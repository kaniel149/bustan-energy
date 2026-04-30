// ============================================================
// /api/admin-create-proposal
// Creates a proposal from web form data (for Erez + admins)
// ============================================================
export const config = { runtime: 'edge' }

import { escapeHtml } from './_lib/html.js'
import { fmt } from './_lib/fmt.js'
import { sha256hex, random6 } from './_lib/crypto.js'
import { supaUpsert } from './_lib/supa.js'
import { calculateSolarFinancials, TM_SOLAR_ASSUMPTIONS } from '../src/lib/solar-financials'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_DOMAIN = '@energy-tm.com'
const EXTRA_ADMINS = ['k@kanielt.com']
const isAllowed = (email: string) => {
  const e = email.toLowerCase()
  return e.endsWith(ADMIN_DOMAIN) || EXTRA_ADMINS.includes(e)
}

async function verifyAdmin(req: Request): Promise<{ email: string } | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)

  // Verify token with Supabase
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!r.ok) return null
  const user = await r.json()
  const email = user?.email?.toLowerCase()
  if (!email || !isAllowed(email)) return null
  return { email }
}

// ── TEMPLATE FETCH (from GitHub raw or embedded) ──
// For Edge, we need the template inline or fetch it
// Simplest: fetch from Vercel's own public folder
async function loadTemplate(origin: string): Promise<string> {
  const r = await fetch(`${origin}/proposal-templates/template-dynamic.html`, {
    cache: 'force-cache',
  })
  if (!r.ok) throw new Error(`Template fetch failed: ${r.status}`)
  return r.text()
}

function render(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = data[k]
    return v === undefined || v === null ? '' : escapeHtml(String(v))
  })
}

// ── MAIN HANDLER ──
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const admin = await verifyAdmin(req)
    if (!admin) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      ref,
      client_name,
      client_phone,
      client_email,
      location_he = 'תאילנד',
      location_en = 'Thailand',
      location_short = 'TH',
      location_psh = 'Thailand 13°N',
      system_size_kwp,
      panel_count,
      panel_watt = 580,
      panel_model = 'Jinko N-Type 580W',
      inverter_model = 'Huawei SUN2000-12KTL-M2',
      battery_model = 'Huawei LUNA2000-10-S0',
      battery_kwh = 10,
      annual_kwh: annual_kwh_submitted,
      monthly_kwh: monthly_kwh_submitted,
      monthly_savings_thb: monthly_savings_thb_submitted,
      annual_savings_thb: annual_savings_thb_submitted,
      total_price_thb,
      payback_no_tax: payback_no_tax_submitted,
      payback_with_tax: payback_with_tax_submitted,
      savings_25yr_thb: savings_25yr_thb_submitted,
      roof_original_url,
      roof_panels_url,
      logo_url = 'https://energy-tm.com/proposals/tm-energy-logo.png',
      language = 'he',
      password,
      tax_deduction_thb = 0,
      // v3 deal options
      ppa_rate_thb_per_kwh = 4.20,
      ppa_years = 15,
      battery_price_thb = 150000,
      battery_kwh_extra = 10,
      co2_factor = TM_SOLAR_ASSUMPTIONS.co2KgPerKwh,
      monthly_bill_thb = 0,
      ai_analysis = null,
    } = body

    if (!ref || !client_name || !system_size_kwp || !total_price_thb) {
      return Response.json({ ok: false, error: 'missing_required' }, { status: 400 })
    }

    const financials = calculateSolarFinancials({
      systemSizeKwp: Number(system_size_kwp),
      panelCount: Number(panel_count || 0),
      panelWatt: Number(panel_watt || 580),
      batteryKwh: Number(battery_kwh || 0),
      totalPriceThb: Number(total_price_thb || 0),
      taxDeductionThb: Number(tax_deduction_thb || 0),
    })
    const annual_kwh = financials.annual_kwh || annual_kwh_submitted
    const monthly_kwh = financials.monthly_kwh || monthly_kwh_submitted
    const monthly_savings_thb = financials.monthly_savings_thb || monthly_savings_thb_submitted
    const annual_savings_thb = financials.annual_savings_thb || annual_savings_thb_submitted
    const payback_no_tax = financials.payback_discounted_years || payback_no_tax_submitted
    const payback_with_tax = financials.payback_with_tax_years || payback_with_tax_submitted || 0
    const savings_25yr_thb = financials.savings_25yr_thb || savings_25yr_thb_submitted

    const pw = password || random6()
    const password_hash = await sha256hex(pw)

    // Build render data
    const now = new Date()
    const months_he = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
    const month_year_he = `${months_he[now.getMonth()]} ${now.getFullYear()}`

    // Cumulative savings (simple linear)
    const y5 = Math.round(annual_savings_thb * 5 / 1000)
    const y10 = Math.round(annual_savings_thb * 10 / 1000)
    const y15 = Math.round(annual_savings_thb * 15 / 1000)
    const y20 = Math.round(annual_savings_thb * 20 / 1000)

    // v3 computations
    const price_battery = (total_price_thb || 0) + (battery_price_thb || 0)
    const co2_saved_kg = Math.round((annual_kwh || 0) * co2_factor)
    const savings_10yr = (annual_savings_thb || 0) * 10
    const annual_bill = (monthly_bill_thb || 0) * 12
    const annual_bill_with_solar = Math.max(0, annual_bill - (annual_savings_thb || 0))
    // bar width percentage for savings viz (solar bar vs total bill)
    const solar_bar_pct = annual_bill > 0
      ? Math.max(2, Math.round((annual_bill_with_solar / annual_bill) * 100))
      : 2

    const renderData = {
      ref,
      client_name,
      system_size_kwp,
      panel_count,
      panel_watt,
      panel_model,
      inverter_model,
      battery_model,
      battery_kwh,
      annual_kwh_fmt: fmt(annual_kwh),
      monthly_kwh_fmt: fmt(monthly_kwh),
      monthly_savings_fmt: fmt(monthly_savings_thb),
      annual_savings_fmt: fmt(annual_savings_thb),
      price_fmt: fmt(total_price_thb),
      payback_no_tax,
      payback_with_tax,
      payback_with_tax_display: payback_with_tax ? `${payback_with_tax} שנים` : 'לא נכלל במודל',
      savings_25yr_fmt: `${(savings_25yr_thb / 1000000).toFixed(1)}M`,
      cum_5yr: `${y5}K`,
      cum_10yr: `${y10}K`,
      cum_15yr: `${(y15/1000).toFixed(1)}M`,
      cum_20yr: `${(y20/1000).toFixed(1)}M`,
      cum_25yr: `${(savings_25yr_thb / 1000000).toFixed(1)}M`,
      location_he,
      location_en,
      location_short,
      location_psh,
      logo_url,
      roof_original_url: roof_original_url || logo_url,
      roof_panels_url: roof_panels_url || logo_url,
      month_year_he,
      // v3 deal options
      ppa_rate: String(ppa_rate_thb_per_kwh),
      ppa_years: String(ppa_years),
      price_battery_fmt: fmt(price_battery),
      battery_kwh_extra: String(battery_kwh_extra),
      co2_saved_kg: String(co2_saved_kg),
      savings_10yr_fmt: fmt(savings_10yr),
      annual_bill_fmt: fmt(annual_bill),
      annual_bill_with_solar_fmt: fmt(annual_bill_with_solar),
      solar_bar_pct: String(solar_bar_pct),
      language,
    }

    // Load + render template
    const origin = new URL(req.url).origin
    const template = await loadTemplate(origin)
    const rendered = render(template, renderData)

    // Inject password gate + contract (fetch snippets)
    const [gateRes, contractRes] = await Promise.all([
      fetch(`${origin}/proposal-templates/password-gate.html`),
      fetch(`${origin}/proposal-templates/contract-snippet.html`),
    ])
    const gateTmpl = gateRes.ok ? await gateRes.text() : ''
    const contractTmpl = contractRes.ok ? await contractRes.text() : ''
    const gate = render(gateTmpl, { ref, password_hash })
    const contract = render(contractTmpl, { ref })

    const finalHtml = rendered.replace('</body>', `${contract}\n${gate}\n</body>`)

    // Check if this proposal already exists — preserves sent_at on edit
    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/proposals?ref_number=eq.${encodeURIComponent(ref)}&select=sent_at,status,view_count,first_viewed_at,signed_at`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    const existing = existingRes.ok ? (await existingRes.json())[0] : null
    const isNewProposal = !existing

    const nowIso = new Date().toISOString()
    // 30-day expiry (needed by schedule_followups_on_send trigger)
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Build upsert payload — only set sent_at on first send
    const upsertBody: Record<string, any> = {
      ref_number: ref,
      client_name,
      client_phone: client_phone || null,
      client_email: client_email || null,
      location: location_en,
      system_size_kwp,
      panel_count,
      panel_watt,
      panel_model,
      inverter_model,
      battery_kwh,
      total_price_thb,
      monthly_savings_thb,
      annual_savings_thb,
      payback_years: payback_no_tax,
      monthly_production_kwh: monthly_kwh,
      annual_production_kwh: annual_kwh,
      password_hash,
      language,
      html_url: `https://energy-tm.com/p/${ref}`,
      expires_at,
      metadata: {
        rendered_html: finalHtml,
        created_by: admin.email,
        tax_deduction_thb,
        financial_assumptions: financials,
        location_he,
        location_short,
        location_psh,
        last_edited_at: nowIso,
        last_edited_by: admin.email,
        // v3
        ppa_rate_thb_per_kwh,
        ppa_years,
        battery_price_thb,
        battery_kwh_extra,
        co2_factor,
        monthly_bill_thb,
        // AI roof analysis (if ran)
        ai_analysis: ai_analysis || undefined,
      },
    }

    if (isNewProposal) {
      // First time — mark as sent now
      upsertBody.status = 'sent'
      upsertBody.sent_at = nowIso
    } else {
      // Edit — preserve existing lifecycle state
      upsertBody.sent_at = existing.sent_at || nowIso
      // Don't downgrade status (viewed/signed should stay)
      if (!existing.status || existing.status === 'draft') {
        upsertBody.status = 'sent'
      }
    }

    await supaUpsert('proposals', upsertBody, 'ref_number')

    // Emit analytics event
    fetch(`${SUPABASE_URL}/rest/v1/proposal_events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        proposal_ref: ref,
        event_type: isNewProposal ? 'sent' : 'edited',
        event_data: { by: admin.email },
      }),
    }).catch(() => {})

    return Response.json({
      ok: true,
      ref,
      password: pw,
      url: `https://energy-tm.com/p/${ref}`,
      created_by: admin.email,
      is_new: isNewProposal,
    })
  } catch (e: any) {
    console.error('create error:', e)
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
