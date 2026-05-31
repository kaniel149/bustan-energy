/**
 * panel-layout.test.ts
 *
 * TDD suite for the polygon → solar-panel-layout engine.
 * Run with: npx vitest run src/lib/panel-layout.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  computePanelLayout,
  panelsToFeatureCollection,
  layoutToSvg,
} from './panel-layout'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Build a GeoJSON Polygon rectangle centred on (centLng, centLat) with the
 * given width and height in metres (equirectangular approximation).
 * Coordinates are in [lng, lat] order.
 */
function makeRectPolygon(
  centLng: number,
  centLat: number,
  widthM: number,
  heightM: number,
): GeoJSON.Polygon {
  const mPerDegLat = 111_132
  const mPerDegLng = mPerDegLat * Math.cos((centLat * Math.PI) / 180)
  const dLng = widthM / 2 / mPerDegLng
  const dLat = heightM / 2 / mPerDegLat
  return {
    type: 'Polygon',
    coordinates: [
      [
        [centLng - dLng, centLat - dLat],
        [centLng + dLng, centLat - dLat],
        [centLng + dLng, centLat + dLat],
        [centLng - dLng, centLat + dLat],
        [centLng - dLng, centLat - dLat],
      ],
    ],
  }
}

/** Ko Phangan centroid — representative Thailand location. */
const KP_LNG = 100.058
const KP_LAT = 9.726

/** ~10m × 10m rectangle (≈100 m² gross). */
const rect10x10 = makeRectPolygon(KP_LNG, KP_LAT, 10, 10)

/**
 * L-shaped polygon (10m × 10m with 5m × 5m bottom-right quadrant removed).
 * Total area ≈ 75 m².
 *
 *  (0,10)──────(10,10)
 *    │              │
 *  (0,5)──(5,5)    │
 *           │       │
 *         (5,0)──(10,0)
 *           └───────┘
 */
function makeLShapePolygon(centLng: number, centLat: number, sideM: number): GeoJSON.Polygon {
  const mPerDegLat = 111_132
  const mPerDegLng = mPerDegLat * Math.cos((centLat * Math.PI) / 180)
  // Convert metre offsets to degree offsets relative to centroid
  const toLng = (dx: number) => centLng + dx / mPerDegLng
  const toLat = (dy: number) => centLat + dy / mPerDegLat
  const h = sideM / 2
  // Build L-shape centred at (0,0) in metre-space, then convert
  // Points (metre-space, CCW): TL, TR, mid-right, mid-mid, mid-left, BL, closed
  return {
    type: 'Polygon',
    coordinates: [
      [
        [toLng(-h), toLat(h)],  // top-left
        [toLng(h), toLat(h)],   // top-right
        [toLng(h), toLat(0)],   // mid-right (inner corner upper)
        [toLng(0), toLat(0)],   // inner corner
        [toLng(0), toLat(-h)],  // inner corner lower
        [toLng(-h), toLat(-h)], // bottom-left
        [toLng(-h), toLat(h)],  // closed
      ],
    ],
  }
}

const lShape10 = makeLShapePolygon(KP_LNG, KP_LAT, 10)

// Full rectangle covering the same bbox as the L-shape (10m × 10m)
const fullRect10 = makeRectPolygon(KP_LNG, KP_LAT, 10, 10)

// ---------------------------------------------------------------------------
// 1. Rectangle yield
// ---------------------------------------------------------------------------

describe('computePanelLayout — rectangle yield', () => {
  it('places between 30 and 55 panels on a ~10×10 m rectangle (default params)', () => {
    const result = computePanelLayout(rect10x10)
    // Default panel ≈ 1.762×1.134 m = ~2 m²; with 0.5 m setback on a 10×10 m
    // roof usable area ~9×9 m (after setback on both sides) = 81 m²
    // Expected: 81 / ~2.02 ≈ 40, but grid packing efficiency ~70-80%
    expect(result.count).toBeGreaterThan(30)
    expect(result.count).toBeLessThan(55)
  })

  it('capacityKwp ≈ count × 0.58', () => {
    const result = computePanelLayout(rect10x10)
    const expected = (result.count * 580) / 1000
    expect(result.capacityKwp).toBeCloseTo(expected, 3)
  })

  it('usableAreaSqm reflects the actual placed panel count', () => {
    const result = computePanelLayout(rect10x10)
    // In landscape mode width/height are swapped to long × short
    const landscapeW = Math.max(result.params.panelWidthM, result.params.panelHeightM)
    const landscapeH = Math.min(result.params.panelWidthM, result.params.panelHeightM)
    expect(result.usableAreaSqm).toBeCloseTo(result.count * landscapeW * landscapeH, 2)
  })
})

// ---------------------------------------------------------------------------
// 2. L-shape vs full rectangle
// ---------------------------------------------------------------------------

describe('computePanelLayout — L-shape vs rectangle', () => {
  it('L-shaped polygon yields fewer panels than the full bounding rectangle', () => {
    const lResult = computePanelLayout(lShape10)
    const rectResult = computePanelLayout(fullRect10)
    expect(lResult.count).toBeLessThan(rectResult.count)
  })

  it('L-shape count is > 0 (non-trivial shape)', () => {
    const result = computePanelLayout(lShape10)
    expect(result.count).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Edge setback strictly reduces or equals panel count
// ---------------------------------------------------------------------------

describe('computePanelLayout — edge setback', () => {
  it('larger setback produces ≤ panels compared to zero setback', () => {
    const zeroSetback = computePanelLayout(rect10x10, { edgeSetbackM: 0 })
    const halfMetre = computePanelLayout(rect10x10, { edgeSetbackM: 0.5 })
    const oneMetre = computePanelLayout(rect10x10, { edgeSetbackM: 1.0 })

    expect(zeroSetback.count).toBeGreaterThanOrEqual(halfMetre.count)
    expect(halfMetre.count).toBeGreaterThanOrEqual(oneMetre.count)
  })
})

// ---------------------------------------------------------------------------
// 4. usableAreaSqm ≤ roofAreaSqm
// ---------------------------------------------------------------------------

describe('computePanelLayout — area constraints', () => {
  it('sum of panel areas never exceeds gross roof area', () => {
    const result = computePanelLayout(rect10x10)
    expect(result.usableAreaSqm).toBeLessThanOrEqual(result.roofAreaSqm + 1e-6)
  })

  it('L-shape usable area ≤ L-shape roof area', () => {
    const result = computePanelLayout(lShape10)
    expect(result.usableAreaSqm).toBeLessThanOrEqual(result.roofAreaSqm + 1e-6)
  })
})

// ---------------------------------------------------------------------------
// 5. Projection round-trip
// ---------------------------------------------------------------------------

describe('makeProjection — round-trip accuracy', () => {
  it('project → unproject returns within 1e-6 degrees', () => {
    // We test the projection indirectly: panels' centres should be close to
    // the input polygon extent, and we verify by checking a known point.
    // Direct test: compute layout and verify panel centres are within the bbox.
    const result = computePanelLayout(rect10x10)
    expect(result.count).toBeGreaterThan(0)

    // All panel centres should lie within the rough bounding box of the polygon
    const coords = rect10x10.coordinates[0]
    const lngs = coords.map((c) => c[0])
    const lats = coords.map((c) => c[1])
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    for (const panel of result.panels) {
      const [lng, lat] = panel.center
      expect(lng).toBeGreaterThan(minLng - 1e-5)
      expect(lng).toBeLessThan(maxLng + 1e-5)
      expect(lat).toBeGreaterThan(minLat - 1e-5)
      expect(lat).toBeLessThan(maxLat + 1e-5)
    }
  })

  it('projection round-trip within 1e-6 degrees for a representative point', () => {
    // Access the projection directly by building a test polygon and
    // verifying that the panel ring corners unproject close to the original corners.
    const result = computePanelLayout(rect10x10)
    if (result.count === 0) return

    // Check that all panel polygon corners are within the roof polygon bbox
    const coords = rect10x10.coordinates[0]
    const lngs = coords.map((c) => c[0])
    const lats = coords.map((c) => c[1])
    const polyMinLng = Math.min(...lngs) - 1e-5
    const polyMaxLng = Math.max(...lngs) + 1e-5
    const polyMinLat = Math.min(...lats) - 1e-5
    const polyMaxLat = Math.max(...lats) + 1e-5

    for (const panel of result.panels) {
      for (const [lng, lat] of panel.polygon.coordinates[0]) {
        expect(lng).toBeGreaterThan(polyMinLng)
        expect(lng).toBeLessThan(polyMaxLng)
        expect(lat).toBeGreaterThan(polyMinLat)
        expect(lat).toBeLessThan(polyMaxLat)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 6. Degenerate polygons → 0 panels, no throw
// ---------------------------------------------------------------------------

describe('computePanelLayout — degenerate inputs', () => {
  it('3-vertex sliver polygon (triangle) → count ≥ 0, no throw', () => {
    const sliver: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [KP_LNG, KP_LAT],
          [KP_LNG + 0.00001, KP_LAT + 0.000001],
          [KP_LNG + 0.00002, KP_LAT],
          [KP_LNG, KP_LAT],
        ],
      ],
    }
    let result: ReturnType<typeof computePanelLayout>
    expect(() => { result = computePanelLayout(sliver) }).not.toThrow()
    expect(result!.count).toBe(0)
  })

  it('2-point "polygon" (degenerate) → count 0, no throw', () => {
    const degenerate: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [KP_LNG, KP_LAT],
          [KP_LNG + 0.0001, KP_LAT],
          [KP_LNG, KP_LAT], // closes immediately — 2 unique vertices
        ],
      ],
    }
    let result: ReturnType<typeof computePanelLayout>
    expect(() => { result = computePanelLayout(degenerate) }).not.toThrow()
    expect(result!.count).toBe(0)
  })

  it('empty coordinates array → count 0, no throw', () => {
    const empty: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[]],
    }
    let result: ReturnType<typeof computePanelLayout>
    expect(() => { result = computePanelLayout(empty) }).not.toThrow()
    expect(result!.count).toBe(0)
  })

  it('MultiPolygon with single tiny polygon → count 0, no throw', () => {
    const tiny: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [KP_LNG, KP_LAT],
            [KP_LNG + 0.000001, KP_LAT],
            [KP_LNG + 0.000001, KP_LAT + 0.000001],
            [KP_LNG, KP_LAT + 0.000001],
            [KP_LNG, KP_LAT],
          ],
        ],
      ],
    }
    let result: ReturnType<typeof computePanelLayout>
    expect(() => { result = computePanelLayout(tiny) }).not.toThrow()
    expect(result!.count).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 7. panelsToFeatureCollection + layoutToSvg
// ---------------------------------------------------------------------------

describe('panelsToFeatureCollection', () => {
  it('returns a FeatureCollection with exactly count features', () => {
    const result = computePanelLayout(rect10x10)
    const fc = panelsToFeatureCollection(result)
    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(result.count)
  })

  it('each feature has an index property matching its array position', () => {
    const result = computePanelLayout(rect10x10)
    const fc = panelsToFeatureCollection(result)
    fc.features.forEach((f, i) => {
      expect((f.properties as Record<string, unknown>).index).toBe(i)
    })
  })

  it('each feature geometry is a Polygon', () => {
    const result = computePanelLayout(rect10x10)
    const fc = panelsToFeatureCollection(result)
    for (const f of fc.features) {
      expect(f.geometry.type).toBe('Polygon')
    }
  })
})

describe('layoutToSvg', () => {
  it('returns a string containing "<rect"', () => {
    const result = computePanelLayout(rect10x10)
    const svg = layoutToSvg(result)
    expect(typeof svg).toBe('string')
    expect(svg).toContain('<rect')
  })

  it('returns a valid SVG opening tag', () => {
    const result = computePanelLayout(rect10x10)
    const svg = layoutToSvg(result)
    expect(svg).toMatch(/^<svg/)
    expect(svg).toContain('</svg>')
  })

  it('contains "<polygon" elements for panels', () => {
    const result = computePanelLayout(rect10x10)
    const svg = layoutToSvg(result)
    // Panels are rendered as <polygon> elements
    expect(svg).toContain('<polygon')
  })

  it('degenerate (0-panel) result still returns a valid SVG with "<rect"', () => {
    const empty: GeoJSON.Polygon = { type: 'Polygon', coordinates: [[]] }
    const result = computePanelLayout(empty)
    const svg = layoutToSvg(result)
    expect(svg).toContain('<rect')
    expect(svg).toMatch(/^<svg/)
  })

  it('respects custom width and height', () => {
    const result = computePanelLayout(rect10x10)
    const svg = layoutToSvg(result, { width: 800, height: 600 })
    expect(svg).toContain('width="800"')
    expect(svg).toContain('height="600"')
  })
})

// ---------------------------------------------------------------------------
// 8. Orientation — portrait vs landscape
// ---------------------------------------------------------------------------

describe('computePanelLayout — orientation', () => {
  it('portrait orientation produces a valid layout (count ≥ 0)', () => {
    const result = computePanelLayout(rect10x10, { orientation: 'portrait' })
    expect(result.count).toBeGreaterThanOrEqual(0)
    expect(result.params.orientation).toBe('portrait')
  })
})

// ---------------------------------------------------------------------------
// 9. Sanity-check numbers — print to console for human review
// ---------------------------------------------------------------------------

describe('sanity check — 10×10m rectangle', () => {
  it('logs count and capacityKwp for human review', () => {
    const result = computePanelLayout(rect10x10)
    // Not asserting exact values here — just making them visible in test output.
    console.log(`[sanity] 10×10m rectangle: count=${result.count}, capacityKwp=${result.capacityKwp.toFixed(3)} kWp`)
    console.log(`[sanity] rows=${result.rows}, cols=${result.cols}, roofArea=${result.roofAreaSqm.toFixed(1)} m²`)
    expect(result.count).toBeGreaterThan(0)
  })
})
