import { describe, it, expect } from 'vitest'
import { lonLatToTile, tileBlockFor, polygonToSvgPath, cropBoxForMetres } from './aerial-tiles.js'

describe('lonLatToTile', () => {
  it('matches the python slippy math at z18 for Ko Phangan', () => {
    // from unmapped_roofs.json: lat 9.703328 lon 100.011004 → tile [18, 203897, 123972]
    expect(lonLatToTile(100.011004, 9.703328, 18)).toEqual({ x: 203897, y: 123972, xf: expect.any(Number), yf: expect.any(Number) })
  })
})
describe('tileBlockFor', () => {
  it('returns a 3x3 block centred on the containing tile', () => {
    const b = tileBlockFor(100.011004, 9.703328, 18)
    expect(b.tiles).toHaveLength(9)
    expect(b.tiles[4]).toEqual({ x: 203897, y: 123972 })
    expect(b.originX).toBe(203896); expect(b.originY).toBe(123971)
  })
})
describe('polygonToSvgPath', () => {
  it('projects lon/lat ring into block pixel space', () => {
    const b = tileBlockFor(100.011004, 9.703328, 18)
    const ring = [[100.011004, 9.703328], [100.0112, 9.703328], [100.0112, 9.7031], [100.011004, 9.703328]]
    const d = polygonToSvgPath(ring, b)
    expect(d.startsWith('M')).toBe(true); expect(d.endsWith('Z')).toBe(true)
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(0); expect(Math.max(...nums)).toBeLessThanOrEqual(768)
  })
})
describe('cropBoxForMetres', () => {
  it('120 m at z18 lat 9.7 is ~204 px wide, clamped inside the 768 canvas', () => {
    const b = tileBlockFor(100.011004, 9.703328, 18)
    const box = cropBoxForMetres(100.011004, 9.703328, 120, b)
    expect(box.width).toBeGreaterThan(190); expect(box.width).toBeLessThan(220)
    expect(box.left).toBeGreaterThanOrEqual(0); expect(box.left + box.width).toBeLessThanOrEqual(768)
  })
})
