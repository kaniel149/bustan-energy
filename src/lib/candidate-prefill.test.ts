import { describe, it, expect } from 'vitest'
import { candidateToFormPatch } from './candidate-prefill'

const c = { id: 'u1', name: 'Treechart Hostel', phone: '0946692011', website: null, lat: 9.708598, lon: 99.990975,
  roof_area_sqm: 994.4, estimated_kwp: 126.56, roof_geom: { type: 'Polygon', coordinates: [[[99.99, 9.70], [99.991, 9.70], [99.991, 9.701], [99.99, 9.70]]] } }

describe('candidateToFormPatch', () => {
  it('maps kWp to panel_count at 580 W and carries roof + contact fields', () => {
    const p = candidateToFormPatch(c as never, 580)
    expect(p.panel_count).toBe(218)             // round(126.56*1000/580)
    expect(p.client_name).toBe('Treechart Hostel'); expect(p.client_phone).toBe('0946692011')
    expect(p.roof_lat).toBe(9.708598); expect(p.roof_lng).toBe(99.990975); expect(p.roof_area_sqm).toBe(994.4)
    expect(p.roof_polygon).toEqual(c.roof_geom)
    expect(p.location_preset).toBe('koh_phangan')
  })
  it('falls back to polygon centroid when lat/lon are 0', () => {
    const p = candidateToFormPatch({ ...c, lat: 0, lon: 0 } as never, 580)
    expect(p.roof_lat).toBeCloseTo(9.7003, 3); expect(p.roof_lng).toBeCloseTo(99.9907, 3)
  })
})
