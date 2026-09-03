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
// Node runtime (not edge): the enrichment pipeline now does Google Places +
// Firecrawl search + scrape + Gemini per property. With real company names the
// scrape actually runs and a single property can approach ~20 s, which blows the
// edge 25-s ceiling. Node gives a 60-s budget so a full parallel batch fits.
export const config = { maxDuration: 60 }

import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  bGet,
  BUSTAN_KEY,
  runFindContactPipeline,
} from './_lib/find-contact-core.js'
import { selectUnenrichedProperties } from './_lib/enrich-queue.js'

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

const CRON_SECRET = process.env.CRON_SECRET

// Process 3 properties per tick, all fully in parallel (CONCURRENCY === MAX_PER_TICK)
// so wall time ≈ the slowest single property (~10-20 s) rather than the sum.
// 3 concurrent Firecrawl/Gemini calls stays within free-tier rate limits and the
// 60-s Node budget with wide margin.
const MAX_PER_TICK = 3
const CONCURRENCY = 3

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
// Queue fetch — shared with /api/admin-enrich-batch (see _lib/enrich-queue.ts)
// ---------------------------------------------------------------------------

interface BustanPropertyMinRow {
  id: string
  name: string | null
  lat: number | null
  lon: number | null
  property_type: string | null
  roof_area_sqm: number | null
}

async function buildQueue(): Promise<QueueRow[]> {
  const props = await selectUnenrichedProperties(MAX_PER_TICK)
  return props.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lon: p.lon,
    property_type: p.property_type,
    roof_area_sqm: p.roof_area_sqm,
    last_researched_at: null,
  }))
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
//
// Node runtime (classic req/res signature) — required because the per-property
// pipeline chains several network hops (Places + Firecrawl search + scrape +
// Gemini) whose worst-case sum exceeds the edge 25-s ceiling. The other api/*
// functions stay on edge; this one needs the longer maxDuration above.
// ---------------------------------------------------------------------------

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) as Record<string, unknown> : {}) } catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!CRON_SECRET) {
    return sendJson(res, 500, { ok: false, error: 'server_misconfigured' })
  }
  const authHeader = req.headers['authorization']
  const secret = typeof authHeader === 'string' ? authHeader.match(/^Bearer\s+(\S+)$/i)?.[1] : undefined
  if (!secret || secret !== CRON_SECRET) {
    return sendJson(res, 401, { ok: false, error: 'unauthorized' })
  }
  if (!BUSTAN_KEY) {
    return sendJson(res, 500, { ok: false, error: 'BUSTAN_SUPABASE_SERVICE_ROLE_KEY not set' })
  }

  const method = (req.method ?? 'GET').toUpperCase()

  // ── POST: manual batch by propertyIds ────────────────────────────────────
  if (method === 'POST') {
    const body = await readJsonBody(req) as { propertyIds?: unknown }

    const propertyIds = Array.isArray(body.propertyIds)
      ? (body.propertyIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : []

    if (propertyIds.length === 0) {
      return sendJson(res, 400, { ok: false, error: 'propertyIds must be a non-empty string array' })
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

    return sendJson(res, 200, { ok: true, processed, found_dm, found_company, deferred, errors })
  }

  // ── GET: scheduled run ────────────────────────────────────────────────────
  if (method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
  }

  const queue = await buildQueue()

  if (queue.length === 0) {
    return sendJson(res, 200, {
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

  // Concurrency pool — each worker pulls the next item off the queue. With
  // CONCURRENCY === MAX_PER_TICK all items run in parallel, so wall time ≈ the
  // slowest single property, comfortably inside the 60-s Node budget.
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

  return sendJson(res, 200, {
    ok: true,
    processed,
    found_dm,
    found_company,
    deferred,
    errors,
    queue_size: queue.length,
  })
}

