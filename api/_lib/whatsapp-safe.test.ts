import { describe, it, expect } from 'vitest'
import { resolveWhatsAppTarget } from './whatsapp-safe.js'

describe('resolveWhatsAppTarget', () => {
  it('redirects to the test number with a prefix when SELF_SEND=1', () => {
    const r = resolveWhatsAppTarget('0946692011', 'Hello', { OUTREACH_SELF_SEND: '1', OUTREACH_TEST_WHATSAPP: '972502213948' })
    expect(r).toEqual({ phone: '972502213948', message: '[TEST→66946692011] Hello', test: true })
  })
  it('sends to the real number when SELF_SEND=0', () => {
    expect(resolveWhatsAppTarget('0946692011', 'Hi', { OUTREACH_SELF_SEND: '0' })).toEqual({ phone: '66946692011', message: 'Hi', test: false })
  })
  it('returns null for an invalid phone', () => {
    expect(resolveWhatsAppTarget('12', 'Hi', {})).toBeNull()
  })
})
