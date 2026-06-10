// ============================================================
// /api/cron-email-queue
// Processes pending email_queue rows (drip sequences) and
// sends them via Resend. Triggered by Vercel cron hourly.
// Enrollment happens in api/_lib/drip.ts (see contact-lead).
// ============================================================
export const config = { runtime: 'edge' }

import { supaGetAll, supaPatch } from './_lib/supa.js'
import { getDripTemplate } from './_lib/drip-templates.js'

const RESEND_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'Bustan Energy <proposals@energy-tm.com>'
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'erez@energy-tm.com'

// CRON_SECRET must be set — no fallback to prevent unauthenticated execution
const CRON_SECRET = process.env.CRON_SECRET

interface QueueStepRow {
  template_key: string
  subject: string | null
}

interface QueueRow {
  id: string
  recipient: string | null
  recipient_name: string | null
  metadata?: Record<string, unknown>
  step: QueueStepRow | null
}

interface ResendResponse {
  id?: string
  error?: unknown
}

type QueueResult = Record<string, string | number | null | undefined>

async function sendEmail(to: string, subject: string, html: string): Promise<ResendResponse> {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: [REPLY_TO],
      subject,
      html,
    }),
  }).then((r) => r.json()).catch((e) => ({ error: String(e) }))
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

  if (!RESEND_KEY) {
    console.error('RESEND_API_KEY env var not set')
    return Response.json({ ok: false, error: 'resend_not_configured' }, { status: 500 })
  }

  const now = new Date().toISOString()
  const pendings = await supaGetAll<QueueRow>(
    `email_queue?status=eq.pending&send_at=lte.${encodeURIComponent(now)}` +
      `&select=id,recipient,recipient_name,metadata,step:email_sequence_steps!step_id(template_key,subject)` +
      `&order=send_at.asc&limit=50`,
  )

  if (!pendings.length) {
    return Response.json({ ok: true, processed: 0, message: 'no pending emails' })
  }

  const results: QueueResult[] = []
  for (const item of pendings) {
    // Skip rows with missing recipient or step definition
    if (!item.recipient || !item.step) {
      await supaPatch(`email_queue?id=eq.${item.id}`, {
        status: 'cancelled',
        metadata: { ...item.metadata, reason: !item.recipient ? 'no_recipient' : 'no_step' },
      })
      results.push({ id: item.id, result: 'cancelled' })
      continue
    }

    // Render template (DB subject wins so copy can be edited without a deploy)
    const template = getDripTemplate(item.step.template_key, { name: item.recipient_name })
    if (!template) {
      await supaPatch(`email_queue?id=eq.${item.id}`, {
        status: 'failed',
        metadata: { ...item.metadata, reason: `unknown_template:${item.step.template_key}` },
      })
      results.push({ id: item.id, result: 'failed_unknown_template' })
      continue
    }
    const subject = item.step.subject || template.subject

    // Send via Resend
    const emailRes = await sendEmail(item.recipient, subject, template.html)
    await supaPatch(`email_queue?id=eq.${item.id}`, {
      status: emailRes?.id ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
      metadata: { ...item.metadata, resend_id: emailRes?.id, error: emailRes?.error },
    })

    results.push({
      id: item.id,
      template: item.step.template_key,
      recipient: item.recipient,
      result: emailRes?.id ? 'sent' : 'failed',
    })
  }

  const sent = results.filter((r) => r.result === 'sent').length
  return Response.json({ ok: true, processed: results.length, sent, results })
}
