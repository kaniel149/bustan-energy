/**
 * scan-review — pure port of kp-solar-pro.html filters/badges for /admin/scan.
 * No DOM, no map: everything here is unit-testable against ScanCandidate rows.
 */
import type { ScanCandidate } from './bustan-crm-service'

export const CAT_ICONS: Record<string, string> = {
  hospitality: '🏨', food_beverage: '🍽️', retail: '🛒', residential: '🏠',
  bungalow: '🛖', healthcare: '🏥', commercial: '🏢', government: '🏛️',
}
export const CATEGORY_LABELS: Record<string, string> = {
  hospitality: 'מלונאות ואירוח', food_beverage: 'מסעדות ובתי קפה', retail: 'חנויות', residential: 'מגורים',
  bungalow: 'בונגלוס', healthcare: 'בריאות', commercial: 'מסחר ועסקים', government: 'מוסדות ציבור',
}
export function categoryLabel(c: ScanCandidate): string {
  const category = c.category?.trim() || c.property_type?.trim() || ''
  return CATEGORY_LABELS[category] ?? (category || 'סוג נכס לא ידוע')
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

export function footprintLabel(c: ScanCandidate): string {
  if (c.kind === 'land') return 'קרקע · יש לאתר את הגג'
  switch (c.footprint_class) {
    case 'parcel': return 'חלקת קרקע · יש לאתר את הגג'
    case 'compound': return 'מספר מבנים · יש לפצל לגגות'
    case 'unclear': return 'גבולות הגג טעונים אימות'
    case 'roof': return 'גג בודד'
    default: return 'סוג תוואי לא אומת'
  }
}

const positiveNumber = (value: unknown): number | null => {
  if (value == null || (typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export interface SizingSummary {
  roofAreaSqm: number | null
  estimatedCapacityKwp: number | null
  recommendationKwp: null
  status: 'roof_estimate' | 'needs_roof_verification' | 'missing_estimate'
  label: string
  reason: string
}

/** Stored kWp is a roof-capacity estimate, never a consumption-based recommendation. */
export function sizingSummary(c: ScanCandidate): SizingSummary {
  const roofAreaSqm = positiveNumber(c.roof_area_sqm)
  if (c.kind === 'land' || footprintBadge(c)) {
    return {
      roofAreaSqm: null, estimatedCapacityKwp: null, recommendationKwp: null, status: 'needs_roof_verification',
      label: 'נדרש אימות גג', reason: 'יש לזהות ולמדוד גג בודד לפני חישוב הספק המערכת.',
    }
  }
  const estimatedCapacityKwp = positiveNumber(c.estimated_kwp)
  return {
    roofAreaSqm, estimatedCapacityKwp, recommendationKwp: null,
    status: estimatedCapacityKwp == null ? 'missing_estimate' : 'roof_estimate',
    label: estimatedCapacityKwp == null ? 'טרם חושב הספק' : 'אומדן קיבולת גג',
    reason: estimatedCapacityKwp == null
      ? 'נדרשת מדידת שטח גג שמיש. המלצת מערכת דורשת גם חשבון חשמל וצריכת יום.'
      : 'אומדן ראשוני לפי הגג. המלצת מערכת דורשת חשבון חשמל, צריכת יום ואימות שטח שמיש והצללה.',
  }
}

/** Confident positive only — an uncertain roof stays a prospect (kp-solar-pro rule). */
export function hasExistingSolar(c: ScanCandidate): boolean {
  const confidence = c.solar_check_confidence
  return c.existing_solar === true && (confidence == null || (Number.isFinite(Number(confidence)) && Number(confidence) >= 0.5 && Number(confidence) <= 1))
}

export function solarCheckLabel(c: ScanCandidate): string {
  if (hasExistingSolar(c)) return 'זוהתה מערכת סולארית קיימת'
  if (c.existing_solar == null) return 'מערכת קיימת · טרם נבדק'
  const confidence = c.solar_check_confidence
  if (confidence != null && Number.isFinite(Number(confidence)) && Number(confidence) >= 0.5 && Number(confidence) <= 1 && c.existing_solar === false) {
    return 'לא זוהתה מערכת סולארית'
  }
  return 'מערכת קיימת · נדרש אימות'
}

export function gradeOf(c: ScanCandidate): Grade {
  return (GRADES.includes(c.priority as Grade) ? c.priority : 'D') as Grade
}

export function applyScanFilters(list: ScanCandidate[], f: ScanFilters): ScanCandidate[] {
  const q = normalizeSearch(f.search)
  const terms = q.split(' ').filter(Boolean)
  return list.filter((c) => {
    if (c.status === 'rejected') return false
    if (c.status === 'added' && !f.showInCrm) return false
    if (!f.includeSolar && hasExistingSolar(c)) return false
    if (!f.grades.includes(gradeOf(c))) return false
    if (f.category !== 'all' && (c.category?.trim() || c.property_type?.trim()) !== f.category) return false
    if ((sizingSummary(c).estimatedCapacityKwp ?? 0) < f.minKwp) return false
    if ((positiveNumber(c.solar_potential_score) ?? 0) < f.minScore) return false
    if (q) {
      const searchable = normalizeSearch([
        c.name, c.area_name, c.id, c.external_id, c.external_source,
        c.category, c.property_type, categoryLabel(c), c.phone, c.website,
      ].filter(Boolean).join(' '))
      const phoneQuery = /^[+\d()\s.-]+$/.test(q) ? q.replace(/\D/g, '') : ''
      const matchesPhone = phoneQuery.length >= 3 && Boolean(c.phone?.replace(/\D/g, '').includes(phoneQuery))
      if (!matchesPhone && !terms.every((term) => searchable.includes(term))) return false
    }
    return true
  })
}

function normalizeSearch(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ')
}

export function displayName(c: ScanCandidate): string {
  return c.name?.trim() || `גג ${c.id.slice(0, 8)}`
}

function validPosition(value: unknown): value is GeoJSON.Position {
  return Array.isArray(value) && value.length >= 2 && value.every((part) => typeof part === 'number' && Number.isFinite(part))
    && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90
}

function validPolygon(value: unknown): value is GeoJSON.Polygon {
  if (!value || typeof value !== 'object' || !('type' in value) || value.type !== 'Polygon' || !('coordinates' in value)) return false
  const rings = value.coordinates
  return Array.isArray(rings) && rings.length > 0 && rings.every((ring: unknown) => {
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(validPosition)) return false
    const first = ring[0], last = ring[ring.length - 1]
    return first[0] === last[0] && first[1] === last[1]
      && new Set(ring.map((point) => `${point[0]},${point[1]}`)).size >= 3
  })
}


export function toFeatureCollection(list: ScanCandidate[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const c of list) {
    let geometry: GeoJSON.Geometry
    if (validPolygon(c.roof_geom)) {
      geometry = c.roof_geom
    } else if (validPosition([c.lon, c.lat]) && (c.lon !== 0 || c.lat !== 0)) {
      geometry = { type: 'Point', coordinates: [c.lon!, c.lat!] }
    } else {
      // Null, malformed and out-of-range coordinates must never become a marker at [0, 0].
      continue
    }
    const grade = gradeOf(c)
    features.push({
      type: 'Feature', geometry,
      properties: {
        id: c.id, grade, color: GRADE_COLORS[grade], kwp: sizingSummary(c).estimatedCapacityKwp, name: displayName(c),
        badge: footprintBadge(c), pv: hasExistingSolar(c), icon: CAT_ICONS[c.category?.trim() || c.property_type?.trim() || ''] ?? '🏢', inCrm: c.status === 'added',
      },
    })
  }
  return { type: 'FeatureCollection', features }
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
function parseNotes(value: string | null): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'string'))
  } catch { return {} }
}

export function loadNotes(storage?: Pick<Storage, 'getItem'>): Record<string, string> {
  try { return parseNotes((storage ?? localStorage).getItem(NOTES_KEY)) } catch { return {} }
}

/** Storage access failures propagate so the UI cannot claim an unsaved note was saved. */
export function saveNote(id: string, text: string, storage?: Pick<Storage, 'getItem' | 'setItem'>): Record<string, string> {
  const target = storage ?? localStorage
  // Do not use loadNotes here: a failed read must not overwrite notes we could not load.
  const n = { ...parseNotes(target.getItem(NOTES_KEY)), [id]: text }
  if (!text.trim()) delete n[id]
  target.setItem(NOTES_KEY, JSON.stringify(n))
  return n
}
