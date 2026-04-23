// ============================================================
// /api/cron-followups
// Processes pending follow-ups and sends emails
// Triggered by Vercel cron daily at 10:00 UTC (17:00 Bangkok)
// ============================================================
export const config = { runtime: 'edge' }

import { escapeHtml } from './_lib/html'
import { fmt } from './_lib/fmt'
import { supaGetAll, supaPatch } from './_lib/supa'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_KEY = process.env.RESEND_API_KEY!
const FROM = process.env.RESEND_FROM || 'TM Energy <contracts@energy-tm.com>'

// CRON_SECRET must be set — no fallback to prevent unauthenticated execution
const CRON_SECRET = process.env.CRON_SECRET

async function sendEmail(to: string, subject: string, html: string) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: ['erez@energy-tm.com'],
      subject,
      html,
    }),
  }).then((r) => r.json()).catch((e) => ({ error: String(e) }))
}

function buildFollowupEmail(type: string, proposal: any): { subject: string; html: string } {
  const url = `https://energy-tm.com/p/${encodeURIComponent(proposal.ref_number)}`
  const firstName = escapeHtml((proposal.client_name || 'valued customer').split(' ')[0])
  const systemLine = `${escapeHtml(proposal.system_size_kwp)} kWp · <b>Total:</b> ฿${fmt(proposal.total_price_thb)}`
  const refEsc = escapeHtml(proposal.ref_number)

  if (type === 'not_viewed_3d' || type === 'not_viewed_7d') {
    return {
      subject: `☀️ ${firstName}, did you see your solar proposal?`,
      html: `
<div style="font-family:system-ui;max-width:600px;">
  <div style="background:linear-gradient(135deg,#0D2137,#132D4A);padding:28px;border-radius:16px 16px 0 0;color:white;">
    <div style="color:#E8A820;font-weight:800;letter-spacing:2px;font-size:12px;margin-bottom:6px;">TM ENERGY</div>
    <h1 style="margin:0;font-size:22px;">Your solar proposal is ready</h1>
  </div>
  <div style="background:white;padding:28px;border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;">
    <p>Hi ${firstName},</p>
    <p>Just a friendly reminder that your personalized solar proposal is waiting for you.</p>
    <p><b>System:</b> ${systemLine}</p>
    <p style="margin:24px 0;">
      <a href="${url}" style="background:#E8A820;color:#0D2137;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:800;">View Proposal →</a>
    </p>
    <p style="color:#666;font-size:13px;">Questions? WhatsApp us at +66 94 669 2011 or reply to this email.</p>
  </div>
</div>`,
    }
  }

  if (type === 'expiring_soon') {
    return {
      subject: `⏰ ${firstName}, your proposal expires in 3 days`,
      html: `
<div style="font-family:system-ui;max-width:600px;">
  <div style="background:linear-gradient(135deg,#D97706,#E8A820);padding:28px;border-radius:16px 16px 0 0;color:white;">
    <h1 style="margin:0;font-size:22px;">⏰ Proposal expires soon</h1>
  </div>
  <div style="background:white;padding:28px;border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;">
    <p>Hi ${firstName},</p>
    <p>Your solar proposal <b>${refEsc}</b> expires in 3 days. Component prices may change after expiration.</p>
    <p>Lock in today's price — sign digitally in 2 minutes:</p>
    <p style="margin:24px 0;">
      <a href="${url}" style="background:#E8A820;color:#0D2137;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:800;">Review &amp; Sign →</a>
    </p>
  </div>
</div>`,
    }
  }

  return { subject: 'Follow-up from TM Energy', html: `<p>View your proposal: <a href="${url}">${refEsc}</a></p>` }
}

export default async function handler(req: Request): Promise<Response> {
  // Require CRON_SECRET env var — fail hard if not configured
  if (!CRON_SECRET) {
    console.error('CRON_SECRET env var not set')
    return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  }

  // Auth via cron secret
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== CRON_SECRET) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()
  const pendings = await supaGetAll(
    `proposal_followups?status=eq.pending&scheduled_for=lte.${encodeURIComponent(now)}&select=*&limit=50`,
  )

  if (!pendings.length) {
    return Response.json({ ok: true, processed: 0, message: 'no pending follow-ups' })
  }

  const results: any[] = []
  for (const fu of pendings) {
    // Skip if no recipient
    if (!fu.recipient) {
      await supaPatch(`proposal_followups?id=eq.${fu.id}`, {
        status: 'cancelled',
        metadata: { ...fu.metadata, reason: 'no_recipient' },
      })
      results.push({ id: fu.id, result: 'skipped_no_recipient' })
      continue
    }

    // Fetch proposal
    const proposalRows = await supaGetAll(
      `proposals?ref_number=eq.${encodeURIComponent(fu.proposal_ref)}&select=*`,
    )
    const proposal = proposalRows[0]
    if (!proposal) {
      await supaPatch(`proposal_followups?id=eq.${fu.id}`, { status: 'cancelled' })
      results.push({ id: fu.id, result: 'proposal_not_found' })
      continue
    }

    // Check if still applicable (not signed / rejected)
    if (proposal.status === 'signed' || proposal.status === 'rejected') {
      await supaPatch(`proposal_followups?id=eq.${fu.id}`, {
        status: 'cancelled',
        metadata: { ...fu.metadata, reason: `proposal_${proposal.status}` },
      })
      results.push({ id: fu.id, result: `cancelled_${proposal.status}` })
      continue
    }

    // Type-specific checks
    if (fu.followup_type.startsWith('not_viewed') && proposal.view_count > 0) {
      await supaPatch(`proposal_followups?id=eq.${fu.id}`, {
        status: 'cancelled',
        metadata: { ...fu.metadata, reason: 'already_viewed' },
      })
      results.push({ id: fu.id, result: 'cancelled_already_viewed' })
      continue
    }

    // Send email
    const { subject, html } = buildFollowupEmail(fu.followup_type, proposal)
    const emailRes = await sendEmail(fu.recipient, subject, html)

    await supaPatch(`proposal_followups?id=eq.${fu.id}`, {
      status: emailRes?.id ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
      metadata: { ...fu.metadata, resend_id: emailRes?.id, error: emailRes?.error },
    })

    results.push({
      id: fu.id,
      type: fu.followup_type,
      recipient: fu.recipient,
      result: emailRes?.id ? 'sent' : 'failed',
    })
  }

  return Response.json({ ok: true, processed: results.length, results })
}
