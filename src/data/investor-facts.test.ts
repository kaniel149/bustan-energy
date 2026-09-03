import { describe, it, expect } from 'vitest'
import { INVESTOR_FACTS, VALIDATED_AT, pendingFacts, hasPendingFacts } from './investor-facts'

describe('investor facts', () => {
  it('exactly the three VALIDATION.md §2 mismatches are pending, each with a note; VALIDATED_AT is an ISO date', () => {
    expect(VALIDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(pendingFacts().sort()).toEqual(['installedCostPerKwp', 'ppaTariff', 'salePricePerKwp'])
    for (const k of pendingFacts()) expect(INVESTOR_FACTS[k].note).toMatch(/deck/i)
    expect(hasPendingFacts()).toBe(true)
  })
  it('agreed figures are workbook-sourced and not pending', () => {
    expect(INVESTOR_FACTS.peaTariff).toMatchObject({ value: 6, unit: 'THB/kWh', source: 'workbook', pending: false })
    expect(INVESTOR_FACTS.sunHours).toMatchObject({ value: 4.5, pending: false })
  })
})
