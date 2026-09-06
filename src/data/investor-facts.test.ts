import { describe, it, expect } from 'vitest'
import { INVESTOR_FACTS, VALIDATED_AT, pendingFacts, hasPendingFacts } from './investor-facts'

describe('investor facts', () => {
  it('VALIDATION.md §4 is closed (SPEC 2026-09-04): nothing pending; VALIDATED_AT is an ISO date', () => {
    expect(VALIDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(pendingFacts()).toEqual([])
    expect(hasPendingFacts()).toBe(false)
  })
  it('canonical Sep-2026 figures are spec-sourced and carry their tier/condition notes', () => {
    expect(INVESTOR_FACTS.peaTariff).toMatchObject({ value: 4.52, unit: 'THB/kWh', source: 'spec', pending: false })
    expect(INVESTOR_FACTS.ppaTariff).toMatchObject({ value: 3.8, unit: 'THB/kWh', pending: false })
    expect(INVESTOR_FACTS.installedCostPerKwp).toMatchObject({ value: 17_000, pending: false })
    expect(INVESTOR_FACTS.salePricePerKwp).toMatchObject({ value: 30_000, pending: false })
    expect(INVESTOR_FACTS.sunHours).toMatchObject({ value: 4.0, pending: false })
    expect(INVESTOR_FACTS.yieldKwhPerKwp).toMatchObject({ value: 1_450, unit: 'kWh/kWp/yr' })
    expect(INVESTOR_FACTS.netBillingExport).toMatchObject({ value: 2.2 })
    expect(INVESTOR_FACTS.taxDeduction).toMatchObject({ value: 200_000, unit: 'THB' })
    expect(INVESTOR_FACTS.loanRate.note).toMatch(/GSB/)
    expect(INVESTOR_FACTS.loanRate.note).not.toMatch(/Krungsri/)
    expect(INVESTOR_FACTS.taxDeduction.note).toMatch(/Not available under a PPA/)
    for (const k of ['installedCostPerKwp', 'salePricePerKwp', 'ppaTariff'] as const) expect(INVESTOR_FACTS[k].note).toBeTruthy()
  })
})
