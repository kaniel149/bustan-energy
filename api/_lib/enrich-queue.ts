// ── Unenriched-property queue (shared by cron-enrich-contacts + admin-enrich-batch) ──
//
// We need bustan.properties LEFT JOIN bustan.owner_decision on the sentinel
// data->>'lastResearchedAt'. PostgREST cannot express that anti-join, so we
// fetch the (small) owner_decision set and page through properties in JS —
// the same approach cron-detect-solar uses for its solar_checked_at queue.
//
// The sentinel that exits a row from the queue is a non-null
// data->>'lastResearchedAt' in owner_decision.data (written by
// persistToProperty in find-contact-core.ts on every non-deferred run,
// whether a contact was found or not). Rows selected are those with no
// owner_decision row at all, or one with lastResearchedAt null.
import { bGet } from './find-contact-core.js'

// OSM landuse values → no commercial owner to research (mirrors cron-detect-solar).
export const LAND_PROPERTY_TYPES = new Set([
  'farmland', 'meadow', 'grass', 'greenfield', 'brownfield',
  'orchard', 'farmyard', 'quarry',
])

export interface UnenrichedProperty {
  id: string
  name: string | null
  lat: number | null
  lon: number | null
  property_type: string | null
  roof_area_sqm: number | null
}

interface OwnerDecisionMinRow {
  property_id: string
  data: Record<string, unknown> | null
}

const PAGE = 250
const MAX_PAGES = 12 // safety bound: scans at most 3000 properties per call

/**
 * Up to `limit` properties that still need enrichment, biggest roofs first.
 * Land-typed and coordinate-less rows are excluded (nothing to research).
 *
 * Pagination (not a fixed over-fetch window) guarantees forward progress no
 * matter how large the already-stamped prefix grows — a fixed window of the
 * 12 biggest roofs once all were stamped froze the cron (2026-06-14).
 * Pass a large `limit` to enumerate the whole backlog (bounded by MAX_PAGES).
 */
export async function selectUnenrichedProperties(limit: number): Promise<UnenrichedProperty[]> {
  const ownerRows = await bGet<OwnerDecisionMinRow>(`owner_decision?select=property_id,data`)
  const stampedIds = new Set(
    ownerRows.filter((r) => r.data?.['lastResearchedAt'] != null).map((r) => r.property_id),
  )

  const landTypeFilter = `property_type.not.in.(${[...LAND_PROPERTY_TYPES].join(',')})`
  const queue: UnenrichedProperty[] = []
  for (let page = 0; page < MAX_PAGES && queue.length < limit; page++) {
    const props = await bGet<UnenrichedProperty>(
      `properties?lat=not.is.null&lon=not.is.null` +
      `&or=(property_type.is.null,${landTypeFilter})` +
      `&order=roof_area_sqm.desc.nullslast` +
      `&select=id,name,lat,lon,property_type,roof_area_sqm` +
      `&limit=${PAGE}&offset=${page * PAGE}`,
    )
    if (props.length === 0) break
    for (const p of props) {
      if (stampedIds.has(p.id)) continue
      queue.push(p)
      if (queue.length >= limit) break
    }
    if (props.length < PAGE) break // last page
  }
  return queue
}

/** Exact size of the remaining backlog (bounded by MAX_PAGES × PAGE). */
export async function countUnenriched(): Promise<number> {
  return (await selectUnenrichedProperties(MAX_PAGES * PAGE)).length
}
