// ============================================================
// /api/admin-funnel — GET, admin JWT.
// Business funnel across both DBs (bustan scans/CRM + main proposals):
// scans → candidates → promoted → with contact → outreach → proposals →
// viewed → signed, plus KP split, 7-day deltas and "needs attention" lists.
// Big tables are counted (PostgREST count=exact); small ones are fetched and
// aggregated by the pure buildFunnel().
// ============================================================
export const config = { runtime: 'edge' }

import { verifyAdminRequest } from './_lib/admin-verify.js'
import { bGet, bCount } from './_lib/bustan-db.js'
import { supaGetAll } from './_lib/supa.js'
import { buildFunnel, KP_FILTER } from './_lib/funnel.js'
import type { PropertyRow, OwnerRow, OutreachRow, ProposalRow } from './_lib/funnel.js'

export default async function handler(req: Request): Promise<Response> {
  if (!(await verifyAdminRequest(req))) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  try {
    const now = new Date()
    const since7 = new Date(now.getTime() - 7 * 86_400_000).toISOString()
    const C = 'scan_candidates?select=id'
    const [pending, added, rejected, pendingA, kpAll, kpPendingA, created7d, kpCreated7d,
      scanRequests, properties, owners, outreach, proposals, pendingATop] = await Promise.all([
      bCount(`${C}&status=eq.pending`),
      bCount(`${C}&status=eq.added`),
      bCount(`${C}&status=eq.rejected`),
      bCount(`${C}&status=eq.pending&priority=eq.A`),
      bCount(`${C}&${KP_FILTER}`),
      bCount(`${C}&status=eq.pending&priority=eq.A&${KP_FILTER}`),
      bCount(`${C}&created_at=gte.${since7}`),
      bCount(`${C}&created_at=gte.${since7}&${KP_FILTER}`),
      bGet<{ created_at: string | null }>('scan_requests?select=created_at&limit=5000'),
      bGet<PropertyRow>('properties?select=id,name,lat,lon,created_at&limit=5000'),
      bGet<OwnerRow>('owner_decision?select=property_id,data&limit=5000'),
      bGet<OutreachRow>('outreach_messages?select=property_id,status,sent_at&limit=5000'),
      supaGetAll<ProposalRow>('proposals?select=ref_number,status,client_name,created_at,first_viewed_at,signed_at&order=created_at.desc&limit=500'),
      bGet('scan_candidates?select=id,name,estimated_kwp,lat,lon,footprint_class,existing_solar,external_id&status=eq.pending&priority=eq.A&existing_solar=not.is.true&order=estimated_kwp.desc.nullslast&limit=10'),
    ])
    const f = buildFunnel({
      now, scanRequests, properties, owners, outreach, proposals,
      candidateCounts: { pending, added, rejected, pendingA, kpAll, kpPendingA, created7d, kpCreated7d },
    })
    return Response.json({ ok: true, generated_at: now.toISOString(), ...f, attention: { ...f.attention, pending_a: pendingATop } })
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
