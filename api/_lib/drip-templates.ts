// ── Drip email templates (welcome sequence) ─────────────────
// Keyed by email_sequence_steps.template_key.
// English copy, Ko Phangan / island-property angle.
// Branding matches cron-followups.ts (Bustan navy + amber).

import { escapeHtml } from './html.js'

const SITE_URL = process.env.SITE_URL || 'https://energy-tm.com'
const WHATSAPP = process.env.CONTACT_WHATSAPP || '+66 94 669 2011'

export interface DripVars {
  name?: string | null
}

export interface DripEmail {
  subject: string
  html: string
}

function layout(heading: string, body: string): string {
  return `
<div style="font-family:system-ui;max-width:600px;">
  <div style="background:linear-gradient(135deg,#0D2137,#132D4A);padding:28px;border-radius:16px 16px 0 0;color:white;">
    <div style="color:#E8A820;font-weight:800;letter-spacing:2px;font-size:12px;margin-bottom:6px;">BUSTAN ENERGY</div>
    <h1 style="margin:0;font-size:22px;">${heading}</h1>
  </div>
  <div style="background:white;padding:28px;border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;color:#1a1a1a;">
    ${body}
    <p style="color:#666;font-size:13px;margin-top:28px;">Questions? WhatsApp us at ${escapeHtml(WHATSAPP)} or just reply to this email.</p>
    <p style="color:#999;font-size:11px;margin-top:16px;">You're receiving this because you contacted Bustan Energy at energy-tm.com. Reply "unsubscribe" and we'll stop emailing you.</p>
  </div>
</div>`
}

function cta(label: string, path = ''): string {
  return `
    <p style="margin:24px 0;">
      <a href="${SITE_URL}${path}" style="background:#E8A820;color:#0D2137;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:800;">${label}</a>
    </p>`
}

function firstName(vars: DripVars): string {
  return escapeHtml((vars.name || 'there').trim().split(' ')[0] || 'there')
}

const templates: Record<string, (vars: DripVars) => DripEmail> = {
  welcome_day0: (vars) => ({
    subject: "Welcome to Bustan Energy — here's what happens next",
    html: layout(
      'Your island solar journey starts here',
      `
    <p>Hi ${firstName(vars)},</p>
    <p>Thanks for reaching out about solar for your property. We're based right here on Ko Phangan, so here's exactly what happens next:</p>
    <p>
      <b>1. We review your details</b> — property type, roof, and what you want from solar.<br>
      <b>2. Free roof assessment</b> — on-site or from satellite and drone imagery.<br>
      <b>3. Your personalized proposal</b> — system size, Tier-1 equipment, price, and payback, usually within 48 hours.
    </p>
    <p>We handle everything end to end, including all PEA paperwork and grid connection.</p>
    ${cta('See How It Works')}`,
    ),
  }),

  welcome_day3: (vars) => ({
    subject: 'What solar actually saves on Ko Phangan',
    html: layout(
      'The numbers behind island solar',
      `
    <p>Hi ${firstName(vars)},</p>
    <p>Island electricity isn't cheap — and the bigger your villa, resort, or business, the more those units add up every month.</p>
    <p>Here's what owners on Ko Phangan typically see with a right-sized system:</p>
    <p>
      ☀️ <b>60–90% off the monthly bill</b>, depending on daytime usage.<br>
      💰 <b>Payback in roughly 4–6 years</b> — then decades of nearly free power.<br>
      🔋 <b>Optional battery backup</b> that keeps essentials running through grid outages.<br>
      🛡 <b>25+ year panel warranties</b> on Tier-1 equipment.
    </p>
    <p>The first step is a free assessment of your roof and consumption — no commitment.</p>
    ${cta('Get My Free Assessment')}`,
    ),
  }),

  welcome_day7: (vars) => ({
    subject: 'From roof survey to switch-on: how an island install works',
    html: layout(
      'What an install actually looks like',
      `
    <p>Hi ${firstName(vars)},</p>
    <p>"How complicated is it?" is the question we hear most. Here's the whole process:</p>
    <p>
      <b>1. Free survey</b> — we check your roof, shading, and electricity usage.<br>
      <b>2. Engineering design</b> — panel layout, inverter sizing, and a clear proposal.<br>
      <b>3. Paperwork</b> — we handle all PEA permits and grid-connection forms for you.<br>
      <b>4. Installation</b> — typically 2–5 days on site, with marine-grade mounting.<br>
      <b>5. Switch-on</b> — live monitoring on your phone from day one.
    </p>
    <p>Most systems go from signed proposal to producing power within a few weeks.</p>
    ${cta('Schedule My Survey')}`,
    ),
  }),

  welcome_day14: (vars) => ({
    subject: 'The questions island owners ask before going solar',
    html: layout(
      'Still thinking it over?',
      `
    <p>Hi ${firstName(vars)},</p>
    <p>Totally fine — solar is a long-term decision. Here are the three questions almost everyone asks us first:</p>
    <p>
      <b>"Does it work in monsoon season?"</b><br>
      Yes. Panels produce in diffuse light too, and we size systems for your full-year yield, rainy months included.
    </p>
    <p>
      <b>"What about salt air and corrosion?"</b><br>
      We use marine-grade mounting and Tier-1 panels with anti-corrosion warranties — built for island conditions.
    </p>
    <p>
      <b>"How much maintenance?"</b><br>
      Very little. Rain does most of the cleaning, monitoring flags any issue, and we're 15 minutes away if you need us.
    </p>
    <p>If you'd like to talk it through — numbers, roof, timing — just reply to this email. No pressure, no hard sell.</p>
    ${cta('Talk To Us')}`,
    ),
  }),
}

export function getDripTemplate(key: string, vars: DripVars): DripEmail | null {
  const templateFn = templates[key]
  return templateFn ? templateFn(vars) : null
}
