// ============================================================
// /api/cron-detect-solar  — automated existing-PV detection
//
// Runs every 10 min (offset 5-55/10 from cron-process-scans's */10).
// Fetches up to MAX_PER_RUN unchecked roof candidates + properties, builds a
// z18 3×3 Esri World Imagery stitch with the target footprint outlined in
// magenta (api/_lib/aerial-tiles.ts), and asks a Gemini vision model whether PV
// panels are already installed INSIDE the outline.
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
//   • scan_candidates: existing_solar, panel_coverage_pct, solar_check_confidence, solar_checked_at
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
// Node runtime (not edge): tile stitching + outline drawing needs sharp, and
// nine z18 tiles per roof would not fit the edge 25-s ceiling at any useful
// batch size. Node gives a 60-s budget.
export const config = { runtime: 'nodejs', maxDuration: 60 }

import { buildOutlinedCrop } from './_lib/aerial-tiles.js'

const CRON_SECRET  = process.env.CRON_SECRET
const BUSTAN_URL   = process.env.BUSTAN_SUPABASE_URL || 'https://ygoiaabzkuvdsyyduvhv.supabase.co'
const BUSTAN_KEY   = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_KEY   = process.env.GEMINI_API_KEY || process.env.NANOBANANA_API_KEY!

// Keep total Gemini calls ≤ 10 per run: each item is 9 tile fetches + one
// Gemini vision call (≈ 3-6 s), and CONCURRENCY workers share the 60-s budget.
const MAX_PER_RUN  = 10
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
// Imagery: see api/_lib/aerial-tiles.ts (z18, 3×3 stitch, magenta outline,
// 120 m crop). z19 is a placeholder over Ko Phangan; the outline is what stops
// a neighbour's panels from being attributed to the target roof.
// ----------------------------------------------------------------

// ----------------------------------------------------------------
// Gemini 2.0 Flash — focused existing-solar prompt
// Deliberately narrow: we only ask about PV panels, not full roof
// analysis, so the model stays on-task and the output token budget
// stays tiny (well within 200-token max).
// ----------------------------------------------------------------
// Copied verbatim from bustan-index/scripts/detect_solar_kp.py (verified on the
// Aug-2026 island run). Same JSON contract as before.
const SOLAR_DETECT_PROMPT = `This is aerial imagery of Ko Phangan, Thailand. ONE building has its roof outlined with a bright magenta line.

TASK: Determine whether photovoltaic (PV) solar panels are installed on the roof INSIDE the magenta outline.

CRITICAL: Panels on neighbouring roofs outside the outline do NOT count. If the panels are outside the magenta line, answer false.

GUIDANCE:
- Solar panels: a regular grid of dark blue/black rectangular cells, usually in neat rows, often with a visible metal frame and a slight offset shadow.
- Do NOT confuse with: blue- or dark-painted metal roofing (very common in Thailand), skylights, water tanks, AC units, tarpaulins, or shadow.
- A blue roof with no visible cell grid is NOT solar.
- If the outlined roof is obscured, blurry or not visible, answer false with confidence <= 0.25.
- panel_coverage_pct: percent of the outlined roof covered by panels (0 if none).

Return ONLY JSON:
{"has_existing_solar":true|false,"confidence":0.0-1.0,"panel_coverage_pct":0-100}`

// Rows with no footprint polygon get no outline drawn — tell the model so.
const NO_OUTLINE_NOTE = 'No outline is drawn; judge the building at the exact centre of the image only.'

function promptFor(outlined: boolean): string {
  return outlined ? SOLAR_DETECT_PROMPT : `${SOLAR_DETECT_PROMPT}\n\n${NO_OUTLINE_NOTE}`
}

interface SolarDetectResult {
  has_existing_solar: boolean | string
  confidence: number
  panel_coverage_pct: number
}

// Model fallback chain: free-tier quotas are tracked PER MODEL, so when one
// model is 429-exhausted we roll to the next (verified 2026-06-11: 2.0-flash
// exhausted while 2.5-flash-lite / 2.5-flash still had quota).
// Model fallback chain: free-tier quota is tracked PER MODEL, so a 429 on one
// rolls to the next.
//
// gemini-2.5-flash-lite was removed 2026-08-25: it is RETIRED and now answers
// 404 "This model models/gemini-2.5-flash-lite is no longer available". Being
// first in the chain, it turned every call into a wasted round-trip before the
// real model ran. gemini-3.1-flash-lite verified working the same day and
// returns clean unfenced JSON; 3.5-flash-lite wraps output in ```json fences,
// which the parsers here already strip.
const GEMINI_MODELS = [
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
]

async function callGemini(image: string, mime: string, prompt: string): Promise<SolarDetectResult> {
  let res: Response | null = null
  let lastErr = ''
  for (const model of GEMINI_MODELS) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 20_000)
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mime, data: image } },
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
    if (res.ok) break
    lastErr = `gemini_${model}_${res.status}: ${(await res.text()).slice(0, 120)}`
    // 429 (quota) / 404 (model unavailable) → try the next model; else give up
    if (res.status !== 429 && res.status !== 404) throw new Error(lastErr)
    res = null
  }

  if (!res) throw new Error(lastErr || 'gemini_all_models_exhausted')

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
  roof_geom: { type: string; coordinates: number[][][] } | null
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
type RoofGeom = { type: string; coordinates: number[][][] } | null

function outerRing(geom: RoofGeom): number[][] | null {
  return Array.isArray(geom?.coordinates?.[0]) ? geom.coordinates[0] : null
}

async function processItem(lat: number, lon: number, geom: RoofGeom): Promise<{
  has_existing_solar: boolean
  confidence: number
  panel_coverage_pct: number
}> {
  const img = await buildOutlinedCrop({ lon, lat, ring: outerRing(geom) })
  const result = await callGemini(img.base64, img.mime, promptFor(img.outlined))
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
          panel_coverage_pct: r.panel_coverage_pct,
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
        `properties?id=eq.${id}&select=id,lat,lon,roof_geom,existing_solar,roof_area_sqm,property_type&limit=1`,
      )
      if (rows.length === 0) continue
      const row = rows[0]
      try {
        const r = await processItem(Number(row.lat), Number(row.lon), row.roof_geom)
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
        `&select=id,lat,lon,roof_geom,existing_solar,roof_area_sqm,property_type` +
        `&limit=${remainingBudget}`,
      )
    : []

  const totalWork = candidates.length + properties.length
  if (totalWork === 0) {
    return Response.json({ ok: true, processed: 0, detected: 0, errors: 0, message: 'nothing_to_process' })
  }

  let processed = 0, detected = 0, errors = 0, deferred = 0

  // Sequential processing of 15 items blew the 25-s edge wall clock
  // (FUNCTION_INVOCATION_TIMEOUT, verified 2026-06-11). Process with a small
  // concurrency pool instead: each worker pulls the next item off the queue.
  // Kept at 3 on Node too: the Aug-2026 island run showed 8 parallel workers on
  // the shared Gemini key turn into a 429 storm; 3 is the verified safe value.
  type WorkItem =
    | { table: 'scan_candidates'; row: CandidateRow }
    | { table: 'properties'; row: PropertyRow }
  const work: WorkItem[] = [
    ...candidates.map((row) => ({ table: 'scan_candidates' as const, row })),
    ...properties.map((row) => ({ table: 'properties' as const, row })),
  ]

  async function handleOne(item: WorkItem): Promise<void> {
    const { table, row } = item
    try {
      const r = await processItem(Number(row.lat), Number(row.lon), row.roof_geom)
      // properties has no panel_coverage_pct column (015 added it to scan_candidates only)
      const patch = table === 'properties'
        ? buildPropertySolarPatch((row as PropertyRow).existing_solar, r.has_existing_solar, r.confidence)
        : { existing_solar: r.has_existing_solar, panel_coverage_pct: r.panel_coverage_pct }
      await bPatch(`${table}?id=eq.${row.id}`, {
        ...patch,
        solar_check_confidence: r.confidence,
        solar_checked_at: now,
      })
      processed++
      if (r.has_existing_solar) detected++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Gemini quota exhaustion (429 on every model) is TRANSIENT — free-tier
      // limit is ~20 req/min. Do NOT stamp the row; leave it queued so the
      // next 10-min cron tick retries it. Stamping here would silently drain
      // the whole queue as "checked, confidence 0" during a quota storm.
      if (msg.includes('_429')) {
        deferred++
        return
      }
      // Real per-item failure (bad imagery, parse error): stamp so the row
      // exits the queue (confidence=0 signals failure; re-queue via POST).
      await bPatch(`${table}?id=eq.${row.id}`, {
        solar_check_confidence: 0,
        solar_checked_at: now,
      })
      console.error(`cron-detect-solar ${table} ${row.id} error:`, msg)
      errors++
    }
  }

  const CONCURRENCY = 3
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, work.length) }, async () => {
      while (cursor < work.length) {
        const item = work[cursor++]
        await handleOne(item)
      }
    }),
  )

  return Response.json({
    ok: true,
    processed,
    detected,
    errors,
    deferred,
    slots: { candidates: candidates.length, properties: properties.length },
  })
}
