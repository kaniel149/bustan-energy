// ============================================================
// api/_lib/outreach/assumptions.ts
// Single source of truth for outreach savings math.
// The LLM NEVER computes numbers — these do.
//
// These figures are DERIVED from TM_SOLAR_ASSUMPTIONS (src/lib/solar-financials.ts),
// the same constants that drive the formal proposal. They used to be standalone
// literals (4.2 kWh/kWp/day × 4.5 THB/kWh), which overstated savings by ~30% versus
// the proposal the same prospect receives later — the cold email promised a number
// the quote then contradicted. Deriving them here keeps the two documents honest.
// ============================================================

import { TM_SOLAR_ASSUMPTIONS } from '../../../src/lib/solar-financials.js'

export const USABLE_ROOF_FACTOR = 0.85   // share of roof usable for panels
export const SQM_PER_KWP = 6             // m² of roof per kWp installed
export const DAYS_PER_MONTH = 30
export const MIN_KWP_FOR_OUTREACH = 10   // below this, not worth a B2B email

/**
 * Daily yield per kWp, matching the proposal engine's
 * `baselineKwh = kWp × PSH × 365 × (PR × soiling)`.
 * 5.0 × 0.77 × 0.97 ≈ 3.73 kWh/kWp/day.
 */
export const KWH_PER_KWP_PER_DAY =
  TM_SOLAR_ASSUMPTIONS.pshAnnual *
  TM_SOLAR_ASSUMPTIONS.performanceRatio *
  TM_SOLAR_ASSUMPTIONS.soilingFactor

/**
 * Blended value per kWh. A grid-tied system without a battery self-consumes
 * `selfConsumptionGridTied` of what it makes (worth the retail tariff) and
 * exports the rest (worth the lower export tariff). Outreach quotes the
 * no-battery case, so this mirrors the proposal's `blendedRate` for that case.
 * 0.60 × 4.4 + 0.40 × 3.1 ≈ 3.88 THB/kWh.
 */
export const THB_PER_KWH =
  TM_SOLAR_ASSUMPTIONS.selfConsumptionGridTied * TM_SOLAR_ASSUMPTIONS.retailRateThb +
  (1 - TM_SOLAR_ASSUMPTIONS.selfConsumptionGridTied) * TM_SOLAR_ASSUMPTIONS.exportRateThb

export interface SolarFacts {
  kwp: number
  monthlySavingThb: number
  annualSavingThb: number
}

export function calcSolar(roofAreaSqm: number): SolarFacts | null {
  if (!roofAreaSqm || !Number.isFinite(roofAreaSqm) || roofAreaSqm <= 0) return null
  const kwp = Math.round((roofAreaSqm * USABLE_ROOF_FACTOR) / SQM_PER_KWP)
  if (kwp < MIN_KWP_FOR_OUTREACH) return null
  const monthlySavingThb =
    Math.round((kwp * KWH_PER_KWP_PER_DAY * DAYS_PER_MONTH * THB_PER_KWH) / 1000) * 1000
  return { kwp, monthlySavingThb, annualSavingThb: monthlySavingThb * 12 }
}

export function formatThb(n: number): string {
  return '฿' + n.toLocaleString('en-US')
}
