// ============================================================
// /api/cron-followups
// Processes pending follow-ups and sends emails, plus a WhatsApp
// nudge (GreenAPI) for proposals viewed but not signed.
// Triggered by Vercel cron daily at 10:00 UTC (17:00 Bangkok)
// ============================================================
export const config = { runtime: 'edge' }

import { escapeHtml } from './_lib/html.js'
import { fmt } from './_lib/fmt.js'
import { supaGetAll, supaPatch, supaPost } from './_lib/supa.js'
import { isWhatsAppConfigured, sendWhatsApp, type WhatsAppSendResult } from './_lib/whatsapp.js'

const RESEND_KEY = process.env.RESEND_API_KEY!
const FROM = process.env.RESEND_FROM || 'Bustan Energy <contracts@bustan.energy>'

// CRON_SECRET must be set — no fallback to prevent unauthenticated execution
const CRON_SECRET = process.env.CRON_SECRET

// ── WhatsApp follow-up config ───────────────────────────────
// Proposals VIEWED but NOT SIGNED after this many days get one
// WhatsApp nudge (client) + a team notification. No-op unless
// GREENAPI_INSTANCE_ID + GREENAPI_TOKEN are set.
const WA_FOLLOWUP_TYPE = 'wa_not_signed_after_view'
const WA_FOLLOWUP_DAYS = Math.max(1, Number(process.env.WA_FOLLOWUP_DAYS) || 2)
// Safety window: never message proposals first viewed more than this many
// days ago (prevents blasting stale proposals on first deploy).
const WA_FOLLOWUP_MAX_AGE_DAYS = 14
const WA_TEAM_PHONE = process.env.WA_TEAM_PHONE || ''

interface ProposalFollowupRow {
  id: string
  proposal_ref: string
  followup_type: string
  recipient?: string | null
  metadata?: Record<string, unknown>
}

interface FollowupProposalRow {
  ref_number: string
  client_name?: string | null
  system_size_kwp?: number | string | null
  total_price_thb?: number | string | null
  status?: string | null
  view_count?: number | null
}

type FollowupResult = Record<string, string | number | null | undefined>

async function sendEmail(to: string, subject: string, html: string) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: ['erez@bustan-energy.com'],
      subject,
      html,
    }),
  }).then((r) => r.json()).catch((e) => ({ error: String(e) }))
}

function buildFollowupEmail(type: string, proposal: FollowupProposalRow): { subject: string; html: string } {
  const url = `https://bustan-energy.com/p/${encodeURIComponent(proposal.ref_number)}`
  const firstName = escapeHtml((proposal.client_name || 'valued customer').split(' ')[0])
  const systemLine = `${escapeHtml(proposal.system_size_kwp)} kWp · <b>Total:</b> ฿${fmt(proposal.total_price_thb)}`
  const refEsc = escapeHtml(proposal.ref_number)

  if (type === 'not_viewed_3d' || type === 'not_viewed_7d') {
    return {
      subject: `☀️ ${firstName}, did you see your solar proposal?`,
      html: `
<div style="font-family:system-ui;max-width:600px;">
  <div style="background:linear-gradient(135deg,#0D2137,#132D4A);padding:28px;border-radius:16px 16px 0 0;color:white;">
    <div style="color:#E8A820;font-weight:800;letter-spacing:2px;font-size:12px;margin-bottom:6px;">BUSTAN ENERGY</div>
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

  if (type === 'not_signed_after_view_5d') {
    return {
      subject: `${firstName}, questions before you approve the solar proposal?`,
      html: `
<div style="font-family:system-ui;max-width:600px;">
  <div style="background:linear-gradient(135deg,#0D2137,#132D4A);padding:28px;border-radius:16px 16px 0 0;color:white;">
    <div style="color:#E8A820;font-weight:800;letter-spacing:2px;font-size:12px;margin-bottom:6px;">BUSTAN ENERGY</div>
    <h1 style="margin:0;font-size:22px;">Next step for proposal ${refEsc}</h1>
  </div>
  <div style="background:white;padding:28px;border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;">
    <p>Hi ${firstName},</p>
    <p>You viewed the proposal a few days ago. If the system size, payment schedule, or PEA timeline needs adjustment, reply here and we will revise it before signing.</p>
    <p><b>System:</b> ${systemLine}</p>
    <p style="margin:24px 0;">
      <a href="${url}" style="background:#E8A820;color:#0D2137;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:800;">Review Proposal</a>
    </p>
    <p style="color:#666;font-size:13px;">For a faster answer, WhatsApp us at +66 94 669 2011.</p>
  </div>
</div>`,
    }
  }

  return { subject: 'Follow-up from Bustan Energy', html: `<p>View your proposal: <a href="${url}">${refEsc}</a></p>` }
}

// ── WhatsApp follow-ups (viewed but not signed) ─────────────

interface WaProposalRow {
  ref_number: string
  client_name?: string | null
  client_phone?: string | null
  system_size_kwp?: number | string | null
  total_price_thb?: number | string | null
  first_viewed_at?: string | null
}

function buildWhatsAppMessages(p: WaProposalRow): { client: string; team: string } {
  const url = `https://bustan-energy.com/p/${encodeURIComponent(p.ref_number)}`
  const firstName = (p.client_name || '').trim().split(' ')[0] || 'there'
  const size = p.system_size_kwp ? `${p.system_size_kwp} kWp` : 'solar'

  const client = [
    `Hi ${firstName}! ☀️ Bustan Energy here — you recently viewed your ${size} solar proposal (${p.ref_number}). Happy to answer any questions before you approve, just reply to this message.`,
    'สวัสดีค่ะ ทีม Bustan Energy ยินดีตอบทุกคำถามเกี่ยวกับใบเสนอราคาโซลาร์ของคุณค่ะ 🙏',
    `Review & sign: ${url}`,
  ].join('\n\n')

  const team = [
    `🔔 Proposal follow-up: ${p.ref_number} — ${p.client_name || 'unknown client'} (${size}, ฿${fmt(p.total_price_thb)})`,
    `Viewed ${WA_FOLLOWUP_DAYS}+ days ago, still NOT signed. WhatsApp nudge sent to client (${p.client_phone}).`,
    url,
  ].join('\n')

  return { client, team }
}

async function processWhatsAppFollowups(): Promise<FollowupResult[]> {
  const maxAgeCutoff = new Date(Date.now() - WA_FOLLOWUP_MAX_AGE_DAYS * 86_400_000).toISOString()
  const cutoff = new Date(Date.now() - WA_FOLLOWUP_DAYS * 86_400_000).toISOString()
  const candidates = await supaGetAll<WaProposalRow>(
    `proposals?status=eq.viewed&first_viewed_at=lte.${encodeURIComponent(cutoff)}&first_viewed_at=gte.${encodeURIComponent(maxAgeCutoff)}&client_phone=not.is.null&select=ref_number,client_name,client_phone,system_size_kwp,total_price_thb,first_viewed_at&limit=50`,
  )
  if (!candidates.length) return []

  // Dedupe: at most one WhatsApp nudge per proposal, ever. Reuses the
  // proposal_followups log (channel='whatsapp'); failed sends are logged
  // too, so a bad number is not retried daily.
  const logged = await supaGetAll<{ proposal_ref: string }>(
    `proposal_followups?followup_type=eq.${WA_FOLLOWUP_TYPE}&status=in.(pending,sent,failed)&select=proposal_ref`,
  )
  const alreadySent = new Set(logged.map((r) => r.proposal_ref))

  const results: FollowupResult[] = []
  for (const p of candidates) {
    if (!p.client_phone || alreadySent.has(p.ref_number)) continue

    const { client, team } = buildWhatsAppMessages(p)
    const clientRes = await sendWhatsApp(p.client_phone, client)
    let teamRes: WhatsAppSendResult | null = null
    if (WA_TEAM_PHONE) teamRes = await sendWhatsApp(WA_TEAM_PHONE, team)

    const now = new Date().toISOString()
    await supaPost('proposal_followups', {
      proposal_ref: p.ref_number,
      followup_type: WA_FOLLOWUP_TYPE,
      scheduled_for: now,
      sent_at: now,
      channel: 'whatsapp',
      recipient: p.client_phone,
      status: clientRes.ok ? 'sent' : 'failed',
      metadata: {
        greenapi_id: clientRes.idMessage ?? null,
        error: clientRes.error ?? null,
        team_notified: teamRes?.ok ?? false,
        team_error: teamRes?.error ?? null,
        days_after_view: WA_FOLLOWUP_DAYS,
      },
    })

    results.push({
      ref: p.ref_number,
      channel: 'whatsapp',
      recipient: p.client_phone,
      result: clientRes.ok ? 'sent' : `failed_${clientRes.error}`,
      team: WA_TEAM_PHONE ? (teamRes?.ok ? 'notified' : `failed_${teamRes?.error}`) : 'no_team_phone',
    })
  }
  return results
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
  const pendings = await supaGetAll<ProposalFollowupRow>(
    `proposal_followups?status=eq.pending&scheduled_for=lte.${encodeURIComponent(now)}&select=*&limit=50`,
  )

  const results: FollowupResult[] = []
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
    const proposalRows = await supaGetAll<FollowupProposalRow>(
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
    if (fu.followup_type.startsWith('not_viewed') && (proposal.view_count ?? 0) > 0) {
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

  // WhatsApp phase — graceful no-op when GreenAPI env vars are unset
  let waResults: FollowupResult[] = []
  if (isWhatsAppConfigured()) {
    try {
      waResults = await processWhatsAppFollowups()
    } catch (e) {
      waResults = [{ channel: 'whatsapp', result: `error_${e instanceof Error ? e.message : String(e)}` }]
    }
  }

  return Response.json({
    ok: true,
    processed: results.length,
    results,
    wa_enabled: isWhatsAppConfigured(),
    wa_processed: waResults.length,
    wa_results: waResults,
  })
}
