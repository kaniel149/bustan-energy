#!/usr/bin/env node
// ============================================================
// bom-calc.mjs — compute BOM for a given system size
// Usage:
//   node bom-calc.mjs --panels 157 --watt 555 --template grid-tied-commercial-metal-roof
//   node bom-calc.mjs --panels 32 --watt 620 --template hybrid-commercial-with-battery --battery-kwh 30
//
// Output: markdown BOM + total cost breakdown
// ============================================================

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES = JSON.parse(readFileSync(join(__dirname, 'bom-templates.json'), 'utf8'))

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { panels: 157, watt: 555, template: 'grid-tied-commercial-metal-roof', batteryKwh: 20, acRunM: 15 }
  for (let i = 0; i < args.length; i++) {
    const k = args[i]
    const v = args[i + 1]
    if (k === '--panels') { out.panels = parseInt(v, 10); i++ }
    else if (k === '--watt') { out.watt = parseInt(v, 10); i++ }
    else if (k === '--template') { out.template = v; i++ }
    else if (k === '--battery-kwh') { out.batteryKwh = parseInt(v, 10); i++ }
    else if (k === '--ac-run-m') { out.acRunM = parseInt(v, 10); i++ }
    else if (k === '--out') { out.outFile = v; i++ }
  }
  return out
}

// Split only on the first dot — SKUs like "Antal_Rail_4.4m" have dots in them
// but the path structure is always "category.sku"
function splitPath(path) {
  const i = path.indexOf('.')
  return i === -1 ? [path] : [path.slice(0, i), path.slice(i + 1)]
}

function getByPath(db, path) {
  const [cat, sku] = splitPath(path)
  return sku ? db[cat]?.[sku] : db[cat]
}

// Simple formula evaluator (safe — only arithmetic + ceil/floor)
function evalFormula(formula, ctx) {
  if (typeof formula !== 'string') return formula
  if (/^\d+$/.test(formula.trim())) return parseInt(formula, 10)
  const funcs = { ceil: Math.ceil, floor: Math.floor, round: Math.round, max: Math.max, min: Math.min }
  // Replace identifiers with context or funcs
  const safe = formula.replace(/\b[a-z_]\w*\b/gi, (name) => {
    if (name in ctx) return `(${ctx[name]})`
    if (name in funcs) return `funcs.${name}`
    return '0'
  })
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('funcs', `return (${safe})`)
    return Math.max(0, Math.round(fn(funcs)))
  } catch {
    return 0
  }
}

// ── DC/AC RATIO VALIDATION ────────────────────────────────────────────────────
// IEC 62548 / NREL best-practice: DC/AC ratio 1.05-1.35.
// Below 1.05: inverter undersized (clipping risk at low irradiance).
// Above 1.35: excessive DC clipping losses (>5% annual energy loss typical).
function validateDcAcRatio(kwp, inverterAcKw) {
  const ratio = kwp / inverterAcKw
  if (ratio < 1.05) {
    console.warn(`WARNING: DC/AC ratio ${ratio.toFixed(2)} < 1.05 (kwp=${kwp}, inverter=${inverterAcKw}kW). Inverter is oversized for this array — consider a smaller inverter.`)
  } else if (ratio > 1.35) {
    console.warn(`WARNING: DC/AC ratio ${ratio.toFixed(2)} > 1.35 (kwp=${kwp}, inverter=${inverterAcKw}kW). Excessive DC clipping expected (>5% annual loss). Increase inverter capacity or reduce array size.`)
  }
  return ratio
}

function pickInverterGridTied(kwp, db) {
  const inverters = db.price_database_thb.inverters_grid_tied
  // Find smallest inverter where max_dc_kw >= kwp * 1.05 (IEC 62548 min DC/AC ratio)
  const sorted = Object.entries(inverters).sort(([, a], [, b]) => a.max_dc_kw - b.max_dc_kw)
  for (const [sku, info] of sorted) {
    if (info.max_dc_kw >= kwp * 1.05) {
      validateDcAcRatio(kwp, info.kw)
      return { sku, ...info, dbPath: `inverters_grid_tied.${sku}` }
    }
  }
  // No single inverter fits — recommend doubling largest
  const [largestSku, largest] = sorted[sorted.length - 1]
  validateDcAcRatio(kwp, largest.kw)
  return { sku: largestSku, ...largest, dbPath: `inverters_grid_tied.${largestSku}`, warning: 'system size exceeds largest single inverter — consider splitting into 2 units' }
}

function pickInverterHybrid(kwp, db) {
  const inverters = db.price_database_thb.inverters_hybrid
  let result
  if (kwp <= 18) result = { sku: 'Huawei_SUN2000_12KTL_M2', ...inverters.Huawei_SUN2000_12KTL_M2, dbPath: 'inverters_hybrid.Huawei_SUN2000_12KTL_M2' }
  else if (kwp <= 30) result = { sku: 'Huawei_SUN2000_20KTL_M5', ...inverters.Huawei_SUN2000_20KTL_M5, dbPath: 'inverters_hybrid.Huawei_SUN2000_20KTL_M5' }
  else if (kwp <= 80) result = { sku: 'Huawei_SUN2000_50KTL_NHM1', ...inverters.Huawei_SUN2000_50KTL_NHM1, dbPath: 'inverters_hybrid.Huawei_SUN2000_50KTL_NHM1' }
  else result = { sku: 'Huawei_SUN2000_50KTL_NHM1', ...inverters.Huawei_SUN2000_50KTL_NHM1, warning: `kwp ${kwp} exceeds largest hybrid inverter — recommend grid-tied + separate battery system instead` }
  if (result.kw) validateDcAcRatio(kwp, result.kw)
  return result
}

function calcBOM(opts) {
  const { panels, watt, template: tplId, batteryKwh, acRunM } = opts
  const db = TEMPLATES
  const tpl = db.templates.find((t) => t.id === tplId)
  if (!tpl) throw new Error(`Template not found: ${tplId}`)

  const kwp = Math.round(panels * watt / 1000 * 100) / 100
  const acCurrentA = kwp * 1000 / (1.732 * 400 * 0.95)
  const panelsPerString = tpl.defaults.panels_per_string || 13
  const strings = Math.ceil(panels / panelsPerString)
  const acSizeClass = acCurrentA < 200 ? 'under_200a' : 'over_200a'

  const ctx = { panels, kwp, strings, ac_cable_run_m: acRunM, battery_kwh_target: batteryKwh }

  const rows = []
  const byCategory = {}

  // Special handling for the inverter row — resolve by kwp
  for (const item of tpl.items) {
    let dbPath = item.db_path
    let priceOverride = item.price_override_thb

    // Inverter auto-picker for grid-tied
    if (item.auto_pick_by === 'kwp') {
      const inv = pickInverterGridTied(kwp, db)
      dbPath = inv.dbPath
      if (inv.warning) console.warn(`⚠️  ${inv.warning}`)
    }
    // Hybrid inverter picker
    else if (item.db_path_by_kwp) {
      const inv = pickInverterHybrid(kwp, db)
      dbPath = inv.dbPath
      if (inv.warning) console.warn(`⚠️  ${inv.warning}`)
    }
    // AC-current-dependent SKU (MCCB, cable)
    else if (item.db_path_by_current) {
      dbPath = item.db_path_by_current[acSizeClass]
    }

    const qty = evalFormula(item.qty_formula, ctx)
    if (qty <= 0) continue

    let priceInfo = dbPath ? getByPath(db.price_database_thb, dbPath) : null
    const unitPrice = priceInfo?.price ?? priceOverride ?? 0
    const subtotal = unitPrice * qty

    const skuName = dbPath ? (splitPath(dbPath)[1] || item.sku) : item.sku
    const row = {
      category: item.category,
      sku: skuName,
      qty,
      unit_price_thb: unitPrice,
      subtotal_thb: subtotal,
      note: item.note || '',
    }
    rows.push(row)

    byCategory[item.category] ??= { items: [], subtotal: 0 }
    byCategory[item.category].items.push(row)
    byCategory[item.category].subtotal += subtotal
  }

  const total = rows.reduce((s, r) => s + r.subtotal_thb, 0)
  const vat = Math.round(total * 0.07)
  const totalWithVat = total + vat

  return {
    summary: {
      template: tpl.id,
      panels,
      watt,
      kwp,
      strings,
      panels_per_string: panelsPerString,
      ac_current_a: Math.round(acCurrentA),
      ac_cable_run_m: acRunM,
      battery_kwh: tplId.includes('hybrid') ? batteryKwh : 0,
    },
    categories: byCategory,
    rows,
    totals: {
      materials_thb: Math.round(total),
      vat_7pct_thb: vat,
      total_with_vat_thb: Math.round(totalWithVat),
    },
  }
}

function thb(n) {
  return '฿' + n.toLocaleString('en-US')
}

function toMarkdown(bom) {
  const { summary, categories, totals } = bom
  let out = `# BOM — ${summary.template}\n\n`
  out += `**System:** ${summary.panels} × ${summary.watt}W = **${summary.kwp} kWp** · ${summary.strings} strings · ${summary.ac_current_a}A AC\n\n`
  if (summary.battery_kwh) out += `**Battery target:** ${summary.battery_kwh} kWh\n\n`

  for (const [cat, data] of Object.entries(categories)) {
    out += `\n## ${cat}\n\n`
    out += `| SKU | Qty | Unit (THB) | Subtotal (THB) | Note |\n`
    out += `|---|---:|---:|---:|---|\n`
    for (const r of data.items) {
      out += `| ${r.sku} | ${r.qty} | ${thb(r.unit_price_thb)} | ${thb(r.subtotal_thb)} | ${r.note} |\n`
    }
    out += `| | | | **${thb(Math.round(data.subtotal))}** | |\n`
  }

  out += `\n---\n\n`
  out += `### Totals\n\n`
  out += `- Materials:     **${thb(totals.materials_thb)}**\n`
  out += `- VAT (7%):      ${thb(totals.vat_7pct_thb)}\n`
  out += `- **Total (incl VAT):** **${thb(totals.total_with_vat_thb)}**\n`

  return out
}

// ─── MAIN ───
const opts = parseArgs()
const bom = calcBOM(opts)
const md = toMarkdown(bom)
console.log(md)

if (opts.outFile) {
  writeFileSync(opts.outFile, md)
  console.error(`\n✓ Saved to ${opts.outFile}`)
}
