// Ingest Overture Maps building footprints for a bbox into bustan.buildings_external,
// so the area-scan worker has dense coverage where OSM is sparse.
//
// Requires: DuckDB CLI on PATH; BUSTAN_SUPABASE_SERVICE_ROLE_KEY in .env (or env).
// Usage:  node scripts/ingest-overture.mjs <minLng> <minLat> <maxLng> <maxLat> [release]
// Example (the Bangkok-east area where OSM returned 0):
//   node scripts/ingest-overture.mjs 100.94095 13.56533 100.94688 13.57375
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const RELEASE = process.argv[6] || '2026-05-20.0'
const [minLng, minLat, maxLng, maxLat] = process.argv.slice(2, 6).map(Number)
if ([minLng, minLat, maxLng, maxLat].some((n) => !Number.isFinite(n))) {
  console.error('usage: node scripts/ingest-overture.mjs <minLng> <minLat> <maxLng> <maxLat> [release]')
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

// --- DuckDB → Overture S3 → JSON ---
const OUT = `/tmp/overture_${Date.now ? 'x' : 'x'}.json` // Date.now unavailable in some sandboxes; static name
const sql = `
INSTALL spatial; LOAD spatial; INSTALL httpfs; LOAD httpfs;
SET s3_region='us-west-2';
COPY (
  SELECT id,
    ST_Y(ST_Centroid(geometry)) AS lat,
    ST_X(ST_Centroid(geometry)) AS lon,
    ST_AsGeoJSON(geometry) AS geom,
    height,
    names.primary AS name
  FROM read_parquet('s3://overturemaps-us-west-2/release/${RELEASE}/theme=buildings/type=building/*', hive_partitioning=1)
  WHERE bbox.xmin BETWEEN ${minLng} AND ${maxLng}
    AND bbox.ymin BETWEEN ${minLat} AND ${maxLat}
) TO '${OUT}' (FORMAT JSON, ARRAY true);
`
console.log(`Querying Overture ${RELEASE} for bbox [${minLng},${minLat} → ${maxLng},${maxLat}] …`)
execFileSync('duckdb', ['-c', sql], { stdio: 'inherit', timeout: 300000 })
if (!existsSync(OUT)) { console.error('DuckDB produced no output'); process.exit(1) }

const raw = JSON.parse(readFileSync(OUT, 'utf8'))
const rows = raw
  .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && r.geom)
  .map((r) => ({
    id: r.id,
    source: 'overture',
    lat: r.lat,
    lon: r.lon,
    roof_geom: JSON.parse(r.geom), // GeoJSON geometry → jsonb
    height: Number.isFinite(r.height) ? r.height : null,
    name: r.name || null,
  }))
console.log(`Parsed ${rows.length} Overture buildings. Upserting to bustan.buildings_external …`)

// --- batch upsert to bustan REST (service role) ---
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
  const res = await fetch(`${BUSTAN_URL}/rest/v1/buildings_external`, { method: 'POST', headers, body: JSON.stringify(batch) })
  if (!res.ok) { console.error('upsert failed:', res.status, (await res.text()).slice(0, 200)); process.exit(1) }
  done += batch.length
  console.log(`  upserted ${done}/${rows.length}`)
}
writeFileSync(resolve(ROOT, 'scripts/.overture-last-bbox.json'), JSON.stringify({ minLng, minLat, maxLng, maxLat, release: RELEASE, count: rows.length }, null, 2))
console.log(`Done — ${rows.length} Overture buildings loaded for the bbox.`)
