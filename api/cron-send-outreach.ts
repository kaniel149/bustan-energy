// ============================================================
// /api/cron-send-outreach — sends approved outreach messages.
//
// Daily 03:00 UTC = 10:00 Thailand morning. Email channel only
// (Phase 1). Daily cap protects sender reputation.
//
// SELF-SEND MODE (fail-closed): every email goes to OUTREACH_TEST_EMAIL
// unless OUTREACH_SELF_SEND is explicitly '0'. Subject is prefixed
// [TEST→real@addr]. Set OUTREACH_SELF_SEND=0 to actually go live.
//
// Each row is claimed with a conditional PATCH (...&status=eq.approved) that
// returns the updated rows, so a concurrent run claiming 0 rows knows to skip.
// The claim happens BEFORE Resend is called.
// Auth: Bearer CRON_SECRET.
//
// KNOWN RISK (deliberate): if the process dies between the claim and Resend,
// the row reads 'sent' but was never delivered. Chosen over the reverse risk
// of emailing a real prospect twice.
// ============================================================
export const config = { runtime: 'edge' }

import { bGet, bPatch, bPatchReturning } from './_lib/bustan-db.js'
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
  const sentToday = await bGet<{ id: string }>(
    `outreach_messages?channel=eq.email&status=eq.sent&sent_at=gte.${today}T00:00:00Z&select=id`,
  )
  const budget = DAILY_CAP - sentToday.length
  if (budget <= 0) {
    return Response.json({ ok: true, skipped: 'daily_cap', sentToday: sentToday.length })
  }

  const approved = await bGet<OutMsg>(
    `outreach_messages?channel=eq.email&status=eq.approved` +
    `&select=id,recipient,subject,body,status&order=approved_at.asc&limit=${budget}`,
  )

  // FAIL-CLOSED: safe mode is the default. Real prospects are only emailed when
  // OUTREACH_SELF_SEND is explicitly set to '0'. A missing, misspelled or
  // accidentally-deleted env var therefore routes mail to OUTREACH_TEST_EMAIL
  // instead of to strangers. Going live is a deliberate act, not an omission.
  const selfSend = process.env.OUTREACH_SELF_SEND !== '0'
  const testEmail = process.env.OUTREACH_TEST_EMAIL || ''

  if (selfSend && !testEmail) {
    return Response.json({ ok: false, error: 'self_send_no_test_email' }, { status: 500 })
  }

  let sent = 0, failed = 0, patchFailed = 0, skipped = 0
  for (const msg of approved) {
    if (!msg.recipient) {
      await bPatch(`outreach_messages?id=eq.${msg.id}&status=eq.approved`, {
        status: 'bounced', error: 'no_recipient',
      })
      failed++
      continue
    }
    const to = selfSend ? testEmail : msg.recipient
    const subject = selfSend
      ? `[TEST→${msg.recipient}] ${msg.subject || ''}`
      : (msg.subject || 'Bustan Energy')

    // Claim the row BEFORE calling Resend. Two overlapping cron runs select the
    // same 'approved' rows, so whoever flips the status first owns the send; the
    // loser sees 0 claimed rows and skips. We claim straight to 'sent' rather
    // than to an intermediate 'sending' because the status CHECK constraint
    // (012_outreach.sql:29) has no 'sending' value — adding one would need a
    // migration, and a failed PATCH here would stall the whole queue silently.
    // Failing toward "marked sent but not delivered" is the right direction:
    // a lost message is recoverable, a stranger emailed twice is not.
    const claimed = await bPatchReturning<{ id: string }>(
      `outreach_messages?id=eq.${msg.id}&status=eq.approved`,
      { status: 'sent', sent_at: new Date().toISOString() },
    )
    if (claimed === null) { patchFailed++; continue }
    if (claimed.length === 0) { skipped++; continue }  // another run got it

    const res = await sendOutreachEmail(to, subject, textToHtml(msg.body))
    if (res.error) {
      await bPatch(`outreach_messages?id=eq.${msg.id}`, {
        status: 'bounced', error: res.error, sent_at: null,
      })
      failed++
    } else {
      await bPatch(`outreach_messages?id=eq.${msg.id}`, { thread_ref: res.id ?? null })
      sent++
    }
  }

  return Response.json({ ok: true, sent, failed, patchFailed, skipped, selfSend, remainingBudget: budget - sent })
}
