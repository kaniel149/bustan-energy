/**
 * Pure mapper: a bustan.scan_candidates row → NewProposalForm patch.
 *
 * Used by NewProposalPage when the URL carries `candidate_id` / `external_id`
 * (KP Solar Pro "Create proposal" CTA, candidate review panel). Kept free of
 * React and network so it can be unit-tested in isolation.
 */
import type { ScanCandidate } from './bustan-crm-service'
import type { NewProposalForm } from '../types/proposals'
import { sizingSummary } from './scan-review'

function validPosition(value: unknown): value is GeoJSON.Position {
  return Array.isArray(value) && value.length >= 2
    && value.every((part) => typeof part === 'number' && Number.isFinite(part))
    && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90
}

function validPolygon(value: unknown): value is GeoJSON.Polygon {
  if (!value || typeof value !== 'object' || !('type' in value) || value.type !== 'Polygon' || !('coordinates' in value)) return false
  return Array.isArray(value.coordinates) && value.coordinates.length > 0 && value.coordinates.every((ring: unknown) => {
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(validPosition)) return false
    const first = ring[0], last = ring[ring.length - 1]
    if (first.length !== last.length || !first.every((part, i) => part === last[i])) return false
    if (new Set(ring.map((point) => `${point[0]},${point[1]}`)).size < 3) return false
    // Translate to the first vertex to avoid cancellation at small roof scales.
    const twiceArea = ring.slice(1).reduce((sum, point, i) => sum
      + (ring[i][0] - first[0]) * (point[1] - first[1])
      - (point[0] - first[0]) * (ring[i][1] - first[1]), 0)
    return twiceArea !== 0
  })
}

/** [lng, lat] average of the outer ring, after validating every ring and point. */
export function polygonCentroidLonLat(geom: unknown): [number, number] | null {
  if (!validPolygon(geom)) return null
  const ring = geom.coordinates[0]
  const n = ring.length - 1
  let x = 0, y = 0
  for (let i = 0; i < n; i++) { x += ring[i][0]; y += ring[i][1] }
  const centroid: [number, number] = [x / n, y / n]
  return centroid[0] === 0 && centroid[1] === 0 ? null : centroid
}

function candidateCoordinate(value: unknown, limit: number): number | null {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null
  const coordinate = Number(value)
  return Number.isFinite(coordinate) && coordinate !== 0 && Math.abs(coordinate) <= limit ? coordinate : null
}

export function candidateToFormPatch(
  c: ScanCandidate,
  panelWatt: number,
  requestedScreeningKwp?: number,
): Partial<NewProposalForm> {
  if (!Number.isFinite(panelWatt) || panelWatt <= 0) throw new RangeError('Panel wattage must be a positive finite number')
  const polygon = validPolygon(c.roof_geom) ? c.roof_geom : null
  const centroid = polygonCentroidLonLat(polygon)
  // Treat coordinates as a pair: mixing one stored axis with a centroid axis
  // can place the proposal at an unrelated location. Zero retains the unset convention.
  const candidateLat = candidateCoordinate(c.lat, 90)
  const candidateLng = candidateCoordinate(c.lon, 180)
  const location = candidateLat != null && candidateLng != null ? [candidateLng, candidateLat] : centroid
  const sizing = sizingSummary(c)
  const roofCapacityKwp = sizing.estimatedCapacityKwp
  const requested = requestedScreeningKwp !== undefined
  const requestValid = requested && Number.isFinite(requestedScreeningKwp)
    && requestedScreeningKwp > 0 && roofCapacityKwp != null && requestedScreeningKwp <= roofCapacityKwp
  const kwp = requested ? (requestValid ? requestedScreeningKwp : null) : roofCapacityKwp
  const panelRatio = kwp != null ? (kwp * 1000) / panelWatt : 0
  // Whole panels must fit both the roof-capacity ceiling and any lower
  // consumption-based screening cap; rounding up would exceed that limit.
  const panelCount = Math.floor(panelRatio)
  return {
    client_name: c.name ?? '',
    client_phone: c.phone ?? '',
    client_email: '',
    location_preset: 'koh_phangan',
    // system_size_kwp is derived from panel_count × panel_watt, so drive panel_count.
    // replaceForm merges over defaults, so missing estimates must explicitly
    // clear the initial 18 panels instead of leaving an invented system size.
    panel_count: Number.isSafeInteger(panelCount) && panelCount >= 0 ? panelCount : 0,
    roof_polygon: sizing.status === 'needs_roof_verification' ? null : polygon,
    roof_lat: location?.[1] ?? null,
    roof_lng: location?.[0] ?? null,
    roof_area_sqm: sizing.roofAreaSqm,
  }
}
