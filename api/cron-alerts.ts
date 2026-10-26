// ============================================================
// /api/cron-alerts — every 30 min (vercel.json).
// Tells Kaniel what happened since the last tick: candidates approved to CRM,
// new pending A-grade candidates, first proposal views, signatures.
// Channel: WhatsApp (GreenAPI) when configured, else Resend email.
// Read-only on business tables; the only write is the watermark row in
// bustan.alert_state (migration 017). Never throws out of the handler.
// Auth: Bearer CRON_SECRET (same as cron-monitoring-check.ts). Edge runtime.
// ============================================================
export const config = { runtime: 'edge' }

import { bGet, bGetOrThrow, bPost, bPatch } from './_lib/bustan-db.js'
import { supaGetAll } from './_lib/supa.js'
import { sendWhatsApp } from './_lib/whatsapp.js'
import { sendResendEmail } from './_lib/resend.js'
import { buildAlertText, pickChannel, isFirstRun, alertQueryPaths, ALERT_WHATSAPP, ALERT_EMAIL } from './_lib/alerts-core.js'
import { escapeHtml } from './_lib/html.js'

const CRON_SECRET = process.env.CRON_SECRET
const KEY = 'cron-alerts'

interface AlertState { key: string; last_run_at: string }
type SendResult = { channel: string; ok: boolean; error?: string }

async function emailFallback(text: string, channel: string): Promise<SendResult> {
  const e = await sendResendEmail([ALERT_EMAIL], 'Bustan alerts', `<pre>${escapeHtml(text)}</pre>`)
  return { channel, ok: e.ok, error: e.error }
}

export default async function handler(req: Request): Promise<Response> {
  if (!CRON_SECRET) return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  if (req.headers.get('authorization')?.replace('Bearer ', '') !== CRON_SECRET) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date().toISOString()
    // Strict read: a gateway timeout here must NOT look like "no watermark yet",
    // otherwise we insert a duplicate alert_state row (pkey violation) every tick.
    const [state] = await bGetOrThrow<AlertState>(`alert_state?key=eq.${KEY}&select=key,last_run_at`)
    if (isFirstRun(state ?? null) || !state) {
      await bPost('alert_state', { key: KEY, last_run_at: now })
      return Response.json({ ok: true, first_run: true, sent: false })
    }

    const since = state.last_run_at
    const paths = alertQueryPaths(since)
    const [approved, newA, firstViews, signatures] = await Promise.all([
      bGet<{ id: string; name: string | null; created_at: string | null }>(paths.approved),
      bGet<{ id: string; name: string | null; estimated_kwp: number | null; lat: number; lon: number }>(paths.newA),
      supaGetAll<{ ref_number: string; client_name: string | null; first_viewed_at: string | null }>(paths.firstViews),
      supaGetAll<{ proposal_ref: string; signer_name: string | null; signed_at: string | null }>(paths.signatures),
    ])

    const text = buildAlertText({ since, approved, newA: newA.slice(0, 3), newACount: newA.length, firstViews, signatures })
    let sent: SendResult = { channel: 'none', ok: false }
    if (text) {
      const ch = pickChannel()
      if (ch === 'whatsapp') {
        const r = await sendWhatsApp(ALERT_WHATSAPP, text)
        sent = { channel: 'whatsapp', ok: r.ok, error: r.error }
        if (!r.ok) sent = await emailFallback(text, 'email(fallback)')
      } else if (ch === 'email') {
        sent = await emailFallback(text, 'email')
      }
    }

    // Advance the watermark only when there was nothing to say or the send
    // succeeded — a failed send retries next tick with the same window.
    if (!text || sent.ok) {
      await bPatch(`alert_state?key=eq.${KEY}`, { last_run_at: now, updated_at: now, data: { last_text: text, last_sent: sent } })
    }

    return Response.json({
      ok: true, since,
      counts: { approved: approved.length, newA: newA.length, firstViews: firstViews.length, signatures: signatures.length },
      sent, text,
    })
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
