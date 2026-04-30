// ── PERFORMANCE CONSTANTS (Ko Phangan tropical+coastal) ──────────────────────
// PR 0.77: IEC 61724 typical tropical (vs 0.80 temperate).
// Source: Skoplaki & Palyvos 2009, validated on Thai PEA monitoring data.
const PERFORMANCE_RATIO = 0.77
// SOILING_FACTOR 0.97: 3% loss from salt-spray + monsoon dust, Ko Phangan.
// Applied as additional multiplier on top of PR.
// Source: IEA PVPS T13-10:2018 coastal soiling study.
const SOILING_FACTOR = 0.97
// Effective PR = 0.77 * 0.97 = 0.7469 (~0.747)

const DEFAULT_EPC_COST_PER_KWP = 32000     // THB/kWp
const DEFAULT_DISCOUNT_RATE = 0.08         // 8%
const DEFAULT_DEGRADATION_RATE = 0.005     // 0.5%/year (years 2+); year 1 = 2%
const DEFAULT_TARIFF_ESCALATION = 0.03     // 3%/year
const DEFAULT_SYSTEM_LIFE_YEARS = 25
const OM_COST_PCT = 0.01                   // 1% of EPC/year
const CO2_KG_PER_KWH = 0.477              // EGAT 2023 official grid mix
const PANEL_WATT = 550

// ── THAILAND PEA EXPORT / TARIFF MODEL ───────────────────────────────────────
// Export value is a planning assumption and must be verified against the current
// PEA/ERC program and project approval before client or investor use.
export interface TariffModel {
  retailRate: number          // THB/kWh (e.g. 4.4)
  exportRate: number          // THB/kWh (e.g. 3.1 = ~70% of retail)
  selfConsumptionPct: number  // 0.60 grid-tied typical, 0.85 with battery
}

const DEFAULT_TARIFF_MODEL: TariffModel = {
  retailRate: 4.4,
  exportRate: 3.1,
  selfConsumptionPct: 0.60,
}

// Effective blended rate = self_pct * retail + (1 - self_pct) * export
function effectiveRate(model: TariffModel): number {
  return model.selfConsumptionPct * model.retailRate +
    (1 - model.selfConsumptionPct) * model.exportRate
}

// ── DEGRADATION: 2% year-1, then 0.5%/year ───────────────────────────────────
// IEC 61215 / NREL "Photovoltaic Degradation Rates" (Jordan & Kurtz 2013).
// First-year LID (Light Induced Degradation) for mono-PERC/TOPCon: ~2%.
function degradationFactor(year: number, annualRate: number): number {
  if (year === 1) return 1 - 0.02
  // Year 2+ relative to post-LID baseline (year-1 output = 0.98)
  return 0.98 * Math.pow(1 - annualRate, year - 2)
}

// Monthly distribution factors for Thailand (relative to annual average)
// Higher in dry season (Nov–Apr), lower in wet season (May–Oct)
const MONTHLY_FACTORS = [
  1.05, // Jan
  1.10, // Feb
  1.12, // Mar
  1.08, // Apr
  0.95, // May
  0.88, // Jun
  0.87, // Jul
  0.88, // Aug
  0.90, // Sep
  0.93, // Oct
  0.98, // Nov
  1.02, // Dec
]

export interface FinancialAnalysis {
  // System
  capacityKwp: number
  panelCount: number
  annualKwhYear1: number

  // Costs
  epcCost: number
  annualOMCost: number

  // Revenue
  annualSavingsYear1: number
  monthlyRevenue: number[]   // 12 months (THB)
  monthlyKwh: number[]       // 12 months

  // Returns
  paybackYears: number
  roi25Year: number          // 25-year ROI %
  irr: number                // Internal Rate of Return %
  npv: number                // Net Present Value (THB)
  lcoe: number               // Levelized Cost of Energy (THB/kWh)

  // Lifetime
  lifetimeKwh: number        // 25 years with annual degradation
  lifetimeSavings: number    // With tariff escalation (THB)
  co2Avoided: number         // tons CO2 over 25 years
}

function calculateNPV(cashflows: number[], rate: number): number {
  return cashflows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0)
}

function calculateIRR(cashflows: number[]): number {
  // Bisection method — reliable for typical solar cashflow patterns
  let lo = -0.5
  let hi = 2.0
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const npv = calculateNPV(cashflows, mid)
    if (npv > 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function calculateFinancials(params: {
  capacityKwp: number
  annualGHI: number          // kWh/m²/day from NASA POWER
  tariffRate?: number        // THB/kWh — legacy param, prefer tariffModel
  tariffModel?: TariffModel  // Full self-consumption/export model (preferred)
  epcCostPerKwp?: number
  discountRate?: number
  degradationRate?: number
  tariffEscalation?: number
  systemLifeYears?: number
  soilingFactor?: number     // Override location soiling (default SOILING_FACTOR)
  performanceRatio?: number  // Override PR (default PERFORMANCE_RATIO)
}): FinancialAnalysis {
  const {
    capacityKwp,
    annualGHI,
    epcCostPerKwp = DEFAULT_EPC_COST_PER_KWP,
    discountRate = DEFAULT_DISCOUNT_RATE,
    degradationRate = DEFAULT_DEGRADATION_RATE,
    tariffEscalation = DEFAULT_TARIFF_ESCALATION,
    systemLifeYears = DEFAULT_SYSTEM_LIFE_YEARS,
    soilingFactor = SOILING_FACTOR,
    performanceRatio = PERFORMANCE_RATIO,
  } = params

  // Resolve tariff model: accept either legacy tariffRate or full TariffModel
  const tariffModel: TariffModel = params.tariffModel ?? {
    ...DEFAULT_TARIFF_MODEL,
    retailRate: params.tariffRate ?? DEFAULT_TARIFF_MODEL.retailRate,
  }
  const blendedRate = effectiveRate(tariffModel)

  // System sizing
  const panelCount = Math.round((capacityKwp * 1000) / PANEL_WATT)
  const epcCost = capacityKwp * epcCostPerKwp
  const annualOMCost = epcCost * OM_COST_PCT

  // Year 1 production — apply PR * soiling
  const effectivePR = performanceRatio * soilingFactor
  // Year-1 degradation factor = 0.98 (2% LID)
  const annualKwhYear1 = capacityKwp * annualGHI * 365 * effectivePR * degradationFactor(1, degradationRate)
  // annualSavingsYear1 uses the blended effective rate (self-consumption + export)
  const annualSavingsYear1 = annualKwhYear1 * blendedRate

  // Monthly production based on NASA GHI distributed by monthly factors
  const factorSum = MONTHLY_FACTORS.reduce((a, b) => a + b, 0)
  // monthlyKwh for display uses year-1 output (already includes LID)
  const monthlyKwh = MONTHLY_FACTORS.map((f) => annualKwhYear1 * (f / factorSum))
  const monthlyRevenue = monthlyKwh.map((kwh) => kwh * blendedRate)

  // 25-year cashflow model
  // t=0: -epcCost
  // t=year: yearlyKwh (with LID + annual degradation) * blended rate * tariff escalation - O&M
  const cashflows: number[] = [-epcCost]
  let lifetimeKwh = 0
  let lifetimeSavings = 0

  for (let year = 1; year <= systemLifeYears; year++) {
    const degFactor = degradationFactor(year, degradationRate)
    // Year-1 baseline before LID = capacityKwp * annualGHI * 365 * effectivePR
    // yearlyKwh already folds in LID via degradationFactor
    const yearlyKwh = capacityKwp * annualGHI * 365 * effectivePR * degFactor
    const tariffFactor = Math.pow(1 + tariffEscalation, year - 1)
    const yearlySavings = yearlyKwh * blendedRate * tariffFactor
    const yearlyNetCashflow = yearlySavings - annualOMCost

    cashflows.push(yearlyNetCashflow)
    lifetimeKwh += yearlyKwh
    lifetimeSavings += yearlySavings
  }

  // ── DISCOUNTED PAYBACK (Fix #1) ───────────────────────────────────────────
  // Find first year where cumulative discounted NPV (including t=0 cost) >= 0.
  // Interpolate fractional year for precision.
  let cumulativeNPV = cashflows[0] // -epcCost
  let paybackYears = systemLifeYears // fallback: not recovered within life
  for (let year = 1; year <= systemLifeYears; year++) {
    const discountedCF = cashflows[year] / Math.pow(1 + discountRate, year)
    const prevNPV = cumulativeNPV
    cumulativeNPV += discountedCF
    if (cumulativeNPV >= 0) {
      // Interpolate: fraction = |prevNPV| / discountedCF
      paybackYears = year - 1 + Math.abs(prevNPV) / discountedCF
      break
    }
  }

  const npv = calculateNPV(cashflows, discountRate)
  const irr = calculateIRR(cashflows)

  // ROI over 25 years
  const totalRevenue = cashflows.slice(1).reduce((a, b) => a + b, 0)
  const roi25Year = ((totalRevenue - epcCost) / epcCost) * 100

  // LCOE: total discounted costs / total discounted energy
  const totalDiscountedCost = epcCost + cashflows.slice(1).map((_, i) =>
    annualOMCost / Math.pow(1 + discountRate, i + 1)
  ).reduce((a, b) => a + b, 0)
  const totalDiscountedKwh = Array.from({ length: systemLifeYears }, (_, i) => {
    const degFactor = degradationFactor(i + 1, degradationRate)
    const yearlyKwh = capacityKwp * annualGHI * 365 * effectivePR * degFactor
    return yearlyKwh / Math.pow(1 + discountRate, i + 1)
  }).reduce((a, b) => a + b, 0)
  const lcoe = totalDiscountedKwh > 0 ? totalDiscountedCost / totalDiscountedKwh : 0

  // CO2 avoided — EGAT 2023 official grid mix (0.477 kg CO2/kWh)
  const co2Avoided = (lifetimeKwh * CO2_KG_PER_KWH) / 1000 // convert kg -> tons

  return {
    capacityKwp,
    panelCount,
    annualKwhYear1,
    epcCost,
    annualOMCost,
    annualSavingsYear1,
    monthlyRevenue,
    monthlyKwh,
    paybackYears,
    roi25Year,
    irr,
    npv,
    lcoe,
    lifetimeKwh,
    lifetimeSavings,
    co2Avoided,
  }
}
