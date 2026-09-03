// ── Minimal Resend sender (mirror of proposal-view.ts sendEmail; never throws) ──
export async function sendResendEmail(
  to: string[],
  subject: string,
  html: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'not_configured' }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM || 'Bustan Energy <contracts@bustan-energy.com>', to, subject, html }),
    })
    const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string }
    return r.ok ? { ok: true, id: j.id } : { ok: false, error: j.message || `resend_${r.status}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
