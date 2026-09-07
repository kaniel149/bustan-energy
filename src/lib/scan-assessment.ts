import type { ScanCandidate } from './bustan-crm-service'
import { sizingSummary } from './scan-review'

export interface DemandInputs {
  monthlyKwh: number
  daytimePercent: number
  dailyYield: number
}

/** Screening calculation only: match average daytime consumption, bounded by roof capacity. */
export function assessDemand(candidate: ScanCandidate, input: DemandInputs) {
  const capacity = sizingSummary(candidate).estimatedCapacityKwp
  if (capacity == null || !Number.isFinite(input.monthlyKwh) || input.monthlyKwh <= 0 ||
    !Number.isFinite(input.daytimePercent) || input.daytimePercent <= 0 || input.daytimePercent > 100 ||
    !Number.isFinite(input.dailyYield) || input.dailyYield <= 0 || input.dailyYield > 8) return null
  const demandKwp = input.monthlyKwh * input.daytimePercent / 100 / 30 / input.dailyYield
  // Round DOWN so the displayed screening size never exceeds either constraint.
  const recommendedKwp = Math.floor(Math.min(capacity, demandKwp) * 10) / 10
  return {
    recommendedKwp,
    demandKwp,
    roofLimited: capacity < demandKwp,
    estimatedMonthlyKwh: Math.round(recommendedKwp * input.dailyYield * 30),
  }
}

export function safeWebsite(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const raw = value.trim()
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

/** Keep current worker counters and legacy job records honest in the history. */
export function scanJobSummary(value: unknown) {
  const counts = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const count = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null
  const found = count(counts.found) ?? count(counts.fetched)
  return {
    added: count(counts.candidates) ?? count(counts.inserted),
    examined: found == null ? null : found + (count(counts.overture) ?? 0),
    coverage: counts.coverage === 'partial' ? 'partial' : counts.coverage === 'available_sources_processed' ? 'processed' : 'unknown',
  }
}

export function viewportScanArea(bounds: [[number, number], [number, number]]) {
  const [[west, south], [east, north]] = bounds
  if (![west, south, east, north].every(Number.isFinite) || west < -180 || east > 180 || south < -90 || north > 90 ||
    east <= west || north <= south || east - west > 0.2 || north - south > 0.2) return null
  return {
    bbox: [west, south, east, north],
    polygon: { type: 'Polygon', coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] } as GeoJSON.Polygon,
  }
}
