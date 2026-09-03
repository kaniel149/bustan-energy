// Usage: BUSTAN_SUPABASE_SERVICE_ROLE_KEY=... node scripts/ingest-kp-scan.mjs [--index ../bustan-index] [--dry-run]
// Idempotent: upserts on (external_source, external_id); legacy rows without external_id are matched by ~28 m.
// Requires migration 015 (external_source/external_id + unique index) on schema bustan.
import fs from 'node:fs'; import path from 'node:path'
import { parseBuildingsJs, buildOsmRecords, buildUnmappedRecords, matchExisting } from './lib/kp-ingest-core.mjs'

const args = process.argv.slice(2)
const dry = args.includes('--dry-run')
const idx = args.includes('--index') ? args[args.indexOf('--index') + 1] : path.resolve(process.cwd(), '../bustan-index')
const rs = p => path.join(idx, 'roof-scanner', p)
const URL_ = process.env.BUSTAN_SUPABASE_URL || 'https://ygoiaabzkuvdsyyduvhv.supabase.co'
const KEY = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY
if (!KEY && !dry) { console.error('BUSTAN_SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1) }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Accept-Profile': 'bustan', 'Content-Profile': 'bustan' }

const buildings = parseBuildingsJs(fs.readFileSync(rs('buildings_data.js'), 'utf8'))
const fq = JSON.parse(fs.readFileSync(rs('footprint_quality_merged.json'), 'utf8'))
const sd = JSON.parse(fs.readFileSync(rs('solar_detected.json'), 'utf8'))
const un = JSON.parse(fs.readFileSync(rs('unmapped_roofs.json'), 'utf8'))
const records = [...buildOsmRecords(buildings, fq, sd), ...buildUnmappedRecords(un)]
console.log(`records: osm=${buildings.length} unmapped=${un.length} total=${records.length}`)

// Ko Phangan bbox
const q = `scan_candidates?select=id,lat,lon,external_id,external_source,status&lat=gte.9.65&lat=lte.9.82&lon=gte.99.93&lon=lte.100.10&limit=10000`
const existing = dry ? [] : await (await fetch(`${URL_}/rest/v1/${q}`, { headers: H })).json()
if (!Array.isArray(existing)) { console.error('existing fetch failed', existing); process.exit(1) }
console.log(`existing KP candidates in DB: ${existing.length}`)

let matched = 0, inserted = 0, skipped = 0
const inserts = []; const updates = []
for (const r of records) {
  const m = matchExisting(r, existing)
  if (m) { matched++; if (m.status === 'pending') updates.push({ id: m.id, ...r }); else skipped++ }
  else inserts.push(r)
}
console.log(`match=${matched} (update pending=${updates.length}, leave non-pending=${skipped}) insert=${inserts.length}`)
if (dry) process.exit(0)

for (let i = 0; i < inserts.length; i += 500) {
  const chunk = inserts.slice(i, i + 500)
  const r = await fetch(`${URL_}/rest/v1/scan_candidates?on_conflict=external_source,external_id`, {
    method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(chunk) })
  if (!r.ok) { console.error('insert failed', r.status, await r.text()); process.exit(1) }
  inserted += chunk.length; console.log(`inserted ${inserted}/${inserts.length}`)
}
let updated = 0
for (const u of updates) {
  const { id, ...body } = u; delete body.status // never touch status on a legacy match
  const r = await fetch(`${URL_}/rest/v1/scan_candidates?id=eq.${id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(body) })
  if (!r.ok) { console.error('patch failed', id, r.status, await r.text()); process.exit(1) }
  if (++updated % 200 === 0) console.log(`updated ${updated}/${updates.length}`)
}
console.log(`done: inserted=${inserted} updated=${updated}`)
