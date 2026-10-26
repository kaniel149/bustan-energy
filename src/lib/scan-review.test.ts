import { describe, it, expect, vi } from 'vitest'
import { CAT_ICONS, GRADE_COLORS, footprintBadge, hasExistingSolar, applyScanFilters, toFeatureCollection, DEFAULT_FILTERS, whatsappLink, noteKey, loadNotes, saveNote, NOTES_KEY, sizingSummary, categoryLabel, footprintLabel, displayName, solarCheckLabel } from './scan-review'
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
    expect(hasExistingSolar(c({ existing_solar: true, solar_check_confidence: Number.POSITIVE_INFINITY }))).toBe(false)
    expect(hasExistingSolar(c({ existing_solar: true, solar_check_confidence: 20 }))).toBe(false)
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


describe('scan sizing and labels', () => {
  it('keeps roof potential separate from a recommended system size', () => {
    expect(sizingSummary(base)).toMatchObject({ roofAreaSqm: 994, estimatedCapacityKwp: 126.56, recommendationKwp: null, status: 'roof_estimate' })
    for (const footprint_class of ['parcel', 'compound', 'unclear'] as const) {
      expect(sizingSummary(c({ footprint_class }))).toMatchObject({ roofAreaSqm: null, estimatedCapacityKwp: null, recommendationKwp: null, status: 'needs_roof_verification' })
    }
    expect(sizingSummary(c({ kind: 'land' })).estimatedCapacityKwp).toBeNull()
  })

  it('does not turn missing, negative or nonfinite sizing inputs into zero estimates', () => {
    for (const value of [null, -5, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(sizingSummary(c({ roof_area_sqm: value, estimated_kwp: value }))).toMatchObject({ roofAreaSqm: null, estimatedCapacityKwp: null, status: 'missing_estimate' })
    }
    expect(applyScanFilters([c({ estimated_kwp: Number.NaN }), c({ footprint_class: 'parcel' })], { ...DEFAULT_FILTERS, minKwp: 1 })).toEqual([])
  })

  it('provides Hebrew labels and separates untested solar from a negative result', () => {
    expect(categoryLabel(base)).toBe('מלונאות ואירוח')
    expect(categoryLabel(c({ category: '', property_type: 'residential' }))).toBe('מגורים')
    expect(footprintLabel(c({ footprint_class: 'parcel' }))).toContain('קרקע')
    expect(displayName(c({ name: '  ' }))).toBe('גג u1')
    expect(solarCheckLabel(base)).toContain('טרם נבדק')
    expect(solarCheckLabel(c({ existing_solar: false, solar_check_confidence: 0.8 }))).toBe('לא זוהתה מערכת סולארית')
    expect(solarCheckLabel(c({ existing_solar: false, solar_check_confidence: 0.2 }))).toContain('נדרש אימות')
  })
})

describe('search normalization', () => {
  it('searches normalized identity, category, phone and website fields', () => {
    const candidate = c({ name: ' Treechart   Hostel ', website: 'https://treechart.example' })
    for (const search of [' HOSTEL  treechart ', 'מלונאות', 'u1', '094 669 2011', 'treechart.example']) {
      expect(applyScanFilters([candidate], { ...DEFAULT_FILTERS, search })).toEqual([candidate])
    }
    expect(applyScanFilters([candidate], { ...DEFAULT_FILTERS, search: 'unknown hostel' })).toEqual([])
  })
})

describe('invalid map geometry', () => {
  it('skips missing, nonfinite, out-of-range and origin coordinates instead of producing [0,0]', () => {
    const invalid = [
      c({ roof_geom: null, lat: null, lon: null }),
      c({ roof_geom: null, lat: null }),
      c({ roof_geom: null, lat: Number.NaN }),
      c({ roof_geom: null, lon: Number.POSITIVE_INFINITY }),
      c({ roof_geom: null, lat: 91 }),
      c({ roof_geom: null, lon: -181 }),
      c({ roof_geom: null, lat: 0, lon: 0 }),
    ]
    expect(toFeatureCollection(invalid).features).toEqual([])
    expect(toFeatureCollection([c({ lat: null, lon: null })]).features[0].geometry.type).toBe('Polygon')
  })

  it('falls back to a valid point when a roof ring contains invalid positions or is not closed', () => {
    const malformed = { type: 'Polygon', coordinates: [[[99, 9], [null, 9], [100, 10], [99, 9]]] } as unknown as ScanCandidate['roof_geom']
    const open = { type: 'Polygon', coordinates: [[[99, 9], [100, 9], [100, 10], [99, 10]]] } as ScanCandidate['roof_geom']
    for (const roof_geom of [malformed, open]) {
      expect(toFeatureCollection([c({ roof_geom })]).features[0].geometry).toEqual({ type: 'Point', coordinates: [base.lon, base.lat] })
      expect(toFeatureCollection([c({ roof_geom, lat: null, lon: null })]).features).toEqual([])
    }
    expect(toFeatureCollection([c({ footprint_class: 'parcel' })]).features[0].properties?.kwp).toBeNull()
  })
})

describe('local notes', () => {
  it('accepts only a record of string notes from storage', () => {
    for (const raw of ['null', '[]', 'true', '42', '"note"', '{broken']) {
      expect(loadNotes({ getItem: () => raw })).toEqual({})
    }
    expect(loadNotes({ getItem: () => '{"u1":"valid","u2":false,"u3":{"nested":1}}' })).toEqual({ u1: 'valid' })
    expect(loadNotes({ getItem: () => { throw new Error('unavailable') } })).toEqual({})
  })

  it('preserves other notes when updating or clearing one note', () => {
    let value = '{"u1":"old","u2":"keep"}'
    const storage = { getItem: () => value, setItem: vi.fn((_key: string, next: string) => { value = next }) }
    expect(saveNote('u1', 'new', storage)).toEqual({ u1: 'new', u2: 'keep' })
    expect(storage.setItem).toHaveBeenCalledWith(NOTES_KEY, '{"u1":"new","u2":"keep"}')
    expect(saveNote('u1', '   ', storage)).toEqual({ u2: 'keep' })
  })

  it('surfaces write failures and never overwrites notes after a failed read', () => {
    const setItem = vi.fn()
    expect(() => saveNote('u1', 'note', { getItem: () => { throw new Error('denied') }, setItem })).toThrow('denied')
    expect(setItem).not.toHaveBeenCalled()
    expect(() => saveNote('u1', 'note', { getItem: () => '{}', setItem: () => { throw new Error('quota') } })).toThrow('quota')
  })
})
