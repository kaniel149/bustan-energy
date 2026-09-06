import { describe, expect, it } from 'vitest'
import {
  CHAPTER_TIMES,
  CINEMATIC_DURATION_MS,
  sampleCinematicShot,
  sourceFrameToPosition,
  type InstallationProperty,
} from './installation-cinematography'

const residential = ['concrete', 'villa', 'tropical'] as const
const commercial = ['factory', 'largeroof', 'field', 'parking'] as const
const properties: InstallationProperty[] = [...residential, ...commercial]
const seconds = [...CHAPTER_TIMES, 20]

describe('installation video retiming', () => {
  it('defines a twenty-second journey with five chapter starts', () => {
    expect(CINEMATIC_DURATION_MS).toBe(20_000)
    expect(CHAPTER_TIMES).toEqual([0, 3, 6.5, 10.5, 15])
  })

  it.each(properties)('matches all source chapter frames for %s', (type) => {
    const frames = residential.includes(type as typeof residential[number])
      ? [0, 12, 24, 36, 56, 122]
      : [0, 24, 36, 60, 88, 122]
    seconds.forEach((time, index) => {
      const shot = sampleCinematicShot(type, time / 20)
      expect(shot.frame).toBe(frames[index])
      expect(shot.chapter).toBe(Math.min(index, 4))
      expect(sourceFrameToPosition(type, frames[index])).toBe(time / 20)
    })
  })

  it.each(properties)('is linear between chapter anchors, matching the rendered video for %s', (type) => {
    for (let chapter = 0; chapter < 5; chapter++) {
      const start = seconds[chapter] / 20
      const end = seconds[chapter + 1] / 20
      const first = sampleCinematicShot(type, start).frame
      const last = sampleCinematicShot(type, end).frame
      for (const fraction of [0.1, 0.25, 0.7, 0.9]) {
        expect(sampleCinematicShot(type, start + fraction * (end - start)).frame)
          .toBeCloseTo(first + fraction * (last - first), 10)
      }
    }
  })

  it.each(properties)('advances monotonically, stays fractional and round-trips through the inverse for %s', (type) => {
    let previous = -1
    let fractional = false
    for (let tick = 0; tick <= 1_200; tick++) {
      const position = tick / 1_200
      const { frame } = sampleCinematicShot(type, position)
      expect(frame).toBeGreaterThan(previous)
      expect(frame).toBeGreaterThanOrEqual(0)
      expect(frame).toBeLessThanOrEqual(122)
      expect(sourceFrameToPosition(type, frame)).toBeCloseTo(position, 12)
      fractional ||= !Number.isInteger(frame)
      previous = frame
    }
    expect(fractional).toBe(true)
  })

  it.each(properties)('changes the chapter at the boundary, not before, for %s', (type) => {
    CHAPTER_TIMES.slice(1).forEach((time, index) => {
      expect(sampleCinematicShot(type, (time - 0.000001) / 20).chapter).toBe(index)
      expect(sampleCinematicShot(type, time / 20).chapter).toBe(index + 1)
    })
  })

  it.each(properties)('clamps out-of-range and nonfinite inputs for %s', (type) => {
    for (const input of [-100, -Infinity, NaN]) {
      expect(sampleCinematicShot(type, input)).toEqual(sampleCinematicShot(type, 0))
      expect(sourceFrameToPosition(type, input)).toBe(0)
    }
    for (const input of [Number.MAX_VALUE, Infinity]) {
      expect(sampleCinematicShot(type, input)).toEqual(sampleCinematicShot(type, 1))
      expect(sourceFrameToPosition(type, input)).toBe(1)
    }
    expect(sampleCinematicShot(type, 1.01)).toEqual(sampleCinematicShot(type, 1))
    expect(sourceFrameToPosition(type, 123)).toBe(1)
  })
})

describe('installation camera', () => {
  it.each(properties)('starts and ends with the entire image visible for %s', (type) => {
    for (const position of [0, 1]) {
      const { scale, x, y } = sampleCinematicShot(type, position)
      expect({ scale, x, y }).toEqual({ scale: 1, x: 0, y: 0 })
    }
  })

  it.each([
    ['concrete', 1.55, 1.4, 0.55, 0.38],
    ['villa', 1.35, 1.3, 0.54, 0.42],
    ['tropical', 1.35, 1.3, 0.54, 0.42],
  ] as const)('centers the inspected roof and panel details for %s', (type, structureScale, panelScale, centerX, centerY) => {
    for (const [time, expectedScale] of [[6.5, structureScale], [10.5, panelScale]]) {
      const { scale, x, y } = sampleCinematicShot(type, time / 20)
      expect(scale).toBe(expectedScale)
      expect(x / 100 + (centerX - 0.5) * scale).toBeCloseTo(0, 12)
      expect(y / 100 + (centerY - 0.5) * scale).toBeCloseTo(0, 12)
      expect(x).toBeLessThan(0)
      expect(y).toBeGreaterThan(0)
    }
  })

  it.each(properties)('keeps its crop finite, bounded and covering the viewport for %s', (type) => {
    const maximum = type === 'concrete' ? 1.55 : type === 'villa' || type === 'tropical' ? 1.35 : 1.25
    for (let tick = 0; tick <= 2_000; tick++) {
      const { scale, x, y } = sampleCinematicShot(type, tick / 2_000)
      expect([scale, x, y].every(Number.isFinite)).toBe(true)
      expect(scale).toBeGreaterThanOrEqual(1 - 1e-12)
      expect(scale).toBeLessThanOrEqual(maximum + 1e-12)
      const spareImage = (scale - 1) * 50
      expect(Math.abs(x)).toBeLessThanOrEqual(spareImage + 1e-10)
      expect(Math.abs(y)).toBeLessThanOrEqual(spareImage + 1e-10)
      expect(x).toBeLessThanOrEqual(1e-12)
      expect(y).toBeGreaterThanOrEqual(-1e-12)
    }
  })

  it.each(properties)('keeps position and velocity continuous at every camera chapter for %s', (type) => {
    const delta = 0.00001
    for (const time of CHAPTER_TIMES.slice(1)) {
      const before = sampleCinematicShot(type, (time - delta) / 20)
      const current = sampleCinematicShot(type, time / 20)
      const after = sampleCinematicShot(type, (time + delta) / 20)
      for (const key of ['scale', 'x', 'y'] as const) {
        expect(Math.abs(after[key] - before[key])).toBeLessThan(0.001)
        const incomingVelocity = (current[key] - before[key]) / delta
        const outgoingVelocity = (after[key] - current[key]) / delta
        expect(Math.abs(incomingVelocity - outgoingVelocity)).toBeLessThan(0.001)
      }
    }
  })
})
