// Single source for every number shown on /partners. `pending: true` = Kaniel has not yet
// closed the item in bustan-index/presentations/VALIDATION.md §4; the page shows a badge.
export const VALIDATED_AT = '2026-09-03'
export type FactKey = 'peaTariff' | 'ppaTariff' | 'installedCostPerKwp' | 'salePricePerKwp' | 'sunHours' | 'loanRate' | 'loanTermYears'
export interface InvestorFact {
  value: number
  unit: string
  source: 'workbook' | 'deck'
  pending: boolean
  /** Required when pending: what disagrees with what. */
  note?: string
}
export const INVESTOR_FACTS: Record<FactKey, InvestorFact> = {
  peaTariff: { value: 6, unit: 'THB/kWh', source: 'workbook', pending: false },
  sunHours: { value: 4.5, unit: 'h/day', source: 'workbook', pending: false },
  ppaTariff: { value: 4.5, unit: 'THB/kWh', source: 'workbook', pending: true,
    note: 'Deck uses 4.5 in examples and 4.20 as default; workbook QA retail 4.40 — one number to be chosen.' },
  installedCostPerKwp: { value: 11_800, unit: 'THB/kWp', source: 'workbook', pending: true,
    note: 'Deck shows ฿12K (EPC) and ฿20K (ESCO 500 kWp) vs workbook 11,800 — basis per system size to be chosen.' },
  salePricePerKwp: { value: 32_500, unit: 'THB/kWp', source: 'workbook', pending: true,
    note: 'Deck examples (villa 10 kW ฿300K, resort 50 kW ฿1.5M) imply ~฿30K/kWp vs workbook 32,500.' },
  loanRate: { value: 3.5, unit: '%', source: 'deck', pending: false },
  loanTermYears: { value: 10, unit: 'years', source: 'deck', pending: false },
}
export function pendingFacts(): FactKey[] {
  return (Object.keys(INVESTOR_FACTS) as FactKey[]).filter((k) => INVESTOR_FACTS[k].pending)
}
export function hasPendingFacts(): boolean {
  return pendingFacts().length > 0
}
