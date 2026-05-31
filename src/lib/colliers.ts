/**
 * colliers.ts
 *
 * Pure, framework-agnostic parsing + solar-scoring layer for the
 * Colliers Thailand demo dataset (public DotProperty listings).
 *
 * No network / no fs imports — callers supply the markdown string.
 * Solar estimation constants mirror api/cron-process-scans.ts:
 *   USABLE_RATIO = 0.65
 *   EFFICIENCY_KWP = 0.18
 */

import type { Property } from '../types'

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

export const COLLIERS_DISCLAIMER =
  'These are public listings attributed to Colliers Thailand. This is not a verified ownership or mandate list. Solar estimates are preliminary and for demonstration only.'

export const COLLIERS_SOURCE =
  'public DotProperty agency pages attributed to Colliers Thailand'

export const COLLIERS_MISSING_FIELDS: string[] = [
  'actual roof area',
  'electricity bill / annual kWh',
  'tariff',
  'owner vs tenant decision maker',
  'roof age/structure',
  'interconnection constraints',
  'contract appetite (PPA/lease/CAPEX)',
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollierListing {
  /** URL-slug-derived unique id */
  id: string
  /** 1-based record index from the markdown */
  index: number
  /** e.g. "Office", "Factory", "Warehouse/Logistics", "Hotel/Hospitality" */
  assetType: string
  listing: 'rent' | 'sale' | 'unknown'
  name: string
  locationRaw: string
  province: string
  district: string
  areaSqm: number | null
  priceThb: number | null
  /** Estimated number of floors parsed from description (default 1) */
  floors: number
  /** areaSqm / floors, or 0 if areaSqm is null */
  estFootprintSqm: number
  /** estFootprintSqm * USABLE_RATIO (0.65) */
  estUsableSqm: number
  /** round(estUsableSqm * EFFICIENCY_KWP (0.18)) */
  estKwp: number
  tier: 'A' | 'B' | 'C' | 'D'
  url: string
  description: string
  /** Always COLLIERS_MISSING_FIELDS — every row carries these as demo data */
  missing: string[]
  /** Geocoded latitude — set by attachGeocodes(); undefined when no geocode exists */
  lat?: number
  /** Geocoded longitude — set by attachGeocodes(); undefined when no geocode exists */
  lng?: number
}

// ---------------------------------------------------------------------------
// Internal constants (mirror cron-process-scans.ts)
// ---------------------------------------------------------------------------

const USABLE_RATIO = 0.65
const EFFICIENCY_KWP = 0.18

// ---------------------------------------------------------------------------
// Floor-word mapping: word numbers → digits
// ---------------------------------------------------------------------------

const WORD_FLOORS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

/**
 * Parse number of floors from a description string.
 * Matches patterns like:
 *   "5-story", "5 story", "5-storey", "5 storey", "5-floor", "5 floor"
 *   "five-story", "four-storey", "three floor", "3.5-story" (rounds down)
 * Returns 1 if nothing is matched.
 */
function parseFloors(description: string): number {
  // 1. Numeric: "3-story", "3.5-storey", "3 floor"
  const numericMatch = description.match(
    /(\d+(?:\.\d+)?)[- ]?(?:story|storey|floor)s?(?!\w)/i,
  )
  if (numericMatch) {
    const n = parseFloat(numericMatch[1])
    return Math.max(1, Math.floor(n))
  }

  // 2. Word numbers: "five-story", "four storey", "two floor"
  const wordPattern = new RegExp(
    `(${Object.keys(WORD_FLOORS).join('|')})[- ]?(?:story|storey|floor)s?(?!\\w)`,
    'i',
  )
  const wordMatch = description.match(wordPattern)
  if (wordMatch) {
    const word = wordMatch[1].toLowerCase()
    return WORD_FLOORS[word] ?? 1
  }

  return 1
}

/**
 * Assign tier based on kWp — mirrors priority() in cron-process-scans.ts.
 */
function assignTier(kwp: number): 'A' | 'B' | 'C' | 'D' {
  if (kwp >= 50) return 'A'
  if (kwp >= 20) return 'B'
  if (kwp >= 5) return 'C'
  return 'D'
}

/**
 * Derive a stable id from a URL (last path segment) or fallback to index.
 */
function deriveId(url: string, index: number): string {
  if (!url) return `listing-${index}`
  const parts = url.split('/')
  const slug = parts[parts.length - 1]
  return slug || `listing-${index}`
}

/**
 * Parse areaSqm from the "Area mentioned" bullet.
 * Accepts: "640 SqM", "4,650 sqm", "2,600 sq.m.", "184.33 SqM", "69.2 sq.m."
 * Returns null if no numeric value is found.
 */
function parseArea(raw: string): number | null {
  if (!raw) return null
  // Strip commas so "4,650" → "4650"
  const cleaned = raw.replace(/,/g, '')
  const m = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:sqm|sq\.m\.|SqM)/i)
  if (!m) return null
  const n = parseFloat(m[1])
  return isNaN(n) ? null : n
}

/**
 * Parse priceThb from the "Price" bullet.
 * Accepts: "฿280,000", "฿1" (hotel joke listing), etc.
 * Returns null if no ฿ or no digits found.
 */
function parsePrice(raw: string): number | null {
  if (!raw) return null
  const idx = raw.indexOf('฿')
  if (idx === -1) return null
  const cleaned = raw.slice(idx + 1).replace(/,/g, '').trim()
  const m = cleaned.match(/^(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = parseFloat(m[1])
  return isNaN(n) ? null : n
}

/**
 * Parse listing type (rent/sale/unknown) from the Type line's Listing segment.
 */
function parseListing(raw: string): 'rent' | 'sale' | 'unknown' {
  const lower = raw.toLowerCase()
  if (lower.includes('rent')) return 'rent'
  if (lower.includes('sale') || lower.includes('sell')) return 'sale'
  return 'unknown'
}

/**
 * Split location string "district, subdistrict, province" into parts.
 * province = last comma-segment (trimmed).
 * district = first comma-segment (trimmed).
 * Handles special cases like "Jubilee Prestige Tower — Din Daeng, Din Daeng, Bangkok"
 */
function parseLocation(raw: string): { province: string; district: string } {
  if (!raw || !raw.trim()) return { province: '', district: '' }
  // Remove building-name prefix if present (indicated by " — ")
  const withoutBuilding = raw.includes(' — ')
    ? raw.slice(raw.indexOf(' — ') + 3)
    : raw
  const parts = withoutBuilding.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return { province: '', district: '' }
  const province = parts[parts.length - 1]
  const district = parts[0]
  return { province, district }
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse a Colliers Thailand markdown string into structured CollierListing[].
 *
 * The markdown format uses `## N. <title>` as record separators, with
 * bullet lines for each field. Fields may be missing/partial — the parser
 * is robust and falls back to safe defaults.
 */
export function parseColliersMarkdown(md: string): CollierListing[] {
  // Split on record headers: "## <number>. "
  // We keep everything after the first "## " separator.
  const rawBlocks = md.split(/^## /m)
  // First element is the preamble (header / disclaimer) — skip it.
  const recordBlocks = rawBlocks.slice(1)

  const results: CollierListing[] = []

  for (const block of recordBlocks) {
    const lines = block.split('\n')
    // First line: "<index>. <title>"
    const headerLine = lines[0]
    const headerMatch = headerLine.match(/^(\d+)\.\s+(.*)$/)
    if (!headerMatch) continue

    const index = parseInt(headerMatch[1], 10)

    // Extract bullet values
    const getValue = (key: string): string => {
      const pattern = new RegExp(`^-\\s+${key}\\s*:(.*)$`, 'i')
      for (const line of lines) {
        const m = line.match(pattern)
        if (m) return m[1].trim()
      }
      return ''
    }

    const typeRaw = getValue('Type')
    const listingRaw = getValue('Listing')
    const locationRaw = getValue('Location/address')
    const nameRaw = getValue('Listing name')
    const areaRaw = getValue('Area mentioned')
    const priceRaw = getValue('Price')
    const descRaw = getValue('Description')
    const urlRaw = getValue('URL')

    // Parse Type | Listing from the same "Type: X | Listing: Y" line
    let assetType = ''
    let listingTypeStr = listingRaw
    if (typeRaw.includes('|')) {
      const parts = typeRaw.split('|')
      assetType = parts[0].trim()
      // Listing value is in the second part: "Listing: for rent"
      const listingPart = parts[1]
      const listingMatch = listingPart.match(/Listing\s*:\s*(.+)/i)
      if (listingMatch) listingTypeStr = listingMatch[1].trim()
    } else {
      assetType = typeRaw
    }

    const listing = parseListing(listingTypeStr)
    const { province, district } = parseLocation(locationRaw)
    const areaSqm = parseArea(areaRaw)
    const priceThb = parsePrice(priceRaw)
    const floors = parseFloors(descRaw)

    const estFootprintSqm = areaSqm != null ? areaSqm / Math.max(floors, 1) : 0
    const estUsableSqm = estFootprintSqm * USABLE_RATIO
    const estKwp = Math.round(estUsableSqm * EFFICIENCY_KWP)
    const tier = assignTier(estKwp)

    results.push({
      id: deriveId(urlRaw, index),
      index,
      assetType,
      listing,
      name: nameRaw,
      locationRaw,
      province,
      district,
      areaSqm,
      priceThb,
      floors,
      estFootprintSqm,
      estUsableSqm,
      estKwp,
      tier,
      url: urlRaw,
      description: descRaw,
      missing: COLLIERS_MISSING_FIELDS,
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface ColliersSummary {
  total: number
  byAssetType: Record<string, number>
  byProvince: Record<string, number>
  byTier: { A: number; B: number; C: number; D: number }
  top15: CollierListing[]
}

/**
 * Summarise parsed listings:
 * - counts by asset type, province, tier
 * - top 15 listings sorted by estKwp descending
 */
export function summarizeColliers(rows: CollierListing[]): ColliersSummary {
  const byAssetType: Record<string, number> = {}
  const byProvince: Record<string, number> = {}
  const byTier: { A: number; B: number; C: number; D: number } = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  }

  for (const row of rows) {
    const at = row.assetType || 'Unknown'
    byAssetType[at] = (byAssetType[at] ?? 0) + 1

    const prov = row.province || 'Unknown'
    byProvince[prov] = (byProvince[prov] ?? 0) + 1

    byTier[row.tier] += 1
  }

  const top15 = [...rows]
    .sort((a, b) => b.estKwp - a.estKwp)
    .slice(0, 15)

  return { total: rows.length, byAssetType, byProvince, byTier, top15 }
}

// ---------------------------------------------------------------------------
// Geocode attachment
// ---------------------------------------------------------------------------

/**
 * Small deterministic jitter so markers sharing the same district centroid
 * don't perfectly stack.  The offset is ±0.0008° derived from the row index
 * (no randomness — same input always produces the same output).
 *
 * The pattern maps index → a unit-circle offset scaled to 0.0008° and then
 * distributed evenly by index mod 8, giving 8 compass directions.
 */
function jitterForIndex(index: number): { dLat: number; dLng: number } {
  const STEP = 0.0008
  // 8 directions evenly spread: N, NE, E, SE, S, SW, W, NW
  const angle = (index % 8) * (Math.PI / 4)
  return {
    dLat: Math.sin(angle) * STEP,
    dLng: Math.cos(angle) * STEP,
  }
}

/**
 * Attach geocoordinates to each listing by matching `row.locationRaw` to a
 * key in `geo` (exact string match).  Rows without a matching key are left
 * without `lat`/`lng`.
 *
 * A small deterministic per-index jitter (±0.0008°) is applied so that
 * multiple listings sharing one district centroid do not perfectly overlap.
 *
 * Pure and deterministic — no side effects, no randomness.
 */
export function attachGeocodes(
  rows: CollierListing[],
  geo: Record<string, { lat: number; lng: number }>,
): CollierListing[] {
  return rows.map((row) => {
    const match = geo[row.locationRaw]
    if (!match) return row
    const { dLat, dLng } = jitterForIndex(row.index)
    return { ...row, lat: match.lat + dLat, lng: match.lng + dLng }
  })
}

// ---------------------------------------------------------------------------
// Property adapter — maps geocoded CollierListings to the platform Property type
// ---------------------------------------------------------------------------

/**
 * Convert geocoded CollierListing[] to Property[] for map display.
 *
 * Only rows that have both lat AND lng (i.e. were matched by attachGeocodes)
 * are included — ungeocoded rows are silently dropped.
 *
 * Mapping decisions:
 *   status: 'sale' | 'rent' based on listing; 'unknown' → 'private'
 *   region: always 'colliers'
 *   area / sizeM2: from areaSqm when present
 *   capacityKwp: estKwp from solar estimation
 *   panelCount: estKwp * 1000 / 580 W per panel (standard 580 W panel)
 *   category: assetType lowercased (e.g. "office", "factory")
 *   priority: tier from solar estimation (A/B/C/D)
 *   price: priceThb when present
 *   listingLink: original DotProperty URL
 */
export function colliersToProperties(rows: CollierListing[]): Property[] {
  const result: Property[] = []

  for (const row of rows) {
    // Skip rows without geocoordinates
    if (row.lat == null || row.lng == null) continue

    const status: Property['status'] =
      row.listing === 'sale' ? 'sale'
      : row.listing === 'rent' ? 'rent'
      : 'private'

    const prop: Property = {
      id: row.id,
      type: 'roof',
      status,
      region: 'colliers',
      title: row.name || row.id,
      location: row.locationRaw,
      lat: row.lat,
      lng: row.lng,
      area: row.areaSqm ?? row.estFootprintSqm,
      sizeM2: row.areaSqm ?? undefined,
      capacityKwp: row.estKwp,
      panelCount: Math.round((row.estKwp * 1000) / 580),
      category: row.assetType?.toLowerCase(),
      priority: row.tier,
      price: row.priceThb ?? undefined,
      listingLink: row.url,
    }

    result.push(prop)
  }

  return result
}
