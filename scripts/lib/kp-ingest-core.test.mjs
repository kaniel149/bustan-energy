import { describe, it, expect } from 'vitest'
import { parseBuildingsJs, buildOsmRecords, buildUnmappedRecords, matchExisting } from './kp-ingest-core.mjs'

const b = { i: 479104039, la: 9.708598, lo: 99.990975, a: 994.4, u: 696.1, kw: 126.56, p: 270,
  s: 100, pr: 'A', c: 'hospitality', n: 'Treechart Hostel', ph: '', w: '',
  poly: [[99.99083, 9.708742], [99.99100, 9.708742], [99.99100, 9.708500], [99.99083, 9.708742]] }

describe('parseBuildingsJs', () => {
  it('extracts the array from a const B=[...] file', () => {
    expect(parseBuildingsJs('const B=[{"i":1,"la":9.7,"lo":100.0}];')).toEqual([{ i: 1, la: 9.7, lo: 100.0 }])
  })
})

describe('buildOsmRecords', () => {
  it('maps a plain roof with no overlays', () => {
    const [r] = buildOsmRecords([b], {}, {})
    expect(r).toMatchObject({
      external_source: 'osm', external_id: '479104039', kind: 'roof', name: 'Treechart Hostel',
      lat: 9.708598, lon: 99.990975, roof_area_sqm: 994.4, estimated_kwp: 126.56, estimated_kwp_raw: 126.56,
      priority: 'A', solar_potential_score: 100, category: 'hospitality',
      footprint_class: null, existing_solar: null,
    })
    expect(r.roof_geom).toEqual({ type: 'Polygon', coordinates: [b.poly] })
  })
  it('downgrades kWp only for adjudicated parcel/compound', () => {
    const fq = { '479104039': { k: 'parcel', roof_pct: 15, c: 0.7, src: 'adjudicated' } }
    const [r] = buildOsmRecords([b], fq, {})
    expect(r.footprint_class).toBe('parcel'); expect(r.roof_pct).toBe(15)
    expect(r.estimated_kwp).toBe(18.98); expect(r.estimated_kwp_raw).toBe(126.56)
    const [r2] = buildOsmRecords([b], { '479104039': { k: 'parcel', roof_pct: 15, c: 0.6, src: 'single-model' } }, {})
    expect(r2.estimated_kwp).toBe(126.56)
  })
  it('marks confident PV as existing_solar=true, uncertain as null', () => {
    const sd = { '479104039': { s: true, c: 0.9, p: 40 } }
    const [r] = buildOsmRecords([b], {}, sd)
    expect(r.existing_solar).toBe(true); expect(r.solar_check_confidence).toBe(0.9); expect(r.panel_coverage_pct).toBe(40)
    const [r2] = buildOsmRecords([b], {}, { '479104039': { s: true, c: 0.3, p: 5 } })
    expect(r2.existing_solar).toBeNull()
    const [r3] = buildOsmRecords([b], {}, { '479104039': { s: false, c: 1.0, p: 0 } })
    expect(r3.existing_solar).toBe(false)
  })
})

describe('buildUnmappedRecords', () => {
  it('derives a deterministic external id from the tile+coords', () => {
    const u = { lat: 9.703328, lon: 100.011004, w_m: 63.1, h_m: 70.1, area_m2: 4424, tile: [18, 203897, 123972], roof_m2: 3539, kwp: 541.5 }
    const [r] = buildUnmappedRecords([u])
    expect(r.external_source).toBe('esri-2026')
    expect(r.external_id).toBe('18-203897-123972-9.703328-100.011004')
    expect(r).toMatchObject({ lat: 9.703328, lon: 100.011004, roof_area_sqm: 3539, estimated_kwp: 541.5, status: 'pending', kind: 'roof', priority: 'A' })
    expect(buildUnmappedRecords([u])[0].external_id).toBe(r.external_id)
  })
})

describe('matchExisting', () => {
  const existing = [
    { id: 'u1', lat: 9.708600, lon: 99.990980, external_id: null },
    { id: 'u2', lat: 9.800000, lon: 99.900000, external_id: '999', external_source: 'osm' },
  ]
  it('matches by external id first, then by ~28 m proximity', () => {
    expect(matchExisting({ external_source: 'osm', external_id: '999', lat: 0, lon: 0 }, existing)?.id).toBe('u2')
    expect(matchExisting({ external_source: 'osm', external_id: '1', lat: 9.708598, lon: 99.990975 }, existing)?.id).toBe('u1')
    expect(matchExisting({ external_source: 'osm', external_id: '1', lat: 9.75, lon: 99.95 }, existing)).toBeNull()
  })
})
