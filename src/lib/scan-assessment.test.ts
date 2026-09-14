import { describe, expect, it } from 'vitest'
import { assessDemand, safeWebsite, viewportScanArea, scanJobSummary } from './scan-assessment'
import type { ScanCandidate } from './bustan-crm-service'

const roof = { kind: 'roof', footprint_class: 'roof', roof_area_sqm: 200, estimated_kwp: 24 } as ScanCandidate
describe('scan worker history contract', () => {
  it('reads the candidates counter produced by the worker and all source counts', () => {
    expect(scanJobSummary({ candidates: 4, found: 7, overture: 3, coverage: 'partial' })).toEqual({ added: 4, examined: 10, coverage: 'partial' })
  })
  it('does not infer source completeness for legacy jobs', () => {
    expect(scanJobSummary({ candidates: 2, found: 3 })).toEqual({ added: 2, examined: 3, coverage: 'unknown' })
    expect(scanJobSummary({ inserted: 0, found: 0, coverage: 'available_sources_processed' })).toEqual({ added: 0, examined: 0, coverage: 'processed' })
  })
  it('preserves unknown and invalid counters instead of inventing zero results', () => {
    expect(scanJobSummary(null)).toEqual({ added: null, examined: null, coverage: 'unknown' })
    expect(scanJobSummary({ candidates: -1, found: NaN }).added).toBeNull()
  })
})
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
