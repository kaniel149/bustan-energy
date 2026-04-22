#!/usr/bin/env node
// ============================================================
// TM Energy — Proposal Generator
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

// ── ENV ──
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PUBLIC_BASE_URL = process.env.PROPOSAL_BASE_URL || 'https://energy-tm.com/p'

// ── ARGS ──
function parseArgs() {
  const args = {}
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace(/^--/, '')
    args[key] = process.argv[i + 1]
  }
  return args
}

// ── HELPERS ──
const sha256 = (input) =>
  createHash('sha256').update(input).digest('hex')

const random6 = () => String(randomInt(100000, 999999))

function fmt(num) {
  return Number(num).toLocaleString('en-US')
}

// ── PASSWORD GATE SNIPPET (injected into HTML) ──
function passwordGateHTML(ref, passwordHash) {
  return `
<!-- ═══ PASSWORD GATE ═══ -->
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
           class="pg-input" id="pgInput" placeholder="● ● ● ● ● ●" autocomplete="off" autofocus>
    <button class="pg-btn" id="pgBtn">פתח הצעה</button>
    <div class="pg-error" id="pgError"></div>
    <div class="pg-ref">REF · ${ref}</div>
  </div>
</div>
<script>
(function(){
  const REF = "${ref}";
  const HASH = "${passwordHash}";
  const API = "/api/proposal-view";

  // Already unlocked? (localStorage)
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
      // Log failed attempt too
      fetch(API, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ref: REF, password: pw }) }).catch(()=>{});
      input.value = '';
      input.focus();
    }
  }
  btn.addEventListener('click', handle);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handle(); });

  // Auto-unlock if localStorage says so (but still log the view)
  if (isUnlocked()) {
    unlock();
    // Silent log: send with special flag so we know it's re-visit
    fetch(API, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ref: REF, password: '__localStorage__' }) }).catch(()=>{});
  }
})();
</script>
<!-- ═══ END PASSWORD GATE ═══ -->
`
}

// ── TEMPLATE RENDERING ──
function render(template, data) {
  // Simple {{var}} replacement
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    return data[k] !== undefined ? String(data[k]) : `{{${k}}}`
  })
}

// ── SUPABASE (REST, no SDK to keep it light) ──
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

// ── PDF GENERATION (via Playwright, optional) ──
async function generatePDF(htmlPath, pdfPath) {
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch()
    const page = await browser.newPage()
    await page.goto(`file://${resolve(htmlPath)}`)
    // Hide password gate for PDF (skip gate by setting localStorage)
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
    console.warn('⚠️  Playwright not available — skipping PDF generation')
    console.warn('   Install: npm i -D playwright && npx playwright install chromium')
    return false
  }
}

// ── MAIN ──
async function main() {
  const args = parseArgs()
  const dataPath = args.data
  const skipPDF = args['skip-pdf']
  const skipSupa = args['skip-supa']

  if (!dataPath) {
    console.error('❌ Usage: node generate.mjs --data clients/amir.json [--skip-pdf] [--skip-supa]')
    process.exit(1)
  }

  // Load client data
  const data = JSON.parse(readFileSync(dataPath, 'utf8'))
  const ref = data.ref
  if (!ref) {
    console.error('❌ JSON must include "ref" (e.g. AMIR-001)')
    process.exit(1)
  }

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
  console.log(`✅ HTML saved: ${htmlPath}`)

  // PDF
  if (!skipPDF) {
    const ok = await generatePDF(htmlPath, pdfPath)
    if (ok) console.log(`✅ PDF saved:  ${pdfPath}`)
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
        payback_years: data.payback_years_with_tax || data.payback_years_no_tax || null,
        monthly_production_kwh: data.monthly_kwh || null,
        annual_production_kwh: data.annual_kwh || null,
        password_hash: passwordHash,
        language: data.language || 'he',
        html_url: `${PUBLIC_BASE_URL}/${ref}`,
        pdf_url: `${ref}-${data.language || 'he'}.pdf`,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: data.metadata || {},
      })
      console.log(`✅ Registered in Supabase`)
    } catch (e) {
      console.warn(`⚠️  Supabase register failed: ${e.message}`)
    }
  } else {
    console.log(`⏭️  Skipped Supabase (no env vars or --skip-supa)`)
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📋 Proposal: ${ref}`)
  console.log(`👤 Client:   ${data.client_name}`)
  console.log(`🔑 Password: ${password}`)
  console.log(`🔗 URL:      ${PUBLIC_BASE_URL}/${ref}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\nSend the client this message:\n`)
  console.log(`היי ${data.client_name.split(' ')[0]}, הנה הצעת המחיר שלך מ-TM Energy:`)
  console.log(`${PUBLIC_BASE_URL}/${ref}`)
  console.log(`סיסמה: ${password}\n`)
}

main().catch((err) => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
