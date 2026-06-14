/**
 * Shared region-inference logic.
 *
 * Single source of truth for deriving a Region from coordinates (+ optional area
 * name). Used by bustan-crm-service.ts (DB leads + scan candidates) and
 * load-data.ts (owner-decision JSON leads).
 *
 * Rules (evaluated in order):
 *   1. If lng is given and falls inside a defined region's bounds → that region
 *      (covers Bangkok, Chonburi/EEC, Rayong, Ayutthaya, Korat, … — every
 *      scanned region). This is what makes an approved lead show up on the map:
 *      the properties layer filters by region, so a Bangkok lead mis-tagged
 *      koh_phangan would be hidden.
 *   2. area_name contains "samui"  OR  lat < 9.63 → koh_samui
 *   3. area_name contains "surat"                 → surat_thani
 *   4. default                                     → koh_phangan
 */
import type { Region } from '../types'
import { regionContaining } from './regions'

export function regionFromLead(
  opts: { areaName?: string | null },
  lat: number,
  lng?: number,
): Region {
  if (lng != null && Number.isFinite(lng) && Number.isFinite(lat)) {
    const geo = regionContaining(lng, lat)
    if (geo) return geo
  }
  const area = (opts.areaName ?? '').toLowerCase()
  if (area.includes('samui') || lat < 9.63) return 'koh_samui'
  if (area.includes('surat')) return 'surat_thani'
  return 'koh_phangan'
}
