// ============================================================
// /api/proposal-view — Edge runtime, direct fetch (no SDK)
// Logs a view, updates proposal counters/status/first_viewed_at,
// and emits a proposal_events row for analytics.
// NOTE: view_count is incremented by the DB trigger on proposal_views
//       insert (migration 009). We do NOT patch it here to avoid double-count.
// ============================================================
export const config = { runtime: 'edge' }

import { sha256hex } from './_lib/crypto.js'
import { escapeHtml } from './_lib/html.js'
import { fmt } from './_lib/fmt.js'
import { supaGet, supaPost, supaPatch } from './_lib/supa.js'
import type { JsonValue } from './_lib/supa.js'

const RESEND_KEY = process.env.RESEND_API_KEY!
const NOTIFY = ['erez@bustan-energy.com', 'kaniel@bustan-energy.com']
const FROM = process.env.RESEND_FROM || 'Bustan Energy <contracts@bustan.energy>'

interface ProposalViewRow {
  ref_number: string
  client_name?: string | null
  client_phone?: string | null
  location?: string | null
  system_size_kwp?: number | string | null
  total_price_thb?: number | string | null
  password_hash: string
  view_count?: number | null
  first_viewed_at?: string | null
  status?: string | null
}

async function sendEmail(to: string[], subject: string, html: string) {
  if (!RESEND_KEY) return null
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to,
      reply_to: ['erez@bustan-energy.com'],
      subject,
      html,
    }),
  }).then((r) => r.json()).catch((e) => ({ error: String(e) }))
}

function emailBody(p: ProposalViewRow, viewCount: number, isFirst: boolean) {
  const when = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })
  const flag = isFirst ? '🎯 נצפה בפעם הראשונה!' : `👁️ נצפה שוב (פעם ${viewCount})`
  return `
<div style="font-family:system-ui;max-width:600px;direction:rtl;">
  <h2 style="color:#0D2137;">${flag}</h2>
  <p>הצעה <b>${escapeHtml(p.ref_number)}</b> — ${escapeHtml(p.client_name) || '—'}</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
    <tr><td style="padding:6px 0;color:#666;"><b>לקוח</b></td><td>${escapeHtml(p.client_name) || '—'}</td></tr>
    <tr><td style="padding:6px 0;color:#666;"><b>טלפון</b></td><td>${escapeHtml(p.client_phone) || '—'}</td></tr>
    <tr><td style="padding:6px 0;color:#666;"><b>מיקום</b></td><td>${escapeHtml(p.location) || '—'}</td></tr>
    <tr><td style="padding:6px 0;color:#666;"><b>מערכת</b></td><td>${escapeHtml(p.system_size_kwp)} kWp · ฿${fmt(p.total_price_thb)}</td></tr>
    <tr><td style="padding:6px 0;color:#666;"><b>זמן</b></td><td>${when} (Bangkok)</td></tr>
    <tr><td style="padding:6px 0;color:#666;"><b>סה״כ צפיות</b></td><td>${viewCount}</td></tr>
  </table>
  <p style="color:#888;font-size:12px;">Bustan Energy · Proposal Tracker</p>
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

    const proposal = await supaGet<ProposalViewRow>(`proposals?ref_number=eq.${encodeURIComponent(ref)}&select=*`)
    if (!proposal) {
      return Response.json({ ok: false, error: 'not_found' }, { status: 404 })
    }

    const correct = (await sha256hex(String(password).trim())) === proposal.password_hash
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || null
    const ua = req.headers.get('user-agent') || null
    const now = new Date().toISOString()

    // Log view attempt (correct or not).
    // The DB trigger (migration 009) handles view_count increment on correct inserts.
    // We do NOT patch view_count here to avoid double-counting.
    supaPost('proposal_views', {
      proposal_ref: ref,
      ip,
      user_agent: ua,
      password_correct: correct,
    }).catch(() => {})

    if (!correct) {
      supaPost('proposal_events', {
        proposal_ref: ref,
        event_type: 'access_denied',
        event_data: { ip, ua },
      }).catch(() => {})
      return Response.json({ ok: false, error: 'wrong_password' }, { status: 401 })
    }

    // Compute derived values for response / email (read current state)
    const isFirst = !proposal.first_viewed_at
    // The trigger will increment, so expected new count = current + 1
    const viewCount = (proposal.view_count || 0) + 1

    // Only update status/first_viewed_at — NOT view_count (trigger owns it)
    if (isFirst) {
      const updates: Record<string, JsonValue> = { first_viewed_at: now }
      if (proposal.status === 'sent' || proposal.status === 'draft') {
        updates.status = 'viewed'
      }
      supaPatch(
        `proposals?ref_number=eq.${encodeURIComponent(ref)}`,
        updates,
      ).catch(() => {})
    }

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
  } catch (e: unknown) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
