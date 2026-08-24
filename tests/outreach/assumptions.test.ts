import { describe, it, expect } from 'vitest'
import { calcSolar, formatThb } from '../../api/_lib/outreach/assumptions'
import { TM_SOLAR_ASSUMPTIONS } from '../../src/lib/solar-financials'

describe('calcSolar', () => {
  it('computes kwp and savings for a 2400 sqm roof', () => {
    // 2400 * 0.85 / 6 = 340 kWp
    // yield  = 5.0 PSH * 0.77 PR * 0.97 soiling = 3.7345 kWh/kWp/day
    // value  = 0.60 * 4.4 retail + 0.40 * 3.1 export = 3.88 THB/kWh
    // 340 * 3.7345 * 30 * 3.88 = 147,797 → rounds to 148,000
    //
    // This expectation was 193,000 until 2026-08-23, from standalone constants
    // (4.2 kWh/kWp/day × 4.5 THB/kWh) that overstated savings by ~31% against the
    // proposal the same prospect receives later. The test encoded the discrepancy;
    // both now derive from TM_SOLAR_ASSUMPTIONS. If this figure ever drifts from
    // the proposal engine again, that is the bug — not this number.
    const f = calcSolar(2400)
    expect(f).not.toBeNull()
    expect(f!.kwp).toBe(340)
    expect(f!.monthlySavingThb).toBe(148000)
    expect(f!.annualSavingThb).toBe(148000 * 12)
  })

  it('never promises more than the proposal engine will quote', () => {
    // Regression guard for the 2026-08 drift: outreach must not out-promise the
    // proposal. Compare against the proposal's own baseline for the same system.
    const f = calcSolar(2400)!
    const proposalMonthly =
      (f.kwp * TM_SOLAR_ASSUMPTIONS.pshAnnual * 365 *
        TM_SOLAR_ASSUMPTIONS.performanceRatio * TM_SOLAR_ASSUMPTIONS.soilingFactor *
        (TM_SOLAR_ASSUMPTIONS.selfConsumptionGridTied * TM_SOLAR_ASSUMPTIONS.retailRateThb +
          (1 - TM_SOLAR_ASSUMPTIONS.selfConsumptionGridTied) * TM_SOLAR_ASSUMPTIONS.exportRateThb)) / 12
    // Allow the ±1000 THB rounding in calcSolar, nothing more.
    expect(f.monthlySavingThb).toBeLessThanOrEqual(proposalMonthly + 1000)
  })

  it('returns null for tiny, zero, or missing roofs', () => {
    expect(calcSolar(0)).toBeNull()
    expect(calcSolar(50)).toBeNull() // ~7 kWp < 10 kWp B2B floor
    expect(calcSolar(NaN)).toBeNull()
  })
})

describe('formatThb', () => {
  it('formats with thousands separators and ฿', () => {
    expect(formatThb(193000)).toBe('฿193,000')
  })
})
