/**
 * scan-review — pure port of kp-solar-pro.html filters/badges for /admin/scan.
 * No DOM, no map: everything here is unit-testable against ScanCandidate rows.
 */
import type { ScanCandidate } from './bustan-crm-service'

export const CAT_ICONS: Record<string, string> = {
  hospitality: '🏨', food_beverage: '🍽️', retail: '🛒', residential: '🏠',
  bungalow: '🛖', healthcare: '🏥', commercial: '🏢', government: '🏛️',
}
// Same palette as the SolarMap cand layer.
export const GRADE_COLORS = { A: '#00E676', B: '#FFD600', C: '#FF9100', D: '#FF3D00' } as const
export type Grade = keyof typeof GRADE_COLORS
export const GRADES: Grade[] = ['A', 'B', 'C', 'D']

export interface ScanFilters {
  grades: Grade[]
  category: string | 'all'
  minKwp: number
  minScore: number
  search: string
  includeSolar: boolean
  showInCrm: boolean
}
export const DEFAULT_FILTERS: ScanFilters = {
  grades: ['A', 'B', 'C', 'D'], category: 'all', minKwp: 0, minScore: 0, search: '', includeSolar: false, showInCrm: false,
}

export type FootprintBadge = '' | 'land, not a roof' | 'several buildings' | 'verify footprint'

export function footprintBadge(c: ScanCandidate): FootprintBadge {
  switch (c.footprint_class) {
    case 'parcel': return 'land, not a roof'
    case 'compound': return 'several buildings'
    case 'unclear': return 'verify footprint'
    default: return ''
  }
}

/** Confident positive only — an uncertain roof stays a prospect (kp-solar-pro rule). */
export function hasExistingSolar(c: ScanCandidate): boolean {
  return c.existing_solar === true && (c.solar_check_confidence == null || Number(c.solar_check_confidence) >= 0.5)
}

export function gradeOf(c: ScanCandidate): Grade {
  return (GRADES.includes(c.priority as Grade) ? c.priority : 'D') as Grade
}

export function applyScanFilters(list: ScanCandidate[], f: ScanFilters): ScanCandidate[] {
  const q = f.search.trim().toLowerCase()
  return list.filter((c) => {
    if (c.status === 'rejected') return false
    if (c.status === 'added' && !f.showInCrm) return false
    if (!f.includeSolar && hasExistingSolar(c)) return false
    if (!f.grades.includes(gradeOf(c))) return false
    if (f.category !== 'all' && (c.category ?? c.property_type) !== f.category) return false
    if (Number(c.estimated_kwp ?? 0) < f.minKwp) return false
    if (Number(c.solar_potential_score ?? 0) < f.minScore) return false
    if (q && !`${c.name ?? ''} ${c.area_name ?? ''} ${c.external_id ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })
}

export function displayName(c: ScanCandidate): string {
  return c.name ?? `Roof ${c.id.slice(0, 8)}`
}

export function toFeatureCollection(list: ScanCandidate[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: list.map((c) => {
      const grade = gradeOf(c)
      const props = {
        id: c.id, grade, color: GRADE_COLORS[grade], kwp: Number(c.estimated_kwp ?? 0), name: c.name ?? '',
        badge: footprintBadge(c), pv: hasExistingSolar(c), icon: CAT_ICONS[c.category ?? ''] ?? '🏢', inCrm: c.status === 'added',
      }
      const ring = c.roof_geom?.coordinates?.[0]
      const geometry: GeoJSON.Geometry = ring && ring.length >= 4
        ? c.roof_geom as GeoJSON.Polygon
        : { type: 'Point', coordinates: [Number(c.lon), Number(c.lat)] }
      return { type: 'Feature', geometry, properties: props }
    }),
  }
}

/** wa.me deep link; Thai local numbers ("0XX…") become +66. Null when no usable phone. */
export function whatsappLink(c: ScanCandidate, text: string): string | null {
  if (!c.phone) return null
  let d = c.phone.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = `66${d.slice(1)}`
  return d.length >= 9 && d.length <= 15 ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : null
}

export const NOTES_KEY = 'bustan_scan_notes'
export function noteKey(c: ScanCandidate): string { return c.id }
export function loadNotes(storage: Pick<Storage, 'getItem'> = localStorage): Record<string, string> {
  try { return JSON.parse(storage.getItem(NOTES_KEY) || '{}') } catch { return {} }
}
export function saveNote(id: string, text: string, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): Record<string, string> {
  const n = loadNotes(storage)
  if (text.trim()) n[id] = text
  else delete n[id]
  storage.setItem(NOTES_KEY, JSON.stringify(n))
  return n
}
