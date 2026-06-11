// ============================================================
// /api/cron-enrich-contacts  — automatic decision-maker enrichment
//
// Runs every 10 min (schedule "2-52/10 * * * *"), offset 2 min from
// cron-process-scans (*/10) and 3 min from cron-detect-solar (5-55/10).
//
// Queue logic (≤ MAX_PER_TICK = 4 Gemini calls per tick):
//   Select up to 4 bustan.properties that are not yet enriched, joined
//   against bustan.owner_decision:
//     • No owner_decision row at all (LEFT JOIN → null), OR
//     • owner_decision row exists but data->>'lastResearchedAt' IS NULL
//       (row was inserted as a placeholder before this cron existed).
//   Land property_types excluded (no commercial owner to research).
//   Ordered by roof_area_sqm DESC NULLS LAST — biggest commercial roofs first.
//
//   The sentinel that exits a row from the queue is the presence of
//   data->>'lastResearchedAt' in owner_decision.data (written by
//   persistToProperty in find-contact-core.ts on every non-deferred run,
//   whether a contact was found or not).
//
// Deferral on Gemini 429:
//   When geminiExtract returns quota_exhausted=true the row is NOT stamped.
//   The counter `deferred` is incremented and the row stays in the queue for
//   the next tick — mirrors the _429 pattern in cron-detect-solar.ts exactly.
//
// Auth: Bearer CRON_SECRET (Vercel cron or manual trigger).
//
// POST { propertyIds: string[] } — manual batch trigger (same auth).
//   Useful for re-running specific IDs after env vars are added (DBD/Firecrawl).
//   Does NOT apply the land-type or lastResearchedAt filters; processes ids as-is.
// ============================================================
export const config = { runtime: 'edge' }

import {
  bGet,
  BUSTAN_KEY,
  runFindContactPipeline,
} from './_lib/find-contact-core.js'

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

const CRON_SECRET = process.env.CRON_SECRET

// OSM landuse values → no commercial owner to research (mirrors cron-detect-solar).
const LAND_PROPERTY_TYPES = new Set([
  'farmland', 'meadow', 'grass', 'greenfield', 'brownfield',
  'orchard', 'farmyard', 'quarry',
])

// Keep total Gemini calls ≤ 4 per tick to share free-tier quota with
// cron-detect-solar (which runs ≤ 10 calls/tick on a 10-min schedule).
// Contact enrichment is heavier per call (~4-5 s including Firecrawl),
// so 4 items fits well within the Vercel edge 25-s wall-clock limit when
// run sequentially. Concurrency 2 is used as a safe middle ground.
const MAX_PER_TICK = 4
const CONCURRENCY = 2

// ---------------------------------------------------------------------------
// Types for the work-queue rows
// ---------------------------------------------------------------------------

interface QueueRow {
  id: string
  name: string | null
  lat: number | null
  lon: number | null
  property_type: string | null
  roof_area_sqm: number | null
  // null when no owner_decision row exists (LEFT JOIN)
  last_researched_at: string | null
}

// ---------------------------------------------------------------------------
// Queue fetch
//
// Strategy: we need bustan.properties LEFT JOIN bustan.owner_decision on the
// sentinel column data->>'lastResearchedAt'. PostgREST does not support JOIN
// expressions directly, so we fetch both tables and compute the unenriched set
// in JS — same approach used by cron-detect-solar for the solar_checked_at queue.
//
// Steps:
//   1. Fetch all owner_decision rows (property_id + data->>'lastResearchedAt').
//   2. Build a Set of property_ids that are already stamped.
//   3. Fetch properties with land-type filter + valid coords, ordered by
//      roof_area_sqm DESC, limit MAX_PER_TICK * 3 (over-fetch to fill the
//      budget after filtering out already-stamped rows).
//   4. Filter out stamped ids in JS, then slice to MAX_PER_TICK.
// ---------------------------------------------------------------------------

interface OwnerDecisionMinRow {
  property_id: string
  data: Record<string, unknown> | null
}

interface BustanPropertyMinRow {
  id: string
  name: string | null
  lat: number | null
  lon: number | null
  property_type: string | null
  roof_area_sqm: number | null
}

async function buildQueue(): Promise<QueueRow[]> {
  // Step 1: fetch all owner_decision rows (small table — property_ids + sentinel only)
  const ownerRows = await bGet<OwnerDecisionMinRow>(
    `owner_decision?select=property_id,data`,
  )

  // Step 2: stamped ids = those with a non-null lastResearchedAt in data jsonb
  const stampedIds = new Set(
    ownerRows
      .filter((r) => r.data?.['lastResearchedAt'] != null)
      .map((r) => r.property_id),
  )

  // Step 3: fetch candidate properties — land types excluded, coords required,
  // biggest roofs first. Over-fetch so we can filter and still fill MAX_PER_TICK.
  const landTypeFilter = `property_type.not.in.(${[...LAND_PROPERTY_TYPES].join(',')})`
  const props = await bGet<BustanPropertyMinRow>(
    `properties?lat=not.is.null&lon=not.is.null` +
    `&or=(property_type.is.null,${landTypeFilter})` +
    `&order=roof_area_sqm.desc.nullslast` +
    `&select=id,name,lat,lon,property_type,roof_area_sqm` +
    `&limit=${MAX_PER_TICK * 3}`,
  )

  // Step 4: filter to unenriched properties and slice to budget
  const queue: QueueRow[] = []
  for (const p of props) {
    if (stampedIds.has(p.id)) continue
    const ownerRow = ownerRows.find((o) => o.property_id === p.id)
    queue.push({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lon: p.lon,
      property_type: p.property_type,
      roof_area_sqm: p.roof_area_sqm,
      last_researched_at: (ownerRow?.data?.['lastResearchedAt'] as string | null) ?? null,
    })
    if (queue.length >= MAX_PER_TICK) break
  }

  return queue
}

// ---------------------------------------------------------------------------
// Process one property
// ---------------------------------------------------------------------------

interface ProcessResult {
  found_dm: boolean
  found_company: boolean
  deferred: boolean
  error: string | null
}

async function processOne(row: QueueRow): Promise<ProcessResult> {
  const result = await runFindContactPipeline({
    propertyId: row.id,
    lat: row.lat ?? undefined,
    lng: row.lon ?? undefined,
    name: row.name ?? undefined,
    callerName: 'cron-enrich-contacts',
  })

  // Transient Gemini 429 — do NOT stamp; defer to next tick
  if (result.gemini_quota_exhausted) {
    return { found_dm: false, found_company: false, deferred: true, error: null }
  }

  return {
    found_dm: Boolean(result.decision_maker.name),
    found_company: Boolean(result.company.name),
    deferred: false,
    error: null,
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req: Request): Promise<Response> {
  if (!CRON_SECRET) {
    return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  }
  const secret = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!secret || secret !== CRON_SECRET) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  if (!BUSTAN_KEY) {
    return Response.json({ ok: false, error: 'BUSTAN_SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  // ── POST: manual batch by propertyIds ────────────────────────────────────
  if (req.method === 'POST') {
    let body: { propertyIds?: unknown }
    try {
      body = await req.json() as { propertyIds?: unknown }
    } catch {
      return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const propertyIds = Array.isArray(body.propertyIds)
      ? (body.propertyIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : []

    if (propertyIds.length === 0) {
      return Response.json({ ok: false, error: 'propertyIds must be a non-empty string array' }, { status: 400 })
    }

    let processed = 0, found_dm = 0, found_company = 0, deferred = 0, errors = 0

    // Fetch minimal bustan.properties rows for the given ids
    // (POST batch bypasses land-type + sentinel filters intentionally)
    const rows = await bGet<BustanPropertyMinRow>(
      `properties?id=in.(${propertyIds.map(encodeURIComponent).join(',')})` +
      `&select=id,name,lat,lon,property_type,roof_area_sqm`,
    )

    const queueRows: QueueRow[] = rows.map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lon: p.lon,
      property_type: p.property_type,
      roof_area_sqm: p.roof_area_sqm,
      last_researched_at: null,
    }))

    // Process sequentially to avoid hammering Gemini quota
    for (const row of queueRows) {
      try {
        const r = await processOne(row)
        processed++
        if (r.deferred) { deferred++; continue }
        if (r.found_dm) found_dm++
        if (r.found_company) found_company++
        if (r.error) errors++
      } catch (e) {
        console.error(`cron-enrich-contacts POST ${row.id}:`, e instanceof Error ? e.message : String(e))
        errors++
      }
    }

    return Response.json({ ok: true, processed, found_dm, found_company, deferred, errors })
  }

  // ── GET: scheduled run ────────────────────────────────────────────────────
  if (req.method !== 'GET') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 })
  }

  const queue = await buildQueue()

  if (queue.length === 0) {
    return Response.json({
      ok: true,
      processed: 0,
      found_dm: 0,
      found_company: 0,
      deferred: 0,
      errors: 0,
      message: 'nothing_to_process',
    })
  }

  let processed = 0, found_dm = 0, found_company = 0, deferred = 0, errors = 0

  // Concurrency pool — each worker pulls the next item off the queue.
  // CONCURRENCY=2 keeps total wall time ~10-12 s for 4 items while staying
  // well inside the Vercel edge 25-s limit.
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < queue.length) {
      const row = queue[cursor++]
      try {
        const r = await processOne(row)
        processed++
        if (r.deferred) {
          deferred++
          // Transient quota: abort remaining work — all subsequent Gemini calls
          // will also 429, so stop consuming the queue.
          cursor = queue.length
          return
        }
        if (r.found_dm) found_dm++
        if (r.found_company) found_company++
        if (r.error) errors++
      } catch (e) {
        console.error(`cron-enrich-contacts ${row.id}:`, e instanceof Error ? e.message : String(e))
        errors++
        processed++
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
  )

  return Response.json({
    ok: true,
    processed,
    found_dm,
    found_company,
    deferred,
    errors,
    queue_size: queue.length,
  })
}

