import { describe, it, expect } from 'vitest'
import { calcSolar, formatThb } from '../../api/_lib/outreach/assumptions'

describe('calcSolar', () => {
  it('computes kwp and savings for a 2400 sqm roof', () => {
    // 2400 * 0.85 / 6 = 340 kWp; 340 * 4.2 * 30 * 4.5 = 192,780 → rounds to 193,000
    const f = calcSolar(2400)
    expect(f).not.toBeNull()
    expect(f!.kwp).toBe(340)
    expect(f!.monthlySavingThb).toBe(193000)
    expect(f!.annualSavingThb).toBe(193000 * 12)
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
