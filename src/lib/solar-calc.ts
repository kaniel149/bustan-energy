import type { SolarCalc, GridProximity, GridGrade } from '../types'
import { STANDARD_PANEL_WATT } from './constants'

const PANEL_AREA_M2 = 2.0
const PANEL_WATT = STANDARD_PANEL_WATT
// PR 0.77 for Ko Phangan tropical+coastal (IEC 61724 / Skoplaki & Palyvos 2009)
const PERFORMANCE_RATIO = 0.77
// 3% soiling loss from salt-spray + monsoon dust (IEA PVPS T13-10:2018)
const SOILING_FACTOR = 0.97
const EPC_COST_PER_KWP = 32000 // THB
const DISCOUNT_RATE = 0.08     // 8% for discounted payback

// Thailand PEA export/net-billing planning defaults (verify per project approval)
export const RETAIL_RATE_DEFAULT = 4.4    // THB/kWh
export const EXPORT_RATE_DEFAULT = 3.1    // THB/kWh (~70% of retail)
export const SELF_CONSUMPTION_PCT = 0.60  // grid-tied default

export function calculateSolar(
  areaM2: number,
  irradiance: number,
  tariff: number,
  isRoof: boolean
): SolarCalc {
  const usablePct = isRoof ? 0.7 : 0.85
  const usableArea = areaM2 * usablePct
  const panelCount = Math.floor(usableArea / PANEL_AREA_M2)
  const capacityKwp = (panelCount * PANEL_WATT) / 1000
  const effectivePR = PERFORMANCE_RATIO * SOILING_FACTOR

  // Year-1 degradation: 2% LID for mono-PERC/TOPCon (Jordan & Kurtz 2013)
  const annualKwh = capacityKwp * irradiance * 365 * effectivePR * (1 - 0.02)

  // Blended effective rate (self-consumption + export/net-billing assumption)
  const exportRate = Math.min(tariff * 0.70, EXPORT_RATE_DEFAULT)
  const blendedRate = SELF_CONSUMPTION_PCT * tariff + (1 - SELF_CONSUMPTION_PCT) * exportRate
  const annualSavingsTHB = annualKwh * blendedRate

  const epcCost = capacityKwp * EPC_COST_PER_KWP

  // Discounted payback: find year where cumulative NPV >= 0 (8% discount)
  const OM_COST_PCT = 0.01
  const annualOMCost = epcCost * OM_COST_PCT
  const ANNUAL_DEGRAD = 0.005
  let cumulativeNPV = -epcCost
  let paybackYears = 25
  const baselineKwh = capacityKwp * irradiance * 365 * effectivePR
  for (let year = 1; year <= 25; year++) {
    // degradationFactor: year=1 -> 0.98; year=2+ -> 0.98 * (1-0.005)^(year-2)
    const degFactor = year === 1 ? 0.98 : 0.98 * Math.pow(1 - ANNUAL_DEGRAD, year - 2)
    const yearlySavings = baselineKwh * degFactor * blendedRate
    const netCF = yearlySavings - annualOMCost
    const discountedCF = netCF / Math.pow(1 + DISCOUNT_RATE, year)
    const prevNPV = cumulativeNPV
    cumulativeNPV += discountedCF
    if (cumulativeNPV >= 0) {
      paybackYears = year - 1 + Math.abs(prevNPV) / discountedCF
      break
    }
  }

  return {
    usableArea,
    panelCount,
    capacityKwp,
    annualKwh,
    annualSavingsTHB,
    epcCost,
    paybackYears,
  }
}

export function classifyGridGrade(distanceMeters: number): GridGrade {
  if (distanceMeters <= 500) return 'A'
  if (distanceMeters <= 2000) return 'B'
  if (distanceMeters <= 5000) return 'C'
  return 'D'
}

export function estimateConnectionCost(distanceMeters: number): number {
  if (distanceMeters <= 500) return 200000
  if (distanceMeters <= 2000) return 300000 + (distanceMeters - 500) * 500
  if (distanceMeters <= 5000) return 1000000 + (distanceMeters - 2000) * 700
  return 3000000 + (distanceMeters - 5000) * 1000
}

export function calculateGridProximity(
  propertyLng: number,
  propertyLat: number,
  gridFeatures: GeoJSON.FeatureCollection
): GridProximity {
  let minDistance = Infinity
  let nearestType = 'unknown'
  let nearestName = 'Unknown'

  for (const feature of gridFeatures.features) {
    const props = feature.properties as Record<string, string>
    const ptype = props?.power_type
    if (!ptype) continue

    // Prioritize substations and lines over towers/poles
    const coords = getFeatureCoordinates(feature)
    for (const [lng, lat] of coords) {
      const dist = haversineDistance(propertyLat, propertyLng, lat, lng)
      if (dist < minDistance) {
        minDistance = dist
        nearestType = ptype
        nearestName = props?.name || props?.['name:en'] || ptype
      }
    }
  }

  const grade = classifyGridGrade(minDistance)
  const estimatedConnectionCost = estimateConnectionCost(minDistance)

  return {
    grade,
    distanceMeters: Math.round(minDistance),
    nearestFeatureType: nearestType,
    nearestFeatureName: nearestName,
    estimatedConnectionCost,
  }
}

function getFeatureCoordinates(feature: GeoJSON.Feature): [number, number][] {
  const geom = feature.geometry
  if (geom.type === 'Point') {
    return [geom.coordinates as [number, number]]
  }
  if (geom.type === 'LineString') {
    return geom.coordinates as [number, number][]
  }
  if (geom.type === 'Polygon') {
    return geom.coordinates[0] as [number, number][]
  }
  if (geom.type === 'MultiLineString') {
    return geom.coordinates.flat() as [number, number][]
  }
  return []
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
