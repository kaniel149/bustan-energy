// ============================================================
// /api/proposal-sign — digital signature endpoint (Edge)
// ============================================================
export const config = { runtime: 'edge' }

import { sha256hex } from './_lib/crypto.js'
import { escapeHtml } from './_lib/html.js'
import { fmt } from './_lib/fmt.js'
import { getProposalSessionCookie, verifyProposalSession } from './_lib/proposal-session.js'
import { supaGet, supaPost, supaPatch } from './_lib/supa.js'

const RESEND_KEY = process.env.RESEND_API_KEY!
const NOTIFY = ['erez@energy-tm.com', 'kaniel@energy-tm.com']
const FROM = process.env.RESEND_FROM || 'Bustan Energy Contracts <contracts@energy-tm.com>'

interface ProposalSignRow {
  ref_number: string
  client_name?: string | null
  system_size_kwp?: number | string | null
  total_price_thb?: number | string | null
  status?: string | null
  expires_at?: string | null
}

interface SignatureRow {
  id: string
  signed_at: string
  signer_name: string
  signer_id?: string | null
  signer_phone?: string | null
  signer_email?: string | null
  ip?: string | null
  hash_sha256: string
  signature_base64: string
}

interface SignRequestBody {
  ref?: string
  signer_name?: string
  signer_id?: string
  signer_email?: string
  signer_phone?: string
  signature_base64?: string
  terms_version?: string
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
      reply_to: ['erez@energy-tm.com'],
      subject,
      html,
    }),
  }).then((r) => r.json()).catch((e) => ({ error: String(e) }))
}

function teamEmail(p: ProposalSignRow, s: SignatureRow) {
  const when = new Date(s.signed_at).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })
  return `
<div style="font-family:system-ui;max-width:620px;direction:rtl;">
  <div style="background:linear-gradient(135deg,#1A7A5A,#11604B);padding:28px;border-radius:16px 16px 0 0;color:white;">
    <h1 style="margin:0;font-size:22px;">🎉 דיל נסגר!</h1>
    <p style="margin:6px 0 0 0;opacity:.85;">הצעה ${escapeHtml(p.ref_number)} · ${escapeHtml(p.client_name)}</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#666;"><b>חתם</b></td><td>${escapeHtml(s.signer_name)}</td></tr>
      <tr><td style="padding:8px 0;color:#666;"><b>ת.ז./דרכון</b></td><td>${escapeHtml(s.signer_id) || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#666;"><b>טלפון</b></td><td>${escapeHtml(s.signer_phone) || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#666;"><b>אימייל</b></td><td>${escapeHtml(s.signer_email) || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#666;"><b>מערכת</b></td><td>${escapeHtml(p.system_size_kwp)} kWp · ฿${fmt(p.total_price_thb)}</td></tr>
      <tr><td style="padding:8px 0;color:#666;"><b>זמן</b></td><td>${when}</td></tr>
      <tr><td style="padding:8px 0;color:#666;"><b>IP</b></td><td>${escapeHtml(s.ip) || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#666;"><b>Hash</b></td><td style="font-family:monospace;font-size:11px;">${escapeHtml(s.hash_sha256)}</td></tr>
    </table>
    <div style="margin-top:16px;padding:14px;background:#f7f8fa;border-radius:12px;">
      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">חתימה</div>
      <img src="${escapeHtml(s.signature_base64)}" style="max-width:300px;max-height:120px;background:white;padding:8px;border-radius:8px;border:1px solid #ddd;">
    </div>
    <p style="margin-top:16px;font-size:13px;color:#888;">🎯 שלב הבא: לקבוע התקנה + לשלוח חשבון 50%.</p>
  </div>
</div>`
}

function clientEmail(p: ProposalSignRow, s: SignatureRow) {
  return `
<div style="font-family:system-ui;max-width:620px;">
  <div style="background:linear-gradient(135deg,#0D2137,#132D4A);padding:32px;border-radius:16px 16px 0 0;color:white;text-align:center;">
    <h1 style="margin:0;font-size:26px;color:#E8A820;">&#x2713; Agreement Signed</h1>
    <p style="margin:8px 0 0 0;opacity:.8;">Bustan Energy · Phangan</p>
  </div>
  <div style="background:white;padding:28px;border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;">
    <p>Dear ${escapeHtml(s.signer_name)},</p>
    <p>Thank you for choosing Bustan Energy. This confirms your signed agreement for proposal <b>${escapeHtml(p.ref_number)}</b>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#666;">System</td><td><b>${escapeHtml(p.system_size_kwp)} kWp</b></td></tr>
      <tr><td style="padding:6px 0;color:#666;">Total</td><td><b>฿${fmt(p.total_price_thb)}</b></td></tr>
      <tr><td style="padding:6px 0;color:#666;">Signed</td><td>${new Date(s.signed_at).toLocaleDateString('en-GB')}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Reference</td><td style="font-family:monospace;">${escapeHtml(p.ref_number)}</td></tr>
    </table>
    <p><b>Next steps:</b></p>
    <ol style="padding-left:20px;">
      <li>We will contact you within 24h to schedule site visit</li>
      <li>50% deposit invoice will be sent separately</li>
      <li>Installation within 4-6 weeks</li>
    </ol>
    <p style="margin-top:20px;font-size:13px;color:#888;">WhatsApp: +66 94 669 2011 · contracts@energy-tm.com</p>
  </div>
</div>`
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json() as SignRequestBody
    const { ref, signer_name, signer_id, signer_email, signer_phone, signature_base64, terms_version } = body

    if (!ref || !signer_name || !signature_base64) {
      return Response.json({ ok: false, error: 'missing_fields' }, { status: 400 })
    }
    if (!/^[a-z0-9][a-z0-9._-]{1,80}$/i.test(ref)) {
      return Response.json({ ok: false, error: 'invalid_ref' }, { status: 400 })
    }
    const verifiedSession = await verifyProposalSession(getProposalSessionCookie(req), ref)
    if (!verifiedSession) {
      return Response.json({ ok: false, error: 'proposal_session_required' }, { status: 403 })
    }
    if (signer_name.length > 120 || (signer_email && signer_email.length > 180) || (signer_phone && signer_phone.length > 60)) {
      return Response.json({ ok: false, error: 'field_too_long' }, { status: 400 })
    }
    if (!/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(signature_base64) || signature_base64.length > 350_000) {
      return Response.json({ ok: false, error: 'invalid_signature' }, { status: 400 })
    }

    const proposal = await supaGet<ProposalSignRow>(`proposals?ref_number=eq.${encodeURIComponent(ref)}&select=*`)
    if (!proposal) {
      return Response.json({ ok: false, error: 'not_found' }, { status: 404 })
    }

    // Reject duplicate signing and expired proposals
    if (proposal.status === 'signed') {
      return Response.json({ ok: false, error: 'already_signed' }, { status: 409 })
    }
    if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
      return Response.json({ ok: false, error: 'proposal_expired' }, { status: 409 })
    }

    const hashInput = JSON.stringify({ ref, signer_name, signer_id, signature_base64, t: Date.now() })
    const hash = await sha256hex(hashInput)
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || null
    const ua = req.headers.get('user-agent') || null

    const signature = {
      proposal_ref: ref,
      signer_name,
      signer_id: signer_id || null,
      signer_email: signer_email || null,
      signer_phone: signer_phone || null,
      signature_base64,
      terms_version: terms_version || '1.0',
      ip,
      user_agent: ua,
      hash_sha256: hash,
      signed_at: new Date().toISOString(),
    }

    const saved = await supaPost<SignatureRow>('proposal_signatures', signature)
    if (!saved) {
      return Response.json({ ok: false, error: 'save_failed' }, { status: 500 })
    }

    const s = Array.isArray(saved) ? saved[0] : saved

    // Flip proposal status to 'signed' (trigger in migration 010 also does this,
    // but the explicit PATCH ensures it even if the trigger is disabled)
    supaPatch(`proposals?ref_number=eq.${encodeURIComponent(ref)}`, {
      status: 'signed',
      signed_at: signature.signed_at,
    }).catch(() => {})

    // Analytics event
    supaPost('proposal_events', {
      proposal_ref: ref,
      event_type: 'signed',
      event_data: {
        signer_name,
        signer_email: signer_email || null,
        hash: hash.slice(0, 16),
        ip,
      },
    }).catch(() => {})

    const teamSubject = `🎉 חתימה התקבלה · ${proposal.client_name || proposal.ref_number} · ${ref}`
    sendEmail(NOTIFY, teamSubject, teamEmail(proposal, s)).catch(() => {})
    if (signer_email) {
      sendEmail([signer_email], `&#x2713; Agreement signed · Bustan Energy · ${ref}`, clientEmail(proposal, s)).catch(() => {})
    }

    return Response.json({ ok: true, signature_id: s.id, hash })
  } catch (e: unknown) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
