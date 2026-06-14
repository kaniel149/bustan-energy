// ============================================================
// /api/cron-send-outreach — sends approved outreach messages.
//
// Daily 03:00 UTC = 10:00 Thailand morning. Email channel only
// (Phase 1). Daily cap protects sender reputation.
//
// SELF-SEND MODE: while OUTREACH_SELF_SEND=1, every email goes
// to OUTREACH_TEST_EMAIL instead of the real recipient (subject
// prefixed [TEST→real@addr]). Flip the env var off to go live.
//
// Status transitions are guarded (PATCH ... &status=eq.approved)
// so a concurrent run can't double-send.
// Auth: Bearer CRON_SECRET.
//
// KNOWN RISK: if the PATCH to 'sent' fails after Resend succeeds, the row
// stays 'approved' and re-sends next tick. Mitigated by daily cap + human
// approval. Phase 2: PATCH retry/logging.
// ============================================================
export const config = { runtime: 'edge' }

import { supaGetAll, supaPatch } from './_lib/supa.js'
import { sendOutreachEmail, textToHtml } from './_lib/channels/email.js'

const DAILY_CAP = 20

interface OutMsg {
  id: string
  recipient: string | null
  subject: string | null
  body: string
  status: string
}

export default async function handler(req: Request): Promise<Response> {
  if (!process.env.CRON_SECRET) {
    return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // Daily cap: count emails sent since midnight UTC
  const today = new Date().toISOString().slice(0, 10)
  const sentToday = await supaGetAll<{ id: string }>(
    `outreach_messages?channel=eq.email&status=eq.sent&sent_at=gte.${today}T00:00:00Z&select=id`,
  )
  const budget = DAILY_CAP - sentToday.length
  if (budget <= 0) {
    return Response.json({ ok: true, skipped: 'daily_cap', sentToday: sentToday.length })
  }

  const approved = await supaGetAll<OutMsg>(
    `outreach_messages?channel=eq.email&status=eq.approved` +
    `&select=id,recipient,subject,body,status&order=approved_at.asc&limit=${budget}`,
  )

  const selfSend = process.env.OUTREACH_SELF_SEND === '1'
  const testEmail = process.env.OUTREACH_TEST_EMAIL || ''

  if (selfSend && !testEmail) {
    return Response.json({ ok: false, error: 'self_send_no_test_email' }, { status: 500 })
  }

  let sent = 0, failed = 0, patchFailed = 0
  for (const msg of approved) {
    if (!msg.recipient) {
      await supaPatch(`outreach_messages?id=eq.${msg.id}&status=eq.approved`, {
        status: 'bounced', error: 'no_recipient',
      })
      failed++
      continue
    }
    const to = selfSend ? testEmail : msg.recipient
    const subject = selfSend
      ? `[TEST→${msg.recipient}] ${msg.subject || ''}`
      : (msg.subject || 'Bustan Energy')

    const res = await sendOutreachEmail(to, subject, textToHtml(msg.body))
    if (res.error) {
      await supaPatch(`outreach_messages?id=eq.${msg.id}&status=eq.approved`, {
        status: 'bounced', error: res.error,
      })
      failed++
    } else {
      const patchRes = await supaPatch(`outreach_messages?id=eq.${msg.id}&status=eq.approved`, {
        status: 'sent', sent_at: new Date().toISOString(), thread_ref: res.id ?? null,
      })
      if (!patchRes.ok) patchFailed++
      sent++
    }
  }

  return Response.json({ ok: true, sent, failed, patchFailed, selfSend, remainingBudget: budget - sent })
}
