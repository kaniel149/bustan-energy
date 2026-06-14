/**
 * queue-thailand-scans.mjs
 *
 * CLI helper to queue bustan.scan_requests for Thailand regions.
 * Tiles a bounding box into NxM cells and inserts one scan_requests row per
 * cell (status='queued', scan_type as specified). The cron-process-scans
 * worker picks them up automatically.
 *
 * Usage:
 *   node scripts/queue-thailand-scans.mjs \
 *     --region ko-phangan \
 *     --type land \
 *     [--tile 0.15] \
 *     [--dry]
 *
 *   node scripts/queue-thailand-scans.mjs \
 *     --bbox 100.0,12.5,101.0,13.5 \
 *     --type roof \
 *     [--tile 0.10] \
 *     [--dry]
 *
 * Env vars required:
 *   SUPABASE_URL              — e.g. https://ygoiaabzkuvdsyyduvhv.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (bypasses RLS)
 *
 * Options:
 *   --region  <name>  Named region from the built-in table below.
 *   --bbox    <minLon,minLat,maxLon,maxLat>  Custom bbox (overrides --region).
 *   --type    land|roof   Scan type (default: land).
 *   --tile    <degrees>   Tile side length in degrees (default: 0.15 ≈ 16 km).
 *   --dry               Print tile count + first 3 bboxes, do not insert.
 */

import { createClient } from '@supabase/supabase-js'

// ─── Named regions ─────────────────────────────────────────────────────────
// Format: [minLon, minLat, maxLon, maxLat]
const REGIONS = {
  'ko-phangan':        [100.000,  9.440, 100.120,  9.600],
  'ko-samui':          [ 99.790,  9.390, 100.080,  9.620],
  'surat-thani':       [ 99.000,  9.000, 100.100,  9.450],
  'chonburi-eec':      [100.800, 12.900, 101.500, 13.500],
  'rayong':            [101.200, 12.550, 102.000, 13.200],
  'bangkok-metro':     [100.300, 13.500, 100.950, 14.000],
  'chiang-mai':        [ 98.800, 18.600,  99.200, 19.100],
  'khon-kaen':         [102.600, 16.200, 103.200, 16.700],
  'nakhon-ratchasima': [101.800, 14.800, 102.400, 15.300],
  // High-value industrial / commercial belts (factory roofs + ground-mount land)
  'samut-prakan':      [100.550, 13.450, 100.850, 13.660],  // Bang Phli / Bang Pu estates
  'samut-sakhon':      [100.150, 13.450, 100.450, 13.680],  // Mahachai industrial
  'ayutthaya':         [100.450, 14.180, 100.820, 14.460],  // Rojana / Hi-Tech / Bang Pa-in
  'chachoengsao':      [100.950, 13.450, 101.400, 13.950],  // Gateway City + EEC data centers
  'prachinburi':       [101.200, 13.800, 101.780, 14.220],  // 304 Industrial Park
  'phuket':            [ 98.270,  7.780,  98.450,  8.020],  // resorts + hotels (commercial PPA)
  'thailand':          [ 97.300,  5.600, 105.700, 20.500],
}

// ─── CLI parsing ────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
function flag(name) {
  const i = args.indexOf(name)
  if (i === -1) return undefined
  return args[i + 1]
}
const isDry  = args.includes('--dry')
const region = flag('--region')
const bboxRaw = flag('--bbox')
const typeArg = flag('--type') ?? 'land'
const tileArg = flag('--tile')
const TILE_DEG = tileArg ? parseFloat(tileArg) : 0.15

if (!region && !bboxRaw) {
  console.error('ERROR: provide --region <name> or --bbox minLon,minLat,maxLon,maxLat')
  console.error('Available regions:', Object.keys(REGIONS).join(', '))
  process.exit(1)
}
if (!['land', 'roof'].includes(typeArg)) {
  console.error('ERROR: --type must be land or roof')
  process.exit(1)
}
if (isNaN(TILE_DEG) || TILE_DEG <= 0 || TILE_DEG > 2) {
  console.error('ERROR: --tile must be a positive number ≤ 2 (degrees)')
  process.exit(1)
}

// ─── Resolve bbox ───────────────────────────────────────────────────────────
let bbox
if (bboxRaw) {
  const parts = bboxRaw.split(',').map(Number)
  if (parts.length !== 4 || parts.some(isNaN)) {
    console.error('ERROR: --bbox must be four comma-separated numbers: minLon,minLat,maxLon,maxLat')
    process.exit(1)
  }
  bbox = parts
} else {
  bbox = REGIONS[region]
  if (!bbox) {
    console.error(`ERROR: unknown region "${region}". Available:`, Object.keys(REGIONS).join(', '))
    process.exit(1)
  }
}

const [minLon, minLat, maxLon, maxLat] = bbox

// ─── Generate tiles ─────────────────────────────────────────────────────────
const lons = []
for (let lo = minLon; lo < maxLon - 1e-9; lo = Math.round((lo + TILE_DEG) * 1e7) / 1e7) {
  lons.push(lo)
}
const lats = []
for (let la = minLat; la < maxLat - 1e-9; la = Math.round((la + TILE_DEG) * 1e7) / 1e7) {
  lats.push(la)
}

const tiles = []
let tileIndex = 0
const totalTiles = lons.length * lats.length
for (const lo of lons) {
  for (const la of lats) {
    tileIndex++
    const tlo = Math.min(lo + TILE_DEG, maxLon)
    const tla = Math.min(la + TILE_DEG, maxLat)
    const label = region
      ? `${region} tile ${tileIndex}/${totalTiles}`
      : `custom tile ${tileIndex}/${totalTiles}`
    tiles.push({
      minLon: lo,
      minLat: la,
      maxLon: tlo,
      maxLat: tla,
      label,
    })
  }
}

console.log(`Region:    ${region ?? 'custom'}`)
console.log(`BBox:      [${minLon}, ${minLat}, ${maxLon}, ${maxLat}]`)
console.log(`Tile size: ${TILE_DEG}°`)
console.log(`Scan type: ${typeArg}`)
console.log(`Tiles:     ${tiles.length} (${lons.length} × ${lats.length})`)

if (isDry) {
  console.log('\n-- DRY RUN (no insert) --')
  tiles.slice(0, 3).forEach((t, i) => {
    console.log(`  tile ${i + 1}: [${t.minLon}, ${t.minLat}, ${t.maxLon}, ${t.maxLat}] "${t.label}"`)
  })
  if (tiles.length > 3) console.log(`  ... and ${tiles.length - 3} more`)
  process.exit(0)
}

// ─── Supabase client ─────────────────────────────────────────────────────────
// Prefer BUSTAN_* vars (same as api/cron-process-scans.ts) so this can't
// accidentally point at the main project — scan_requests lives in the bustan
// project (ygoiaabzkuvdsyyduvhv), schema `bustan`.
const SUPABASE_URL = process.env.BUSTAN_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: BUSTAN_SUPABASE_URL and BUSTAN_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_*) env vars are required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'bustan' },
  auth: { persistSession: false },
})

// ─── Build GeoJSON polygon for each tile bbox ────────────────────────────────
function bboxToPolygon(tMinLon, tMinLat, tMaxLon, tMaxLat) {
  return {
    type: 'Polygon',
    coordinates: [[
      [tMinLon, tMinLat],
      [tMaxLon, tMinLat],
      [tMaxLon, tMaxLat],
      [tMinLon, tMaxLat],
      [tMinLon, tMinLat],
    ]],
  }
}

// ─── Insert rows in batches of 50 ────────────────────────────────────────────
const BATCH = 50
let inserted = 0
let skipped  = 0

console.log(`\nInserting ${tiles.length} scan_requests...`)

for (let i = 0; i < tiles.length; i += BATCH) {
  const batch = tiles.slice(i, i + BATCH)
  const rows = batch.map((t) => ({
    area_geojson: bboxToPolygon(t.minLon, t.minLat, t.maxLon, t.maxLat),
    bbox: [t.minLon, t.minLat, t.maxLon, t.maxLat],
    filters: JSON.stringify({}),
    scan_type: typeArg,
    status: 'queued',
    // Store the human-readable label in the counts jsonb for easy debugging
    counts: { label: t.label },
  }))

  const { error, count } = await supabase
    .from('scan_requests')
    .insert(rows, { count: 'exact' })

  if (error) {
    console.error(`Batch ${Math.floor(i / BATCH) + 1} error:`, error.message)
    skipped += batch.length
  } else {
    inserted += count ?? batch.length
    process.stdout.write(`\r  Inserted ${inserted}/${tiles.length}`)
  }
}

console.log(`\n\nDone. Inserted: ${inserted}, Skipped (errors): ${skipped}`)
if (inserted > 0) {
  console.log('The cron-process-scans worker will pick these up on its next run.')
}
