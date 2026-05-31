/**
 * colliers.test.ts
 *
 * Tests for the Colliers Thailand parsing + solar-scoring layer.
 * Run with: npx vitest run src/lib/colliers.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  parseColliersMarkdown,
  summarizeColliers,
  attachGeocodes,
  colliersToProperties,
  COLLIERS_MISSING_FIELDS,
  type CollierListing,
} from './colliers'

// ---------------------------------------------------------------------------
// Inline fixture — 3 records covering rent/sale, multi-story, missing price
// ---------------------------------------------------------------------------

const FIXTURE_MD = `
# Colliers Thailand – test fixture

## 1. Office for rent In Phra Khanong Bangkok
- Type: Office | Listing: for rent
- Location/address: Phra Khanong, Khlong Toei, Bangkok
- Listing name: 640 SqM Office for rent in Phra Khanong
- Area mentioned: 640 SqM
- Price: ฿280,000
- Description: Five-story commercial building, two adjoining units, on Sukhumvit-Thonglor Road, just a 3-minute walk from BTS Thonglor station.
- URL: https://www.dotproperty.co.th/en/ads/office-for-rent-phra-khanong_abc123

## 2. Warehouse for sale In Phraeksa Samut Prakan
- Type: Factory | Listing: for sale
- Location/address: Phraeksa, Mueang Samut Prakan, Samut Prakan
- Listing name: Warehouse for sale in Phraeksa
- Area mentioned: 4,650 sqm
- Price: ฿12,000,000
- Description: Perfect for manufacturing and warehouse operations. Available factory sizes: 4,650 sqm. Total land area: 8 rai. Ceiling height: 8 meters. Single-story industrial building.
- URL: https://www.dotproperty.co.th/en/ads/warehouse-for-sale-phraeksa_xyz789

## 3. Office for rent In Khlong Toei Bangkok
- Type: Office | Listing: for rent
- Location/address: Khlong Toei, Khlong Toei, Bangkok
- Listing name: Office for rent (no price listed)
- Area mentioned: 326 SqM
- Description: Three-story commercial building in Sukhumvit area. Ready to move in.
- URL: https://www.dotproperty.co.th/en/ads/office-for-rent-khlong-toei_noprice
`

// ---------------------------------------------------------------------------
// 1. Unit tests — inline fixture
// ---------------------------------------------------------------------------

describe('parseColliersMarkdown — inline fixture', () => {
  let rows: CollierListing[]

  it('parses exactly 3 records', () => {
    rows = parseColliersMarkdown(FIXTURE_MD)
    expect(rows).toHaveLength(3)
  })

  it('record 1: rent, Office, correct province/district', () => {
    rows = parseColliersMarkdown(FIXTURE_MD)
    const r = rows[0]
    expect(r.index).toBe(1)
    expect(r.listing).toBe('rent')
    expect(r.assetType).toBe('Office')
    expect(r.province).toBe('Bangkok')
    expect(r.district).toBe('Phra Khanong')
    expect(r.areaSqm).toBe(640)
    expect(r.priceThb).toBe(280000)
  })

  it('record 1: five-story building → floors=5, correct solar math', () => {
    rows = parseColliersMarkdown(FIXTURE_MD)
    const r = rows[0]
    expect(r.floors).toBe(5)
    // estFootprintSqm = 640 / 5 = 128
    expect(r.estFootprintSqm).toBeCloseTo(128, 2)
    // estUsableSqm = 128 * 0.65 = 83.2
    expect(r.estUsableSqm).toBeCloseTo(83.2, 2)
    // estKwp = round(83.2 * 0.18) = round(14.976) = 15
    expect(r.estKwp).toBe(15)
    // tier: 15 kWp → >=5 && <20 → 'C'
    expect(r.tier).toBe('C')
  })

  it('record 2: sale, Factory, Samut Prakan, comma-formatted area, single-story', () => {
    rows = parseColliersMarkdown(FIXTURE_MD)
    const r = rows[1]
    expect(r.index).toBe(2)
    expect(r.listing).toBe('sale')
    expect(r.assetType).toBe('Factory')
    expect(r.province).toBe('Samut Prakan')
    expect(r.areaSqm).toBe(4650)
    expect(r.priceThb).toBe(12000000)
    // "Single-story" → floors = 1
    expect(r.floors).toBe(1)
    // estFootprintSqm = 4650/1 = 4650
    expect(r.estFootprintSqm).toBeCloseTo(4650, 1)
    // estUsableSqm = 4650 * 0.65 = 3022.5
    expect(r.estUsableSqm).toBeCloseTo(3022.5, 1)
    // estKwp = round(3022.5 * 0.18) = round(544.05) = 544
    expect(r.estKwp).toBe(544)
    // tier: >= 50 → 'A'
    expect(r.tier).toBe('A')
  })

  it('record 3: missing price → priceThb null; three-story', () => {
    rows = parseColliersMarkdown(FIXTURE_MD)
    const r = rows[2]
    expect(r.priceThb).toBeNull()
    expect(r.areaSqm).toBe(326)
    // "Three-story" → floors = 3
    expect(r.floors).toBe(3)
    // estFootprintSqm = 326/3 ≈ 108.67
    expect(r.estFootprintSqm).toBeCloseTo(326 / 3, 1)
    // estKwp = round((326/3) * 0.65 * 0.18) = round(12.74) = 13
    const expectedKwp = Math.round((326 / 3) * 0.65 * 0.18)
    expect(r.estKwp).toBe(expectedKwp)
  })

  it('every record has missing[] === COLLIERS_MISSING_FIELDS (all 7 entries)', () => {
    rows = parseColliersMarkdown(FIXTURE_MD)
    for (const r of rows) {
      expect(r.missing).toStrictEqual(COLLIERS_MISSING_FIELDS)
      expect(r.missing).toHaveLength(7)
    }
  })

  it('each record has a non-empty id and url', () => {
    rows = parseColliersMarkdown(FIXTURE_MD)
    for (const r of rows) {
      expect(r.id).toBeTruthy()
      expect(r.url).toBeTruthy()
    }
  })
})

// ---------------------------------------------------------------------------
// 2. summarizeColliers — aggregation over the parsed fixture
// (Real-file 150-record distribution A=19/B=48/C=62/D=21 verified manually;
//  parse logic is input-size-independent, so unit coverage on the fixture is
//  sufficient + keeps the test pure for the browser tsconfig.)
// ---------------------------------------------------------------------------

describe('summarizeColliers — over parsed fixture', () => {
  const rows = parseColliersMarkdown(FIXTURE_MD)
  const summary = summarizeColliers(rows)

  it('total equals the number of parsed rows', () => {
    expect(summary.total).toBe(rows.length)
    expect(summary.total).toBe(3)
  })

  it('byTier sums to total', () => {
    const tierSum = summary.byTier.A + summary.byTier.B + summary.byTier.C + summary.byTier.D
    expect(tierSum).toBe(summary.total)
  })

  it('byProvince counts Bangkok (2) and Samut Prakan (1)', () => {
    expect(summary.byProvince['Bangkok']).toBe(2)
    expect(summary.byProvince['Samut Prakan']).toBe(1)
  })

  it('byAssetType counts Office (2) and Factory (1)', () => {
    expect(summary.byAssetType['Office']).toBe(2)
    expect(summary.byAssetType['Factory']).toBe(1)
  })

  it('top15 is capped at the row count and sorted by estKwp descending', () => {
    expect(summary.top15).toHaveLength(Math.min(15, rows.length))
    const kwps = summary.top15.map((r) => r.estKwp)
    for (let i = 1; i < kwps.length; i++) {
      expect(kwps[i]).toBeLessThanOrEqual(kwps[i - 1])
    }
    // Factory (544 kWp, tier A) must rank first
    expect(summary.top15[0].assetType).toBe('Factory')
  })
})

// ---------------------------------------------------------------------------
// 3. attachGeocodes
// ---------------------------------------------------------------------------

describe('attachGeocodes', () => {
  // Use record 1 from the fixture: locationRaw = "Phra Khanong, Khlong Toei, Bangkok"
  // and record 2: locationRaw = "Phraeksa, Mueang Samut Prakan, Samut Prakan"
  const rows = parseColliersMarkdown(FIXTURE_MD)

  const GEO: Record<string, { lat: number; lng: number }> = {
    'Phra Khanong, Khlong Toei, Bangkok': { lat: 13.7008, lng: 100.6034 },
    // Phraeksa intentionally omitted to test unmatched path
  }

  it('attaches lat/lng to a matched row', () => {
    const result = attachGeocodes(rows, GEO)
    const r1 = result.find((r) => r.locationRaw === 'Phra Khanong, Khlong Toei, Bangkok')
    expect(r1?.lat).toBeDefined()
    expect(r1?.lng).toBeDefined()
  })

  it('leaves unmatched rows without lat/lng', () => {
    const result = attachGeocodes(rows, GEO)
    const r2 = result.find((r) => r.locationRaw === 'Phraeksa, Mueang Samut Prakan, Samut Prakan')
    expect(r2?.lat).toBeUndefined()
    expect(r2?.lng).toBeUndefined()
  })

  it('jitter is applied: coordinates differ from the raw geocode centroid', () => {
    const result = attachGeocodes(rows, GEO)
    const r1 = result.find((r) => r.locationRaw === 'Phra Khanong, Khlong Toei, Bangkok')
    // Index 1 (odd) → non-zero jitter direction, so at least one coordinate differs
    const rawLat = GEO['Phra Khanong, Khlong Toei, Bangkok'].lat
    const rawLng = GEO['Phra Khanong, Khlong Toei, Bangkok'].lng
    const latDiffers = r1?.lat !== rawLat
    const lngDiffers = r1?.lng !== rawLng
    expect(latDiffers || lngDiffers).toBe(true)
  })

  it('jitter is deterministic: calling twice produces identical results', () => {
    const result1 = attachGeocodes(rows, GEO)
    const result2 = attachGeocodes(rows, GEO)
    for (let i = 0; i < result1.length; i++) {
      expect(result1[i].lat).toBe(result2[i].lat)
      expect(result1[i].lng).toBe(result2[i].lng)
    }
  })

  it('does not mutate the original rows', () => {
    const originalLat = rows[0].lat
    attachGeocodes(rows, GEO)
    expect(rows[0].lat).toBe(originalLat)
  })

  it('returns the same count as the input', () => {
    const result = attachGeocodes(rows, GEO)
    expect(result).toHaveLength(rows.length)
  })

  it('empty geo map → no rows receive coordinates', () => {
    const result = attachGeocodes(rows, {})
    for (const r of result) {
      expect(r.lat).toBeUndefined()
      expect(r.lng).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// 4. colliersToProperties — Property adapter
// ---------------------------------------------------------------------------

describe('colliersToProperties', () => {
  const GEO: Record<string, { lat: number; lng: number }> = {
    'Phra Khanong, Khlong Toei, Bangkok': { lat: 13.7008, lng: 100.6034 },
    'Phraeksa, Mueang Samut Prakan, Samut Prakan': { lat: 13.5990, lng: 100.6194 },
    // record 3 (Khlong Toei) intentionally omitted → ungeocoded
  }

  const rows = parseColliersMarkdown(FIXTURE_MD)
  const geocoded = attachGeocodes(rows, GEO)
  const properties = colliersToProperties(geocoded)

  it('only geocoded rows (2 out of 3) are included', () => {
    expect(properties).toHaveLength(2)
  })

  it('all included properties have region === "colliers"', () => {
    for (const p of properties) {
      expect(p.region).toBe('colliers')
    }
  })

  it('all included properties carry lat and lng', () => {
    for (const p of properties) {
      expect(typeof p.lat).toBe('number')
      expect(typeof p.lng).toBe('number')
    }
  })

  it('tier → priority mapping is preserved (record 1: C, record 2: A)', () => {
    const officeProps = properties.filter((p) => p.title.toLowerCase().includes('office'))
    expect(officeProps).toHaveLength(1)
    // record 1 is Office / tier C
    expect(officeProps[0].priority).toBe('C')

    const factoryProps = properties.filter((p) => p.title.toLowerCase().includes('warehouse'))
    expect(factoryProps).toHaveLength(1)
    // record 2 is Factory / tier A
    expect(factoryProps[0].priority).toBe('A')
  })

  it('rent listing → status "rent"; sale listing → status "sale"', () => {
    const rentProp = properties.find((p) => p.title.toLowerCase().includes('office'))
    expect(rentProp?.status).toBe('rent')

    const saleProp = properties.find((p) => p.title.toLowerCase().includes('warehouse'))
    expect(saleProp?.status).toBe('sale')
  })

  it('ungeocoded row (record 3) is excluded', () => {
    const ids = properties.map((p) => p.id)
    // record 3 slug: "office-for-rent-khlong-toei_noprice"
    expect(ids).not.toContain('office-for-rent-khlong-toei_noprice')
  })

  it('panelCount is round(estKwp * 1000 / 580)', () => {
    for (const p of properties) {
      if (p.capacityKwp != null && p.panelCount != null) {
        expect(p.panelCount).toBe(Math.round((p.capacityKwp * 1000) / 580))
      }
    }
  })
})
