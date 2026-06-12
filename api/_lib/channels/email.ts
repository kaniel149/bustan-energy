// ============================================================
// api/_lib/channels/email.ts
// Outreach email sender (direct Resend). Kept separate from the
// drip pipeline (email_queue) which is template-key based.
// ============================================================

export interface SendResult { id?: string; error?: string }

const FROM = process.env.OUTREACH_FROM_EMAIL || 'Bustan Energy <hello@bustan-energy.com>'

/** Never throws — failures return { error }. Subject/recipient assumed validated upstream; html should be pre-escaped (use textToHtml). */
export async function sendOutreachEmail(
  to: string,
  subject: string,
  html: string,
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { error: 'resend_not_configured' }
  try {
    const replyTo = process.env.OUTREACH_REPLY_TO
    const body: Record<string, unknown> = { from: FROM, to: [to], subject, html }
    if (replyTo) body.reply_to = [replyTo]
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!r.ok) return { error: j?.message || `resend_${r.status}` }
    return { id: j.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: /abort|signal|timeout/i.test(msg) ? 'network_timeout' : 'network_error' }
  }
}

/** Plain text → minimal HTML (preserve line breaks). */
export function textToHtml(text: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<div style="font-family:sans-serif;font-size:15px;line-height:1.7;white-space:pre-wrap">${esc}</div>`
}
