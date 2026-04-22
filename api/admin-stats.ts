// ============================================================
// /api/admin-stats
// Returns aggregated stats for admin dashboard
// ============================================================
export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_DOMAIN = '@energy-tm.com'
const EXTRA = ['k@kanielt.com']
const allowed = (e: string) => e.endsWith(ADMIN_DOMAIN) || EXTRA.includes(e)

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${auth.slice(7)}` },
  })
  if (!r.ok) return null
  const user = await r.json()
  const email = user?.email?.toLowerCase()
  return email && allowed(email.toLowerCase()) ? email : null
}

async function q<T = any>(path: string): Promise<T[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  return r.ok ? r.json() : []
}

export default async function handler(req: Request): Promise<Response> {
  const admin = await verifyAdmin(req)
  if (!admin) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  try {
    // Parallel queries
    const [proposals, events, signatures, pendingFollowups] = await Promise.all([
      q('proposals?select=ref_number,status,total_price_thb,view_count,created_at,first_viewed_at,sent_at,signed_at&order=created_at.desc&limit=500'),
      q('proposal_events?select=event_type,occurred_at&order=occurred_at.desc&limit=1000'),
      q('proposal_signatures?select=id,proposal_ref,signed_at'),
      q('proposal_followups?status=eq.pending&select=followup_type,scheduled_for&order=scheduled_for'),
    ])

    // Aggregate metrics
    const total = proposals.length
    const sent = proposals.filter((p: any) => p.status === 'sent').length
    const viewed = proposals.filter((p: any) => p.status === 'viewed').length
    const signed = proposals.filter((p: any) => p.status === 'signed').length
    const rejected = proposals.filter((p: any) => p.status === 'rejected').length

    const signedValue = proposals
      .filter((p: any) => p.status === 'signed')
      .reduce((s: number, p: any) => s + Number(p.total_price_thb || 0), 0)

    const totalValue = proposals.reduce(
      (s: number, p: any) => s + Number(p.total_price_thb || 0),
      0
    )

    // Conversion rates
    const conversionSent = total > 0 ? (sent / total) * 100 : 0
    const conversionViewed = sent > 0 ? (viewed / (sent + viewed + signed)) * 100 : 0
    const conversionSigned = (viewed + signed) > 0 ? (signed / (viewed + signed)) * 100 : 0

    // Time metrics
    const viewedProposals = proposals.filter((p: any) => p.first_viewed_at && p.sent_at)
    const avgHoursToView =
      viewedProposals.length > 0
        ? viewedProposals.reduce((s: number, p: any) => {
            const diff = new Date(p.first_viewed_at).getTime() - new Date(p.sent_at).getTime()
            return s + diff / (1000 * 60 * 60)
          }, 0) / viewedProposals.length
        : 0

    const signedProposals = proposals.filter((p: any) => p.signed_at && p.first_viewed_at)
    const avgHoursViewToSign =
      signedProposals.length > 0
        ? signedProposals.reduce((s: number, p: any) => {
            const diff = new Date(p.signed_at).getTime() - new Date(p.first_viewed_at).getTime()
            return s + diff / (1000 * 60 * 60)
          }, 0) / signedProposals.length
        : 0

    // Daily trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentProposals = proposals.filter(
      (p: any) => new Date(p.created_at) >= thirtyDaysAgo
    )
    const dailyMap: Record<string, any> = {}
    for (const p of recentProposals) {
      const day = p.created_at.slice(0, 10)
      if (!dailyMap[day]) dailyMap[day] = { day, created: 0, viewed: 0, signed: 0 }
      dailyMap[day].created++
      if (p.first_viewed_at) dailyMap[day].viewed++
      if (p.signed_at) dailyMap[day].signed++
    }
    const daily = Object.values(dailyMap).sort((a: any, b: any) => a.day.localeCompare(b.day))

    return Response.json({
      ok: true,
      counts: { total, sent, viewed, signed, rejected },
      value: {
        signed_thb: signedValue,
        pipeline_thb: totalValue,
        avg_ticket_thb: total > 0 ? totalValue / total : 0,
      },
      conversion: {
        sent_pct: Math.round(conversionSent),
        viewed_pct: Math.round(conversionViewed),
        signed_pct: Math.round(conversionSigned),
      },
      timing: {
        avg_hours_to_view: Math.round(avgHoursToView * 10) / 10,
        avg_hours_view_to_sign: Math.round(avgHoursViewToSign * 10) / 10,
      },
      daily,
      signatures_count: signatures.length,
      pending_followups: pendingFollowups.length,
      pending_followups_breakdown: pendingFollowups.reduce((acc: any, fu: any) => {
        acc[fu.followup_type] = (acc[fu.followup_type] || 0) + 1
        return acc
      }, {}),
    })
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
