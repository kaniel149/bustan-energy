// ============================================================
// /api/contact-lead
// Public website contact form -> CRM lead + email notification
//   + attribution inference (UTM / gclid / fbclid / referrer)
//   + Meta CAPI Lead (no-op until META_PIXEL_ID/META_ACCESS_TOKEN set)
// ============================================================
export const config = { runtime: 'edge' }

import { escapeHtml } from './_lib/html.js'
import { inferAttribution } from './_lib/attribution.js'
import { sendMetaCapiEventLogged } from './_lib/meta-capi.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM || 'Bustan Energy Leads <leads@energy-tm.com>'
const NOTIFY = (process.env.LEAD_NOTIFY_EMAILS || 'erez@energy-tm.com,kaniel@energy-tm.com')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean)

interface ContactLeadBody {
  name?: string
  email?: string
  phone?: string
  propertyType?: string
  systemInterest?: string
  message?: string
  // Attribution (all optional — sent by src/lib/attribution.ts)
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  gclid?: string
  fbclid?: string
  ttclid?: string
  referrer_source?: string
  referrer_url?: string
  landing_page?: string
  // Meta CAPI dedup (sent by src/lib/analytics.ts trackLeadConversion)
  event_id?: string
  fbc?: string
  fbp?: string
}

interface EmailLead {
  name: string
  email: string
  phone: string
  propertyType: string
  systemInterest: string
  message: string
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 2000) : ''
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function sendLeadEmail(lead: EmailLead) {
  if (!RESEND_KEY || NOTIFY.length === 0) return

  const html = `
<div style="font-family:system-ui;max-width:620px;direction:ltr;">
  <div style="background:#0D2137;color:white;padding:24px;border-radius:16px 16px 0 0;">
    <h1 style="margin:0;color:#E8A820;font-size:22px;">New Bustan Energy Lead</h1>
    <p style="margin:6px 0 0 0;opacity:.8;">Website contact form</p>
  </div>
  <div style="border:1px solid #eee;border-top:0;padding:22px;border-radius:0 0 16px 16px;">
    <p><b>Name:</b> ${escapeHtml(lead.name)}</p>
    <p><b>Email:</b> ${escapeHtml(lead.email)}</p>
    <p><b>Phone:</b> ${escapeHtml(lead.phone) || '-'}</p>
    <p><b>Property:</b> ${escapeHtml(lead.propertyType) || '-'}</p>
    <p><b>Interest:</b> ${escapeHtml(lead.systemInterest) || '-'}</p>
    <p><b>Message:</b><br>${escapeHtml(lead.message).replace(/\n/g, '<br>') || '-'}</p>
  </div>
</div>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: NOTIFY,
      reply_to: [lead.email],
      subject: `New Bustan Energy lead · ${lead.name}`,
      html,
    }),
  }).catch(() => null)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return Response.json({ ok: false, error: 'server_not_configured' }, { status: 500 })
  }

  try {
    const raw = await req.json() as ContactLeadBody
    const lead = {
      name: clean(raw.name),
      email: clean(raw.email).toLowerCase(),
      phone: clean(raw.phone),
      propertyType: clean(raw.propertyType),
      systemInterest: clean(raw.systemInterest),
      message: clean(raw.message),
    }

    if (!lead.name || !isEmail(lead.email)) {
      return Response.json({ ok: false, error: 'invalid_contact_details' }, { status: 400 })
    }

    const notes = [
      'Source: website contact form',
      lead.propertyType ? `Property type: ${lead.propertyType}` : '',
      lead.systemInterest ? `System interest: ${lead.systemInterest}` : '',
      lead.message ? `Message:\n${lead.message}` : '',
    ].filter(Boolean).join('\n\n')

    // ── Attribution: infer utm_source from gclid/fbclid/referrer when missing
    const resolved = inferAttribution({
      utm_source: clean(raw.utm_source) || null,
      utm_medium: clean(raw.utm_medium) || null,
      utm_campaign: clean(raw.utm_campaign) || null,
      utm_content: clean(raw.utm_content) || null,
      utm_term: clean(raw.utm_term) || null,
      gclid: clean(raw.gclid) || null,
      fbclid: clean(raw.fbclid) || null,
      ttclid: clean(raw.ttclid) || null,
      referrer_source: clean(raw.referrer_source) || null,
      referrer_url: clean(raw.referrer_url) || null,
    })

    // Stable event_id for Meta browser-pixel/CAPI dedup.
    // Client generates it once per submission — never regenerate on retries.
    const eventId = clean(raw.event_id) || crypto.randomUUID()
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || null
    const clientUserAgent = req.headers.get('user-agent')

    const baseRecord = {
      client_name: lead.name,
      client_email: lead.email,
      client_phone: lead.phone || null,
      business_type: lead.propertyType || null,
      deal_type: lead.systemInterest || null,
      status: 'lead',
      step_number: 1,
      priority: 'normal',
      source: 'website',
      notes,
    }

    const trackingColumns = {
      utm_source: resolved.utm_source,
      utm_medium: resolved.utm_medium,
      utm_campaign: resolved.utm_campaign,
      utm_content: resolved.utm_content,
      utm_term: resolved.utm_term,
      gclid: resolved.gclid,
      fbclid: resolved.fbclid,
      ttclid: resolved.ttclid,
      referrer_source: clean(raw.referrer_source) || null,
      referrer_url: clean(raw.referrer_url) || null,
      landing_page: clean(raw.landing_page) || null,
      event_id: eventId,
      fbc: clean(raw.fbc) || null,
      fbp: clean(raw.fbp) || null,
      client_ip: clientIp,
      client_user_agent: clientUserAgent,
      attribution_debug: resolved.attribution_debug,
    }

    const insertProject = (body: Record<string, unknown>) =>
      fetch(`${SUPABASE_URL}/rest/v1/projects`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
      })

    let insertRes = await insertProject({ ...baseRecord, ...trackingColumns })
    if (!insertRes.ok) {
      // Migration 019 not applied yet (unknown column) → degrade to base insert
      // so the lead is never lost.
      insertRes = await insertProject(baseRecord)
    }

    if (!insertRes.ok) {
      const detail = await insertRes.text()
      return Response.json({ ok: false, error: 'crm_insert_failed', detail }, { status: 500 })
    }

    const rows = await insertRes.json()
    const project = Array.isArray(rows) ? rows[0] : rows
    await sendLeadEmail({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      propertyType: lead.propertyType,
      systemInterest: lead.systemInterest,
      message: lead.message,
    })

    // ── Meta CAPI Lead — no-op until META_PIXEL_ID + META_ACCESS_TOKEN are set.
    // Awaited (Edge runtime kills detached work after response) but never fatal.
    try {
      const nameParts = lead.name.split(/\s+/)
      await sendMetaCapiEventLogged({
        eventName: 'Lead',
        eventId,
        email: lead.email || null,
        phone: lead.phone || null,
        firstName: nameParts[0] || null,
        lastName: nameParts.slice(1).join(' ') || null,
        externalId: project?.id ? String(project.id) : undefined,
        fbc: clean(raw.fbc) || null,
        fbp: clean(raw.fbp) || null,
        clientIp,
        clientUserAgent,
        sourceUrl: clean(raw.landing_page) || 'https://energy-tm.com/contact',
        currency: 'THB',
        contentName: 'website_contact_form',
        country: 'th',
      })
    } catch {
      /* CAPI must never break lead intake */
    }

    return Response.json({ ok: true, project_id: project?.id ?? null, event_id: eventId })
  } catch {
    return Response.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }
}
