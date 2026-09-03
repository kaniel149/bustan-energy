import { describe, it, expect } from 'vitest'
import { funnelWidths } from './funnel-client'

describe('funnelWidths', () => {
  it('scales bars to the largest stage with a 4% floor so zero stages stay visible', () => {
    expect(funnelWidths([{ all: 1000 }, { all: 250 }, { all: 0 }])).toEqual([100, 25, 4])
    expect(funnelWidths([])).toEqual([])
    expect(funnelWidths([{ all: 0 }])).toEqual([4])
  })
})
