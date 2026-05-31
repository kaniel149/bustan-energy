// ============================================================
// /api/cron-process-scans  — P4 on-demand scan worker (light tier)
// Polls bustan.scan_requests for 'queued' rows, acquires buildings from OSM
// Overpass in the bbox, scores + dedups them, and upserts new leads
// (properties + crm_pipeline + owner_decision) into the `bustan` schema.
//
// Heavy CV roof-detection + paid owner enrichment are intentionally NOT done
// here — that's the separate Python worker (scripts/roof_detector.py,
// scripts/enrich_owners.py). This serverless tier covers the cheap OSM path.
//
// Auth: Bearer CRON_SECRET (Vercel cron or manual trigger).
// Targets the BUSTAN project (separate from the TM Energy SUPABASE_URL); uses
// its own service-role key + PostgREST schema headers.
// ============================================================
export const config = { runtime: 'edge' }

const CRON_SECRET = process.env.CRON_SECRET
const BUSTAN_URL = process.env.BUSTAN_SUPABASE_URL || 'https://ygoiaabzkuvdsyyduvhv.supabase.co'
const BUSTAN_KEY = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY!
// Overpass mirrors — the public API frequently 504/429s when overloaded, so we
// fail over across mirrors within a run. Cross-tick retry (attempts) is the
// longer backoff if every mirror is down at once.
const OVERPASS_URLS = [...new Set([
  ...(process.env.OVERPASS_URL ? [process.env.OVERPASS_URL] : []),
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
])]
const OVERPASS_TIMEOUT_MS = 12000  // per-mirror abort — keeps us inside edge limits

// Tuning — mirrors scripts/download_osm_buildings.py
const USABLE_RATIO = 0.65
const EFFICIENCY_KWP = 0.18
const MAX_BBOX_DEG = 0.2          // ~22km per side cap — guards Overpass + cost
const MAX_BUILDINGS = 1500        // hard cap per scan; rest logged as skipped
const DEDUP_DEG = 0.00025         // ~28m: skip buildings near an existing lead
const SCANS_PER_RUN = 3
const MAX_ATTEMPTS = 3            // cross-tick auto-retry cap for failed/stuck scans
const STALE_RUNNING_MS = 3 * 60 * 1000  // a 'running' scan older than this = crashed/timed-out → retry

type LngLat = { lat: number; lon: number }

function bustanHeaders(write = false): Record<string, string> {
  const h: Record<string, string> = { apikey: BUSTAN_KEY, Authorization: `Bearer ${BUSTAN_KEY}` }
  if (write) { h['Content-Type'] = 'application/json'; h['Content-Profile'] = 'bustan' }
  else h['Accept-Profile'] = 'bustan'
  return h
}
async function bGet<T>(path: string): Promise<T[]> {
  const r = await fetch(`${BUSTAN_URL}/rest/v1/${path}`, { headers: bustanHeaders(false) })
  return r.ok ? r.json() : []
}
async function bPatch(path: string, body: unknown): Promise<boolean> {
  const r = await fetch(`${BUSTAN_URL}/rest/v1/${path}`, {
    method: 'PATCH', headers: { ...bustanHeaders(true), Prefer: 'return=minimal' }, body: JSON.stringify(body),
  })
  return r.ok
}
async function bInsert(table: string, rows: unknown[]): Promise<boolean> {
  if (rows.length === 0) return true
  const r = await fetch(`${BUSTAN_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...bustanHeaders(true), Prefer: 'return=minimal,resolution=ignore-duplicates' },
    body: JSON.stringify(rows),
  })
  return r.ok
}

// Acquire buildings from OSM Overpass with mirror failover + per-mirror timeout.
// Returns the parsed Overpass JSON, or throws after every mirror fails (the scan
// is then re-queued by the cross-tick retry, MAX_ATTEMPTS).
async function fetchOverpassBuildings(
  query: string,
): Promise<{ elements?: Array<{ type: string; id: number; geometry?: LngLat[]; tags?: Record<string, string> }> }> {
  let lastErr = 'no mirrors configured'
  for (const url of OVERPASS_URLS) {
    const host = url.replace(/^https?:\/\//, '').split('/')[0]
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), OVERPASS_TIMEOUT_MS)
    try {
      const res = await fetch(url, { method: 'POST', body: `data=${encodeURIComponent(query)}`, signal: ctrl.signal })
      if (res.ok) return await res.json()
      lastErr = `${host} ${res.status}`  // 504/429/502 → try next mirror
    } catch (e) {
      lastErr = `${host} ${e instanceof Error ? e.name : 'error'}`  // abort/timeout/network → next mirror
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error(`overpass all mirrors failed (last: ${lastErr})`)
}

function shoelaceAreaM2(geom: LngLat[]): number {
  if (geom.length < 3) return 0
  const avgLat = geom.reduce((s, g) => s + g.lat, 0) / geom.length
  const latM = 111320
  const lngM = 111320 * Math.cos((avgLat * Math.PI) / 180)
  const pts = geom.map((g) => [g.lon * lngM, g.lat * latM] as [number, number])
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area) / 2
}
function centroid(geom: LngLat[]): [number, number] {
  const lat = geom.reduce((s, g) => s + g.lat, 0) / geom.length
  const lon = geom.reduce((s, g) => s + g.lon, 0) / geom.length
  return [lat, lon]
}
function solarScore(kwp: number): number {
  if (kwp >= 200) return 95
  if (kwp >= 100) return 85
  if (kwp >= 50) return 75
  if (kwp >= 20) return 60
  if (kwp >= 10) return 50
  if (kwp >= 5) return 40
  if (kwp >= 2) return 30
  return 20
}
function priority(kwp: number): string {
  if (kwp >= 50) return 'A'
  if (kwp >= 20) return 'B'
  if (kwp >= 5) return 'C'
  return 'D'
}

interface ScanRow {
  id: string
  bbox: number[] | null
  filters: { propertyType?: string; minRoofM2?: number; commercialOnly?: boolean } | null
  attempts?: number
}

const COMMERCIAL = new Set(['retail', 'hospitality', 'restaurant', 'office', 'industrial', 'commercial', 'hotel'])

async function processScan(scan: ScanRow): Promise<Record<string, number | string>> {
  const bbox = scan.bbox
  if (!bbox || bbox.length !== 4) throw new Error('missing bbox')
  const [minLng, minLat, maxLng, maxLat] = bbox
  if (maxLng - minLng > MAX_BBOX_DEG || maxLat - minLat > MAX_BBOX_DEG) {
    throw new Error(`area too large (max ${MAX_BBOX_DEG}° per side)`)
  }
  const filters = scan.filters || {}

  // 1. ACQUIRE — OSM Overpass buildings in bbox (south,west,north,east), with mirror failover
  const q = `[out:json][timeout:60];(way["building"](${minLat},${minLng},${maxLat},${maxLng});relation["building"](${minLat},${minLng},${maxLat},${maxLng}););out geom;`
  const data = await fetchOverpassBuildings(q)
  const elements = (data.elements || []).filter((e) => (e.geometry?.length ?? 0) >= 3)
  const found = elements.length
  const skipped = Math.max(0, found - MAX_BUILDINGS)

  // 2. SCORE + filter
  const candidates = []
  for (const el of elements.slice(0, MAX_BUILDINGS)) {
    const geom = el.geometry as LngLat[]
    const area = shoelaceAreaM2(geom)
    if (area < 5) continue
    if (filters.minRoofM2 && area < filters.minRoofM2) continue
    const usable = area * USABLE_RATIO
    const kwp = Math.round(usable * EFFICIENCY_KWP * 100) / 100
    const tag = (el.tags?.building || 'yes').toLowerCase()
    const category = COMMERCIAL.has(tag) ? tag : 'other'
    if (filters.commercialOnly && !COMMERCIAL.has(tag)) continue
    const [lat, lon] = centroid(geom)
    const ring = geom.map((g) => [Number(g.lon.toFixed(7)), Number(g.lat.toFixed(7))])
    if (ring.length >= 3 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) ring.push(ring[0])
    candidates.push({
      id: crypto.randomUUID(),
      name: el.tags?.['name:en'] || el.tags?.name || `Building (${Math.round(area)}m²)`,
      area_name: 'Scan', property_type: category,
      roof_area_sqm: Math.round(area * 10) / 10,
      solar_potential_score: solarScore(kwp),
      lat: Number(lat.toFixed(7)), lon: Number(lon.toFixed(7)),
      roof_geom: ring.length >= 4 ? { type: 'Polygon', coordinates: [ring] } : null,
      _kwp: kwp, _priority: priority(kwp),
    })
  }
  const kept = candidates.length

  // 3. DEDUP — drop buildings near an existing lead (or each other)
  const existing = await bGet<{ lat: number; lon: number }>(
    `properties?select=lat,lon&lat=gte.${minLat}&lat=lte.${maxLat}&lon=gte.${minLng}&lon=lte.${maxLng}&limit=10000`,
  )
  const near = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
    Math.abs(a.lat - b.lat) < DEDUP_DEG && Math.abs(a.lon - b.lon) < DEDUP_DEG
  const accepted: typeof candidates = []
  for (const c of candidates) {
    const dupExisting = existing.some((e) => near(e, c))
    const dupSelf = accepted.some((a) => near(a, c))
    if (dupExisting || dupSelf) continue
    accepted.push(c)
  }
  const deduped = kept - accepted.length

  // 4. UPSERT — properties + 'new' pipeline + pending owner_decision
  const props = accepted.map((c) => ({
    id: c.id, name: c.name, area_name: c.area_name, property_type: c.property_type,
    roof_area_sqm: c.roof_area_sqm, solar_potential_score: c.solar_potential_score,
    lat: c.lat, lon: c.lon, roof_geom: c.roof_geom,
  }))
  await bInsert('properties', props)
  await bInsert('crm_pipeline', accepted.map((c) => ({ property_id: c.id, stage: 'new', priority: c._priority, estimated_kwp: c._kwp })))
  await bInsert('owner_decision', accepted.map((c) => ({ property_id: c.id, research_status: 'pending', data: {} })))

  return { found, kept, deduped, inserted: accepted.length, skipped }
}

export default async function handler(req: Request): Promise<Response> {
  if (!CRON_SECRET) return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== CRON_SECRET) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  if (!BUSTAN_KEY) return Response.json({ ok: false, error: 'BUSTAN_SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })

  const now = new Date().toISOString()
  // Pick up: fresh 'queued', previously 'failed' (auto-retry up to MAX_ATTEMPTS),
  // and 'running' scans that went stale (a prior run timed out mid-flight).
  const staleBefore = new Date(Date.now() - STALE_RUNNING_MS).toISOString()
  const filter = `or=(status.eq.queued,and(status.eq.failed,attempts.lt.${MAX_ATTEMPTS}),and(status.eq.running,attempts.lt.${MAX_ATTEMPTS},updated_at.lt.${staleBefore}))`
  const queued = await bGet<ScanRow>(`scan_requests?${filter}&order=created_at.asc&limit=${SCANS_PER_RUN}&select=id,bbox,filters,attempts`)
  if (queued.length === 0) return Response.json({ ok: true, processed: 0, message: 'no queued scans' })

  const results: Array<Record<string, unknown>> = []
  for (const scan of queued) {
    // Claim the attempt at pickup so a mid-flight timeout (function killed before
    // the catch runs) still counts — otherwise a perpetually-timing-out scan would
    // be re-picked forever. attempts caps re-pickup at MAX_ATTEMPTS.
    await bPatch(`scan_requests?id=eq.${scan.id}`, { status: 'running', attempts: (scan.attempts ?? 0) + 1, updated_at: now })
    try {
      const counts = await processScan(scan)
      await bPatch(`scan_requests?id=eq.${scan.id}`, { status: 'done', counts, updated_at: new Date().toISOString() })
      results.push({ id: scan.id, ...counts })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      const attempts = (scan.attempts ?? 0) + 1
      await bPatch(`scan_requests?id=eq.${scan.id}`, { status: 'failed', error, attempts, updated_at: new Date().toISOString() })
      results.push({ id: scan.id, error, attempts, willRetry: attempts < MAX_ATTEMPTS })
    }
  }
  return Response.json({ ok: true, processed: queued.length, results })
}
