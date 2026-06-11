// ============================================================
// /api/cron-detect-solar  — automated existing-PV detection
//
// Runs every 10 min (offset 5-55/10 from cron-process-scans's */10).
// Fetches up to MAX_PER_RUN unchecked roof candidates + properties,
// pulls an Esri World Imagery aerial tile, and asks Gemini 2.0 Flash
// whether PV panels are already installed.
//
// Queue logic (≤ MAX_PER_RUN = 15 Gemini calls per tick):
//   Slot A: scan_candidates where kind='roof', status='pending',
//           solar_checked_at IS NULL — ordered priority asc, estimated_kwp desc
//           (highest-value, most-urgent roofs first).
//   Slot B: bustan.properties where solar_checked_at IS NULL (existing_solar
//           is NOT NULL DEFAULT false — 378 unverified defaults — so we cannot
//           filter on IS NULL there; we use solar_checked_at as the work-queue
//           sentinel instead). Land property_types excluded (no roof to check).
//           Ordered by roof_area_sqm DESC (biggest roofs first; estimated_kwp
//           lives in crm_pipeline, not on the properties row itself).
//
// Write-back:
//   • scan_candidates: existing_solar, solar_check_confidence, solar_checked_at
//   • properties:      existing_solar when confidence ≥ MIN_CONFIDENCE_WRITE,
//                      with an extra guard: stored TRUE is never overwritten to
//                      false unless confidence ≥ MIN_CONFIDENCE_OVERTURN (0.7).
//                      Always stamps solar_check_confidence + solar_checked_at.
//   On per-item error: stamp solar_checked_at with confidence=0 so the row
//   exits the queue (no infinite retry). The item can be re-queued via POST.
//
// Auth: Bearer CRON_SECRET (Vercel cron or manual trigger).
// Schema: bustan (Accept-Profile / Content-Profile headers).
// ============================================================
export const config = { runtime: 'edge' }

const CRON_SECRET  = process.env.CRON_SECRET
const BUSTAN_URL   = process.env.BUSTAN_SUPABASE_URL || 'https://ygoiaabzkuvdsyyduvhv.supabase.co'
const BUSTAN_KEY   = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_KEY   = process.env.GEMINI_API_KEY || process.env.NANOBANANA_API_KEY!

// Keep total Gemini calls ≤ 15 per run to stay comfortably inside the
// Vercel edge 25-s wall-clock limit (Gemini vision ≈ 1-3 s each).
const MAX_PER_RUN  = 15
// Minimum confidence to write existing_solar to a property row at all.
const MIN_CONFIDENCE_WRITE = 0.5
// Minimum confidence required to flip a stored TRUE → false (preventing
// low-confidence "clean" detections from clobbering a known install).
const MIN_CONFIDENCE_OVERTURN = 0.7
// OSM landuse values that mean ground-mount land — these are stored as
// property_type on promoted land candidates. Properties with these types
// have no roof, so we skip them in the PV-check queue.
// Mirrors LAND_USES in cron-process-scans.ts.
const LAND_PROPERTY_TYPES = new Set([
  'farmland', 'meadow', 'grass', 'greenfield', 'brownfield',
  'orchard', 'farmyard', 'quarry',
])
// Esri World Imagery tile size (pixels); 640×640 is the Esri default cap.
const TILE_SIZE    = 640
// Approximate half-size in degrees added as padding around the roof bbox.
// ~30 m at Thai latitudes → enough context to see adjacent panels without
// losing the roof centroid.
const BBOX_PAD_DEG = 0.00030   // ≈ 33 m per side

// ----------------------------------------------------------------
// Bustan REST helpers (mirrors cron-process-scans.ts exactly)
// ----------------------------------------------------------------
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
    method: 'PATCH',
    headers: { ...bustanHeaders(true), Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  return r.ok
}

// ----------------------------------------------------------------
// Esri World Imagery REST export (free, no key)
// Docs: https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer
// bbox order: minLon,minLat,maxLon,maxLat (WGS-84 / bboxSR=4326)
// imageSR=3857 lets the server project internally — output is still a JPEG
// that represents the requested geographic bbox.
// ----------------------------------------------------------------
async function fetchAerialBase64(
  lat: number,
  lon: number,
  roofGeom: { type: string; coordinates: number[][][] } | null,
): Promise<{ b64: string; mime: string }> {
  // Compute bbox from the roof polygon or fall back to a ~60 m box.
  let minLon: number, minLat: number, maxLon: number, maxLat: number
  if (roofGeom?.type === 'Polygon' && roofGeom.coordinates?.[0]?.length >= 3) {
    const ring = roofGeom.coordinates[0]
    minLon = ring.reduce((m, p) => Math.min(m, p[0]), Infinity)
    minLat = ring.reduce((m, p) => Math.min(m, p[1]), Infinity)
    maxLon = ring.reduce((m, p) => Math.max(m, p[0]), -Infinity)
    maxLat = ring.reduce((m, p) => Math.max(m, p[1]), -Infinity)
  } else {
    // ~60 m box centred on the point
    minLon = lon - BBOX_PAD_DEG * 2
    minLat = lat - BBOX_PAD_DEG * 2
    maxLon = lon + BBOX_PAD_DEG * 2
    maxLat = lat + BBOX_PAD_DEG * 2
  }
  // Add 25 % padding to each side for context.
  const dLon = (maxLon - minLon) * 0.25
  const dLat = (maxLat - minLat) * 0.25
  minLon -= dLon; maxLon += dLon
  minLat -= dLat; maxLat += dLat

  const url =
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export` +
    `?bbox=${minLon},${minLat},${maxLon},${maxLat}` +
    `&bboxSR=4326&imageSR=3857` +
    `&size=${TILE_SIZE},${TILE_SIZE}` +
    `&format=jpg&f=image`

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12_000)
  let buf: ArrayBuffer
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`esri_http_${res.status}`)
    buf = await res.arrayBuffer()
  } finally {
    clearTimeout(t)
  }

  // ArrayBuffer → base64 in chunks to avoid call-stack overflow on large arrays.
  const bytes = new Uint8Array(buf)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...(bytes.subarray(i, i + CHUNK) as unknown as number[]))
  }
  return { b64: btoa(binary), mime: 'image/jpeg' }
}

// ----------------------------------------------------------------
// Gemini 2.0 Flash — focused existing-solar prompt
// Deliberately narrow: we only ask about PV panels, not full roof
// analysis, so the model stays on-task and the output token budget
// stays tiny (well within 200-token max).
// ----------------------------------------------------------------
const SOLAR_DETECT_PROMPT = `You are analysing an aerial / satellite photograph of a building rooftop.

TASK: Determine whether photovoltaic (PV) solar panels are ALREADY installed on the roof of the building in the centre of the image.

GUIDANCE:
- Solar panels: rectangular grid of dark blue/black cells, often with a metallic frame visible from above.
- Do NOT confuse with: skylights (glass domes), water-heater tanks, dark-coloured roofing membrane, AC units, or shadows.
- If the image is too blurry, obstructed by clouds, or the roof is not visible → return has_existing_solar: false with confidence ≤ 0.25.
- panel_coverage_pct: approximate percentage of the visible roof surface covered by panels (0 if none detected).

Return ONLY valid JSON, no markdown fences:
{"has_existing_solar":true|false,"confidence":0.0-1.0,"panel_coverage_pct":0-100}`

interface SolarDetectResult {
  has_existing_solar: boolean | string
  confidence: number
  panel_coverage_pct: number
}

async function callGemini(b64: string, mime: string): Promise<SolarDetectResult> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 20_000)
  let res: Response
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: SOLAR_DETECT_PROMPT },
              { inline_data: { mime_type: mime, data: b64 } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            maxOutputTokens: 200,
          },
        }),
      },
    )
  } finally {
    clearTimeout(t)
  }

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`gemini_${res.status}: ${txt.slice(0, 120)}`)
  }

  const envelope = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = envelope?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('gemini_empty_response')

  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
  const parsed = JSON.parse(cleaned) as SolarDetectResult

  // Normalise the boolean field: Gemini sometimes emits "true"/"false" strings.
  const raw = parsed.has_existing_solar
  parsed.has_existing_solar =
    raw === true ||
    (typeof raw === 'string' && ['true', '1', 'yes'].includes(raw.trim().toLowerCase()))

  return parsed
}

// ----------------------------------------------------------------
// Types for the work-queue rows
// ----------------------------------------------------------------
interface CandidateRow {
  id: string
  lat: number
  lon: number
  roof_geom: { type: string; coordinates: number[][][] } | null
  priority: string | null
  estimated_kwp: number | null
}

interface PropertyRow {
  id: string
  lat: number
  lon: number
  existing_solar: boolean | null
  roof_area_sqm: number | null
  property_type: string | null
}

// ----------------------------------------------------------------
// Determine what to write back to properties.existing_solar.
//
// Rules:
//   • confidence < MIN_CONFIDENCE_WRITE (0.5) → do not touch the boolean.
//   • detected = true, confidence ≥ 0.5 → always set true.
//   • detected = false, confidence ≥ 0.5:
//       - stored value is already false (or null) → set false.
//       - stored value is true → only overwrite if confidence ≥ MIN_CONFIDENCE_OVERTURN (0.7)
//         (prevents a low-confidence "clean" image from nuking a confirmed install).
// ----------------------------------------------------------------
function buildPropertySolarPatch(
  stored: boolean | null,
  detected: boolean,
  confidence: number,
): { existing_solar?: boolean } {
  if (confidence < MIN_CONFIDENCE_WRITE) return {}
  if (detected) return { existing_solar: true }
  // detected = false
  if (stored === true && confidence < MIN_CONFIDENCE_OVERTURN) return {}
  return { existing_solar: false }
}

// ----------------------------------------------------------------
// Process a single item (shared logic for candidates + properties)
// ----------------------------------------------------------------
async function processItem(lat: number, lon: number, roofGeom: { type: string; coordinates: number[][][] } | null): Promise<{
  has_existing_solar: boolean
  confidence: number
  panel_coverage_pct: number
}> {
  const { b64, mime } = await fetchAerialBase64(lat, lon, roofGeom)
  const result = await callGemini(b64, mime)
  return {
    has_existing_solar: result.has_existing_solar as boolean,
    confidence: Number(result.confidence) || 0,
    panel_coverage_pct: Number(result.panel_coverage_pct) || 0,
  }
}

// ----------------------------------------------------------------
// Main handler
// ----------------------------------------------------------------
export default async function handler(req: Request): Promise<Response> {
  if (!CRON_SECRET) return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  const secret = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!secret || secret !== CRON_SECRET) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  if (!BUSTAN_KEY) return Response.json({ ok: false, error: 'BUSTAN_SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  if (!GEMINI_KEY) return Response.json({ ok: false, error: 'GEMINI_API_KEY not set' }, { status: 500 })

  const isPost = req.method === 'POST'
  const now = new Date().toISOString()

  // ---- On-demand re-check (POST with explicit id arrays) ----
  if (isPost) {
    const body = await req.json() as { candidateIds?: string[]; propertyIds?: string[] }
    const candidateIds: string[] = Array.isArray(body.candidateIds) ? body.candidateIds : []
    const propertyIds: string[]  = Array.isArray(body.propertyIds)  ? body.propertyIds  : []

    let processed = 0, detected = 0, errors = 0

    for (const id of candidateIds) {
      const rows = await bGet<CandidateRow>(
        `scan_candidates?id=eq.${id}&select=id,lat,lon,roof_geom,priority,estimated_kwp&limit=1`,
      )
      if (rows.length === 0) continue
      const row = rows[0]
      try {
        const r = await processItem(Number(row.lat), Number(row.lon), row.roof_geom)
        await bPatch(`scan_candidates?id=eq.${id}`, {
          existing_solar: r.has_existing_solar,
          solar_check_confidence: r.confidence,
          solar_checked_at: now,
        })
        processed++
        if (r.has_existing_solar) detected++
      } catch {
        await bPatch(`scan_candidates?id=eq.${id}`, { solar_check_confidence: 0, solar_checked_at: now })
        errors++
      }
    }

    for (const id of propertyIds) {
      const rows = await bGet<PropertyRow>(
        `properties?id=eq.${id}&select=id,lat,lon,existing_solar,roof_area_sqm,property_type&limit=1`,
      )
      if (rows.length === 0) continue
      const row = rows[0]
      try {
        const r = await processItem(Number(row.lat), Number(row.lon), null)
        await bPatch(`properties?id=eq.${id}`, {
          ...buildPropertySolarPatch(row.existing_solar, r.has_existing_solar, r.confidence),
          solar_check_confidence: r.confidence,
          solar_checked_at: now,
        })
        processed++
        if (r.has_existing_solar) detected++
      } catch {
        await bPatch(`properties?id=eq.${id}`, { solar_check_confidence: 0, solar_checked_at: now })
        errors++
      }
    }

    return Response.json({ ok: true, processed, detected, errors })
  }

  // ---- Scheduled run (GET): build work queue ----

  // Slot A: pending roof scan candidates not yet checked.
  // Order: priority asc (A < B < C < D lexicographically), then estimated_kwp desc.
  const candidates = await bGet<CandidateRow>(
    `scan_candidates?kind=eq.roof&status=eq.pending&solar_checked_at=is.null` +
    `&order=priority.asc,estimated_kwp.desc.nullslast` +
    `&select=id,lat,lon,roof_geom,priority,estimated_kwp` +
    `&limit=${MAX_PER_RUN}`,
  )

  const remainingBudget = MAX_PER_RUN - candidates.length

  // Slot B: properties not yet checked (solar_checked_at IS NULL).
  // NOTE: existing_solar is NOT NULL DEFAULT false — filtering on IS NULL would
  // match nothing. solar_checked_at is the authoritative work-queue sentinel.
  // Exclusions:
  //   • property_type in LAND_PROPERTY_TYPES — ground-mount land, no roof.
  //   • lat/lon nulls — no coordinates to build an aerial bbox.
  // Order: roof_area_sqm DESC NULLS LAST — biggest roofs checked first.
  // (estimated_kwp lives in crm_pipeline, not on the properties row itself.)
  // NOTE: or=(neq,neq,...) would be a tautology (x≠a OR x≠b is always true);
  // not.in.(...) excludes the listed values, and the is.null arm keeps untyped rows.
  const landTypeFilter = `property_type.not.in.(${[...LAND_PROPERTY_TYPES].join(',')})`
  const properties = remainingBudget > 0
    ? await bGet<PropertyRow>(
        `properties?solar_checked_at=is.null&lat=not.is.null&lon=not.is.null` +
        `&or=(property_type.is.null,${landTypeFilter})` +
        `&order=roof_area_sqm.desc.nullslast` +
        `&select=id,lat,lon,existing_solar,roof_area_sqm,property_type` +
        `&limit=${remainingBudget}`,
      )
    : []

  const totalWork = candidates.length + properties.length
  if (totalWork === 0) {
    return Response.json({ ok: true, processed: 0, detected: 0, errors: 0, message: 'nothing_to_process' })
  }

  let processed = 0, detected = 0, errors = 0

  // Process scan_candidates (Slot A)
  for (const c of candidates) {
    try {
      const r = await processItem(Number(c.lat), Number(c.lon), c.roof_geom)
      await bPatch(`scan_candidates?id=eq.${c.id}`, {
        existing_solar: r.has_existing_solar,
        solar_check_confidence: r.confidence,
        solar_checked_at: now,
      })
      processed++
      if (r.has_existing_solar) detected++
    } catch (err) {
      // Stamp solar_checked_at so this row exits the work queue (confidence=0
      // signals the failure; the item can be re-queued via POST if needed).
      await bPatch(`scan_candidates?id=eq.${c.id}`, {
        solar_check_confidence: 0,
        solar_checked_at: now,
      })
      console.error(`cron-detect-solar candidate ${c.id} error:`, err instanceof Error ? err.message : err)
      errors++
    }
  }

  // Process properties (Slot B)
  for (const p of properties) {
    try {
      const r = await processItem(Number(p.lat), Number(p.lon), null)
      await bPatch(`properties?id=eq.${p.id}`, {
        ...buildPropertySolarPatch(p.existing_solar, r.has_existing_solar, r.confidence),
        solar_check_confidence: r.confidence,
        solar_checked_at: now,
      })
      processed++
      if (r.has_existing_solar) detected++
    } catch (err) {
      await bPatch(`properties?id=eq.${p.id}`, {
        solar_check_confidence: 0,
        solar_checked_at: now,
      })
      console.error(`cron-detect-solar property ${p.id} error:`, err instanceof Error ? err.message : err)
      errors++
    }
  }

  return Response.json({
    ok: true,
    processed,
    detected,
    errors,
    slots: { candidates: candidates.length, properties: properties.length },
  })
}
