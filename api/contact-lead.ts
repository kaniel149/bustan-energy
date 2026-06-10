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
import { enrollInDrip } from './_lib/drip.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM || 'Bustan Energy Leads <leads@bustan-energy.com>'
const NOTIFY = (process.env.LEAD_NOTIFY_EMAILS || 'erez@bustan-energy.com,kaniel@bustan-energy.com')
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
  /** Lead origin, e.g. 'bill-scanner'. Defaults to 'website'. */
  source?: string
  /** Free-text summary produced by tools (e.g. bill scanner savings estimate). */
  billSummary?: string
  /** Attribution params captured client-side by the bill scanner (utm object). */
  utm?: Record<string, unknown>
  /** Honeypot field — humans never fill this. */
  website?: string
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

interface LeadEmailPayload {
  name: string
  email: string
  phone: string
  propertyType: string
  systemInterest: string
  message: string
  source: string
  billSummary: string
  utmText: string
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 2000) : ''
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isPhone(value: string): boolean {
  return (value.match(/\d/g) || []).length >= 7
}

// --- Basic per-IP rate limit (best-effort, per edge isolate) ---
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 5
const rateMap = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const hits = (rateMap.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_MAX) {
    rateMap.set(ip, hits)
    return true
  }
  hits.push(now)
  rateMap.set(ip, hits)
  // Prevent unbounded growth across many IPs
  if (rateMap.size > 5000) rateMap.clear()
  return false
}

const ALLOWED_UTM_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'ref', 'landing_page',
] as const

function utmToText(utm: Record<string, unknown> | undefined): string {
  if (!utm || typeof utm !== 'object') return ''
  const parts: string[] = []
  for (const key of ALLOWED_UTM_KEYS) {
    const value = clean(utm[key]).slice(0, 300)
    if (value) parts.push(`${key}=${value}`)
  }
  return parts.join(' | ')
}

async function sendLeadEmail(lead: LeadEmailPayload) {
  if (!RESEND_KEY || NOTIFY.length === 0) return

  const sourceLabel = lead.source === 'bill-scanner' ? 'Bill Scanner lead magnet' : 'Website contact form'

  const html = `
<div style="font-family:system-ui;max-width:620px;direction:ltr;">
  <div style="background:#0D2137;color:white;padding:24px;border-radius:16px 16px 0 0;">
    <h1 style="margin:0;color:#E8A820;font-size:22px;">New Bustan Energy Lead</h1>
    <p style="margin:6px 0 0 0;opacity:.8;">${escapeHtml(sourceLabel)}</p>
  </div>
  <div style="border:1px solid #eee;border-top:0;padding:22px;border-radius:0 0 16px 16px;">
    <p><b>Name:</b> ${escapeHtml(lead.name)}</p>
    <p><b>Email:</b> ${escapeHtml(lead.email) || '-'}</p>
    <p><b>Phone:</b> ${escapeHtml(lead.phone) || '-'}</p>
    <p><b>Property:</b> ${escapeHtml(lead.propertyType) || '-'}</p>
    <p><b>Interest:</b> ${escapeHtml(lead.systemInterest) || '-'}</p>
    <p><b>Message:</b><br>${escapeHtml(lead.message).replace(/\n/g, '<br>') || '-'}</p>
    ${lead.billSummary ? `<p><b>Bill scan estimate:</b><br>${escapeHtml(lead.billSummary).replace(/\n/g, '<br>')}</p>` : ''}
    ${lead.utmText ? `<p style="font-size:12px;color:#888;"><b>Attribution:</b> ${escapeHtml(lead.utmText)}</p>` : ''}
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
      ...(isEmail(lead.email) ? { reply_to: [lead.email] } : {}),
      subject: `New Bustan Energy lead · ${lead.name}${lead.source === 'bill-scanner' ? ' (Bill Scanner)' : ''}`,
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

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  if (rateLimited(ip)) {
    return Response.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  try {
    const raw = await req.json() as ContactLeadBody

    // Honeypot: bots fill every field. Pretend success, store nothing.
    if (clean(raw.website)) {
      return Response.json({ ok: true, project_id: null })
    }

    const source = clean(raw.source).slice(0, 60).replace(/[^a-z0-9_-]/gi, '') || 'website'
    const lead = {
      name: clean(raw.name),
      email: clean(raw.email).toLowerCase(),
      phone: clean(raw.phone),
      propertyType: clean(raw.propertyType),
      systemInterest: clean(raw.systemInterest),
      message: clean(raw.message),
      billSummary: clean(raw.billSummary),
    }
    const utmText = utmToText(raw.utm)

    // Name + at least one valid contact channel (email or phone).
    // Website contact form always sends email; bill scanner may send phone only.
    const hasEmail = isEmail(lead.email)
    const hasPhone = isPhone(lead.phone)
    if (!lead.name || (!hasEmail && !hasPhone)) {
      return Response.json({ ok: false, error: 'invalid_contact_details' }, { status: 400 })
    }
    if (lead.email && !hasEmail) {
      return Response.json({ ok: false, error: 'invalid_contact_details' }, { status: 400 })
    }

    const notes = [
      source === 'bill-scanner' ? 'Source: bill scanner lead magnet' : 'Source: website contact form',
      lead.propertyType ? `Property type: ${lead.propertyType}` : '',
      lead.systemInterest ? `System interest: ${lead.systemInterest}` : '',
      lead.message ? `Message:\n${lead.message}` : '',
      lead.billSummary ? `Bill scan estimate:\n${lead.billSummary}` : '',
      utmText ? `Attribution: ${utmText}` : '',
    ].filter(Boolean).join('\n\n')

    // ── Attribution: infer utm_source from gclid/fbclid/referrer when missing.
    // Accepts both payload shapes: flat fields (src/lib/attribution.ts) and the
    // bill scanner's `utm` object.
    const utmObj: Record<string, unknown> =
      raw.utm && typeof raw.utm === 'object' ? (raw.utm as Record<string, unknown>) : {}
    const pick = (flat: unknown, nested: unknown) => clean(flat) || clean(nested) || null
    const landingPage = pick(raw.landing_page, utmObj.landing_page)
    const resolved = inferAttribution({
      utm_source: pick(raw.utm_source, utmObj.utm_source),
      utm_medium: pick(raw.utm_medium, utmObj.utm_medium),
      utm_campaign: pick(raw.utm_campaign, utmObj.utm_campaign),
      utm_content: pick(raw.utm_content, utmObj.utm_content),
      utm_term: pick(raw.utm_term, utmObj.utm_term),
      gclid: pick(raw.gclid, utmObj.gclid),
      fbclid: pick(raw.fbclid, utmObj.fbclid),
      ttclid: pick(raw.ttclid, utmObj.ttclid),
      referrer_source: clean(raw.referrer_source) || null,
      referrer_url: pick(raw.referrer_url, utmObj.ref),
    })

    // Stable event_id for Meta browser-pixel/CAPI dedup.
    // Client generates it once per submission — never regenerate on retries.
    const eventId = clean(raw.event_id) || crypto.randomUUID()
    const clientIp = ip === 'unknown' ? null : ip
    const clientUserAgent = req.headers.get('user-agent')

    const baseRecord = {
      client_name: lead.name,
      client_email: lead.email || null,
      client_phone: lead.phone || null,
      business_type: lead.propertyType || null,
      deal_type: lead.systemInterest || null,
      status: 'lead',
      step_number: 1,
      priority: 'normal',
      source,
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
      landing_page: landingPage,
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
      source,
      billSummary: lead.billSummary,
      utmText,
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
        sourceUrl: landingPage || 'https://bustan-energy.com/contact',
        currency: 'THB',
        contentName: source === 'bill-scanner' ? 'bill_scanner' : 'website_contact_form',
        country: 'th',
      })
    } catch {
      /* CAPI must never break lead intake */
    }

    // Enroll in welcome drip sequence (best-effort — never blocks intake).
    // Phone-only leads (bill scanner) can't be enrolled — requires an email.
    if (hasEmail) {
      await enrollInDrip({
        email: lead.email,
        name: lead.name,
        projectId: project?.id ?? null,
      })
    }

    return Response.json({ ok: true, project_id: project?.id ?? null, event_id: eventId })
  } catch {
    return Response.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }
}
