/**
 * Pure mapper: a bustan.scan_candidates row → NewProposalForm patch.
 *
 * Used by NewProposalPage when the URL carries `candidate_id` / `external_id`
 * (KP Solar Pro "Create proposal" CTA, candidate review panel). Kept free of
 * React and network so it can be unit-tested in isolation.
 */
import type { ScanCandidate } from './bustan-crm-service'
import type { NewProposalForm } from '../types/proposals'

/** [lng, lat] average of the outer ring (closing vertex dropped). Null if no usable ring. */
export function polygonCentroidLonLat(geom: { coordinates: number[][][] } | null | undefined): [number, number] | null {
  const ring = geom?.coordinates?.[0]
  if (!ring || ring.length < 3) return null
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
  const n = ring.length - (closed ? 1 : 0)
  let x = 0, y = 0
  for (let i = 0; i < n; i++) { x += ring[i][0]; y += ring[i][1] }
  return [x / n, y / n]
}

export function candidateToFormPatch(c: ScanCandidate, panelWatt: number): Partial<NewProposalForm> {
  const centroid = polygonCentroidLonLat(c.roof_geom)
  // lat/lon of 0 means "unset" — fall back to the footprint centroid.
  const lat = c.lat && Number(c.lat) !== 0 ? Number(c.lat) : centroid?.[1] ?? null
  const lng = c.lon && Number(c.lon) !== 0 ? Number(c.lon) : centroid?.[0] ?? null
  const kwp = c.estimated_kwp != null ? Number(c.estimated_kwp) : null
  return {
    client_name: c.name ?? '',
    client_phone: c.phone ?? '',
    client_email: '',
    location_preset: 'koh_phangan',
    // system_size_kwp is derived from panel_count × panel_watt, so drive panel_count.
    ...(kwp != null ? { panel_count: Math.round((kwp * 1000) / panelWatt) } : {}),
    roof_polygon: c.roof_geom ?? null,
    roof_lat: lat,
    roof_lng: lng,
    roof_area_sqm: c.roof_area_sqm != null ? Number(c.roof_area_sqm) : null,
  }
}
