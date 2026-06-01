/**
 * Shared region-inference logic.
 *
 * Single source of truth for deriving a Region from an area name + latitude.
 * Used by bustan-crm-service.ts (DB leads + scan candidates) and load-data.ts
 * (owner-decision JSON leads). The logic is intentionally identical to what
 * load-data.ts previously inlined.
 *
 * Rules (evaluated in order):
 *   1. area_name contains "samui"  OR  lat < 9.63  → koh_samui
 *   2. area_name contains "surat"                   → surat_thani
 *   3. default                                       → koh_phangan
 */
import type { Region } from '../types'

export function regionFromLead(opts: { areaName?: string | null }, lat: number): Region {
  const area = (opts.areaName ?? '').toLowerCase()
  if (area.includes('samui') || lat < 9.63) return 'koh_samui'
  if (area.includes('surat')) return 'surat_thani'
  return 'koh_phangan'
}
