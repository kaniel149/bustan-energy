// ============================================================
// /api/admin-bom
// INTERNAL ONLY — generates BOM + supplier procurement text.
// Client never sees this. Triggered after proposal signature.
// ============================================================
export const config = { runtime: 'edge' }

// @ts-expect-error - Vercel esbuild handles JSON imports without attributes
import templatesJson from '../tools/proposal-builder/bom-templates.json'
import {
  resolveSupplierPrice,
  supplierCatalogStats,
  type SupplierPriceStatus,
} from '../src/lib/supplier-pricing.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_DOMAIN = '@energy-tm.com'
const EXTRA = ['k@kanielt.com']
const allowed = (e: string) => e.endsWith(ADMIN_DOMAIN) || EXTRA.includes(e)

interface AuthUser {
  email?: string
}

interface PriceInfo {
  price?: number
  kw?: number
  max_dc_kw?: number
  [key: string]: unknown
}

interface PriceDatabase {
  inverters_grid_tied: Record<string, PriceInfo>
  inverters_hybrid: Record<string, PriceInfo>
  [category: string]: Record<string, PriceInfo>
}

interface BomTemplateItem {
  category: string
  sku?: string
  db_path?: string
  db_path_by_kwp?: boolean
  db_path_by_current?: Record<string, string>
  auto_pick_by?: 'kwp' | string
  qty_formula: string | number
  price_override_thb?: number
  note?: string
}

interface BomTemplate {
  id: string
  name: string
  defaults: {
    panels_per_string?: number
    battery_kwh_target?: number
    ac_cable_run_m?: number
  }
  items: BomTemplateItem[]
}

interface BomTemplatesDb {
  templates: BomTemplate[]
  price_database_thb: PriceDatabase
}

interface PickedInverter extends PriceInfo {
  sku: string
  dbPath: string
  warning?: string
}

interface BomRow {
  category: string
  sku: string
  qty: number
  unit_price_thb: number
  subtotal_thb: number
  note: string
  benchmark_unit_price_thb: number
  price_status: SupplierPriceStatus
  supplier_name?: string
  supplier_source?: string
  supplier_sku?: string
  supplier_url?: string
  supplier_valid_until?: string
  supplier_price_name?: string
  price_note?: string
}

interface BomCategory {
  items: BomRow[]
  subtotal: number
}

interface BomResult {
  summary: {
    template: string
    template_name: string
    panels: number
    watt: number
    kwp: number
    strings: number
    ac_current_a: number
    ac_cable_run_m: number
    battery_kwh: number
  }
  categories: Record<string, BomCategory>
  rows: BomRow[]
  totals: {
    materials_thb: number
    vat_7pct_thb: number
    total_with_vat_thb: number
  }
  supplier_summary: {
    catalog_captured_at: string
    catalog_total_items: number
    supplier_matched_rows: number
    live_rows: number
    expired_rows: number
    benchmark_rows: number
    supplier_materials_thb: number
    benchmark_materials_thb: number
  }
}

interface BomRequestBody {
  panels?: number
  watt?: number
  template?: string
  battery_kwh?: number
  ac_run_m?: number
  proposal_ref?: string
  client_name?: string
  client_site?: string
}

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${auth.slice(7)}` },
  })
  if (!r.ok) return null
  const user = await r.json() as AuthUser
  const email = user?.email?.toLowerCase()
  return email && allowed(email) ? email : null
}

// ── BOM calc logic (ported from bom-calc.mjs) ──

function splitPath(path: string): [string, string?] {
  const i = path.indexOf('.')
  return i === -1 ? [path] : [path.slice(0, i), path.slice(i + 1)]
}

function getByPath(db: PriceDatabase, path: string): PriceInfo | undefined {
  const [cat, sku] = splitPath(path)
  return sku ? db[cat]?.[sku] : undefined
}

function evalFormula(formula: string | number, ctx: Record<string, number>): number {
  if (typeof formula === 'number') return formula
  if (typeof formula !== 'string') return 0
  if (/^\d+$/.test(formula.trim())) return parseInt(formula, 10)
  const funcs = { ceil: Math.ceil, floor: Math.floor, round: Math.round, max: Math.max, min: Math.min }
  const safe = formula.replace(/\b[a-z_]\w*\b/gi, (name) => {
    if (name in ctx) return `(${ctx[name as keyof typeof ctx]})`
    if (name in funcs) return `funcs.${name}`
    return '0'
  })
  try {
    const fn = new Function('funcs', `return (${safe})`)
    return Math.max(0, Math.round(fn(funcs)))
  } catch {
    return 0
  }
}

function pickInverterGridTied(kwp: number, db: BomTemplatesDb): PickedInverter {
  const inverters = db.price_database_thb.inverters_grid_tied
  const sorted = Object.entries(inverters).sort((a, b) => (a[1].max_dc_kw ?? 0) - (b[1].max_dc_kw ?? 0))
  for (const [sku, info] of sorted) {
    if ((info.max_dc_kw ?? 0) >= kwp * 1.05) return { sku, ...info, dbPath: `inverters_grid_tied.${sku}` }
  }
  const [sku, info] = sorted[sorted.length - 1]
  return { sku, ...info, dbPath: `inverters_grid_tied.${sku}`, warning: 'exceeds largest inverter — split into 2 units' }
}

function pickInverterHybrid(kwp: number, db: BomTemplatesDb): PickedInverter {
  const h = db.price_database_thb.inverters_hybrid
  if (kwp <= 18) return { sku: 'Huawei_SUN2000_12KTL_M2', ...h.Huawei_SUN2000_12KTL_M2, dbPath: 'inverters_hybrid.Huawei_SUN2000_12KTL_M2' }
  if (kwp <= 30) return { sku: 'Huawei_SUN2000_20KTL_M5', ...h.Huawei_SUN2000_20KTL_M5, dbPath: 'inverters_hybrid.Huawei_SUN2000_20KTL_M5' }
  return { sku: 'Huawei_SUN2000_50KTL_NHM1', ...h.Huawei_SUN2000_50KTL_NHM1, dbPath: 'inverters_hybrid.Huawei_SUN2000_50KTL_NHM1' }
}

function calcBOM(opts: { panels: number; watt: number; template: string; batteryKwh?: number; acRunM?: number }): BomResult {
  const db = templatesJson as unknown as BomTemplatesDb
  const tpl = db.templates.find((t) => t.id === opts.template)
  if (!tpl) throw new Error(`Template not found: ${opts.template}`)

  const panels = opts.panels
  const watt = opts.watt
  const kwp = Math.round(panels * watt / 1000 * 100) / 100
  const acCurrentA = kwp * 1000 / (1.732 * 400 * 0.95)
  const panelsPerString = tpl.defaults.panels_per_string || 13
  const strings = Math.ceil(panels / panelsPerString)
  const acSizeClass = acCurrentA < 200 ? 'under_200a' : 'over_200a'
  const batteryKwh = opts.batteryKwh ?? tpl.defaults.battery_kwh_target ?? 0
  const acRunM = opts.acRunM ?? tpl.defaults.ac_cable_run_m ?? 15

  const ctx = { panels, kwp, strings, ac_cable_run_m: acRunM, battery_kwh_target: batteryKwh }

  const rows: BomRow[] = []
  const byCategory: Record<string, BomCategory> = {}

  for (const item of tpl.items) {
    let dbPath = item.db_path
    const priceOverride = item.price_override_thb

    if (item.auto_pick_by === 'kwp') {
      const inv = pickInverterGridTied(kwp, db)
      dbPath = inv.dbPath
    } else if (item.db_path_by_kwp) {
      const inv = pickInverterHybrid(kwp, db)
      dbPath = inv.dbPath
    } else if (item.db_path_by_current) {
      dbPath = item.db_path_by_current[acSizeClass]
    }

    const qty = evalFormula(item.qty_formula, ctx)
    if (qty <= 0) continue

    const skuName = (dbPath ? splitPath(dbPath)[1] || item.sku : item.sku) || 'Unknown_SKU'
    const priceInfo = dbPath ? getByPath(db.price_database_thb, dbPath) : null
    const benchmarkUnitPrice = priceInfo?.price ?? priceOverride ?? 0
    const resolvedPrice = resolveSupplierPrice(skuName, item.category, benchmarkUnitPrice)
    const unitPrice = resolvedPrice.unit_price_thb
    const subtotal = unitPrice * qty

    const row = {
      category: item.category,
      sku: skuName,
      qty,
      unit_price_thb: unitPrice,
      subtotal_thb: subtotal,
      note: item.note || '',
      ...resolvedPrice,
    }
    rows.push(row)
    byCategory[item.category] ??= { items: [], subtotal: 0 }
    byCategory[item.category].items.push(row)
    byCategory[item.category].subtotal += subtotal
  }

  const total = rows.reduce((s, r) => s + r.subtotal_thb, 0)
  const vat = Math.round(total * 0.07)
  const catalog = supplierCatalogStats()
  const benchmarkMaterials = rows.reduce((s, r) => s + (r.benchmark_unit_price_thb * r.qty), 0)
  const supplierMatchedRows = rows.filter((r) => r.price_status !== 'benchmark').length
  const liveRows = rows.filter((r) => r.price_status === 'live').length
  const expiredRows = rows.filter((r) => r.price_status === 'expired').length
  const benchmarkRows = rows.filter((r) => r.price_status === 'benchmark').length

  return {
    summary: {
      template: tpl.id,
      template_name: tpl.name,
      panels, watt, kwp, strings,
      ac_current_a: Math.round(acCurrentA),
      ac_cable_run_m: acRunM,
      battery_kwh: opts.template.includes('hybrid') ? batteryKwh : 0,
    },
    categories: byCategory,
    rows,
    totals: {
      materials_thb: Math.round(total),
      vat_7pct_thb: vat,
      total_with_vat_thb: Math.round(total + vat),
    },
    supplier_summary: {
      catalog_captured_at: catalog.captured_at,
      catalog_total_items: catalog.total_items,
      supplier_matched_rows: supplierMatchedRows,
      live_rows: liveRows,
      expired_rows: expiredRows,
      benchmark_rows: benchmarkRows,
      supplier_materials_thb: Math.round(total),
      benchmark_materials_thb: Math.round(benchmarkMaterials),
    },
  }
}

// Supplier email generator — RFP in English
function buildSupplierEmail(bom: BomResult, client: { name?: string; site?: string; ref?: string }): string {
  const { summary, categories, totals, supplier_summary } = bom
  const thb = (n: number) => '฿' + n.toLocaleString('en-US')

  const lines: string[] = []
  lines.push(`Subject: Quotation Request — ${summary.kwp} kWp ${summary.template.includes('hybrid') ? 'Hybrid' : 'Grid-Tied'} PV System${client.site ? ` · ${client.site}` : ''}`)
  lines.push('')
  lines.push('Hello,')
  lines.push('')
  lines.push(`Please provide a quotation for the following complete PV system materials.`)
  lines.push('')
  lines.push('PROJECT OVERVIEW')
  lines.push('─────────────────────────────────────────────────────────')
  if (client.ref) lines.push(`Reference:       ${client.ref}`)
  if (client.name) lines.push(`Client:          ${client.name}`)
  if (client.site) lines.push(`Site:            ${client.site}`)
  lines.push(`System Size:     ${summary.kwp} kWp DC · ${summary.panels} × ${summary.watt}W modules`)
  lines.push(`Strings:         ${summary.strings} (${Math.ceil(summary.panels/summary.strings)} panels/string avg)`)
  lines.push(`AC Current:      ${summary.ac_current_a} A @ 400V 3-phase`)
  lines.push(`AC Cable Run:    ${summary.ac_cable_run_m} m to main panel`)
  lines.push(`Grid:            PEA (Provincial Electricity Authority) compliant`)
  if (summary.battery_kwh) lines.push(`Battery Target:  ${summary.battery_kwh} kWh`)
  lines.push(`Price Basis:     ${supplier_summary.live_rows} live rows · ${supplier_summary.expired_rows} expired supplier rows · ${supplier_summary.benchmark_rows} benchmark rows`)
  lines.push('')
  lines.push('ITEMS REQUIRED')
  lines.push('─────────────────────────────────────────────────────────')

  for (const [cat, data] of Object.entries(categories)) {
    lines.push('')
    lines.push(`━━ ${cat} ━━`)
    for (const r of data.items) {
      const padding = r.sku.length > 42 ? 0 : 42 - r.sku.length
      const supplier = r.supplier_name ? ` · supplier: ${r.supplier_name}${r.supplier_sku ? ` / ${r.supplier_sku}` : ''}` : ''
      const priceState = r.price_status === 'benchmark' ? 'benchmark' : r.price_status === 'expired' ? 'supplier price expired' : 'supplier price live'
      lines.push(`  • ${r.sku}${' '.repeat(padding)} qty ${r.qty} · ${priceState}${supplier}${r.note ? ` (${r.note})` : ''}`)
      if (r.price_note) lines.push(`    note: ${r.price_note}`)
    }
  }

  lines.push('')
  lines.push('ESTIMATE (supplier catalog where matched — please confirm)')
  lines.push('─────────────────────────────────────────────────────────')
  lines.push(`Materials subtotal:  ${thb(totals.materials_thb)}`)
  lines.push(`VAT 7%:              ${thb(totals.vat_7pct_thb)}`)
  lines.push(`Total with VAT:      ${thb(totals.total_with_vat_thb)}`)
  if (supplier_summary.expired_rows > 0) {
    lines.push(`Warning:             ${supplier_summary.expired_rows} supplier-matched rows use expired prices and require reconfirmation.`)
  }
  lines.push('')
  lines.push('REQUEST')
  lines.push('─────────────────────────────────────────────────────────')
  lines.push('Please provide:')
  lines.push('  1. Itemized quotation with unit prices (THB, incl VAT 7%)')
  lines.push('  2. Lead time per item (in stock / pre-order days)')
  lines.push('  3. Delivery cost to Koh Phangan, Surat Thani 84280')
  lines.push('  4. Warranty terms (inverter, modules, mounting)')
  lines.push('  5. Any equivalent alternatives for preferred-brand items')
  lines.push('')
  lines.push('Payment: standard (to be discussed)')
  lines.push('Requested delivery window: within 30 days of PO')
  lines.push('')
  lines.push('Thank you.')
  lines.push('')
  lines.push('TM Energy')
  lines.push('Koh Phangan, Thailand')
  lines.push('contracts@energy-tm.com · +66 94 669 2011')

  return lines.join('\n')
}

// Markdown BOM for internal docs
function buildMarkdown(bom: BomResult): string {
  const { summary, categories, totals, supplier_summary } = bom
  const thb = (n: number) => '฿' + n.toLocaleString('en-US')
  let out = `# BOM — ${summary.template_name}\n\n`
  out += `**System:** ${summary.panels} × ${summary.watt}W = **${summary.kwp} kWp** · ${summary.strings} strings · ${summary.ac_current_a}A AC\n`
  if (summary.battery_kwh) out += `**Battery:** ${summary.battery_kwh} kWh target\n`
  out += `**Price basis:** ${supplier_summary.live_rows} live · ${supplier_summary.expired_rows} expired · ${supplier_summary.benchmark_rows} benchmark rows\n`
  out += `\n`

  for (const [cat, data] of Object.entries(categories)) {
    out += `\n## ${cat}\n\n`
    out += `| SKU | Supplier | Status | Qty | Unit (THB) | Subtotal (THB) |\n`
    out += `|---|---|---|---:|---:|---:|\n`
    for (const r of data.items) {
      const supplier = r.supplier_name || 'Benchmark'
      out += `| ${r.sku} | ${supplier}${r.supplier_sku ? ` / ${r.supplier_sku}` : ''} | ${r.price_status} | ${r.qty} | ${thb(r.unit_price_thb)} | ${thb(r.subtotal_thb)} |\n`
    }
    out += `| | | | | | **${thb(Math.round(data.subtotal))}** |\n`
  }

  out += `\n---\n\n`
  out += `- Materials: **${thb(totals.materials_thb)}**\n`
  out += `- VAT 7%: ${thb(totals.vat_7pct_thb)}\n`
  out += `- **Total w/ VAT: ${thb(totals.total_with_vat_thb)}**\n`
  return out
}

// ── HANDLER ──
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const email = await verifyAdmin(req)
    if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json() as BomRequestBody
    const {
      panels,
      watt = 555,
      template = 'grid-tied-commercial-metal-roof',
      battery_kwh,
      ac_run_m,
      proposal_ref,
      client_name,
      client_site,
    } = body

    if (!panels || panels < 1) {
      return Response.json({ ok: false, error: 'missing_panels' }, { status: 400 })
    }

    const bom = calcBOM({
      panels,
      watt,
      template,
      batteryKwh: battery_kwh,
      acRunM: ac_run_m,
    })

    const supplierEmail = buildSupplierEmail(bom, {
      name: client_name,
      site: client_site,
      ref: proposal_ref,
    })
    const markdown = buildMarkdown(bom)

    return Response.json({
      ok: true,
      bom,
      supplier_email_text: supplierEmail,
      markdown,
      generated_by: email,
      generated_at: new Date().toISOString(),
    })
  } catch (e: unknown) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
