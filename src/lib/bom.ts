/**
 * Auto-build a Bill of Materials (BOM) from a system size in kWp.
 *
 * Faithful, DOM-decoupled TypeScript port of the `selectInverters` +
 * `autoBuildSystem` logic from the static `/crm` app (`crm/index.html`).
 * Pure: takes a kWp target + the supplier price catalog, returns BOM lines
 * (product + qty) + labor. No I/O, no framework.
 *
 * Sizing rules (unchanged): 650 W panels, DC:AC ~1.15 inverter oversize,
 * Antai racking, PV cable per ~120 panels, protection/metering per inverter
 * group, ฿4,500/kWp install labor.
 */
import { SUPPLIER_PRICES, type SupplierPrice } from '../data/supplier-prices'

const PANEL_SKU = 'COMET-2U72-650W'
const PANEL_WATT = 650
const LABOR_THB_PER_KWP = 4500

export interface BomLine {
  product: SupplierPrice
  qty: number
}

export interface BomResult {
  kWp: number
  panels: number
  inverterUnits: number
  lines: BomLine[]
  laborCostThb: number
  /** Equipment cost (sum of line cost_thb × qty), excludes labor. */
  equipmentCostThb: number
  summary: string
}

const parseKw = (value: string): number => {
  const match = String(value).match(/(\d+(?:\.\d+)?)\s*K(?:TL|W)?\b/i)
  return match ? Number(match[1]) : 0
}

/**
 * Greedy best-fit inverter selection for a DC kWp target.
 * Returns a map of inverter SKU → quantity. Mirrors the original algorithm
 * exactly (DC:AC 1.15 oversize, ≥5 kW pool, 0.8× step threshold, guard 40).
 */
export const selectInverters = (
  targetKw: number,
  products: SupplierPrice[] = SUPPLIER_PRICES,
): Record<string, number> => {
  const acTarget = Math.max(targetKw / 1.15, 1) // DC:AC ~1.15 oversize
  const pool = products
    .filter((product) => /inverter/i.test(product.category) && !/accessor/i.test(product.category))
    .map((product) => ({ sku: product.sku, kw: parseKw(product.name) || parseKw(product.sku) }))
    .filter((product) => product.kw >= 5)
    .sort((a, b) => b.kw - a.kw)
  if (!pool.length) return {}

  const picks: Record<string, number> = {}
  let remaining = acTarget
  let guard = 0
  for (const inverter of pool) {
    while (remaining >= inverter.kw * 0.8 && guard < 40) {
      picks[inverter.sku] = (picks[inverter.sku] || 0) + 1
      remaining -= inverter.kw
      guard += 1
    }
  }
  if (remaining > 1) {
    const fit = [...pool].reverse().find((product) => product.kw >= remaining) || pool[pool.length - 1]
    picks[fit.sku] = (picks[fit.sku] || 0) + 1
  }
  return picks
}

/**
 * Build a full system BOM from a kWp target. Lines whose SKU is missing from
 * the catalog are silently skipped (same as the original `addSystemLine`).
 */
export const autoBuildSystem = (
  kWpInput: number,
  products: SupplierPrice[] = SUPPLIER_PRICES,
): BomResult => {
  const kWp = Number(kWpInput) || 0
  const lines: BomLine[] = []
  const bySku = new Map(products.map((p) => [p.sku, p]))

  const addLine = (sku: string, qty: number) => {
    const product = bySku.get(sku)
    const amount = Math.round(Number(qty) || 0)
    if (!product || amount <= 0) return
    lines.push({ product, qty: amount })
  }

  if (kWp <= 0) {
    return { kWp: 0, panels: 0, inverterUnits: 0, lines: [], laborCostThb: 0, equipmentCostThb: 0, summary: 'Enter a system size (kWp)' }
  }

  const nPanels = Math.ceil((kWp * 1000) / PANEL_WATT)
  addLine(PANEL_SKU, nPanels)

  const inverters = selectInverters(kWp, products)
  const inverterUnits = Object.values(inverters).reduce((sum, qty) => sum + qty, 0) || 1
  Object.entries(inverters).forEach(([sku, qty]) => addLine(sku, qty))

  // Racking (Antai) — steel purlin assumption typical for warehouse roofs.
  addLine('ANTAI-RAIL-4200', Math.ceil((nPanels * 2.3) / 4.2))
  addLine('ANTAI-MID-CLAMP-35', nPanels * 2)
  addLine('ANTAI-END-CLAMP-35', Math.ceil(nPanels / 12) * 4)
  addLine('ANTAI-L-FEET-85-HB-STEEL', nPanels * 2)
  addLine('ANTAI-GROUNDING-LUG', Math.ceil(nPanels / 12))

  // PV cable — 1000m red+black drum per ~120 panels.
  const cableDrums = Math.max(1, Math.ceil(nPanels / 120))
  addLine('Solar-Cable-H1Z2Z2-K-1x4mm2-Red-1000m-drum', cableDrums)
  addLine('Solar-Cable-H1Z2Z2-K-1x4mm2-Black-1000m-drum', cableDrums)

  // Protection + metering — per inverter group.
  addLine('BENY-BUD40-3-DC', inverterUnits)
  addLine('MOREDAY-MD1-C40-3P', inverterUnits)
  addLine('Huawei-DTSU666-HW-3-Phase-standard-2-year-warranty', inverterUnits)

  const laborCostThb = Math.round(kWp * LABOR_THB_PER_KWP)
  const equipmentCostThb = lines.reduce((sum, line) => sum + line.product.cost_thb * line.qty, 0)

  return {
    kWp,
    panels: nPanels,
    inverterUnits,
    lines,
    laborCostThb,
    equipmentCostThb,
    summary: `Auto-build: ${kWp} kWp · ${nPanels} panels · ${inverterUnits} inverter(s)`,
  }
}
