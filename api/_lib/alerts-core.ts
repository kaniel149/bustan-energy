// ── Alerts core (pure): what to say, where to send ──────────────────────────
// Consumed by api/cron-alerts.ts. No I/O here so it is unit-testable.

export interface AlertInput {
  since: string
  approved: { id: string; name: string | null; created_at: string | null }[]
  newA: { id: string; name: string | null; estimated_kwp: number | null; lat: number; lon: number }[]
  newACount: number
  firstViews: { ref_number: string; client_name: string | null; first_viewed_at: string | null }[]
  signatures: { proposal_ref: string; signer_name: string | null; signed_at: string | null }[]
}

export const ALERT_WHATSAPP = '972502213948'
export const ALERT_EMAIL = 'k@kanielt.com'

export function pickChannel(env: Record<string, string | undefined> = process.env): 'whatsapp' | 'email' | 'none' {
  if (env.GREENAPI_INSTANCE_ID && env.GREENAPI_TOKEN) return 'whatsapp'
  return env.RESEND_API_KEY ? 'email' : 'none'
}

export function isFirstRun(state: { last_run_at: string } | null): boolean {
  return !state
}

export function buildAlertText(i: AlertInput): string | null {
  const lines: string[] = []
  if (i.approved.length) {
    lines.push(`✅ Approved to CRM (${i.approved.length}): ${i.approved.slice(0, 5).map((p) => p.name || p.id.slice(0, 8)).join(', ')}`)
  }
  if (i.newACount) {
    const top = i.newA[0]
    lines.push(`⭐ New A-grade candidates: ${i.newACount}${top ? ` (top: ${top.name || top.id.slice(0, 8)} ${Math.round(Number(top.estimated_kwp ?? 0))} kWp)` : ''}`)
    if (top) lines.push(`https://bustan-energy.com/admin/scan?focus=${top.id}`)
  }
  for (const v of i.firstViews) lines.push(`👀 First view: ${v.ref_number} — ${v.client_name ?? '—'}`)
  for (const s of i.signatures) lines.push(`✍️ Signed: ${s.proposal_ref} — ${s.signer_name ?? '—'}`)
  if (!lines.length) return null
  return [`Bustan alerts (since ${i.since.slice(0, 16).replace('T', ' ')} UTC)`, ...lines, 'https://bustan-energy.com/admin'].join('\n')
}
