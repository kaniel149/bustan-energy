// ============================================================
// api/_lib/outreach/assumptions.ts
// Single source of truth for outreach savings math.
// The LLM NEVER computes numbers — these do.
// ============================================================

export const USABLE_ROOF_FACTOR = 0.85   // share of roof usable for panels
export const SQM_PER_KWP = 6             // m² of roof per kWp installed
export const KWH_PER_KWP_PER_DAY = 4.2   // Thailand average yield
export const DAYS_PER_MONTH = 30
export const THB_PER_KWH = 4.5           // PEA business tariff approx
export const MIN_KWP_FOR_OUTREACH = 10   // below this, not worth a B2B email

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
