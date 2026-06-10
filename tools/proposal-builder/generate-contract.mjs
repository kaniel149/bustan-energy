#!/usr/bin/env node
// ============================================================
// Bustan Energy -- Contract + Client Prep Generator
// Usage:
//   node generate-contract.mjs --data clients/amir-final.json
//   node generate-contract.mjs --template   (blank templates only)
// Output:
//   output/{REF}-CONTRACT-HE-EN.html + .pdf
//   output/{REF}-CLIENT-PREP-HE-EN.html + .pdf
//   output/TM-CONTRACT-TEMPLATE-HE-EN.html + .pdf
//   output/TM-CLIENT-PREP-TEMPLATE-HE-EN.html + .pdf
// ============================================================

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, resolve, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── ARGS ──────────────────────────────────────────────────
function parseArgs() {
  const args = {}
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '')
      const next = process.argv[i + 1]
      if (next && !next.startsWith('--')) {
        args[key] = next
        i++
      } else {
        args[key] = true
      }
    }
  }
  return args
}

// ── HELPERS ───────────────────────────────────────────────
const HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }
function escapeHtml(s) {
  if (s == null) return ''
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESC[c] ?? c)
}

function fmt(num) {
  if (num == null) return '--'
  const n = Number(num)
  return isNaN(n) ? '--' : n.toLocaleString('en-US')
}

function addPaymentFields(data) {
  const price = Number(data.total_price_thb || data.price_thb || 0)
  if (!price) return data
  return {
    ...data,
    total_price_thb: fmt(price),
    payment_40_thb: fmt(Math.round(price * 0.4)),
    payment_20_thb: fmt(price - Math.round(price * 0.4) * 2),
  }
}

function render(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (data[k] !== undefined) return escapeHtml(String(data[k]))
    return `{{${k}}}`
  })
}

// ── PDF GENERATION ────────────────────────────────────────
async function generatePDF(htmlPath, pdfPath) {
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch()
    const page = await browser.newPage()

    const fileUrl = `file://${resolve(htmlPath)}`
    await page.goto(fileUrl, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // let fonts load

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '15mm', bottom: '20mm', left: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="font-family:Inter,sans-serif; font-size:7pt; color:#A0AEC0;
                    width:100%; padding:0 15mm; display:flex; justify-content:space-between; box-sizing:border-box;">
          <span>Bustan Energy Co., Ltd. — bustan-energy.com</span>
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
    })
    await browser.close()
    return true
  } catch (e) {
    console.warn('Playwright not available -- skipping PDF:', e.message)
    console.warn('Install: npm i -D playwright && npx playwright install chromium')
    return false
  }
}

// ── BLANK TEMPLATE DATA ───────────────────────────────────
const BLANK_DATA = {
  ref: '____________',
  date: '____________',
  date_he: '____________',
  client_name: '____________',
  client_name_he: '____________',
  client_id: '____________',
  location: '____________',
  total_price_thb: '____________',
  payment_40_thb: '____________',
  payment_20_thb: '____________',
  panel_count: '___',
  panel_model: '____________',
  inverter_model: '____________',
  battery_kwh: '___',
  pea_branch: 'Surat Thani',
}

// ── MAIN ──────────────────────────────────────────────────
async function main() {
  const args = parseArgs()
  const templateMode = args.template === true

  const outDir = join(__dirname, 'output')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  // Copy logo to output dir if needed
  const logoSrc = join(__dirname, 'assets', 'tm-energy-logo.png')
  const logoDst = join(outDir, 'tm-energy-logo.png')
  if (existsSync(logoSrc) && !existsSync(logoDst)) {
    copyFileSync(logoSrc, logoDst)
    console.log('Copied logo to output/')
  }

  const skipPDF = args['skip-pdf'] === true

  // Load templates
  const contractTemplate = readFileSync(join(__dirname, 'template-contract.html'), 'utf8')
  const prepTemplate = readFileSync(join(__dirname, 'template-client-prep.html'), 'utf8')

  // ── BLANK TEMPLATES ──────────────────────────────────────
  console.log('\n-- Generating blank templates --')

  const blankContract = render(contractTemplate, BLANK_DATA)
  const blankContractHtml = join(outDir, 'TM-CONTRACT-TEMPLATE-HE-EN.html')
  writeFileSync(blankContractHtml, blankContract)
  console.log('HTML: ' + blankContractHtml)

  const blankPrep = render(prepTemplate, BLANK_DATA)
  const blankPrepHtml = join(outDir, 'TM-CLIENT-PREP-TEMPLATE-HE-EN.html')
  writeFileSync(blankPrepHtml, blankPrep)
  console.log('HTML: ' + blankPrepHtml)

  if (!skipPDF) {
    const ok1 = await generatePDF(blankContractHtml, join(outDir, 'TM-CONTRACT-TEMPLATE-HE-EN.pdf'))
    if (ok1) console.log('PDF:  ' + join(outDir, 'TM-CONTRACT-TEMPLATE-HE-EN.pdf'))
    const ok2 = await generatePDF(blankPrepHtml, join(outDir, 'TM-CLIENT-PREP-TEMPLATE-HE-EN.pdf'))
    if (ok2) console.log('PDF:  ' + join(outDir, 'TM-CLIENT-PREP-TEMPLATE-HE-EN.pdf'))
  }

  // ── CLIENT-SPECIFIC (if data provided) ────────────────────
  if (!templateMode && args.data) {
    const dataPath = args.data
    const data = addPaymentFields(JSON.parse(readFileSync(dataPath, 'utf8')))

    // Patch missing fields
    if (!data.client_id) data.client_id = '____________'
    if (!data.date_he) data.date_he = data.date

    const ref = data.ref
    console.log(`\n-- Generating client documents for ${ref} (${data.client_name}) --`)

    // Contract
    const contractHtml = render(contractTemplate, data)
    const contractHtmlPath = join(outDir, `${ref}-CONTRACT-HE-EN.html`)
    writeFileSync(contractHtmlPath, contractHtml)
    console.log('HTML: ' + contractHtmlPath)

    if (!skipPDF) {
      const ok = await generatePDF(contractHtmlPath, join(outDir, `${ref}-CONTRACT-HE-EN.pdf`))
      if (ok) console.log('PDF:  ' + join(outDir, `${ref}-CONTRACT-HE-EN.pdf`))
    }

    // Client Prep
    const prepHtml = render(prepTemplate, data)
    const prepHtmlPath = join(outDir, `${ref}-CLIENT-PREP-HE-EN.html`)
    writeFileSync(prepHtmlPath, prepHtml)
    console.log('HTML: ' + prepHtmlPath)

    if (!skipPDF) {
      const ok = await generatePDF(prepHtmlPath, join(outDir, `${ref}-CLIENT-PREP-HE-EN.pdf`))
      if (ok) console.log('PDF:  ' + join(outDir, `${ref}-CLIENT-PREP-HE-EN.pdf`))
    }

    console.log('\n-------------------------------')
    console.log(`Contract:  ${ref}-CONTRACT-HE-EN.pdf`)
    console.log(`Checklist: ${ref}-CLIENT-PREP-HE-EN.pdf`)
    console.log('-------------------------------')
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
