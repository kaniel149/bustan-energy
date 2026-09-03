// ============================================================
// /api/admin-enrich-batch — on-demand contact enrichment, one batch per call
//
// POST { limit?: number }  (default 4, max 8) — Bearer <admin user token>
//   Runs the same per-property pipeline as cron-enrich-contacts
//   (find-contact-core) over the next `limit` unenriched properties and
//   returns { processed, deferred, remaining } so the CRM toolbar can loop
//   "Enrich unenriched (N)" until remaining === 0 (or a quota deferral).
//
// Queue selection is shared with the cron via _lib/enrich-queue.ts — one
// definition of "unenriched" (no owner_decision.data.lastResearchedAt stamp).
// ============================================================
// Node runtime: a single property can approach ~20 s (Places + Firecrawl +
// Gemini); a parallel batch needs the 60-s budget, not the edge 25-s ceiling.
export const config = { runtime: 'nodejs', maxDuration: 60 }

import { isAllowedAdmin } from './_lib/admin-access.js'
import { BUSTAN_KEY, runFindContactPipeline } from './_lib/find-contact-core.js'
import { selectUnenrichedProperties, countUnenriched } from './_lib/enrich-queue.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const DEFAULT_LIMIT = 4
const MAX_LIMIT = 8
// All items of a batch run in parallel (≤ 4 at a time): 4 concurrent
// Firecrawl/Gemini calls stay within free-tier limits; wall time ≈ the slowest
// single property rather than the sum.
const CONCURRENCY = 4

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return null
  const user = await r.json() as { email?: string }
  const email = user?.email?.toLowerCase()
  return email && isAllowedAdmin(email) ? email : null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 })
  if (!SUPABASE_URL || !SUPABASE_KEY) return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  if (!BUSTAN_KEY) return Response.json({ ok: false, error: 'BUSTAN_SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })

  const email = await verifyAdmin(req)
  if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { limit?: unknown }
  const requested = Number(body.limit)
  const limit = Number.isFinite(requested) && requested > 0 ? Math.min(MAX_LIMIT, Math.floor(requested)) : DEFAULT_LIMIT

  const queue = await selectUnenrichedProperties(limit)
  let processed = 0, deferred = 0, found_dm = 0, found_company = 0, errors = 0

  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < queue.length) {
      const row = queue[cursor++]
      try {
        const r = await runFindContactPipeline({
          propertyId: row.id,
          lat: row.lat ?? undefined,
          lng: row.lon ?? undefined,
          name: row.name ?? undefined,
          callerName: `admin-enrich-batch:${email}`,
        })
        processed++
        if (r.gemini_quota_exhausted) {
          // Transient quota: every further Gemini call will 429 too — stop
          // consuming the queue; the row stays unstamped for the next pass.
          deferred++
          cursor = queue.length
          return
        }
        if (r.decision_maker.name) found_dm++
        if (r.company.name) found_company++
      } catch (e) {
        console.error(`admin-enrich-batch ${row.id}:`, e instanceof Error ? e.message : String(e))
        errors++
        processed++
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()))

  const remaining = await countUnenriched()
  return Response.json({ ok: true, processed, deferred, found_dm, found_company, errors, remaining, batch: queue.length })
}
