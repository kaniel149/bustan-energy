// ============================================================
// /api/cron-process-scans  — P4 on-demand scan worker (light tier)
// Polls bustan.scan_requests for 'queued' rows, acquires buildings from OSM
// Overpass in the bbox, scores + dedups them, and writes CANDIDATES to
// bustan.scan_candidates (status='pending') for operator review.
//
// Candidates are NOT inserted as leads automatically. An operator reviews them
// on the map (frontend agent) and calls set_scan_candidate_status / confirmDetectedRoof.
//
// Heavy CV roof-detection + paid owner enrichment are intentionally NOT done
// here — that's the separate Python worker (scripts/roof_detector.py,
// scripts/enrich_owners.py). This serverless tier covers the cheap OSM path.
//
// Auth: Bearer CRON_SECRET (Vercel cron or manual trigger).
// Targets the BUSTAN project (separate from the Bustan Energy SUPABASE_URL); uses
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

// ---------------------------------------------------------------------------
// Ray-cast point-in-polygon (no deps). Handles GeoJSON Polygon outer ring.
// Coordinates are [lng, lat] pairs (GeoJSON order).
// Returns true when [lng, lat] lies inside the polygon (or on its boundary).
// If ring is degenerate (< 3 points) falls through to true so the caller
// accepts the building — same behaviour as the bbox-only path.
// ---------------------------------------------------------------------------
function pointInPolygon(lng: number, lat: number, polygon: { type: string; coordinates: number[][][] } | null | undefined): boolean {
  if (!polygon || polygon.type !== 'Polygon' || !polygon.coordinates?.[0]) return true
  const ring = polygon.coordinates[0]
  if (ring.length < 3) return true
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = ((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

interface ScanRow {
  id: string
  bbox: number[] | null
  area_geojson: { type: string; coordinates: number[][][] } | null
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
  const polygon = scan.area_geojson  // GeoJSON Polygon — may be null if old row

  // 1. ACQUIRE — OSM Overpass buildings in bbox (south,west,north,east), with mirror failover
  const q = `[out:json][timeout:60];(way["building"](${minLat},${minLng},${maxLat},${maxLng});relation["building"](${minLat},${minLng},${maxLat},${maxLng}););out geom;`
  const data = await fetchOverpassBuildings(q)
  const elements = (data.elements || []).filter((e) => (e.geometry?.length ?? 0) >= 3)
  const found = elements.length
  // `skipped` is the OSM overage beyond MAX_BUILDINGS; Overture overage is
  // captured separately once we know the combined total.
  const osmSkipped = Math.max(0, found - MAX_BUILDINGS)

  // 2. SCORE + filter (+ polygon containment check)
  const scored = []
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
    // Polygon containment: centroid must lie inside the drawn area (when present).
    // Graceful: if polygon is missing/invalid, pointInPolygon returns true.
    if (!pointInPolygon(lon, lat, polygon)) continue
    const ring = geom.map((g) => [Number(g.lon.toFixed(7)), Number(g.lat.toFixed(7))])
    if (ring.length >= 3 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) ring.push(ring[0])
    scored.push({
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

  // 2b. ACQUIRE (Overture) — pre-loaded buildings_external for this bbox.
  // Runs in parallel-ish with OSM scoring being already done; any network error
  // is swallowed so OSM-only behaviour is fully preserved when the table is
  // empty OR when the query fails.
  let overture = 0
  try {
    const extRows = await bGet<{
      id: string
      lat: number
      lon: number
      roof_geom: { type: string; coordinates: number[][][] } | null
      area_sqm: number | null
      name: string | null
      source: string
    }>(
      // order=source.desc → 'overture' rows come before 'msbuildings', so when
      // both cover the same roof the curated Overture footprint wins the dedup
      // tie; Microsoft only fills gaps where Overture is absent.
      `buildings_external?lat=gte.${minLat}&lat=lte.${maxLat}&lon=gte.${minLng}&lon=lte.${maxLng}&order=source.desc&limit=5000&select=id,lat,lon,roof_geom,area_sqm,name,source`,
    )
    overture = extRows.length
    for (const ext of extRows) {
      // Respect the global MAX_BUILDINGS cap across OSM + Overture combined.
      if (scored.length >= MAX_BUILDINGS) break

      // Determine area: prefer the stored area_sqm, fall back to shoelace on
      // the roof_geom polygon, skip the row if we can't compute one.
      let area: number
      if (ext.area_sqm && ext.area_sqm >= 5) {
        area = ext.area_sqm
      } else if (ext.roof_geom?.type === 'Polygon' && ext.roof_geom.coordinates?.[0]?.length >= 3) {
        const ring = ext.roof_geom.coordinates[0]
        const geomPts: LngLat[] = ring.map(([lon, lat]) => ({ lat, lon }))
        area = shoelaceAreaM2(geomPts)
        if (area < 5) continue
      } else {
        continue  // no usable geometry — skip
      }
      if (filters.minRoofM2 && area < filters.minRoofM2) continue
      // Overture buildings carry no OSM building tag / category, so they cannot
      // be classified as commercial — skip them when commercialOnly is set.
      if (filters.commercialOnly) continue

      const usable = area * USABLE_RATIO
      const kwp = Math.round(usable * EFFICIENCY_KWP * 100) / 100

      const lat = Number(Number(ext.lat).toFixed(7))
      const lon = Number(Number(ext.lon).toFixed(7))

      // Polygon containment — same guard as OSM path.
      if (!pointInPolygon(lon, lat, polygon)) continue

      // Normalise roof_geom ring so first === last (closed ring).
      let roofGeom: { type: string; coordinates: number[][][] } | null = null
      if (ext.roof_geom?.type === 'Polygon' && ext.roof_geom.coordinates?.[0]?.length >= 3) {
        const ring = ext.roof_geom.coordinates[0].map(([ln, la]) => [
          Number(ln.toFixed(7)),
          Number(la.toFixed(7)),
        ])
        if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0])
        if (ring.length >= 4) roofGeom = { type: 'Polygon', coordinates: [ring] }
      }

      scored.push({
        id: crypto.randomUUID(),
        name: ext.name || `Building (${Math.round(area)}m²)`,
        area_name: 'Scan',
        property_type: ext.source || 'other',
        roof_area_sqm: Math.round(area * 10) / 10,
        solar_potential_score: solarScore(kwp),
        lat,
        lon,
        roof_geom: roofGeom,
        _kwp: kwp,
        _priority: priority(kwp),
      })
    }
  } catch (err) {
    console.error('Overture buildings_external fetch failed:', err)
    // Fall through — OSM-only behaviour is unchanged.
  }

  const kept = scored.length   // OSM + Overture combined (pre-dedup)

  // 3. DEDUP — drop buildings near an existing lead OR an existing pending candidate
  const [existing, existingCandidates] = await Promise.all([
    bGet<{ lat: number; lon: number }>(
      `properties?select=lat,lon&lat=gte.${minLat}&lat=lte.${maxLat}&lon=gte.${minLng}&lon=lte.${maxLng}&limit=10000`,
    ),
    bGet<{ lat: number; lon: number }>(
      `scan_candidates?select=lat,lon&status=eq.pending&lat=gte.${minLat}&lat=lte.${maxLat}&lon=gte.${minLng}&lon=lte.${maxLng}&limit=10000`,
    ),
  ])
  const near = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
    Math.abs(a.lat - b.lat) < DEDUP_DEG && Math.abs(a.lon - b.lon) < DEDUP_DEG
  const accepted: typeof scored = []
  for (const c of scored) {
    const dupExisting = existing.some((e) => near(e, c))
    const dupCandidate = existingCandidates.some((e) => near(e, c))
    const dupSelf = accepted.some((a) => near(a, c))
    if (dupExisting || dupCandidate || dupSelf) continue
    accepted.push(c)
  }
  // kept = osmKept + overture candidates that passed polygon filter.
  // skipped counts OSM overage (rows beyond MAX_BUILDINGS that were never scored).
  const skipped = osmSkipped
  const deduped = kept - accepted.length

  // 4. INSERT candidates (status='pending') — NO auto-lead insert.
  // An operator reviews these on the map and calls set_scan_candidate_status /
  // confirmDetectedRoof to promote to a lead or reject.
  const candidateRows = accepted.map((c) => ({
    id: c.id,
    scan_request_id: scan.id,
    name: c.name,
    area_name: c.area_name,
    property_type: c.property_type,
    lat: c.lat,
    lon: c.lon,
    roof_geom: c.roof_geom,
    roof_area_sqm: c.roof_area_sqm,
    solar_potential_score: c.solar_potential_score,
    estimated_kwp: c._kwp,
    priority: c._priority,
    status: 'pending',
  }))
  const inserted = await bInsert('scan_candidates', candidateRows)
  if (!inserted && candidateRows.length > 0) throw new Error('failed to insert candidates into scan_candidates')

  return { found, overture, kept, deduped, candidates: accepted.length, skipped }
}

export default async function handler(req: Request): Promise<Response> {
  if (!CRON_SECRET) return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  const secret = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!secret || secret !== CRON_SECRET) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  if (!BUSTAN_KEY) return Response.json({ ok: false, error: 'BUSTAN_SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })

  const now = new Date().toISOString()
  // Pick up: fresh 'queued', previously 'failed' (auto-retry up to MAX_ATTEMPTS),
  // and 'running' scans that went stale (a prior run timed out mid-flight).
  const staleBefore = new Date(Date.now() - STALE_RUNNING_MS).toISOString()
  const filter = `or=(status.eq.queued,and(status.eq.failed,attempts.lt.${MAX_ATTEMPTS}),and(status.eq.running,attempts.lt.${MAX_ATTEMPTS},updated_at.lt.${staleBefore}))`
  const queued = await bGet<ScanRow>(`scan_requests?${filter}&order=created_at.asc&limit=${SCANS_PER_RUN}&select=id,bbox,area_geojson,filters,attempts`)
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
