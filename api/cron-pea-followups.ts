// ============================================================
// /api/cron-pea-followups
/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase REST payloads here are schemaless until generated DB types are wired in. */
// Daily cron at 09:00 UTC — emails erez@bustan-energy.com about
// PEA submissions with no response after 20 days.
// Logs to notification_log table.
// ============================================================
export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_KEY = process.env.RESEND_API_KEY!
const FROM = process.env.RESEND_FROM || 'Bustan Energy <contracts@bustan.energy>'
const CRON_SECRET = process.env.CRON_SECRET
const ALERT_RECIPIENT = 'erez@bustan-energy.com'

async function supaGetAll(path: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  return r.ok ? r.json() : []
}

async function supaPost(table: string, body: any): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ id?: string; error?: string }> {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: [ALERT_RECIPIENT],
      subject,
      html,
    }),
  }).then((r) => r.json()).catch((e) => ({ error: String(e) }))
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000)
}

function buildAlertEmail(staleProjects: any[]): string {
  const rows = staleProjects.map((p) => {
    const days = daysSince(p.pea_application_date)
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${p.client_name || p.id}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${p.pea_reference_number || '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${p.pea_branch || 'Surat Thani'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#f97316;font-weight:700">${days} days</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${p.pea_status}</td>
      </tr>`
  }).join('')

  return `
<div style="font-family:system-ui;max-width:700px;">
  <div style="background:linear-gradient(135deg,#0D2137,#132D4A);padding:24px;border-radius:12px 12px 0 0;color:white;">
    <div style="color:#E8A820;font-weight:800;letter-spacing:2px;font-size:11px;margin-bottom:4px;">BUSTAN ENERGY · PEA TRACKER</div>
    <h1 style="margin:0;font-size:20px;">PEA Follow-up Alert</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">
      ${staleProjects.length} project${staleProjects.length !== 1 ? 's' : ''} pending PEA response for 20+ days
    </p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Client</th>
          <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">PEA Ref No.</th>
          <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Branch</th>
          <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Days Waiting</th>
          <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-top:20px;padding:14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;font-size:13px;">
      <strong>Action required:</strong> Follow up with the relevant PEA/MEA branch office.
      Consider visiting in person if the application has been pending for more than 30 days.
    </div>

    <p style="margin-top:20px;font-size:12px;color:#9ca3af;">
      Sent automatically by Bustan Energy PEA Tracker · bustan-energy.com/admin<br>
      This cron runs daily at 09:00 UTC (16:00 Bangkok time).
    </p>
  </div>
</div>`
}

export default async function handler(req: Request): Promise<Response> {
  if (!CRON_SECRET) {
    console.error('CRON_SECRET env var not set')
    return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  }

  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== CRON_SECRET) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // Query: submitted/under_review, application_date > 20 days ago,
  // no reminder sent in last 7 days.
  const cutoff20 = new Date(Date.now() - 20 * 86_400_000).toISOString()
  const cutoff7 = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const staleProjects = await supaGetAll(
    `projects?pea_status=in.(submitted,under_review)&pea_application_date=lte.${encodeURIComponent(cutoff20)}&select=id,client_name,pea_branch,pea_status,pea_reference_number,pea_application_date`,
  )

  if (!staleProjects.length) {
    return Response.json({ ok: true, processed: 0, message: 'no stale PEA submissions' })
  }

  // Filter out projects that already received a reminder in the last 7 days
  const recentlyReminded = await supaGetAll(
    `notification_log?event_type=eq.pea_followup&created_at=gte.${encodeURIComponent(cutoff7)}&select=ref_id`,
  )
  const remindedIds = new Set(recentlyReminded.map((r: any) => r.ref_id))
  const toAlert = staleProjects.filter((p: any) => !remindedIds.has(p.id))

  if (!toAlert.length) {
    return Response.json({ ok: true, processed: 0, message: 'all stale projects already reminded within 7 days' })
  }

  const html = buildAlertEmail(toAlert)
  const subject = `PEA Follow-up: ${toAlert.length} project${toAlert.length !== 1 ? 's' : ''} pending 20+ days`

  const emailResult = await sendEmail(ALERT_RECIPIENT, subject, html)

  // Log to notification_log (one entry per project)
  for (const p of toAlert) {
    await supaPost('notification_log', {
      event_type: 'pea_followup',
      ref_id: p.id,
      recipient: ALERT_RECIPIENT,
      subject,
      status: emailResult?.id ? 'sent' : 'failed',
      provider_id: emailResult?.id || null,
      error: emailResult?.error || null,
      metadata: {
        days_waiting: daysSince(p.pea_application_date),
        pea_branch: p.pea_branch,
        pea_status: p.pea_status,
      },
    })
  }

  return Response.json({
    ok: true,
    processed: toAlert.length,
    email_sent: !!emailResult?.id,
    resend_id: emailResult?.id || null,
    projects: toAlert.map((p: any) => ({
      id: p.id,
      client_name: p.client_name,
      days_waiting: daysSince(p.pea_application_date),
    })),
  })
}
