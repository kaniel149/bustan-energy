import { describe, expect, it } from 'vitest'
import { assessDemand, safeWebsite, viewportScanArea } from './scan-assessment'
import type { ScanCandidate } from './bustan-crm-service'

const roof = { kind: 'roof', footprint_class: 'roof', roof_area_sqm: 200, estimated_kwp: 24 } as ScanCandidate
describe('consumption screening', () => {
  it('matches daytime energy without treating total roof potential as the recommendation', () => {
    expect(assessDemand(roof, { monthlyKwh: 1200, daytimePercent: 60, dailyYield: 4 })).toEqual({
      recommendedKwp: 6, demandKwp: 6, roofLimited: false, estimatedMonthlyKwh: 720,
    })
  })
  it('caps the size at roof potential', () => {
    expect(assessDemand(roof, { monthlyKwh: 12000, daytimePercent: 60, dailyYield: 4 })?.recommendedKwp).toBe(24)
  })
  it('cannot recommend a system for an unverified parcel or missing demand', () => {
    expect(assessDemand({ ...roof, footprint_class: 'parcel' }, { monthlyKwh: 1200, daytimePercent: 60, dailyYield: 4 })).toBeNull()
    expect(assessDemand(roof, { monthlyKwh: NaN, daytimePercent: 60, dailyYield: 4 })).toBeNull()
    expect(assessDemand(roof, { monthlyKwh: 1200, daytimePercent: 110, dailyYield: 4 })).toBeNull()
  })
})
describe('scan scope and external links', () => {
  it('rejects oversized/reversed/nonfinite bounds before queuing', () => {
    expect(viewportScanArea([[99, 9], [100, 10]])).toBeNull()
    expect(viewportScanArea([[100, 10], [99, 9]])).toBeNull()
    expect(viewportScanArea([[NaN, 9], [100, 10]])).toBeNull()
    const area = viewportScanArea([[99.98, 9.70], [100.01, 9.73]])
    expect(area?.polygon.coordinates[0]).toHaveLength(5)
    expect(area?.bbox).toEqual([99.98, 9.70, 100.01, 9.73])
  })
  it('only permits real web protocols for imported business websites', () => {
    expect(safeWebsite('javascript:alert(1)')).toBeNull()
    expect(safeWebsite('data:text/html,hello')).toBeNull()
    expect(safeWebsite('example.com')).toBe('https://example.com/')
  })
})
