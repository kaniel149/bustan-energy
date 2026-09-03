import { describe, it, expect } from 'vitest'
import { parseContentRange } from './pg-count.js'

describe('parseContentRange', () => {
  it('reads the total after the slash', () => {
    expect(parseContentRange('0-0/42821')).toBe(42821)
    expect(parseContentRange('*/0')).toBe(0)
  })
  it('returns null for missing or malformed headers', () => {
    expect(parseContentRange(null)).toBeNull()
    expect(parseContentRange('0-24/*')).toBeNull()
  })
})
