import { describe, it, expect } from 'vitest'
import { autoBuildSystem, selectInverters } from './bom'
import { SUPPLIER_PRICES } from '../data/supplier-prices'

describe('autoBuildSystem', () => {
  it('returns an empty BOM for non-positive kWp', () => {
    const r = autoBuildSystem(0)
    expect(r.lines).toHaveLength(0)
    expect(r.laborCostThb).toBe(0)
  })

  it('sizes panels at 650 W and labor at ฿4,500/kWp', () => {
    const r = autoBuildSystem(100)
    expect(r.panels).toBe(Math.ceil((100 * 1000) / 650)) // 154
    expect(r.panels).toBe(154)
    expect(r.laborCostThb).toBe(450000)
  })

  it('includes a real panel line of the right quantity', () => {
    const r = autoBuildSystem(100)
    const panel = r.lines.find((l) => l.product.sku === 'COMET-2U72-650W')
    expect(panel).toBeDefined()
    expect(panel!.qty).toBe(154)
  })

  it('every BOM line references a real catalog product', () => {
    const skus = new Set(SUPPLIER_PRICES.map((p) => p.sku))
    const r = autoBuildSystem(50)
    expect(r.lines.length).toBeGreaterThan(0)
    for (const line of r.lines) expect(skus.has(line.product.sku)).toBe(true)
  })

  it('selects at least one inverter and computes equipment cost', () => {
    const r = autoBuildSystem(30)
    expect(r.inverterUnits).toBeGreaterThanOrEqual(1)
    expect(r.equipmentCostThb).toBeGreaterThan(0)
  })
})

describe('selectInverters', () => {
  it('covers the AC target (DC:AC ~1.15) for a 100 kWp system', () => {
    const picks = selectInverters(100)
    const units = Object.values(picks).reduce((s, q) => s + q, 0)
    expect(units).toBeGreaterThanOrEqual(1)
  })
  it('returns nothing when no inverters in the catalog', () => {
    expect(selectInverters(100, [])).toEqual({})
  })
})
