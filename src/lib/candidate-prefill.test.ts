import { describe, it, expect } from 'vitest'
import { candidateToFormPatch, polygonCentroidLonLat } from './candidate-prefill'
import type { ScanCandidate } from './bustan-crm-service'

const c = { id: 'u1', name: 'Treechart Hostel', phone: '0946692011', website: null, lat: 9.708598, lon: 99.990975,
  roof_area_sqm: 994.4, estimated_kwp: 126.56, roof_geom: { type: 'Polygon', coordinates: [[[99.99, 9.70], [99.991, 9.70], [99.991, 9.701], [99.99, 9.70]]] } }

describe('candidateToFormPatch', () => {
  it('maps kWp to panel_count at 580 W and carries roof + contact fields', () => {
    const p = candidateToFormPatch(c as never, 580)
    expect(p.panel_count).toBe(218)             // floor(126.56*1000/580)
    expect(p.client_name).toBe('Treechart Hostel'); expect(p.client_phone).toBe('0946692011')
    expect(p.roof_lat).toBe(9.708598); expect(p.roof_lng).toBe(99.990975); expect(p.roof_area_sqm).toBe(994.4)
    expect(p.roof_polygon).toEqual(c.roof_geom)
    expect(p.location_preset).toBe('koh_phangan')
  })
  it('falls back to polygon centroid when lat/lon are 0', () => {
    const p = candidateToFormPatch({ ...c, lat: 0, lon: 0 } as never, 580)
    expect(p.roof_lat).toBeCloseTo(9.7003, 3); expect(p.roof_lng).toBeCloseTo(99.9907, 3)
  })

  it.each(['parcel', 'compound', 'unclear'] as const)('clears %s sizing and polygon rather than treating it as a verified roof', (footprint_class) => {
    const candidate = { ...c, footprint_class } as ScanCandidate
    for (const requested of [undefined, 6]) {
      const patch = candidateToFormPatch(candidate, 580, requested)
      expect(patch.panel_count).toBe(0)
      expect(patch.roof_area_sqm).toBeNull()
      expect(patch.roof_polygon).toBeNull()
      expect(patch.client_name).toBe(c.name)
      expect(patch.roof_lat).toBe(c.lat)
      // This mirrors replaceForm's merge; an invalid estimate must erase
      // an existing/default system and footprint rather than omitting keys.
      expect({ panel_count: 18, roof_area_sqm: 500, ...patch }).toMatchObject({ panel_count: 0, roof_area_sqm: null })
    }
  })

  it('never carries a land candidate area or capacity into a roof proposal', () => {
    const patch = candidateToFormPatch({ ...c, kind: 'land' } as ScanCandidate, 580)
    expect(patch).toMatchObject({ panel_count: 0, roof_area_sqm: null, roof_polygon: null })
  })

  it('uses whole panels below an explicit screening cap instead of the larger roof estimate', () => {
    const patch = candidateToFormPatch(c as ScanCandidate, 580, 6)
    expect(patch.panel_count).toBe(10)
    expect(patch.panel_count! * 580 / 1000).toBeLessThanOrEqual(6)
    expect(patch.roof_area_sqm).toBe(c.roof_area_sqm)
  })

  it('accepts an explicit cap at roof capacity and floors fractional panels', () => {
    const patch = candidateToFormPatch({ ...c, estimated_kwp: 6 } as ScanCandidate, 580, 6)
    expect(patch.panel_count).toBe(10)
  })

  it('keeps ordinary roof estimates within the roof capacity when only whole panels fit', () => {
    const patch = candidateToFormPatch({ ...c, estimated_kwp: 6.2 } as ScanCandidate, 580)
    expect(patch.panel_count).toBe(10)
    expect(patch.panel_count! * 580 / 1000).toBeLessThanOrEqual(6.2)
    expect(candidateToFormPatch({ ...c, estimated_kwp: 0.3 } as ScanCandidate, 580).panel_count).toBe(0)
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 127])('clears an invalid or excessive explicit screening value %s without falling back to roof capacity', (requested) => {
    expect(candidateToFormPatch(c as ScanCandidate, 580, requested).panel_count).toBe(0)
  })

  it.each([null, 0, -10, Number.NaN, Number.POSITIVE_INFINITY])('clears invalid/missing roof estimate %s, including explicit screening requests', (estimated_kwp) => {
    const candidate = { ...c, estimated_kwp } as ScanCandidate
    expect(candidateToFormPatch(candidate, 580).panel_count).toBe(0)
    expect(candidateToFormPatch(candidate, 580, 6).panel_count).toBe(0)
  })

  it.each([null, 0, -10, Number.NaN, Number.POSITIVE_INFINITY])('clears invalid roof area %s', (roof_area_sqm) => {
    expect(candidateToFormPatch({ ...c, roof_area_sqm } as ScanCandidate, 580).roof_area_sqm).toBeNull()
  })

  it.each([0, -580, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid panel wattage %s before dividing', (panelWatt) => {
    expect(() => candidateToFormPatch(c as ScanCandidate, panelWatt, 6)).toThrow(RangeError)
  })
})


describe('candidate proposal geometry', () => {
  const validRing = c.roof_geom.coordinates[0]
  const malformedPolygons: unknown[] = [
    { type: 'Polygon', coordinates: [[null, ...validRing.slice(1)]] },
    { type: 'Polygon', coordinates: [[[99.99], ...validRing.slice(1)]] },
    { type: 'Polygon', coordinates: [[[99.99, Number.NaN], ...validRing.slice(1)]] },
    { type: 'Polygon', coordinates: [[[Number.POSITIVE_INFINITY, 9.7], ...validRing.slice(1)]] },
    { type: 'Polygon', coordinates: [[[181, 9.7], ...validRing.slice(1)]] },
    { type: 'Polygon', coordinates: [[[99.99, -91], ...validRing.slice(1)]] },
    { type: 'Polygon', coordinates: [validRing.slice(0, -1)] },
    { type: 'Polygon', coordinates: [validRing, null] },
    { type: 'Polygon', coordinates: [validRing, [[100, 9.7], [100.001, 9.7], null, [100, 9.7]]] },
    { type: 'Polygon', coordinates: [validRing, [[100, 9.7], [100.001, 9.7], [100.001, 9.701], [100, 9.701]]] },
    { type: 'Polygon', coordinates: [[[99, 9], [100, 10], [101, 11], [99, 9]]] },
    { type: 'Polygon', coordinates: [] },
    { type: 'MultiPolygon', coordinates: [[validRing]] },
  ]

  it.each(malformedPolygons.map((geom, index) => [index, geom] as const))('rejects malformed geometry %s before centroid calculation or proposal rendering', (_index, roof_geom) => {
    expect(polygonCentroidLonLat(roof_geom)).toBeNull()
    for (const footprint_class of ['roof', 'parcel'] as const) {
      const candidate = { ...c, footprint_class, roof_geom, lat: null, lon: null } as ScanCandidate
      expect(candidateToFormPatch(candidate, 580)).toMatchObject({ roof_polygon: null, roof_lat: null, roof_lng: null })
    }
  })

  it('retains valid direct coordinates when an invalid polygon is discarded', () => {
    expect(candidateToFormPatch({ ...c, roof_geom: malformedPolygons[0] } as ScanCandidate, 580)).toMatchObject({
      roof_polygon: null, roof_lat: c.lat, roof_lng: c.lon,
    })
  })

  it('preserves a valid polygon including an inner ring', () => {
    const outer = [[99.99, 9.7], [100, 9.7], [100, 9.71], [99.99, 9.71], [99.99, 9.7]]
    const inner = [[99.992, 9.702], [99.994, 9.702], [99.994, 9.704], [99.992, 9.704], [99.992, 9.702]]
    const roof_geom = { type: 'Polygon', coordinates: [outer, inner] } as GeoJSON.Polygon
    expect(candidateToFormPatch({ ...c, roof_geom, lat: null, lon: null } as ScanCandidate, 580)).toMatchObject({
      roof_polygon: roof_geom, roof_lat: 9.705, roof_lng: 99.995,
    })
  })

  it.each([
    { lat: null, lon: null }, { lat: 0, lon: 0 }, { lat: 0, lon: 100 },
    { lat: Number.NaN, lon: 100 }, { lat: 9.7, lon: Number.POSITIVE_INFINITY },
    { lat: 91, lon: 100 }, { lat: -91, lon: 100 }, { lat: 9.7, lon: 181 }, { lat: 9.7, lon: -181 },
  ])('uses a valid centroid pair when candidate coordinates are invalid: %s', (coordinates) => {
    const patch = candidateToFormPatch({ ...c, ...coordinates } as ScanCandidate, 580)
    expect(patch.roof_lat).toBeCloseTo(9.7003, 3)
    expect(patch.roof_lng).toBeCloseTo(99.9907, 3)
    expect(candidateToFormPatch({ ...c, ...coordinates, roof_geom: null } as ScanCandidate, 580)).toMatchObject({ roof_lat: null, roof_lng: null })
  })

  it('does not fall back to a polygon centroid at [0,0]', () => {
    const roof_geom = { type: 'Polygon', coordinates: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]] } as GeoJSON.Polygon
    expect(candidateToFormPatch({ ...c, roof_geom, lat: 0, lon: 0 } as ScanCandidate, 580)).toMatchObject({ roof_lat: null, roof_lng: null })
  })
})
