// Ingest Microsoft GlobalMLBuildingFootprints (2026 release) for a bbox into
// bustan.buildings_external with source='msbuildings'. Use as an ON-DEMAND
// GAP-FILL for islands where Overture/OSM is sparse — Overture stays the
// curated primary (it dedupes OSM+Google+MS). The area-scan worker reads all
// sources from buildings_external (no source filter), so these rows flow into
// scans automatically and get proximity-deduped against existing leads.
//
// Microsoft global buildings are published as gzipped GeoJSONL, partitioned by
// country + z9 quadkey, listed in a manifest CSV. We:
//   1. compute the z9 quadkey(s) covering the bbox,
//   2. DuckDB-filter the manifest to Thailand + those quadkeys → file URLs,
//   3. stream each .csv.gz, parse GeoJSONL, bbox + QA filter,
//   4. upsert centroids + polygons to buildings_external.
//
// Requires: DuckDB CLI on PATH; BUSTAN_SUPABASE_SERVICE_ROLE_KEY in .env or env.
// Usage:  node scripts/ingest-msbuildings.mjs <minLng> <minLat> <maxLng> <maxLat> [zoom=9]
// Example (Ko Phangan):  node scripts/ingest-msbuildings.mjs 99.95 9.69 100.09 9.79
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { createGunzip } from 'node:zlib'
import { Readable } from 'node:stream'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANIFEST = 'https://minedbuildings.z5.web.core.windows.net/global-buildings/dataset-links.csv'
const COUNTRY = 'Thailand'

const [minLng, minLat, maxLng, maxLat] = process.argv.slice(2, 6).map(Number)
const ZOOM = Number(process.argv[6]) || 9
if ([minLng, minLat, maxLng, maxLat].some((n) => !Number.isFinite(n))) {
  console.error('usage: node scripts/ingest-msbuildings.mjs <minLng> <minLat> <maxLng> <maxLat> [zoom=9]')
  process.exit(1)
}

// --- env (BUSTAN service key + url) ---
function fromEnvFile(key) {
  try {
    const line = readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n').find((l) => l.startsWith(`${key}=`))
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '') : ''
  } catch { return '' }
}
const BUSTAN_URL = process.env.BUSTAN_SUPABASE_URL || fromEnvFile('VITE_BUSTAN_SUPABASE_URL') || 'https://ygoiaabzkuvdsyyduvhv.supabase.co'
const BUSTAN_KEY = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY || fromEnvFile('BUSTAN_SUPABASE_SERVICE_ROLE_KEY')
if (!BUSTAN_KEY) { console.error('BUSTAN_SUPABASE_SERVICE_ROLE_KEY missing (env or .env)'); process.exit(1) }

// --- 1. z9 quadkeys covering the bbox ---
function lngLatToTile(lng, lat, z) {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) }
}
function tileToQuadkey(x, y, z) {
  let qk = ''
  for (let i = z; i > 0; i--) {
    let digit = 0
    const mask = 1 << (i - 1)
    if ((x & mask) !== 0) digit += 1
    if ((y & mask) !== 0) digit += 2
    qk += digit
  }
  return qk
}
const tl = lngLatToTile(minLng, maxLat, ZOOM) // top-left
const br = lngLatToTile(maxLng, minLat, ZOOM) // bottom-right
const quadkeys = new Set()
for (let x = tl.x; x <= br.x; x++) {
  for (let y = tl.y; y <= br.y; y++) quadkeys.add(tileToQuadkey(x, y, ZOOM))
}
console.log(`bbox → ${quadkeys.size} z${ZOOM} quadkey(s): ${[...quadkeys].join(', ')}`)

// --- 2. DuckDB: filter the manifest to Thailand + these quadkeys ---
const qkList = [...quadkeys].map((k) => `'${k}'`).join(',')
const URLS_OUT = '/tmp/ms_urls.json'
const manifestSql = `
INSTALL httpfs; LOAD httpfs;
COPY (
  SELECT Url FROM read_csv_auto('${MANIFEST}', header=true)
  WHERE Location = '${COUNTRY}' AND CAST(QuadKey AS VARCHAR) IN (${qkList})
) TO '${URLS_OUT}' (FORMAT JSON, ARRAY true);
`
console.log(`Querying Microsoft manifest for ${COUNTRY} files …`)
execFileSync('duckdb', ['-c', manifestSql], { stdio: 'inherit', timeout: 300000 })
if (!existsSync(URLS_OUT)) { console.error('manifest query produced no output'); process.exit(1) }
const urls = JSON.parse(readFileSync(URLS_OUT, 'utf8')).map((r) => r.Url).filter(Boolean)
if (!urls.length) {
  console.log(`No Microsoft building files for those quadkeys in ${COUNTRY}. Nothing to ingest.`)
  process.exit(0)
}
console.log(`Found ${urls.length} Microsoft part file(s) to scan.`)

// --- geometry helpers ---
function outerRing(geom) {
  if (!geom) return null
  if (geom.type === 'Polygon') return geom.coordinates?.[0] || null
  if (geom.type === 'MultiPolygon') return geom.coordinates?.[0]?.[0] || null
  return null
}
function asPolygon(geom) {
  if (geom.type === 'Polygon') return geom
  if (geom.type === 'MultiPolygon') return { type: 'Polygon', coordinates: geom.coordinates[0] }
  return null
}
function ringCentroid(ring) {
  const last = ring[ring.length - 1]
  const pts = ring[0][0] === last[0] && ring[0][1] === last[1] ? ring.slice(0, -1) : ring
  let sx = 0, sy = 0
  for (const [x, y] of pts) { sx += x; sy += y }
  return { lon: sx / pts.length, lat: sy / pts.length }
}
function ringAreaSqm(ring, lat) {
  let a = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1]
    a += x1 * y2 - x2 * y1
  }
  a = Math.abs(a) / 2 // deg²
  const mPerDegLat = 111320
  const mPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180)
  return a * mPerDegLat * mPerDegLng
}

// --- 3. stream each gzipped GeoJSONL, parse + bbox + QA filter ---
const byId = new Map()
let scanned = 0, kept = 0
for (const url of urls) {
  const res = await fetch(url)
  if (!res.ok || !res.body) { console.error('fetch failed', res.status, url.slice(-60)); continue }
  const stream = Readable.fromWeb(res.body).pipe(createGunzip())
  const rl = createInterface({ input: stream, crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line) continue
    scanned++
    let f
    try { f = JSON.parse(line) } catch { continue }
    const ring = outerRing(f.geometry)
    if (!ring || ring.length < 4) continue
    const c = ringCentroid(ring)
    if (c.lon < minLng || c.lon > maxLng || c.lat < minLat || c.lat > maxLat) continue
    const hRaw = f.properties?.height
    const height = Number.isFinite(hRaw) && hRaw > 0 ? hRaw : null
    const area = ringAreaSqm(ring, c.lat)
    // QA: drop tiny specks (rocks / offshore false positives) that have no height
    if (area < 10 && height == null) continue
    const id = `ms_${c.lat.toFixed(6)}_${c.lon.toFixed(6)}`
    byId.set(id, {
      id,
      source: 'msbuildings',
      lat: c.lat,
      lon: c.lon,
      roof_geom: asPolygon(f.geometry),
      area_sqm: Math.round(area),
      height,
      name: null,
    })
    kept++
  }
}
const rows = [...byId.values()]
console.log(`Scanned ${scanned} features → kept ${kept} in bbox → ${rows.length} unique. Upserting …`)
if (!rows.length) { console.log('Nothing in bbox after filtering.'); process.exit(0) }

// --- 4. batch upsert to bustan REST (service role) ---
const headers = {
  apikey: BUSTAN_KEY,
  Authorization: `Bearer ${BUSTAN_KEY}`,
  'Content-Type': 'application/json',
  'Content-Profile': 'bustan',
  Prefer: 'resolution=merge-duplicates,return=minimal',
}
let done = 0
for (let i = 0; i < rows.length; i += 500) {
  const batch = rows.slice(i, i + 500)
  const r = await fetch(`${BUSTAN_URL}/rest/v1/buildings_external`, { method: 'POST', headers, body: JSON.stringify(batch) })
  if (!r.ok) { console.error('upsert failed:', r.status, (await r.text()).slice(0, 200)); process.exit(1) }
  done += batch.length
  console.log(`  upserted ${done}/${rows.length}`)
}
console.log(`Done — ${rows.length} Microsoft buildings loaded (source=msbuildings) for the bbox.`)
