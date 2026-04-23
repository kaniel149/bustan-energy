// ============================================================
// /api/admin-bom
// INTERNAL ONLY — generates BOM + supplier procurement text.
// Client never sees this. Triggered after proposal signature.
// ============================================================
export const config = { runtime: 'edge' }

import templatesJson from '../tools/proposal-builder/bom-templates.json' with { type: 'json' }

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_DOMAIN = '@energy-tm.com'
const EXTRA = ['k@kanielt.com']
const allowed = (e: string) => e.endsWith(ADMIN_DOMAIN) || EXTRA.includes(e)

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${auth.slice(7)}` },
  })
  if (!r.ok) return null
  const user = await r.json()
  const email = user?.email?.toLowerCase()
  return email && allowed(email) ? email : null
}

// ── BOM calc logic (ported from bom-calc.mjs) ──

function splitPath(path: string): [string, string?] {
  const i = path.indexOf('.')
  return i === -1 ? [path] : [path.slice(0, i), path.slice(i + 1)]
}

function getByPath(db: any, path: string): any {
  const [cat, sku] = splitPath(path)
  return sku ? db[cat]?.[sku] : db[cat]
}

function evalFormula(formula: any, ctx: Record<string, number>): number {
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
    // eslint-disable-next-line no-new-func
    const fn = new Function('funcs', `return (${safe})`)
    return Math.max(0, Math.round(fn(funcs)))
  } catch {
    return 0
  }
}

function pickInverterGridTied(kwp: number, db: any): any {
  const inverters = db.price_database_thb.inverters_grid_tied
  const sorted = Object.entries(inverters).sort((a: any, b: any) => a[1].max_dc_kw - b[1].max_dc_kw)
  for (const [sku, info] of sorted as any) {
    if (info.max_dc_kw >= kwp * 1.05) return { sku, ...info, dbPath: `inverters_grid_tied.${sku}` }
  }
  const [sku, info] = sorted[sorted.length - 1] as any
  return { sku, ...info, dbPath: `inverters_grid_tied.${sku}`, warning: 'exceeds largest inverter — split into 2 units' }
}

function pickInverterHybrid(kwp: number, db: any): any {
  const h = db.price_database_thb.inverters_hybrid
  if (kwp <= 18) return { sku: 'Huawei_SUN2000_12KTL_M2', ...h.Huawei_SUN2000_12KTL_M2, dbPath: 'inverters_hybrid.Huawei_SUN2000_12KTL_M2' }
  if (kwp <= 30) return { sku: 'Huawei_SUN2000_20KTL_M5', ...h.Huawei_SUN2000_20KTL_M5, dbPath: 'inverters_hybrid.Huawei_SUN2000_20KTL_M5' }
  return { sku: 'Huawei_SUN2000_50KTL_NHM1', ...h.Huawei_SUN2000_50KTL_NHM1, dbPath: 'inverters_hybrid.Huawei_SUN2000_50KTL_NHM1' }
}

function calcBOM(opts: { panels: number; watt: number; template: string; batteryKwh?: number; acRunM?: number }) {
  const db: any = templatesJson
  const tpl = db.templates.find((t: any) => t.id === opts.template)
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

  const rows: any[] = []
  const byCategory: Record<string, { items: any[]; subtotal: number }> = {}

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

    const priceInfo = dbPath ? getByPath(db.price_database_thb, dbPath) : null
    const unitPrice = priceInfo?.price ?? priceOverride ?? 0
    const subtotal = unitPrice * qty
    const skuName = dbPath ? splitPath(dbPath)[1] || item.sku : item.sku

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
  }
}

// Supplier email generator — RFP in English
function buildSupplierEmail(bom: any, client: { name?: string; site?: string; ref?: string }): string {
  const { summary, categories, totals } = bom
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
  lines.push('')
  lines.push('ITEMS REQUIRED')
  lines.push('─────────────────────────────────────────────────────────')

  for (const [cat, data] of Object.entries(categories) as any) {
    lines.push('')
    lines.push(`━━ ${cat} ━━`)
    for (const r of data.items) {
      const padding = r.sku.length > 42 ? 0 : 42 - r.sku.length
      lines.push(`  • ${r.sku}${' '.repeat(padding)} qty ${r.qty}${r.note ? ` (${r.note})` : ''}`)
    }
  }

  lines.push('')
  lines.push('ESTIMATE (based on benchmark prices — please confirm)')
  lines.push('─────────────────────────────────────────────────────────')
  lines.push(`Materials subtotal:  ${thb(totals.materials_thb)}`)
  lines.push(`VAT 7%:              ${thb(totals.vat_7pct_thb)}`)
  lines.push(`Total with VAT:      ${thb(totals.total_with_vat_thb)}`)
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
function buildMarkdown(bom: any): string {
  const { summary, categories, totals } = bom
  const thb = (n: number) => '฿' + n.toLocaleString('en-US')
  let out = `# BOM — ${summary.template_name}\n\n`
  out += `**System:** ${summary.panels} × ${summary.watt}W = **${summary.kwp} kWp** · ${summary.strings} strings · ${summary.ac_current_a}A AC\n`
  if (summary.battery_kwh) out += `**Battery:** ${summary.battery_kwh} kWh target\n`
  out += `\n`

  for (const [cat, data] of Object.entries(categories) as any) {
    out += `\n## ${cat}\n\n`
    out += `| SKU | Qty | Unit (THB) | Subtotal (THB) |\n`
    out += `|---|---:|---:|---:|\n`
    for (const r of data.items) {
      out += `| ${r.sku} | ${r.qty} | ${thb(r.unit_price_thb)} | ${thb(r.subtotal_thb)} |\n`
    }
    out += `| | | | **${thb(Math.round(data.subtotal))}** |\n`
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

    const body = await req.json()
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
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
