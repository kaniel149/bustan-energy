export const SOLAR_FINANCIAL_VERSION = 'tm-financials-2026-04-v1.2'

export const TM_SOLAR_ASSUMPTIONS = {
  locationId: 'koh_phangan',
  pshAnnual: 5.0,
  performanceRatio: 0.77,
  soilingFactor: 0.97,
  retailRateThb: 4.4,
  exportRateThb: 3.1,
  selfConsumptionGridTied: 0.6,
  selfConsumptionWithBattery: 0.85,
  discountRate: 0.08,
  tariffEscalation: 0.03,
  annualDegradation: 0.005,
  firstYearLid: 0.02,
  omCostPct: 0.01,
  systemLifeYears: 25,
  co2KgPerKwh: 0.477,
} as const

export interface SolarFinancialInput {
  systemSizeKwp?: number
  pshAvg?: number
  performanceRatio?: number
  soilingFactor?: number
  retailRateThb?: number
  exportRateThb?: number
  selfConsumptionPct?: number
  batteryKwh?: number
  totalPriceThb?: number
  discountRate?: number
  tariffEscalation?: number
  taxDeductionThb?: number
}

export interface SolarFinancialOutput {
  version: string
  system_size_kwp: number
  effective_pr: number
  self_consumption_pct: number
  blended_rate_thb: number
  annual_kwh: number
  monthly_kwh: number
  annual_savings_thb: number
  monthly_savings_thb: number
  payback_simple_years: number
  payback_discounted_years: number
  payback_with_tax_years: number
  savings_10yr_thb: number
  savings_25yr_thb: number
  co2_saved_kg_year1: number
  co2_tons_25yr: number
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function calculateSolarFinancials(input: SolarFinancialInput): SolarFinancialOutput {
  const assumptions = TM_SOLAR_ASSUMPTIONS
  const systemSizeKwp = input.systemSizeKwp || 0
  const pshAvg = input.pshAvg || assumptions.pshAnnual
  const performanceRatio = input.performanceRatio || assumptions.performanceRatio
  const soilingFactor = input.soilingFactor || assumptions.soilingFactor
  const effectivePr = performanceRatio * soilingFactor
  const retailRate = input.retailRateThb || assumptions.retailRateThb
  const exportRate = input.exportRateThb || assumptions.exportRateThb
  const selfConsumptionPct = input.selfConsumptionPct ??
    ((input.batteryKwh || 0) > 0
      ? assumptions.selfConsumptionWithBattery
      : assumptions.selfConsumptionGridTied)
  const blendedRate = selfConsumptionPct * retailRate + (1 - selfConsumptionPct) * exportRate
  const totalPrice = input.totalPriceThb || 0
  const discountRate = input.discountRate ?? assumptions.discountRate
  const tariffEscalation = input.tariffEscalation ?? assumptions.tariffEscalation
  const taxDeduction = Math.max(0, input.taxDeductionThb || 0)
  const annualOmCost = totalPrice * assumptions.omCostPct

  const baselineKwh = systemSizeKwp * pshAvg * 365 * effectivePr
  const year1Kwh = baselineKwh * (1 - assumptions.firstYearLid)
  const year1Savings = year1Kwh * blendedRate

  let lifetimeSavings = 0
  let lifetimeKwh = 0
  let cumulativeDiscounted = -totalPrice
  let paybackDiscounted = assumptions.systemLifeYears
  let cumulative10 = 0

  for (let year = 1; year <= assumptions.systemLifeYears; year += 1) {
    const degradationFactor = year === 1
      ? 1 - assumptions.firstYearLid
      : (1 - assumptions.firstYearLid) * (1 - assumptions.annualDegradation) ** (year - 2)
    const yearlyKwh = baselineKwh * degradationFactor
    const yearlySavings = yearlyKwh * blendedRate * (1 + tariffEscalation) ** (year - 1)
    const yearlyCashflow = yearlySavings - annualOmCost

    lifetimeKwh += yearlyKwh
    lifetimeSavings += yearlySavings
    if (year <= 10) cumulative10 += yearlySavings

    const discountedCashflow = yearlyCashflow / (1 + discountRate) ** year
    const previous = cumulativeDiscounted
    cumulativeDiscounted += discountedCashflow
    if (paybackDiscounted === assumptions.systemLifeYears && cumulativeDiscounted >= 0 && discountedCashflow > 0) {
      paybackDiscounted = year - 1 + Math.abs(previous) / discountedCashflow
    }
  }

  const netPriceAfterTax = Math.max(0, totalPrice - taxDeduction)
  const simplePayback = year1Savings > 0 && totalPrice > 0 ? totalPrice / year1Savings : 0
  const taxPayback = year1Savings > 0 && netPriceAfterTax > 0 ? netPriceAfterTax / year1Savings : 0

  return {
    version: SOLAR_FINANCIAL_VERSION,
    system_size_kwp: round(systemSizeKwp, 2),
    effective_pr: round(effectivePr, 4),
    self_consumption_pct: round(selfConsumptionPct, 3),
    blended_rate_thb: round(blendedRate, 3),
    annual_kwh: Math.round(year1Kwh),
    monthly_kwh: Math.round(year1Kwh / 12),
    annual_savings_thb: Math.round(year1Savings),
    monthly_savings_thb: Math.round(year1Savings / 12),
    payback_simple_years: round(simplePayback, 1),
    payback_discounted_years: totalPrice > 0 ? round(paybackDiscounted, 1) : 0,
    payback_with_tax_years: taxDeduction > 0 ? round(taxPayback, 1) : 0,
    savings_10yr_thb: Math.round(cumulative10),
    savings_25yr_thb: Math.round(lifetimeSavings),
    co2_saved_kg_year1: Math.round(year1Kwh * assumptions.co2KgPerKwh),
    co2_tons_25yr: round((lifetimeKwh * assumptions.co2KgPerKwh) / 1000, 1),
  }
}
