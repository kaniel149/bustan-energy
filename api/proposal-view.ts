// ============================================================
// /api/proposal-view — Edge runtime, direct fetch (no SDK)
// Logs a view, updates proposal counters/status/first_viewed_at,
// and emits a proposal_events row for analytics.
// ============================================================
export const config = { runtime: 'edge' }

async function sha256(s: string): Promise<string> {
  const data = new TextEncoder().encode(s)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0')).join('')
}

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_KEY = process.env.RESEND_API_KEY!
const NOTIFY = ['erez@energy-tm.com', 'kaniel@energy-tm.com']
// Prefer verified domain sender — fall back to Resend sandbox if not configured.
const FROM = process.env.RESEND_FROM || 'TM Energy <contracts@energy-tm.com>'

async function supaGet(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!r.ok) return null
  const arr = await r.json()
  return Array.isArray(arr) && arr.length ? arr[0] : null
}

async function supaPost(table: string, body: any) {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  }).then((r) => r.json())
}

async function supaPatch(path: string, body: any) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
}

async function sendEmail(to: string[], subject: string, html: string) {
  if (!RESEND_KEY) return null
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  }).then((r) => r.json()).catch((e) => ({ error: String(e) }))
}

function emailBody(p: any, viewCount: number, isFirst: boolean) {
  const when = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })
  const flag = isFirst ? '🎯 נצפה בפעם הראשונה!' : `👁️ נצפה שוב (פעם ${viewCount})`
  return `
<div style="font-family:system-ui;max-width:600px;direction:rtl;">
  <h2 style="color:#0D2137;">${flag}</h2>
  <p>הצעה <b>${p.ref_number}</b> — ${p.client_name || '—'}</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
    <tr><td style="padding:6px 0;color:#666;"><b>לקוח</b></td><td>${p.client_name || '—'}</td></tr>
    <tr><td style="padding:6px 0;color:#666;"><b>טלפון</b></td><td>${p.client_phone || '—'}</td></tr>
    <tr><td style="padding:6px 0;color:#666;"><b>מיקום</b></td><td>${p.location || '—'}</td></tr>
    <tr><td style="padding:6px 0;color:#666;"><b>מערכת</b></td><td>${p.system_size_kwp} kWp · ฿${Number(p.total_price_thb).toLocaleString()}</td></tr>
    <tr><td style="padding:6px 0;color:#666;"><b>זמן</b></td><td>${when} (Bangkok)</td></tr>
    <tr><td style="padding:6px 0;color:#666;"><b>סה״כ צפיות</b></td><td>${viewCount}</td></tr>
  </table>
  <p style="color:#888;font-size:12px;">TM Energy · Proposal Tracker</p>
</div>`
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { ref, password } = await req.json()
    if (!ref || !password) {
      return Response.json({ ok: false, error: 'missing' }, { status: 400 })
    }

    const proposal = await supaGet(`proposals?ref_number=eq.${encodeURIComponent(ref)}&select=*`)
    if (!proposal) {
      return Response.json({ ok: false, error: 'not_found' }, { status: 404 })
    }

    const correct = (await sha256(String(password).trim())) === proposal.password_hash
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || null
    const ua = req.headers.get('user-agent') || null
    const now = new Date().toISOString()

    // Log view attempt (correct or not) — fire-and-forget
    supaPost('proposal_views', {
      proposal_ref: ref,
      ip,
      user_agent: ua,
      password_correct: correct,
    }).catch(() => {})

    if (!correct) {
      // Record failed access attempt for analytics
      supaPost('proposal_events', {
        proposal_ref: ref,
        event_type: 'access_denied',
        event_data: { ip, ua },
      }).catch(() => {})
      return Response.json({ ok: false, error: 'wrong_password' }, { status: 401 })
    }

    // ── PERSIST view state (this was the bug — never written before) ──
    const isFirst = !proposal.first_viewed_at
    const viewCount = (proposal.view_count || 0) + 1

    const updates: Record<string, any> = {
      view_count: viewCount,
    }
    if (isFirst) {
      updates.first_viewed_at = now
      // Only flip to 'viewed' if still in 'sent' state (don't overwrite 'signed')
      if (proposal.status === 'sent' || proposal.status === 'draft') {
        updates.status = 'viewed'
      }
    }

    // Fire-and-forget so we don't block the client response
    supaPatch(
      `proposals?ref_number=eq.${encodeURIComponent(ref)}`,
      updates
    ).catch(() => {})

    // Emit analytics event
    supaPost('proposal_events', {
      proposal_ref: ref,
      event_type: isFirst ? 'viewed_first' : 'viewed_return',
      event_data: { ip, ua, view_count: viewCount },
    }).catch(() => {})

    // Send notification email (fire-and-forget)
    const subject = isFirst
      ? `🎯 ${proposal.client_name || proposal.ref_number} פתח את ההצעה!`
      : `👁️ ${proposal.client_name || proposal.ref_number} צופה שוב (${ref})`
    sendEmail(NOTIFY, subject, emailBody(proposal, viewCount, isFirst)).catch(() => {})

    return Response.json({ ok: true, first_view: isFirst, view_count: viewCount })
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
