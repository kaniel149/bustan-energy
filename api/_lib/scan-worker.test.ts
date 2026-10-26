import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Point = { lat: number; lon: number }
type Element = { type: string; id: number; geometry?: Point[]; members?: Array<{ type: string; role: string; geometry: Point[] }> }
type Row = Record<string, unknown>

function square(lat = 9.70, lon = 100, size = 0.00008): Point[] {
  return [{ lat, lon }, { lat, lon: lon + size }, { lat: lat + size, lon: lon + size }, { lat: lat + size, lon }, { lat, lon }]
}

interface Scenario {
  elements?: Element[]
  filters?: Row
  existing?: Row[]
  external?: Row[]
  failTable?: string
  serverPageSize?: number
  omitTotal?: boolean
}

async function runScan(s: Scenario = {}) {
  const inserts: Row[] = []
  const patches: Row[] = []
  const ranges: Record<string, string[]> = {}
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/interpreter')) return Response.json({ elements: s.elements ?? [] })
    const table = url.pathname.split('/').pop()!
    if (init?.method === 'PATCH') {
      patches.push(JSON.parse(String(init.body)))
      return new Response(null, { status: 204 })
    }
    if (init?.method === 'POST') {
      inserts.push(...JSON.parse(String(init.body)))
      return new Response(null, { status: 201 })
    }
    if (table === s.failTable) return new Response('failure', { status: 503 })
    if (table === 'scan_requests') return Response.json([{ id: 'scan-1', bbox: [99.98, 9.68, 100.10, 9.78], area_geojson: null, filters: s.filters ?? null }])
    const rows = table === 'properties' ? s.existing ?? [] : table === 'buildings_external' ? s.external ?? [] : []
    const range = new Headers(init?.headers).get('range') ?? '0-999'
    ;(ranges[table] ??= []).push(range)
    const [from, to] = range.split('-').map(Number)
    const page = rows.slice(from, Math.min(to + 1, from + (s.serverPageSize ?? 1000)))
    const interval = page.length ? `${from}-${from + page.length - 1}` : '*'
    return Response.json(page, { headers: { 'content-range': `${interval}/${s.omitTotal ? '*' : rows.length}` } })
  }))
  const { default: handler } = await import('../cron-process-scans')
  const response = await handler(new Request('https://test.local/api/cron-process-scans', { headers: { authorization: 'Bearer test-cron' } }))
  return { body: await response.json(), inserts, patches, ranges }
}

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('CRON_SECRET', 'test-cron')
  vi.stubEnv('BUSTAN_SUPABASE_SERVICE_ROLE_KEY', 'test-service')
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('roof scan worker acquisition and coverage', () => {
  it('keeps separate nearby villa roofs, persists stable IDs, and includes small roofs by default', async () => {
    const first = square(), next = square(9.70, 100.00012)
    const result = await runScan({ elements: [{ type: 'way', id: 1, geometry: first }, { type: 'way', id: 2, geometry: next }] })
    expect(result.inserts).toHaveLength(2)
    expect(result.inserts.map(r => r.external_id)).toEqual(['1', '2'])
    expect(result.inserts[0]).toMatchObject({ kind: 'roof', external_source: 'osm', status: 'pending' })
    expect(Number(result.inserts[0].roof_area_sqm)).toBeLessThan(150)
    expect(result.body.results[0]).toMatchObject({ min_roof_m2: 5, coverage: 'available_sources_processed', candidates: 2 })
  })

  it('honours an explicit minimum size and rejects an invalid minimum', async () => {
    const elements = [{ type: 'way', id: 1, geometry: square() }]
    const filtered = await runScan({ elements, filters: { minRoofM2: 150 } })
    expect(filtered.inserts).toHaveLength(0)
    expect(filtered.body.results[0]).toMatchObject({ filtered_out: 1, min_roof_m2: 150 })
    const invalid = await runScan({ elements, filters: { minRoofM2: -1 } })
    expect(invalid.body.results[0].error).toBe('invalid minRoofM2')
    expect(invalid.patches.at(-1)?.status).toBe('failed')
  })

  it('deduplicates an existing stable ID without swallowing a neighbouring roof', async () => {
    const result = await runScan({
      elements: [{ type: 'way', id: 1, geometry: square() }, { type: 'way', id: 2, geometry: square(9.70, 100.00012) }],
      existing: [{ lat: 9.70004, lon: 100.00004, external_source: 'osm', external_id: '1' }],
    })
    expect(result.inserts.map(r => r.external_id)).toEqual(['2'])
    expect(result.body.results[0].deduped).toBe(1)
  })

  it('preserves a relation courtyard and subtracts it from roof area', async () => {
    const outer = square(9.70, 100, 0.0002), inner = square(9.70005, 100.00005, 0.0001)
    const result = await runScan({ elements: [{ type: 'relation', id: 1, members: [
      { type: 'way', role: 'outer', geometry: outer }, { type: 'way', role: 'inner', geometry: inner },
    ] }] })
    expect(result.inserts).toHaveLength(1)
    expect(result.inserts[0].external_id).toBe('relation/1')
    expect((result.inserts[0].roof_geom as { coordinates: unknown[] }).coordinates).toHaveLength(2)
    // 0.0002° square at 9.7° latitude ≈488m², minus the 122m² courtyard.
    expect(Number(result.inserts[0].roof_area_sqm)).toBeGreaterThan(350)
    expect(Number(result.inserts[0].roof_area_sqm)).toBeLessThan(380)
  })

  it('reports complex relation geometry as partial coverage without inventing a roof', async () => {
    const result = await runScan({ elements: [{ type: 'relation', id: 5, members: [
      { type: 'way', role: 'outer', geometry: square() },
      { type: 'way', role: 'outer', geometry: square(9.70, 100.001) },
    ] }] })
    expect(result.inserts).toHaveLength(0)
    expect(result.body.results[0]).toMatchObject({ found: 1, unsupported_geometry: 1, coverage: 'partial' })
  })

  it('reports the 1500-building cap and omitted external records', async () => {
    const elements = Array.from({ length: 1501 }, (_, i) => ({
      type: 'way', id: i + 1, geometry: square(9.69 + Math.floor(i / 50) * 0.0003, 99.99 + (i % 50) * 0.0003),
    }))
    const result = await runScan({ elements, external: [{ id: 'e1', source: 'overture', lat: 9.70, lon: 100, area_sqm: 100 }] })
    expect(result.inserts).toHaveLength(1500)
    expect(result.body.results[0]).toMatchObject({ found: 1501, skipped: 2, candidate_limit: 1500, coverage: 'partial' })
  })

  it('reads past PostgREST first-page limits before deduplication', async () => {
    const existing = Array.from({ length: 1001 }, (_, i) => ({ lat: 9.70, lon: 100, external_source: 'osm', external_id: String(i + 1) }))
    const result = await runScan({ elements: [{ type: 'way', id: 1001, geometry: square() }], existing })
    expect(result.inserts).toHaveLength(0)
    expect(result.ranges.properties).toEqual(['0-999', '1000-1999'])
  })

  it('reads every dedup page when the server caps responses below 1000 rows', async () => {
    const existing = Array.from({ length: 601 }, (_, i) => ({ lat: 9.70, lon: 100, external_source: 'osm', external_id: String(i + 1) }))
    const result = await runScan({ elements: [{ type: 'way', id: 601, geometry: square() }], existing, serverPageSize: 250 })
    expect(result.inserts).toHaveLength(0)
    expect(result.body.results[0]).toMatchObject({ deduped: 1, coverage: 'available_sources_processed' })
    expect(result.ranges.properties).toEqual(['0-999', '250-1249', '500-1499'])
  })

  it('continues short pages until empty when the server omits its total', async () => {
    const existing = Array.from({ length: 5 }, (_, i) => ({ lat: 9.70, lon: 100, external_source: 'osm', external_id: String(i + 1) }))
    const result = await runScan({ elements: [{ type: 'way', id: 5, geometry: square() }], existing, serverPageSize: 2, omitTotal: true })
    expect(result.inserts).toHaveLength(0)
    expect(result.body.results[0]).toMatchObject({ deduped: 1, coverage: 'available_sources_processed' })
    expect(result.ranges.properties).toEqual(['0-999', '2-1001', '4-1003', '5-1004'])
  })

  it('accepts exactly the dedup cap when the total confirms all rows were read', async () => {
    const existing = Array.from({ length: 10000 }, (_, i) => ({ lat: 9.70, lon: 100, external_source: 'osm', external_id: String(i + 1) }))
    const result = await runScan({ elements: [{ type: 'way', id: 10000, geometry: square() }], existing, serverPageSize: 300 })
    expect(result.inserts).toHaveLength(0)
    expect(result.body.results[0]).toMatchObject({ deduped: 1, coverage: 'available_sources_processed' })
    expect(result.ranges.properties.at(-1)).toBe('9900-9999')
  })

  it('fails rather than deduplicating against a truncated low-cap response', async () => {
    const existing = Array.from({ length: 10001 }, (_, i) => ({ lat: 9.70, lon: 100, external_source: 'osm', external_id: String(i + 1) }))
    const result = await runScan({ elements: [{ type: 'way', id: 10001, geometry: square() }], existing, serverPageSize: 300 })
    expect(result.inserts).toHaveLength(0)
    expect(result.body.results[0].error).toBe('deduplication data exceeds 10000 records; scan a smaller area')
    expect(result.patches.at(-1)?.status).toBe('failed')
    expect(result.ranges.properties.at(-1)).toBe('9900-9999')
  })

  it('retains external-source truncation and loaded counts with a smaller server page limit', async () => {
    const external = Array.from({ length: 5001 }, (_, i) => ({ id: `external-${i}`, source: 'overture', lat: 9.70, lon: 100, area_sqm: 100 }))
    const result = await runScan({ external, serverPageSize: 300 })
    expect(result.ranges.buildings_external.at(-1)).toBe('4800-4999')
    expect(result.body.results[0]).toMatchObject({ overture: 5000, skipped: 3500, coverage: 'partial', external_source_status: 'truncated' })
  })

  it('fails a scan when dedup data is unavailable instead of inserting blind duplicates', async () => {
    const result = await runScan({ elements: [{ type: 'way', id: 1, geometry: square() }], failTable: 'properties' })
    expect(result.inserts).toHaveLength(0)
    expect(result.body.results[0].error).toBe('scan data read failed (503)')
    expect(result.patches.at(-1)?.status).toBe('failed')
  })

  it('discloses an external source outage while retaining available OSM roofs', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const result = await runScan({ elements: [{ type: 'way', id: 1, geometry: square() }], failTable: 'buildings_external' })
      expect(result.inserts).toHaveLength(1)
      expect(result.body.results[0]).toMatchObject({ coverage: 'partial', external_source_status: 'unavailable' })
    } finally { vi.restoreAllMocks() }
  })
})
