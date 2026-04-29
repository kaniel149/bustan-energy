#!/usr/bin/env node
// ============================================================
// TM Energy -- Proposal Generator
// Usage:
//   node generate.mjs --data clients/amir.json
// Output:
//   output/AMIR-001-he.html  (with password gate)
//   output/AMIR-001-he.pdf   (printed via Playwright)
//   + registers proposal in Supabase
// ============================================================

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs'
import { createHash, randomInt } from 'crypto'
import { dirname, resolve, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// -- LOCATION CONFIG (from bom-templates.json) ------------------------------------------
const BOM_TEMPLATES = JSON.parse(readFileSync(join(__dirname, 'bom-templates.json'), 'utf8'))
const LOCATIONS = BOM_TEMPLATES.locations || {}
const DEFAULT_LOCATION_ID = 'koh_phangan'

function getLocationConfig(locationId) {
  return LOCATIONS[locationId] || LOCATIONS[DEFAULT_LOCATION_ID] || {
    performance_ratio: 0.77,
    soiling_factor: 0.97,
    tariff_retail_thb: 4.4,
    tariff_export_thb: 3.1,
    self_consumption_pct_grid_tied: 0.60,
    self_consumption_pct_with_battery: 0.85,
    co2_kg_per_kwh: 0.477,
    discount_rate: 0.08,
    tariff_escalation: 0.03,
    psh_annual: 5.0,
  }
}

// -- PROPOSAL FINANCIAL CALCULATIONS ----------------------------------------------------
// Corrected formulas v1.1 (2026-04-23):
//   1. Discounted payback (8% discount rate, find year cumulative NPV >= 0, interpolate)
//   2. Net-billing blended rate: self-consumed power @ retail + exported power @ export rate
//   3. First-year LID degradation: 2% year-1, then 0.5%/yr (IEC 61215 / Jordan & Kurtz 2013)
//   4. Performance Ratio: 0.77 (tropical, IEC 61724) * 0.97 (soiling, IEA PVPS T13-10:2018)
//      = 0.7469 effective
//   5. CO2: EGAT 2023 official grid mix = 0.477 kg CO2/kWh
// Client JSON can opt out with "manual_financial_override": true, but calculated values
// are the default source of truth for rendered proposals and Supabase storage.

function calcProposalFinancials(data) {
  const kwp = data.system_size_kwp
  if (!kwp) return {}

  const locId = data.location_id || DEFAULT_LOCATION_ID
  const loc = getLocationConfig(locId)

  const psh = data.psh_avg || loc.psh_annual
  const effectivePR = (data.performance_ratio || loc.performance_ratio) *
                      (data.soiling_factor || loc.soiling_factor)
  const retailRate = data.tariff_thb_per_kwh || loc.tariff_retail_thb
  const exportRate = data.tariff_export_thb || loc.tariff_export_thb
  const withBattery = !!(data.battery_kwh)
  const selfPct = data.self_consumption_pct ||
    (withBattery ? loc.self_consumption_pct_with_battery : loc.self_consumption_pct_grid_tied)
  const blendedRate = selfPct * retailRate + (1 - selfPct) * exportRate

  const discountRate = data.discount_rate || loc.discount_rate
  const tariffEscalation = data.tariff_escalation || loc.tariff_escalation
  const annualDegradRate = 0.005
  const omCostPct = 0.01
  const systemLifeYears = 25
  const co2Factor = loc.co2_kg_per_kwh

  const epcCost = data.price_thb || (kwp * 32000)
  const annualOMCost = epcCost * omCostPct

  // Baseline kWh (pre-LID, full effective PR applied to raw irradiance)
  const baselineKwhPerYear = kwp * psh * 365 * effectivePR

  // Year-1 output: apply 2% LID (IEC 61215)
  const annualKwhYear1 = baselineKwhPerYear * 0.98
  const annualSavingsYear1 = annualKwhYear1 * blendedRate

  // 25-year cashflow: [t=0: -epcCost, t=1..25: netCF]
  const cashflows = [-epcCost]
  let lifetimeKwh = 0
  let lifetimeSavings = 0
  for (let year = 1; year <= systemLifeYears; year++) {
    // year=1 -> 0.98 (LID); year=2+ -> 0.98 * (1-0.005)^(year-2)
    const degFactor = year === 1 ? 0.98 : 0.98 * Math.pow(1 - annualDegradRate, year - 2)
    const yearlyKwh = baselineKwhPerYear * degFactor
    const tariffFactor = Math.pow(1 + tariffEscalation, year - 1)
    const yearlySavings = yearlyKwh * blendedRate * tariffFactor
    cashflows.push(yearlySavings - annualOMCost)
    lifetimeKwh += yearlyKwh
    lifetimeSavings += yearlySavings
  }

  // Discounted payback: find year where cumulative discounted NPV >= 0, interpolate
  let cumulativeNPV = cashflows[0]
  let paybackYears = systemLifeYears
  for (let year = 1; year <= systemLifeYears; year++) {
    const discountedCF = cashflows[year] / Math.pow(1 + discountRate, year)
    const prevNPV = cumulativeNPV
    cumulativeNPV += discountedCF
    if (cumulativeNPV >= 0) {
      paybackYears = year - 1 + Math.abs(prevNPV) / discountedCF
      break
    }
  }

  const co2TonsAvoided = (lifetimeKwh * co2Factor) / 1000

  return {
    _calc_version: '1.1',
    _location_id: locId,
    _effective_pr: +effectivePR.toFixed(4),
    _blended_rate_thb: +blendedRate.toFixed(3),
    annual_kwh_calc: Math.round(annualKwhYear1),
    annual_savings_calc_thb: Math.round(annualSavingsYear1),
    monthly_kwh_calc: Math.round(annualKwhYear1 / 12),
    monthly_savings_calc_thb: Math.round(annualSavingsYear1 / 12),
    payback_discounted_years: Math.round(paybackYears * 10) / 10,
    savings_25yr_calc_thb: Math.round(lifetimeSavings),
    co2_tons_avoided: Math.round(co2TonsAvoided * 10) / 10,
  }
}

// -- ENV ----------------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PUBLIC_BASE_URL = process.env.PROPOSAL_BASE_URL || 'https://energy-tm.com/p'

// -- ARGS ---------------------------------------------------------------------------------
function parseArgs() {
  const args = {}
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace(/^--/, '')
    args[key] = process.argv[i + 1]
  }
  return args
}

// -- HELPERS ------------------------------------------------------------------------------
const sha256 = (input) =>
  createHash('sha256').update(input).digest('hex')

const random6 = () => String(randomInt(100000, 999999))

function fmt(num) {
  if (num == null) return '--'
  const n = Number(num)
  return isNaN(n) ? '--' : n.toLocaleString('en-US')
}

const HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }
function escapeHtml(s) {
  if (s == null) return ''
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESC[c] ?? c)
}

// -- PASSWORD GATE SNIPPET (injected into HTML) -------------------------------------------
function passwordGateHTML(ref, passwordHash) {
  return `
<!-- PASS GATE -->
<style id="gate-style">
  body { overflow: hidden !important; }
  .pg-overlay {
    position: fixed; inset: 0; z-index: 99999;
    background: linear-gradient(135deg, #0D2137 0%, #132D4A 100%);
    display: flex; align-items: center; justify-content: center;
    color: white; font-family: 'Heebo', system-ui, sans-serif;
    direction: rtl;
  }
  .pg-box {
    background: rgba(255,255,255,.05); border: 1px solid rgba(232,168,32,.2);
    border-radius: 20px; padding: 48px 40px; max-width: 400px;
    width: 90%; text-align: center; backdrop-filter: blur(20px);
  }
  .pg-logo { width: 80px; height: 80px; margin: 0 auto 20px; border-radius: 50%; display: block; }
  .pg-brand { color: #E8A820; font-weight: 800; font-size: 13px; letter-spacing: 2.5px; margin-bottom: 8px; }
  .pg-title { font-size: 22px; font-weight: 900; margin-bottom: 8px; }
  .pg-desc { color: rgba(255,255,255,.6); font-size: 14px; margin-bottom: 28px; line-height: 1.6; }
  .pg-input {
    width: 100%; padding: 14px 16px; border-radius: 12px;
    background: rgba(255,255,255,.08); border: 1px solid rgba(232,168,32,.25);
    color: white; font-size: 18px; text-align: center;
    letter-spacing: 8px; font-weight: 700; margin-bottom: 16px;
    direction: ltr;
  }
  .pg-input:focus { outline: none; border-color: #E8A820; background: rgba(255,255,255,.12); }
  .pg-btn {
    width: 100%; padding: 14px; background: #E8A820; color: #0D2137;
    border: none; border-radius: 100px; font-weight: 800; font-size: 15px;
    cursor: pointer; letter-spacing: 0.5px;
  }
  .pg-btn:hover { background: #D49010; }
  .pg-btn:disabled { opacity: 0.6; cursor: wait; }
  .pg-error { color: #ff6b6b; font-size: 13px; margin-top: 12px; min-height: 18px; }
  .pg-ref { color: rgba(255,255,255,.4); font-size: 11px; margin-top: 24px; letter-spacing: 1.5px; font-family: monospace; }
</style>
<div class="pg-overlay" id="pgOverlay">
  <div class="pg-box">
    <img src="./tm-energy-logo.png" alt="TM Energy" class="pg-logo">
    <div class="pg-brand">TM ENERGY</div>
    <h1 class="pg-title">הצעת מחיר אישית</h1>
    <p class="pg-desc">הכנס את הסיסמה שנשלחה אליך ב-WhatsApp כדי לצפות בהצעה.</p>
    <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6"
           class="pg-input" id="pgInput" placeholder="* * * * * *" autocomplete="off" autofocus>
    <button class="pg-btn" id="pgBtn">פתח הצעה</button>
    <div class="pg-error" id="pgError"></div>
    <div class="pg-ref">REF * ${ref}</div>
  </div>
</div>
<script>
(function(){
  const REF = "${ref}";
  const HASH = "${passwordHash}";
  const API = "/api/proposal-view";

  const unlockedKey = 'tm_unlocked_' + REF;
  const isUnlocked = () => localStorage.getItem(unlockedKey) === '1';

  async function sha256hex(str){
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function logView(password){
    try {
      await fetch(API, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ref: REF, password })
      });
    } catch(e){ console.warn('Log failed', e); }
  }

  function unlock(){
    document.getElementById('gate-style').remove();
    document.getElementById('pgOverlay').remove();
    document.body.style.overflow = '';
  }

  async function tryUnlock(pw){
    const h = await sha256hex(pw.trim());
    if (h === HASH) {
      localStorage.setItem(unlockedKey, '1');
      logView(pw);
      unlock();
      return true;
    }
    return false;
  }

  const input = document.getElementById('pgInput');
  const btn = document.getElementById('pgBtn');
  const err = document.getElementById('pgError');

  async function handle(){
    err.textContent = '';
    btn.disabled = true;
    btn.textContent = 'בודק...';
    const pw = input.value;
    const ok = await tryUnlock(pw);
    if (!ok) {
      err.textContent = 'סיסמה שגויה. נסה שוב.';
      btn.disabled = false;
      btn.textContent = 'פתח הצעה';
      fetch(API, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ref: REF, password: pw }) }).catch(()=>{});
      input.value = '';
      input.focus();
    }
  }
  btn.addEventListener('click', handle);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handle(); });

  if (isUnlocked()) {
    unlock();
    fetch(API, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ref: REF, password: '__localStorage__' }) }).catch(()=>{});
  }
})();
</script>
<!-- END PASS GATE -->
`
}

// -- TEMPLATE RENDERING ------------------------------------------------------------------
function render(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    return data[k] !== undefined ? escapeHtml(String(data[k])) : `{{${k}}}`
  })
}

// -- SUPABASE (REST, no SDK) -------------------------------------------------------------
async function supaPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase error: ${res.status} ${text}`)
  }
  return res.json()
}

// -- PDF GENERATION (via Playwright, optional) -------------------------------------------
async function generatePDF(htmlPath, pdfPath) {
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch()
    const page = await browser.newPage()
    await page.goto(`file://${resolve(htmlPath)}`)
    await page.evaluate(() => {
      document.getElementById('gate-style')?.remove()
      document.getElementById('pgOverlay')?.remove()
      document.body.style.overflow = ''
    })
    await page.waitForTimeout(1000)
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    })
    await browser.close()
    return true
  } catch (e) {
    console.warn('Playwright not available -- skipping PDF generation')
    console.warn('   Install: npm i -D playwright && npx playwright install chromium')
    return false
  }
}

// -- MAIN --------------------------------------------------------------------------------
async function main() {
  const args = parseArgs()
  const dataPath = args.data
  const skipPDF = args['skip-pdf']
  const skipSupa = args['skip-supa']

  if (!dataPath) {
    console.error('ERROR: Usage: node generate.mjs --data clients/amir.json [--skip-pdf] [--skip-supa]')
    process.exit(1)
  }

  // Load client data
  const data = JSON.parse(readFileSync(dataPath, 'utf8'))
  const ref = data.ref
  if (!ref) {
    console.error('ERROR: JSON must include "ref" (e.g. AMIR-001)')
    process.exit(1)
  }

  // Run financial calculations and merge into data.
  // Calculated values are authoritative by default. A proposal can opt out only with
  // manual_financial_override=true, which keeps the old JSON fields for legacy cases.
  const calc = calcProposalFinancials(data)
  if (calc._calc_version) {
    console.log('\n-- CALCULATED FINANCIALS (v1.1) --')
    console.log(`  Location:           ${calc._location_id}`)
    console.log(`  Effective PR:       ${calc._effective_pr} (PR * soiling)`)
    console.log(`  Blended rate:       ${calc._blended_rate_thb} THB/kWh (net-metering)`)
    console.log(`  Annual kWh (calc):  ${fmt(calc.annual_kwh_calc)} kWh`)
    console.log(`  Annual savings:     ${fmt(calc.annual_savings_calc_thb)} THB`)
    console.log(`  Payback (discntd):  ${calc.payback_discounted_years} yrs @ 8% discount`)
    console.log(`  25yr savings:       ${fmt(calc.savings_25yr_calc_thb)} THB`)
    console.log(`  CO2 avoided:        ${calc.co2_tons_avoided} tons (EGAT 2023)`)
    // Warn if client JSON has different payback from calculated
    const jsonPayback = data.payback_years_no_tax || data.payback_years_with_tax
    if (jsonPayback && Math.abs(jsonPayback - calc.payback_discounted_years) > 1.5) {
      console.warn(`  WARNING: JSON payback (${jsonPayback}) differs by >1.5yr from calc (${calc.payback_discounted_years}).`)
      console.warn(`           Update client JSON or verify assumptions.`)
    }
    if (!data.manual_financial_override) {
      Object.assign(data, {
        annual_kwh: calc.annual_kwh_calc,
        monthly_kwh: calc.monthly_kwh_calc,
        annual_savings_thb: calc.annual_savings_calc_thb,
        monthly_savings_thb: calc.monthly_savings_calc_thb,
        payback_years_no_tax: calc.payback_discounted_years,
        payback_years_discounted: calc.payback_discounted_years,
        savings_25yr_thb: calc.savings_25yr_calc_thb,
        metadata: {
          ...(data.metadata || {}),
          co2_tons_avoided_25yr: calc.co2_tons_avoided,
        },
      })
    }
    Object.assign(data, { _financials: calc })
  }
  const validityDays = Number(data.valid_days || 30)
  const expiresAt = data.expires_at || new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString()

  // Generate password
  const password = data.password || random6()
  const passwordHash = sha256(password)

  // Load template (multi-language)
  const lang = data.language || 'he'
  const langTemplates = {
    he: 'template.html',
    th: 'template-th.html',
    en: 'template-en.html',
  }
  const templateFile = langTemplates[lang] || langTemplates.he
  const templatePath = existsSync(join(__dirname, templateFile))
    ? join(__dirname, templateFile)
    : join(__dirname, 'template.html')
  const template = readFileSync(templatePath, 'utf8')

  // Render
  const renderedBody = render(template, data)

  // Inject contract before closing body
  const contractPath = join(__dirname, `contract-snippet-${lang}.html`)
  const contractFallback = join(__dirname, 'contract-snippet.html')
  const contractTemplate = existsSync(contractPath)
    ? readFileSync(contractPath, 'utf8')
    : readFileSync(contractFallback, 'utf8')
  const contractHTML = render(contractTemplate, { ref, ...data })

  // Inject password gate
  const gateHTML = passwordGateHTML(ref, passwordHash)
  const finalHTML = renderedBody
    .replace('</body>', `${contractHTML}\n${gateHTML}\n</body>`)

  // Output paths
  const outDir = join(__dirname, 'output')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  const htmlPath = join(outDir, `${ref}-${data.language || 'he'}.html`)
  const pdfPath = join(outDir, `${ref}-${data.language || 'he'}.pdf`)

  // Copy assets (logo + images) to output folder
  const assetsToCopy = ['tm-energy-logo.png', ...(data.images || [])]
  for (const asset of assetsToCopy) {
    const src = join(__dirname, 'assets', asset)
    if (existsSync(src)) {
      copyFileSync(src, join(outDir, asset))
    }
  }

  writeFileSync(htmlPath, finalHTML)
  console.log(`\nHTML saved: ${htmlPath}`)

  // PDF
  if (!skipPDF) {
    const ok = await generatePDF(htmlPath, pdfPath)
    if (ok) console.log(`PDF saved:  ${pdfPath}`)
  }

  // Register in Supabase
  if (!skipSupa && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      await supaPost('proposals?on_conflict=ref_number', {
        ref_number: ref,
        client_name: data.client_name,
        client_phone: data.client_phone || null,
        client_email: data.client_email || null,
        location: data.location || null,
        system_size_kwp: data.system_size_kwp || null,
        panel_count: data.panel_count || null,
        panel_model: data.panel_model || null,
        panel_watt: data.panel_watt || 580,
        inverter_model: data.inverter_model || null,
        battery_kwh: data.battery_kwh || null,
        total_price_thb: data.price_thb || null,
        monthly_savings_thb: data.monthly_savings_thb || null,
        annual_savings_thb: data.annual_savings_thb || null,
        // Use discounted payback from calc if no explicit override in JSON
        payback_years: data.payback_years_no_tax
          || (calc.payback_discounted_years || null),
        monthly_production_kwh: data.monthly_kwh || null,
        annual_production_kwh: data.annual_kwh || null,
        password_hash: passwordHash,
        language: data.language || 'he',
        html_url: `${PUBLIC_BASE_URL}/${ref}`,
        pdf_url: `${ref}-${data.language || 'he'}.pdf`,
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt,
        metadata: { ...(data.metadata || {}), _financials: calc },
      })
      console.log('Registered in Supabase')
    } catch (e) {
      console.warn(`Supabase register failed: ${e.message}`)
    }
  } else {
    console.log('Skipped Supabase (no env vars or --skip-supa)')
  }

  // Summary
  console.log('\n-------------------------------')
  console.log(`Proposal: ${ref}`)
  console.log(`Client:   ${data.client_name}`)
  console.log(`Password: ${password}`)
  console.log(`URL:      ${PUBLIC_BASE_URL}/${ref}`)
  console.log('-------------------------------')
  console.log(`\nSend the client:\n`)
  console.log(`${data.client_name.split(' ')[0]}, הנה הצעת המחיר שלך מ-TM Energy:`)
  console.log(`${PUBLIC_BASE_URL}/${ref}`)
  console.log(`סיסמה: ${password}\n`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
