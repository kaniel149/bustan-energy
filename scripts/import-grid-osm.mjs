/**
 * Import EEC transmission-grid features from OSM Overpass into the MAIN Supabase
 * project's grid_features table (supabase/migrations/003_grid_features.sql).
 *
 * The frontend reads grid data from /public/data/grid_all.geojson (static file).
 * This script ALSO writes a merged GeoJSON to that path so the map sees new data
 * without a DB query — matching what loadGridData() in src/lib/load-data.ts fetches.
 *
 * Usage:
 *   node scripts/import-grid-osm.mjs --bbox 100.5,12.5,102.5,14.5 [--dry]
 *   node scripts/import-grid-osm.mjs --bbox minLon,minLat,maxLon,maxLat [--dry]
 *
 * Env (read from process.env or .env file in the repo root):
 *   SUPABASE_URL             Main Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service role key for the main project
 *
 * The --dry flag prints what would be inserted without writing anything.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const bboxIdx = args.indexOf('--bbox')
if (bboxIdx === -1 || !args[bboxIdx + 1]) {
  console.error('usage: node scripts/import-grid-osm.mjs --bbox minLon,minLat,maxLon,maxLat [--dry]')
  process.exit(1)
}
const bboxParts = args[bboxIdx + 1].split(',').map(Number)
if (bboxParts.length !== 4 || bboxParts.some((n) => !Number.isFinite(n))) {
  console.error('--bbox must be four comma-separated numbers: minLon,minLat,maxLon,maxLat')
  process.exit(1)
}
const [minLon, minLat, maxLon, maxLat] = bboxParts
const DRY = args.includes('--dry')

// ── Env ───────────────────────────────────────────────────────────────────────
function fromEnvFile(key) {
  try {
    const line = readFileSync(resolve(ROOT, '.env'), 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${key}=`))
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '') : ''
  } catch {
    return ''
  }
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  fromEnvFile('VITE_SUPABASE_URL') ||
  fromEnvFile('SUPABASE_URL')
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  fromEnvFile('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — set them in env or .env'
  )
  process.exit(1)
}

// ── Overpass mirrors (same list as api/cron-process-scans.ts) ─────────────────
const OVERPASS_URLS = [
  ...(process.env.OVERPASS_URL ? [process.env.OVERPASS_URL] : []),
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const OVERPASS_TIMEOUT_MS = 30_000

// ── Min voltage filter ─────────────────────────────────────────────────────────
const MIN_VOLTAGE_V = 69_000

// ── Overpass fetch with mirror failover ───────────────────────────────────────
async function fetchOverpass(query) {
  let lastErr = 'no mirrors'
  for (const url of OVERPASS_URLS) {
    const host = url.replace(/^https?:\/\//, '').split('/')[0]
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), OVERPASS_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        signal: ctrl.signal,
      })
      if (res.ok) {
        clearTimeout(timer)
        return await res.json()
      }
      lastErr = `${host} HTTP ${res.status}`
    } catch (e) {
      lastErr = `${host} ${e instanceof Error ? e.message : 'error'}`
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error(`Overpass all mirrors failed (last: ${lastErr})`)
}

// ── Voltage parsing ────────────────────────────────────────────────────────────
/**
 * Parse OSM voltage tag: may be "115000", "115000;22000", "115 kV", etc.
 * Returns the max numeric voltage in volts, or null if unparseable.
 */
function parseMaxVoltage(raw) {
  if (!raw) return null
  const parts = String(raw).split(';')
  let max = null
  for (const part of parts) {
    const clean = part.trim().toLowerCase()
    // Handle "115 kv" → 115000 or "0.4 kv" → 400
    const kvMatch = clean.match(/^([\d.]+)\s*kv$/)
    if (kvMatch) {
      const v = parseFloat(kvMatch[1]) * 1000
      if (Number.isFinite(v) && (max === null || v > max)) max = v
      continue
    }
    // Handle bare numeric strings
    const n = parseFloat(clean.replace(/[^\d.]/g, ''))
    if (Number.isFinite(n) && n > 0 && (max === null || n > max)) max = n
  }
  return max
}

// ── Centroid of OSM way geometry ───────────────────────────────────────────────
function wayCentroid(nodes) {
  if (!nodes || nodes.length === 0) return null
  let sumLat = 0, sumLon = 0
  for (const n of nodes) { sumLat += n.lat; sumLon += n.lon }
  return { lat: sumLat / nodes.length, lon: sumLon / nodes.length }
}

// ── Build GeoJSON geometry from an OSM element ────────────────────────────────
function osmToGeoJsonGeom(el) {
  if (el.type === 'node') {
    return { type: 'Point', coordinates: [el.lon, el.lat] }
  }
  if (el.type === 'way' && el.geometry && el.geometry.length >= 2) {
    const coords = el.geometry.map((n) => [n.lon, n.lat])
    return { type: 'LineString', coordinates: coords }
  }
  return null
}

// ── Region inference from coordinates ─────────────────────────────────────────
function regionFromCoords(lat, lon) {
  // Rough bounding boxes for known regions; EEC area → koh_phangan as default
  if (lat > 9.4 && lat < 10.1 && lon > 99.7 && lon < 100.1) return 'koh_phangan'
  if (lat > 9.3 && lat < 9.7 && lon > 99.9 && lon < 100.2) return 'koh_samui'
  if (lat > 8.5 && lat < 9.5 && lon > 98.9 && lon < 100.5) return 'surat_thani'
  return 'koh_phangan' // fallback
}

// ── Supabase REST helpers ──────────────────────────────────────────────────────
function mainHeaders(write = false) {
  const h = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  }
  if (write) h['Content-Type'] = 'application/json'
  return h
}

async function fetchExistingOsmIds() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/grid_features?select=osm_id&osm_id=not.is.null&limit=50000`,
    { headers: mainHeaders() }
  )
  if (!res.ok) {
    console.warn(`Could not fetch existing osm_ids (${res.status}) — proceeding without dedup`)
    return new Set()
  }
  const rows = await res.json()
  return new Set(rows.map((r) => r.osm_id))
}

async function upsertBatch(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/grid_features`, {
    method: 'POST',
    headers: {
      ...mainHeaders(true),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase upsert failed (${res.status}): ${text.slice(0, 300)}`)
  }
}

// ── Static GeoJSON path (what the frontend actually reads) ────────────────────
const STATIC_GEOJSON_PATH = resolve(ROOT, 'public', 'data', 'grid_all.geojson')
const DATA_GIS_PATH = resolve(ROOT, 'data', 'gis', 'grid_all.geojson')

function loadExistingGeoJson(path) {
  if (!existsSync(path)) return { type: 'FeatureCollection', features: [] }
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return { type: 'FeatureCollection', features: [] }
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
console.log(`\nOSM Grid Import — bbox [${minLon}, ${minLat}, ${maxLon}, ${maxLat}]${DRY ? ' [DRY RUN]' : ''}`)
console.log(`Min voltage filter: ${MIN_VOLTAGE_V / 1000} kV\n`)

// Query 1: substations (nodes + ways with centroid)
const substationQuery = `
[out:json][timeout:60];
(
  node["power"="substation"](${minLat},${minLon},${maxLat},${maxLon});
  way["power"="substation"](${minLat},${minLon},${maxLat},${maxLon});
);
out geom;
`

// Query 2: power lines with voltage >= MIN_VOLTAGE_V
const lineQuery = `
[out:json][timeout:60];
(
  way["power"="line"]["voltage"](${minLat},${minLon},${maxLat},${maxLon});
);
out geom;
`

console.log('Fetching substations from Overpass…')
const substationData = await fetchOverpass(substationQuery)
console.log(`  Raw substations: ${substationData.elements?.length ?? 0} elements`)

console.log('Fetching power lines from Overpass…')
const lineData = await fetchOverpass(lineQuery)
console.log(`  Raw power lines: ${lineData.elements?.length ?? 0} elements`)

// ── Process substations ────────────────────────────────────────────────────────
const substationRows = []
for (const el of substationData.elements ?? []) {
  let lat, lon

  if (el.type === 'node') {
    lat = el.lat
    lon = el.lon
  } else if (el.type === 'way' && el.geometry) {
    const c = wayCentroid(el.geometry)
    if (!c) continue
    lat = c.lat
    lon = c.lon
  } else {
    continue
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

  const osmId = Number(el.id)
  const tags = el.tags ?? {}

  substationRows.push({
    id: `osm_${osmId}`,
    power_type: 'substation',
    name: tags.name || tags['name:en'] || null,
    name_th: tags['name:th'] || null,
    voltage: tags.voltage || null,
    operator: tags.operator || null,
    region: regionFromCoords(lat, lon),
    source: 'osm',
    geom: JSON.stringify({ type: 'Point', coordinates: [lon, lat] }),
    osm_id: osmId,
    osm_type: el.type,
  })
}

// ── Process power lines ────────────────────────────────────────────────────────
/** Voltage histogram: { voltageString: count } */
const voltageHistogram = {}
const lineRows = []

for (const el of lineData.elements ?? []) {
  if (el.type !== 'way') continue
  const geom = osmToGeoJsonGeom(el)
  if (!geom || geom.type !== 'LineString' || geom.coordinates.length < 2) continue

  const tags = el.tags ?? {}
  const voltageRaw = tags.voltage || ''
  const maxVoltage = parseMaxVoltage(voltageRaw)

  // Skip low-voltage lines
  if (maxVoltage === null || maxVoltage < MIN_VOLTAGE_V) continue

  const osmId = Number(el.id)
  const voltKey = voltageRaw || 'unknown'
  voltageHistogram[voltKey] = (voltageHistogram[voltKey] ?? 0) + 1

  // Determine power_type based on voltage range
  let power_type = 'line'
  if (maxVoltage < 115_000) power_type = 'minor_line'

  // Centroid for region inference
  const midIdx = Math.floor(geom.coordinates.length / 2)
  const [midLon, midLat] = geom.coordinates[midIdx]

  lineRows.push({
    id: `osm_${osmId}`,
    power_type,
    name: tags.name || tags['name:en'] || null,
    name_th: tags['name:th'] || null,
    voltage: voltageRaw || null,
    operator: tags.operator || null,
    region: regionFromCoords(midLat, midLon),
    source: 'osm',
    geom: JSON.stringify(geom),
    osm_id: osmId,
    osm_type: 'way',
  })
}

console.log(`\nProcessed:`)
console.log(`  Substations: ${substationRows.length}`)
console.log(`  Power lines (>=${MIN_VOLTAGE_V / 1000} kV): ${lineRows.length}`)

if (lineRows.length > 0) {
  console.log('\nVoltage histogram (line segments):')
  const sorted = Object.entries(voltageHistogram).sort((a, b) => b[1] - a[1])
  for (const [v, count] of sorted.slice(0, 15)) {
    console.log(`  ${v.padEnd(20)} ${count} segments`)
  }
}

const allRows = [...substationRows, ...lineRows]

if (allRows.length === 0) {
  console.log('\nNo features to import.')
  process.exit(0)
}

if (DRY) {
  console.log(`\n[DRY] Would upsert ${allRows.length} rows. Sample:`)
  console.log(JSON.stringify(allRows[0], null, 2))
  process.exit(0)
}

// ── Dedup: fetch existing osm_ids ─────────────────────────────────────────────
console.log('\nFetching existing osm_ids for dedup…')
const existingIds = await fetchExistingOsmIds()
console.log(`  Existing: ${existingIds.size} rows in grid_features`)

const newRows = allRows.filter((r) => !existingIds.has(r.osm_id))
const skipped = allRows.length - newRows.length
console.log(`  New: ${newRows.length} rows | Skipped (already imported): ${skipped}`)

if (newRows.length === 0) {
  console.log('\nAll features already in DB. Nothing to insert.')
} else {
  // Upsert in batches of 200 (PostgREST body limit safety)
  const BATCH = 200
  let done = 0
  for (let i = 0; i < newRows.length; i += BATCH) {
    const batch = newRows.slice(i, i + BATCH)
    await upsertBatch(batch)
    done += batch.length
    console.log(`  Upserted ${done}/${newRows.length}`)
  }
  console.log(`\nDB insert complete.`)
}

// ── Merge into static GeoJSON for the frontend ────────────────────────────────
// The map reads /public/data/grid_all.geojson — merge new features into it.
console.log('\nMerging into static GeoJSON…')
const existing = loadExistingGeoJson(STATIC_GEOJSON_PATH)
const existingFeatureIds = new Set(existing.features.map((f) => f.properties?.id))

/** Convert a DB row (geom is stringified JSON) into a GeoJSON Feature */
function rowToFeature(row) {
  const geom = typeof row.geom === 'string' ? JSON.parse(row.geom) : row.geom
  return {
    type: 'Feature',
    geometry: geom,
    properties: {
      id: row.id,
      osm_id: row.osm_id,
      osm_type: row.osm_type,
      power_type: row.power_type,
      region: row.region,
      source: row.source,
      ...(row.name ? { name: row.name } : {}),
      ...(row.name_th ? { name_th: row.name_th } : {}),
      ...(row.voltage ? { voltage: row.voltage } : {}),
      ...(row.operator ? { operator: row.operator } : {}),
    },
  }
}

// Only add features whose id is not already present in the GeoJSON
const newGeoFeatures = allRows
  .filter((r) => !existingFeatureIds.has(r.id))
  .map(rowToFeature)

const merged = {
  type: 'FeatureCollection',
  features: [...existing.features, ...newGeoFeatures],
}

writeFileSync(STATIC_GEOJSON_PATH, JSON.stringify(merged))
// Also keep the data/gis copy in sync
writeFileSync(DATA_GIS_PATH, JSON.stringify(merged))

console.log(`  Added ${newGeoFeatures.length} new features to grid_all.geojson`)
console.log(`  Total features in file: ${merged.features.length}`)
console.log(`\nDone.`)
console.log(`\nUsage reminder:`)
console.log(`  node scripts/import-grid-osm.mjs --bbox ${minLon},${minLat},${maxLon},${maxLat}`)
