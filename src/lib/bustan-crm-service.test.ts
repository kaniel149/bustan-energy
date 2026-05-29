import { describe, it, expect } from 'vitest'
import fixtureJson from './__fixtures__/bustan-leads.json'
import {
  rowsToLeads,
  toPropertyInput,
  mapLeadToProperty,
  type BustanPropertyRow,
  type BustanOwnerRow,
  type BustanPipelineRow,
} from './bustan-crm-service'
import { summarizeCrmRecords } from './owner-decision-layer'

const fixture = fixtureJson as unknown as {
  properties: BustanPropertyRow[]
  owners: BustanOwnerRow[]
  pipelines: BustanPipelineRow[]
}

const leads = rowsToLeads(fixture.properties, fixture.owners, fixture.pipelines)

describe('bustan-crm-service: real seeded data (85 leads)', () => {
  it('joins all 85 properties with owner + pipeline', () => {
    expect(leads).toHaveLength(85)
    expect(leads.every((l) => l.pipeline)).toBe(true)
    expect(leads.every((l) => l.owner)).toBe(true)
  })

  it('reproduces the documented priority split A=17 / B=61 / C=7', () => {
    const inputs = leads.map((l) => toPropertyInput(l.property, l.owner, l.pipeline))
    const summary = summarizeCrmRecords(inputs)
    expect(summary.byPriority).toEqual({ A: 17, B: 61, C: 7 })
  })

  it('derives reachability for all 85 leads (1 contactable / 64 partial / 20 cold)', () => {
    // NOTE: the handoff documented 1/66/18 as a point-in-time snapshot. The
    // current live seed yields 1/64/20 — 2 leads have since lost reachable
    // contact info. The derivation logic itself is locked by the unit tests in
    // owner-decision-layer.test.ts; this asserts the actual current data state.
    const reach = { contactable: 0, partial: 0, cold: 0 }
    for (const l of leads) reach[l.crm.reachability] += 1
    expect(reach.contactable + reach.partial + reach.cold).toBe(85)
    expect(reach).toEqual({ contactable: 1, partial: 64, cold: 20 })
  })

  it('reports a pipeline of roughly 6,925 kWp (non-lost)', () => {
    const inputs = leads.map((l) => toPropertyInput(l.property, l.owner, l.pipeline))
    const summary = summarizeCrmRecords(inputs)
    expect(summary.totalPipelineKwp).toBeGreaterThan(6000)
    expect(summary.totalPipelineKwp).toBeLessThan(8000)
  })

  it('exposes the 64 real phone numbers through the mapped Property', () => {
    const withPhone = leads.map(mapLeadToProperty).filter((p) => p.phone)
    expect(withPhone.length).toBe(64)
  })

  it('maps every lead to a Property with coordinates for the map', () => {
    const props = leads.map(mapLeadToProperty)
    expect(props.every((p) => p.lat !== 0 && p.lng !== 0)).toBe(true)
    expect(props.every((p) => p.region === 'koh_phangan')).toBe(true)
  })
})
