import { describe, it, expect } from 'vitest'
import { buildFunnel, hasContact, inKp, KP_BBOX } from './funnel.js'

const now = new Date('2026-09-03T12:00:00Z')
const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString()

describe('hasContact', () => {
  it('accepts any of the four contact keys, ignoring empty strings', () => {
    expect(hasContact({ operationalContactPhone: '0946692011' })).toBe(true)
    expect(hasContact({ phone: '', decisionMakerEmail: 'a@b.co' })).toBe(true)
    expect(hasContact({ phone: '', decisionMakerPhone: '', lastResearchedAt: d(1) })).toBe(false)
    expect(hasContact(null)).toBe(false)
  })
})

describe('inKp', () => {
  it('uses the Ko Phangan bounds from src/lib/regions.ts', () => {
    expect(KP_BBOX).toEqual({ minLon: 99.9, minLat: 9.65, maxLon: 100.1, maxLat: 9.82 })
    expect(inKp(9.708598, 99.990975)).toBe(true)
    expect(inKp(13.75, 100.5)).toBe(false)
    expect(inKp(null, null)).toBe(false)
  })
})

describe('buildFunnel', () => {
  const input = {
    now,
    scanRequests: [{ created_at: d(1) }, { created_at: d(30) }],
    candidateCounts: { pending: 100, added: 10, rejected: 5, pendingA: 40, kpAll: 60, kpPendingA: 20, created7d: 30, kpCreated7d: 25 },
    properties: [
      { id: 'p1', name: 'Resort A', lat: 9.7, lon: 99.99, created_at: d(2) },
      { id: 'p2', name: 'Factory B', lat: 13.7, lon: 100.5, created_at: d(20) },
      { id: 'p3', name: 'Villa C', lat: 9.71, lon: 100.0, created_at: d(20) },
    ],
    owners: [
      { property_id: 'p1', data: { operationalContactPhone: '0946692011', lastResearchedAt: d(2) } },
      { property_id: 'p2', data: { lastResearchedAt: d(3) } },
    ],
    outreach: [
      { property_id: 'p1', status: 'sent', sent_at: d(1) },
      { property_id: 'p1', status: 'sent', sent_at: d(1) },
      { property_id: 'p2', status: 'draft', sent_at: null },
    ],
    proposals: [
      { ref_number: 'R1', status: 'viewed', client_name: 'A', created_at: d(3), first_viewed_at: d(2), signed_at: null },
      { ref_number: 'R2', status: 'signed', client_name: 'B', created_at: d(40), first_viewed_at: d(39), signed_at: d(1) },
      { ref_number: 'R3', status: 'sent', client_name: 'C', created_at: d(1), first_viewed_at: null, signed_at: null },
    ],
  }
  it('produces the eight stages with all/kp/rest/d7 counts', () => {
    const f = buildFunnel(input)
    const byKey = Object.fromEntries(f.stages.map((s) => [s.key, s]))
    expect(f.stages.map((s) => s.key)).toEqual(['scans', 'candidates', 'promoted', 'with_contact', 'outreach', 'proposals', 'viewed', 'signed'])
    expect(byKey.scans).toMatchObject({ all: 2, d7: 1, kp: null, rest: null })
    expect(byKey.candidates).toMatchObject({ all: 115, kp: 60, rest: 55, d7: 30, pending: 100, added: 10, rejected: 5, pendingA: 40, kpPendingA: 20 })
    expect(byKey.promoted).toMatchObject({ all: 3, kp: 2, rest: 1, d7: 1 })
    expect(byKey.with_contact).toMatchObject({ all: 1, kp: 1, rest: 0 })
    expect(byKey.outreach).toMatchObject({ all: 1, d7: 1 })          // distinct properties, sent only
    expect(byKey.proposals).toMatchObject({ all: 3, d7: 2, kp: null })
    expect(byKey.viewed).toMatchObject({ all: 2, d7: 1 })             // first_viewed_at not null
    expect(byKey.signed).toMatchObject({ all: 1, d7: 1 })
  })
  it('lists leads without contact and proposals viewed-not-signed', () => {
    const f = buildFunnel(input)
    expect(f.attention.no_contact.map((p) => p.id)).toEqual(['p2', 'p3'])
    expect(f.attention.viewed_unsigned.map((p) => p.ref_number)).toEqual(['R1'])
  })
})
