import { describe, it, expect } from 'vitest'
import { CAT_ICONS, GRADE_COLORS, footprintBadge, hasExistingSolar, applyScanFilters, toFeatureCollection, DEFAULT_FILTERS, whatsappLink, noteKey } from './scan-review'
import type { ScanCandidate } from './bustan-crm-service'

const base = { id: 'u1', status: 'pending', kind: 'roof', name: 'Treechart Hostel', lat: 9.708598, lon: 99.990975, roof_area_sqm: 994, estimated_kwp: 126.56,
  priority: 'A', solar_potential_score: 100, category: 'hospitality', footprint_class: null, roof_pct: null, existing_solar: null, solar_check_confidence: null,
  panel_coverage_pct: null, phone: '0946692011', external_source: 'osm', external_id: '479104039', roof_geom: { type: 'Polygon', coordinates: [[[99.99, 9.70], [99.991, 9.70], [99.991, 9.701], [99.99, 9.70]]] } } as unknown as ScanCandidate
const c = (over: Partial<ScanCandidate>): ScanCandidate => ({ ...base, ...over })

describe('footprintBadge', () => {
  it('mirrors kp-solar-pro: parcel → land, compound → several, unclear → verify', () => {
    expect(footprintBadge(c({ footprint_class: 'parcel' }))).toBe('land, not a roof')
    expect(footprintBadge(c({ footprint_class: 'compound' }))).toBe('several buildings')
    expect(footprintBadge(c({ footprint_class: 'unclear' }))).toBe('verify footprint')
    expect(footprintBadge(c({ footprint_class: 'roof' }))).toBe('')
    expect(footprintBadge(base)).toBe('')
  })
})
describe('hasExistingSolar', () => {
  it('is true only on a confident positive (existing_solar=true and confidence ≥ 0.5)', () => {
    expect(hasExistingSolar(c({ existing_solar: true, solar_check_confidence: 0.9 }))).toBe(true)
    expect(hasExistingSolar(c({ existing_solar: true, solar_check_confidence: 0.3 }))).toBe(false)
    expect(hasExistingSolar(c({ existing_solar: true, solar_check_confidence: null }))).toBe(true)
    expect(hasExistingSolar(base)).toBe(false)
  })
})
describe('applyScanFilters', () => {
  const list = [base, c({ id: 'u2', priority: 'B', estimated_kwp: 40, category: 'retail', name: 'Big C' }),
    c({ id: 'u3', priority: 'A', existing_solar: true, solar_check_confidence: 0.8 }), c({ id: 'u4', status: 'added', name: 'In CRM' })]
  it('defaults: pending only, excludes confident PV, all grades', () => {
    expect(applyScanFilters(list, DEFAULT_FILTERS).map((x) => x.id)).toEqual(['u1', 'u2'])
  })
  it('grade, category, min score/kwp, search and pipeline toggle', () => {
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, grades: ['B'] }).map((x) => x.id)).toEqual(['u2'])
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, category: 'retail' }).map((x) => x.id)).toEqual(['u2'])
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, minKwp: 100 }).map((x) => x.id)).toEqual(['u1'])
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, search: 'big' }).map((x) => x.id)).toEqual(['u2'])
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, includeSolar: true }).map((x) => x.id)).toEqual(['u1', 'u2', 'u3'])
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, showInCrm: true }).map((x) => x.id)).toEqual(['u1', 'u2', 'u4'])
  })
})
describe('toFeatureCollection', () => {
  it('emits a polygon (or point fallback) per candidate with grade colour + badge props', () => {
    const fc = toFeatureCollection([base, c({ id: 'u5', roof_geom: null })])
    expect(fc.features).toHaveLength(2)
    expect(fc.features[0].geometry.type).toBe('Polygon'); expect(fc.features[1].geometry.type).toBe('Point')
    expect(fc.features[0].properties).toMatchObject({ id: 'u1', grade: 'A', color: GRADE_COLORS.A, kwp: 126.56, badge: '', pv: false, icon: CAT_ICONS.hospitality })
  })
})
describe('helpers', () => {
  it('whatsapp link normalises Thai numbers; note key prefers the uuid', () => {
    expect(whatsappLink(base, 'Hi')).toBe('https://wa.me/66946692011?text=Hi')
    expect(whatsappLink(c({ phone: null }), 'Hi')).toBeNull()
    expect(noteKey(base)).toBe('u1')
  })
})
