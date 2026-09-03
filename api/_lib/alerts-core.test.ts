import { describe, it, expect } from 'vitest'
import { buildAlertText, pickChannel, isFirstRun } from './alerts-core.js'

const since = '2026-09-03T09:00:00Z'

describe('buildAlertText', () => {
  it('returns null when nothing happened', () => {
    expect(buildAlertText({ since, approved: [], newA: [], newACount: 0, firstViews: [], signatures: [] })).toBeNull()
  })
  it('lists approvals, top new A-grade with count, first views and signatures', () => {
    const t = buildAlertText({ since,
      approved: [{ id: 'p1', name: 'Resort A', created_at: since }],
      newA: [{ id: 'c1', name: 'Treechart Hostel', estimated_kwp: 126.56, lat: 9.7086, lon: 99.991 }], newACount: 14,
      firstViews: [{ ref_number: 'BE-2026-0007', client_name: 'Koh Ma Resort', first_viewed_at: since }],
      signatures: [{ proposal_ref: 'BE-2026-0003', signer_name: 'Somchai', signed_at: since }] })!
    expect(t).toContain('Bustan alerts')
    expect(t).toContain('✅ Approved to CRM (1): Resort A')
    expect(t).toContain('⭐ New A-grade candidates: 14 (top: Treechart Hostel 127 kWp)')
    expect(t).toContain('👀 First view: BE-2026-0007 — Koh Ma Resort')
    expect(t).toContain('✍️ Signed: BE-2026-0003 — Somchai')
    expect(t).toContain('https://bustan-energy.com/admin/scan?focus=c1')
    expect(t.length).toBeLessThan(1500)
  })
})

describe('pickChannel / isFirstRun', () => {
  it('prefers WhatsApp when GreenAPI is configured, else email', () => {
    expect(pickChannel({ GREENAPI_INSTANCE_ID: '7107', GREENAPI_TOKEN: 't' })).toBe('whatsapp')
    expect(pickChannel({ RESEND_API_KEY: 'r' })).toBe('email')
    expect(pickChannel({})).toBe('none')
  })
  it('first run (no watermark) only sets the watermark', () => {
    expect(isFirstRun(null)).toBe(true)
    expect(isFirstRun({ last_run_at: since })).toBe(false)
  })
})
