// Single source for every number shown on /partners. `pending: true` = Kaniel has not yet
// closed the item in bustan-index/presentations/VALIDATION.md §4; the page shows a badge.
// Canonical values: /tmp/bustan-audit/SPEC.md (approved 2026-09-04) — all §4 decisions closed.
export const VALIDATED_AT = '2026-09-04'
export type FactKey =
  | 'peaTariff'
  | 'ppaTariff'
  | 'installedCostPerKwp'
  | 'salePricePerKwp'
  | 'sunHours'
  | 'yieldKwhPerKwp'
  | 'netBillingExport'
  | 'taxDeduction'
  | 'loanRate'
  | 'loanTermYears'
export interface InvestorFact {
  value: number
  unit: string
  source: 'workbook' | 'deck' | 'spec'
  pending: boolean
  /** Required when pending: what disagrees with what. Optional otherwise: tiers / conditions behind the headline value. */
  note?: string
}
export const INVESTOR_FACTS: Record<FactKey, InvestorFact> = {
  // PEA Sep–Dec 2026: base 3.69 + Ft 0.1623 → average 3.86 ex-VAT. Solar displaces the marginal rate:
  // residential Type 1.1.2 (>400 kWh) 4.52 ex-VAT (4.84 incl. VAT); small business Type 2.1.1 4.58 (4.90 incl. VAT).
  peaTariff: { value: 4.52, unit: 'THB/kWh', source: 'spec', pending: false,
    note: 'PEA marginal rate displaced by solar, ex-VAT: residential 4.52 (4.84 incl. VAT), small business 4.58 (4.90 incl. VAT); average tariff 3.86 (Sep–Dec 2026). Escalation assumption 0–1.5%/yr.' },
  // Koh Phangan: 1,450 kWh/kWp/yr base (≈4.0 sun-hours/day), 1,400 P90 for PPA cash flows, 0.5%/yr degradation.
  sunHours: { value: 4.0, unit: 'h/day', source: 'spec', pending: false,
    note: '≈1,450 kWh/kWp/yr base; 1,400 P90 for PPA cash flows; 0.5%/yr degradation.' },
  yieldKwhPerKwp: { value: 1_450, unit: 'kWh/kWp/yr', source: 'spec', pending: false,
    note: 'Base case Koh Phangan; P90 1,400. A 50 kWp system ≈ 72,500 kWh/yr.' },
  // Headline PPA tariff 3.80 for 30–150 kW (range 3.60–3.90); ≤3.40 for ≥500 kWp; 15 years; escalation 0–1.5%/yr.
  ppaTariff: { value: 3.8, unit: 'THB/kWh', source: 'spec', pending: false,
    note: '30–150 kW headline (range 3.60–3.90); ≤3.40 for ≥500 kWp; 15-year term; escalation 0–1.5%/yr; ≈16–20% below the customer\'s marginal PEA rate. No BOI CIT holiday applies to rooftop/PPA (BOI Ann. 3/2568, 1 Jul 2025).' },
  // Direct installed cost (equipment + labour), THB/kWp ex-VAT, island logistics included.
  installedCostPerKwp: { value: 17_000, unit: 'THB/kWp', source: 'spec', pending: false,
    note: 'Tiers: 5–10 kW 17,000 · 30–100 kW 14,500 · 500 kWp 13,500–14,500 (ESCO all-in 15,000–17,000).' },
  // Sale price to customer, THB/kWp ex-VAT (10 kW villa reference ≈ ฿300,000).
  salePricePerKwp: { value: 30_000, unit: 'THB/kWp', source: 'spec', pending: false,
    note: 'Tiers: 5 kW 34,000 · 10 kW 30,000 · 30–50 kW 24,000 · 100 kW 22,000 · 500 kWp EPC 17,000–20,000. Gross margin ≈40–45% (10 kW), 35–40% (50 kW).' },
  // Residential net billing (ERC regulation 24 Jun 2026; PEA PPIM 1 Jul 2026 – 30 Nov 2027): Type 1 meters only, export ≤5 kW AC, 10-yr contract. Commercial / PPA sites: 0 → zero-export design.
  netBillingExport: { value: 2.2, unit: 'THB/kWh', source: 'spec', pending: false,
    note: 'Residential net billing only (Type 1 meter, export ≤5 kW AC, 10-year contract, 500 MW national quota). Business / PPA sites: export value 0 → zero-export design. Thailand has net billing, not net metering.' },
  // Royal Decree No. 805: personal income-tax deduction up to ฿200,000, 3 Mar 2026 – 31 Dec 2028.
  taxDeduction: { value: 200_000, unit: 'THB', source: 'spec', pending: false,
    note: 'Royal Decree No. 805, 3 Mar 2026 – 31 Dec 2028: individual who owns the meter, on-grid rooftop ≤10 kWp, one system, e-Tax Invoice from a VAT-registered installer, claimed in the year of grid connection. Not available under a PPA.' },
  // Bank financing: GSB Solar for Life — 3.50% yrs 1–2 (3.25% secured), 5.00% yrs 3–5, then MRR; ≤7 yr; ≤฿1M (to 31 Mar 2027).
  // TTB SME Solar Rooftop — 3.5% yrs 1–2, ≤8 yr, up to 100% of project. Model blended 4.5–5.5% over 7–10 yr.
  loanRate: { value: 3.5, unit: '%', source: 'spec', pending: false,
    note: 'GSB Solar for Life 3.50% yrs 1–2 (3.25% secured), 5.00% yrs 3–5, then MRR · TTB SME Solar Rooftop 3.5% yrs 1–2. Blended model 4.5–5.5%.' },
  loanTermYears: { value: 7, unit: 'years', source: 'spec', pending: false,
    note: 'GSB up to 7 years (≤฿1M) · TTB up to 8 years (up to 100% of project). Model 7–10 years.' },
}
export function pendingFacts(): FactKey[] {
  return (Object.keys(INVESTOR_FACTS) as FactKey[]).filter((k) => INVESTOR_FACTS[k].pending)
}
export function hasPendingFacts(): boolean {
  return pendingFacts().length > 0
}
