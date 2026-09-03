# SP2 — Deal Engine Connected Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every roof the Aug-2026 island scan found lives in the DB with a stable id; PV detection in prod uses the proven z18/3×3/outlined-footprint method; a "Create proposal" click from any candidate opens a prefilled form; approving a candidate creates a deduped CRM lead in one atomic call; pricing has one source; a lead can be enriched and WhatsApp'd from its card.

**Architecture:** Add `external_id` to `bustan.scan_candidates`/`properties` (migration 015) so OSM-keyed JSON can be upserted idempotently (lat/lon fallback for legacy rows). Move tile fetching into `api/_lib/aerial-tiles.ts` (Node runtime + `sharp` for stitching/outline/crop). `NewProposalPage` gains a `candidate_id` / `external_id` hydration path that does a single-row select. Promotion becomes one SQL function `bustan.promote_scan_candidate` (dedup inside). Pricing constants are derived from `tools/proposal-builder/bom-templates.json`.

**Tech Stack:** Vercel functions (Node 20 + edge), Supabase PostgREST via `api/_lib/bustan-db.ts` (`bGet/bPost/bPatch`), React 18 + TS, vitest (node env, explicit imports), `sharp`.

**Live DB facts (2026-09-03):** scan_candidates 39,539 total, only **94 in KP bbox, 0 pending** → the ingest inserts ~3,900 new rows; properties 533 = crm_pipeline 533; low-confidence PV checks: 31,579 candidates nationwide (506 properties).

**Facts file:** `/tmp/sp2-facts.md` (line-numbered code facts). **Spec:** `docs/superpowers/specs/2026-09-03-bustan-final-grade-overhaul-design.md`.

**Repos:** `E` = `~/Desktop/projects/solar/bustan/bustan-energy` (branch `sp2/deal-engine` off `main`), `I` = `~/Desktop/projects/solar/bustan/bustan-index`.

**Hard rules:**
- Never apply a migration yourself. Task 1 writes the file; the team lead applies it (Task 8) via Supabase MCP. Tasks 2–7 must compile and pass unit tests without a DB.
- `OUTREACH_SELF_SEND=1` semantics apply to WhatsApp too (Task 7).
- Ignore any file whose name contains ` 2.` / ` 3.`.
- Commit message trailer on every commit:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_017JbAbFU9Nekc5oHPiezgru
  ```

---

### Task 0: Branch

- [ ] `cd $E && git checkout main && git pull --ff-only origin main && git checkout -b sp2/deal-engine`
- [ ] `npm ci` (only if `node_modules` is missing) then `npm test` → all existing suites pass. Record the count.

---

### Task 1: Migration 015 — external ids, footprint columns, atomic promotion, low-confidence requeue

**Files:**
- Create: `E/supabase/bustan-migrations/015_external_ids_promotion.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 015_external_ids_promotion.sql — schema bustan on ygoiaabzkuvdsyyduvhv
-- (a) stable external ids so island-scan JSON (OSM-keyed) can be upserted idempotently
-- (b) footprint-quality + PV-coverage columns from the Aug-2026 scan
-- (c) one atomic, deduping promotion RPC (replaces the two-step client flow)
-- (d) requeue low-confidence PV checks so they get re-examined with the z18 method

alter table bustan.scan_candidates
  add column if not exists external_source     text,
  add column if not exists external_id         text,
  add column if not exists footprint_class     text check (footprint_class in ('roof','parcel','compound','unclear')),
  add column if not exists roof_pct            numeric,
  add column if not exists footprint_confidence numeric,
  add column if not exists panel_coverage_pct  numeric,
  add column if not exists estimated_kwp_raw   numeric,
  add column if not exists category            text,
  add column if not exists phone               text,
  add column if not exists website             text;

create unique index if not exists uq_scan_candidates_external
  on bustan.scan_candidates(external_source, external_id)
  where external_id is not null;

create index if not exists idx_scan_candidates_latlon
  on bustan.scan_candidates(lat, lon);

alter table bustan.properties
  add column if not exists external_source text,
  add column if not exists external_id     text;

create unique index if not exists uq_properties_external
  on bustan.properties(external_source, external_id)
  where external_id is not null;

-- (c) promotion: candidate -> properties + crm_pipeline + owner_decision, deduped.
-- Returns {ok:true, property_id} or {ok:false, reason:'duplicate', property_id:<existing>}.
create or replace function bustan.promote_scan_candidate(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = bustan, public
as $$
declare
  c   bustan.scan_candidates%rowtype;
  dup text;
  v_id text;
begin
  if bustan.current_role() not in ('admin','sales','engineer') then
    raise exception 'insufficient_privilege: role % may not promote candidates',
      coalesce(bustan.current_role(), '(none)');
  end if;

  select * into c from bustan.scan_candidates where id = p_id;
  if not found then raise exception 'not_found: scan candidate % does not exist', p_id; end if;
  if c.status = 'added' then
    return jsonb_build_object('ok', true, 'property_id', c.id::text, 'already', true);
  end if;

  -- dedup 1: same external id already promoted
  if c.external_id is not null then
    select id into dup from bustan.properties
     where external_source = c.external_source and external_id = c.external_id limit 1;
  end if;
  -- dedup 2: another property within ~28 m (same tolerance as cron-process-scans DEDUP_DEG)
  if dup is null and c.lat is not null and c.lon is not null then
    select id into dup from bustan.properties
     where lat is not null and lon is not null
       and abs(lat - c.lat) < 0.00025 and abs(lon - c.lon) < 0.00025
       and id <> c.id::text
     limit 1;
  end if;
  if dup is not null then
    return jsonb_build_object('ok', false, 'reason', 'duplicate', 'property_id', dup);
  end if;

  v_id := c.id::text;
  insert into bustan.properties
    (id, name, area_name, property_type, roof_area_sqm, solar_potential_score,
     lat, lon, roof_geom, external_source, external_id)
  values
    (v_id, coalesce(c.name, 'Roof ' || left(v_id, 8)), c.area_name, c.property_type,
     c.roof_area_sqm, c.solar_potential_score, c.lat, c.lon, c.roof_geom,
     c.external_source, c.external_id)
  on conflict (id) do update
    set roof_geom = excluded.roof_geom,
        roof_area_sqm = excluded.roof_area_sqm,
        solar_potential_score = excluded.solar_potential_score,
        external_source = coalesce(excluded.external_source, bustan.properties.external_source),
        external_id     = coalesce(excluded.external_id,     bustan.properties.external_id);

  insert into bustan.crm_pipeline (property_id, stage, priority, estimated_kwp)
  values (v_id, 'new', coalesce(c.priority, 'C'), c.estimated_kwp)
  on conflict (property_id) do nothing;

  insert into bustan.owner_decision (property_id, research_status, data)
  values (v_id, 'pending',
          jsonb_strip_nulls(jsonb_build_object('phone', c.phone, 'website', c.website)))
  on conflict (property_id) do nothing;

  update bustan.scan_candidates set status = 'added' where id = p_id;

  return jsonb_build_object('ok', true, 'property_id', v_id);
end;
$$;

revoke all on function bustan.promote_scan_candidate(uuid) from public;
grant execute on function bustan.promote_scan_candidate(uuid) to authenticated;

-- (d) requeue: checks that came back "unclear image" get another look with the z18 method
-- Scoped to Ko Phangan: 31,579 rows nationwide match this predicate (most are error-stamped
-- confidence=0 from the z19 era); at 10/tick that would never drain. KP first; widen later per region.
update bustan.scan_candidates
   set solar_checked_at = null
 where solar_checked_at is not null
   and coalesce(solar_check_confidence, 0) < 0.3
   and existing_solar is not true
   and lat between 9.65 and 9.82 and lon between 99.93 and 100.10;

update bustan.properties
   set solar_checked_at = null
 where solar_checked_at is not null
   and coalesce(solar_check_confidence, 0) < 0.3
   and existing_solar is not true;
```

- [ ] **Step 2: Syntax check (no DB)**

Run: `cd $E && npx --yes pgsql-parser-cli supabase/bustan-migrations/015_external_ids_promotion.sql >/dev/null 2>&1 || node -e "require('fs').readFileSync('supabase/bustan-migrations/015_external_ids_promotion.sql','utf8').split('\$\$').length%2===1||process.exit(1)"`
Expected: exit 0 (balanced `$$` at minimum). If `pgsql-parser-cli` isn't installable offline, the balanced-`$$` check is enough — the lead will apply on a branch first.

- [ ] **Step 3: Commit**

`git add supabase/bustan-migrations/015_external_ids_promotion.sql && git commit -m "feat(db): 015 external ids, footprint cols, promote_scan_candidate RPC, requeue low-confidence PV checks"`

---

### Task 2: Ingest the Aug-2026 island scan into `scan_candidates`

**Files:**
- Create: `E/scripts/lib/kp-ingest-core.mjs` (pure: parse + transform + match)
- Create: `E/scripts/lib/kp-ingest-core.test.mjs`
- Create: `E/scripts/ingest-kp-scan.mjs` (I/O: reads I's JSON, talks PostgREST)

Inputs (from `I/roof-scanner/`): `buildings_data.js` (`const B=[…]`, keys `i la lo a u kw p s pr c n ph w poly …`), `footprint_quality_merged.json` (obj by OSM id → `{k, roof_pct, c, src}`), `solar_detected.json` (obj by OSM id → `{s, c, p, err?}`), `unmapped_roofs.json` (array `{lat, lon, area_m2, roof_m2, kwp, tile}`).

- [ ] **Step 1: Write the failing tests**

```js
// E/scripts/lib/kp-ingest-core.test.mjs
import { describe, it, expect } from 'vitest'
import { parseBuildingsJs, buildOsmRecords, buildUnmappedRecords, matchExisting } from './kp-ingest-core.mjs'

const b = { i: 479104039, la: 9.708598, lo: 99.990975, a: 994.4, u: 696.1, kw: 126.56, p: 270,
  s: 100, pr: 'A', c: 'hospitality', n: 'Treechart Hostel', ph: '', w: '',
  poly: [[99.99083, 9.708742], [99.99100, 9.708742], [99.99100, 9.708500], [99.99083, 9.708742]] }

describe('parseBuildingsJs', () => {
  it('extracts the array from a const B=[...] file', () => {
    expect(parseBuildingsJs('const B=[{"i":1,"la":9.7,"lo":100.0}];')).toEqual([{ i: 1, la: 9.7, lo: 100.0 }])
  })
})

describe('buildOsmRecords', () => {
  it('maps a plain roof with no overlays', () => {
    const [r] = buildOsmRecords([b], {}, {})
    expect(r).toMatchObject({
      external_source: 'osm', external_id: '479104039', kind: 'roof', name: 'Treechart Hostel',
      lat: 9.708598, lon: 99.990975, roof_area_sqm: 994.4, estimated_kwp: 126.56, estimated_kwp_raw: 126.56,
      priority: 'A', solar_potential_score: 100, category: 'hospitality',
      footprint_class: null, existing_solar: null,
    })
    expect(r.roof_geom).toEqual({ type: 'Polygon', coordinates: [b.poly] })
  })
  it('downgrades kWp only for adjudicated parcel/compound', () => {
    const fq = { '479104039': { k: 'parcel', roof_pct: 15, c: 0.7, src: 'adjudicated' } }
    const [r] = buildOsmRecords([b], fq, {})
    expect(r.footprint_class).toBe('parcel'); expect(r.roof_pct).toBe(15)
    expect(r.estimated_kwp).toBe(18.98); expect(r.estimated_kwp_raw).toBe(126.56)
    const [r2] = buildOsmRecords([b], { '479104039': { k: 'parcel', roof_pct: 15, c: 0.6, src: 'single-model' } }, {})
    expect(r2.estimated_kwp).toBe(126.56)
  })
  it('marks confident PV as existing_solar=true, uncertain as null', () => {
    const sd = { '479104039': { s: true, c: 0.9, p: 40 } }
    const [r] = buildOsmRecords([b], {}, sd)
    expect(r.existing_solar).toBe(true); expect(r.solar_check_confidence).toBe(0.9); expect(r.panel_coverage_pct).toBe(40)
    const [r2] = buildOsmRecords([b], {}, { '479104039': { s: true, c: 0.3, p: 5 } })
    expect(r2.existing_solar).toBeNull()
    const [r3] = buildOsmRecords([b], {}, { '479104039': { s: false, c: 1.0, p: 0 } })
    expect(r3.existing_solar).toBe(false)
  })
})

describe('buildUnmappedRecords', () => {
  it('derives a deterministic external id from the tile+coords', () => {
    const u = { lat: 9.703328, lon: 100.011004, w_m: 63.1, h_m: 70.1, area_m2: 4424, tile: [18, 203897, 123972], roof_m2: 3539, kwp: 541.5 }
    const [r] = buildUnmappedRecords([u])
    expect(r.external_source).toBe('esri-2026')
    expect(r.external_id).toBe('18-203897-123972-9.703328-100.011004')
    expect(r).toMatchObject({ lat: 9.703328, lon: 100.011004, roof_area_sqm: 3539, estimated_kwp: 541.5, status: 'pending', kind: 'roof', priority: 'A' })
    expect(buildUnmappedRecords([u])[0].external_id).toBe(r.external_id)
  })
})

describe('matchExisting', () => {
  const existing = [
    { id: 'u1', lat: 9.708600, lon: 99.990980, external_id: null },
    { id: 'u2', lat: 9.800000, lon: 99.900000, external_id: '999', external_source: 'osm' },
  ]
  it('matches by external id first, then by ~28 m proximity', () => {
    expect(matchExisting({ external_source: 'osm', external_id: '999', lat: 0, lon: 0 }, existing)?.id).toBe('u2')
    expect(matchExisting({ external_source: 'osm', external_id: '1', lat: 9.708598, lon: 99.990975 }, existing)?.id).toBe('u1')
    expect(matchExisting({ external_source: 'osm', external_id: '1', lat: 9.75, lon: 99.95 }, existing)).toBeNull()
  })
})
```

- [ ] **Step 2: Run → fails** — `npx vitest run scripts/lib/kp-ingest-core.test.mjs` → "Failed to resolve import".

- [ ] **Step 3: Implement the core**

```js
// E/scripts/lib/kp-ingest-core.mjs
// Pure transforms for the Aug-2026 Ko Phangan island scan → bustan.scan_candidates rows.
export const DEDUP_DEG = 0.00025 // ~28 m, same as api/cron-process-scans.ts

export function parseBuildingsJs(src) {
  const start = src.indexOf('['); const end = src.lastIndexOf(']')
  return JSON.parse(src.slice(start, end + 1))
}

function priorityFromKwp(kwp) { return kwp >= 100 ? 'A' : kwp >= 30 ? 'B' : kwp >= 10 ? 'C' : 'D' }

export function buildOsmRecords(buildings, footprintQuality, solarDetected) {
  return buildings.map(b => {
    const id = String(b.i)
    const fq = footprintQuality[id]; const sd = solarDetected[id]
    const adjudicatedDowngrade = fq && fq.src === 'adjudicated' && (fq.k === 'parcel' || fq.k === 'compound')
    const kwp = adjudicatedDowngrade ? Math.round(b.kw * fq.roof_pct) / 100 : b.kw
    let existing_solar = null, solar_check_confidence = null, panel_coverage_pct = null, solar_checked_at = null
    if (sd && !sd.err) {
      solar_check_confidence = sd.c; panel_coverage_pct = sd.p ?? null; solar_checked_at = new Date().toISOString()
      if (sd.s === true && sd.c >= 0.5) existing_solar = true
      else if (sd.s === false && sd.c >= 0.5) existing_solar = false
    }
    return {
      external_source: 'osm', external_id: id, kind: 'roof', status: 'pending',
      name: b.n || null, category: b.c || null, phone: b.ph || null, website: b.w || null,
      lat: b.la, lon: b.lo, roof_area_sqm: b.a,
      roof_geom: Array.isArray(b.poly) && b.poly.length >= 4 ? { type: 'Polygon', coordinates: [b.poly] } : null,
      estimated_kwp: kwp, estimated_kwp_raw: b.kw,
      priority: adjudicatedDowngrade ? priorityFromKwp(kwp) : (b.pr || priorityFromKwp(kwp)),
      solar_potential_score: b.s ?? null,
      footprint_class: fq?.k ?? null, roof_pct: fq?.roof_pct ?? null, footprint_confidence: fq?.c ?? null,
      existing_solar, solar_check_confidence, panel_coverage_pct, solar_checked_at,
    }
  })
}

export function buildUnmappedRecords(unmapped) {
  return unmapped.map(u => ({
    external_source: 'esri-2026',
    external_id: `${u.tile.join('-')}-${u.lat}-${u.lon}`,
    kind: 'roof', status: 'pending', name: null,
    lat: u.lat, lon: u.lon, roof_area_sqm: u.roof_m2, estimated_kwp: u.kwp, estimated_kwp_raw: u.kwp,
    priority: priorityFromKwp(u.kwp), roof_geom: null, footprint_class: null,
  }))
}

export function matchExisting(rec, existing) {
  const byId = existing.find(e => e.external_id && e.external_id === rec.external_id && e.external_source === rec.external_source)
  if (byId) return byId
  return existing.find(e => e.lat != null && e.lon != null &&
    Math.abs(e.lat - rec.lat) < DEDUP_DEG && Math.abs(e.lon - rec.lon) < DEDUP_DEG) ?? null
}
```

- [ ] **Step 4: Run → passes** — `npx vitest run scripts/lib/kp-ingest-core.test.mjs` → 6 passed. (If vitest's default include misses `scripts/**/*.test.mjs`, add `include: ['src/**/*.test.ts','tests/**/*.test.ts','scripts/**/*.test.mjs']` to `vitest.config.ts` `test`.)

- [ ] **Step 5: Write the CLI**

```js
// E/scripts/ingest-kp-scan.mjs
// Usage: BUSTAN_SUPABASE_SERVICE_ROLE_KEY=... node scripts/ingest-kp-scan.mjs [--index ../bustan-index] [--dry-run]
// Idempotent: upserts on (external_source, external_id); legacy rows without external_id are matched by ~28 m.
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
console.log(`existing KP candidates in DB: ${existing.length}`)

let matched = 0, inserted = 0, skipped = 0
const inserts = []; const updates = []
for (const r of records) {
  const m = matchExisting(r, existing)
  if (m) { matched++; if (m.status === 'pending') updates.push({ id: m.id, ...r, status: undefined }); else skipped++ }
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
  const { id, ...body } = u; delete body.status
  const r = await fetch(`${URL_}/rest/v1/scan_candidates?id=eq.${id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(body) })
  if (!r.ok) { console.error('patch failed', id, r.status, await r.text()); process.exit(1) }
  if (++updated % 200 === 0) console.log(`updated ${updated}/${updates.length}`)
}
console.log(`done: inserted=${inserted} updated=${updated}`)
```

- [ ] **Step 6: Dry-run locally** — `node scripts/ingest-kp-scan.mjs --dry-run` → prints `records: osm=2467 unmapped=1441 total=3908` and `insert=3908` (no DB in dry mode). Fix any parse error.

- [ ] **Step 7: Commit** — `git add scripts/lib/kp-ingest-core.mjs scripts/lib/kp-ingest-core.test.mjs scripts/ingest-kp-scan.mjs vitest.config.ts && git commit -m "feat(scan): idempotent ingest of Aug-2026 KP island scan (OSM + unmapped roofs) with tests"`

---

### Task 3: PV detection — shared tile library, z18 3×3, outlined footprint

**Files:**
- Create: `E/api/_lib/aerial-tiles.ts`, `E/api/_lib/aerial-tiles.test.ts`
- Modify: `E/api/cron-detect-solar.ts` (remove local `fetchTile/fetchAerialAtZoom/fetchAerialBase64`, `TILE_ZOOM*`, `MIN_TILE_BYTES`, `ESRI_TILE`; switch runtime to Node; new prompt)
- Modify: `E/package.json` (add `sharp`)
- Modify: `E/vercel.json` if `cron-detect-solar` has a function config block that needs `maxDuration: 60` (check `functions` key; follow the `cron-enrich-contacts` pattern)

- [ ] **Step 1: Failing tests for the pure parts**

```ts
// E/api/_lib/aerial-tiles.test.ts
import { describe, it, expect } from 'vitest'
import { lonLatToTile, tileBlockFor, polygonToSvgPath, cropBoxForMetres } from './aerial-tiles.js'

describe('lonLatToTile', () => {
  it('matches the python slippy math at z18 for Ko Phangan', () => {
    // from unmapped_roofs.json: lat 9.703328 lon 100.011004 → tile [18, 203897, 123972]
    expect(lonLatToTile(100.011004, 9.703328, 18)).toEqual({ x: 203897, y: 123972, xf: expect.any(Number), yf: expect.any(Number) })
  })
})
describe('tileBlockFor', () => {
  it('returns a 3x3 block centred on the containing tile', () => {
    const b = tileBlockFor(100.011004, 9.703328, 18)
    expect(b.tiles).toHaveLength(9)
    expect(b.tiles[4]).toEqual({ x: 203897, y: 123972 })
    expect(b.originX).toBe(203896); expect(b.originY).toBe(123971)
  })
})
describe('polygonToSvgPath', () => {
  it('projects lon/lat ring into block pixel space', () => {
    const b = tileBlockFor(100.011004, 9.703328, 18)
    const ring = [[100.011004, 9.703328], [100.0112, 9.703328], [100.0112, 9.7031], [100.011004, 9.703328]]
    const d = polygonToSvgPath(ring, b)
    expect(d.startsWith('M')).toBe(true); expect(d.endsWith('Z')).toBe(true)
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(0); expect(Math.max(...nums)).toBeLessThanOrEqual(768)
  })
})
describe('cropBoxForMetres', () => {
  it('120 m at z18 lat 9.7 is ~204 px wide, clamped inside the 768 canvas', () => {
    const b = tileBlockFor(100.011004, 9.703328, 18)
    const box = cropBoxForMetres(100.011004, 9.703328, 120, b)
    expect(box.width).toBeGreaterThan(190); expect(box.width).toBeLessThan(220)
    expect(box.left).toBeGreaterThanOrEqual(0); expect(box.left + box.width).toBeLessThanOrEqual(768)
  })
})
```

- [ ] **Step 2: Run → fails** (`npx vitest run api/_lib/aerial-tiles.test.ts`).

- [ ] **Step 3: Implement the library** (`npm i sharp@^0.33` first)

```ts
// E/api/_lib/aerial-tiles.ts
// Esri World Imagery tile fetch + 3x3 stitch + footprint outline + metre crop.
// Ported from bustan-index/scripts/detect_solar_kp.py (verified on Ko Phangan, Aug 2026):
//   z19 returns a ~2.5 KB "no data" placeholder over the island; z18 is real (~13 KB).
//   Outlining the target footprint stops neighbours' panels from being attributed to it.
import sharp from 'sharp'

export const TILE_ZOOM = 18
export const MIN_TILE_BYTES = 4000
export const TILE_PX = 256
export const BLOCK_PX = TILE_PX * 3
export const ESRI_TILE = (z: number, y: number, x: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`

export function lonLatToTile(lon: number, lat: number, z: number) {
  const n = 2 ** z
  const xf = ((lon + 180) / 360) * n
  const latR = (lat * Math.PI) / 180
  const yf = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n
  return { x: Math.floor(xf), y: Math.floor(yf), xf, yf }
}

export interface TileBlock { z: number; originX: number; originY: number; tiles: { x: number; y: number }[] }

export function tileBlockFor(lon: number, lat: number, z = TILE_ZOOM): TileBlock {
  const { x, y } = lonLatToTile(lon, lat, z)
  const tiles: { x: number; y: number }[] = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tiles.push({ x: x + dx, y: y + dy })
  return { z, originX: x - 1, originY: y - 1, tiles }
}

export function lonLatToBlockPx(lon: number, lat: number, b: TileBlock) {
  const { xf, yf } = lonLatToTile(lon, lat, b.z)
  return { px: (xf - b.originX) * TILE_PX, py: (yf - b.originY) * TILE_PX }
}

export function polygonToSvgPath(ring: number[][], b: TileBlock): string {
  const pts = ring.map(([lon, lat]) => {
    const { px, py } = lonLatToBlockPx(lon, lat, b)
    return `${Math.max(0, Math.min(BLOCK_PX, px)).toFixed(1)} ${Math.max(0, Math.min(BLOCK_PX, py)).toFixed(1)}`
  })
  return `M${pts.join(' L')} Z`
}

export function metresPerPixel(lat: number, z: number) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z
}

export function cropBoxForMetres(lon: number, lat: number, metres: number, b: TileBlock) {
  const { px, py } = lonLatToBlockPx(lon, lat, b)
  const half = metres / metresPerPixel(lat, b.z) / 2
  const left = Math.round(Math.max(0, Math.min(BLOCK_PX - 2 * half, px - half)))
  const top = Math.round(Math.max(0, Math.min(BLOCK_PX - 2 * half, py - half)))
  const size = Math.round(Math.min(2 * half, BLOCK_PX))
  return { left, top, width: size, height: size }
}

export async function fetchTile(z: number, y: number, x: number, timeoutMs = 10_000): Promise<Buffer> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(ESRI_TILE(z, y, x), { signal: ctl.signal })
    if (!r.ok) throw new Error(`esri_${r.status}`)
    if (!(r.headers.get('content-type') || '').startsWith('image/')) throw new Error('esri_not_image')
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.byteLength < MIN_TILE_BYTES) throw new Error(`esri_tile_placeholder_${buf.byteLength}b`)
    return buf
  } finally { clearTimeout(t) }
}

/** 3x3 block, target footprint outlined in magenta, cropped to `cropMetres` around (lon,lat), 640px JPEG → base64. */
export async function buildOutlinedCrop(opts: { lon: number; lat: number; ring?: number[][] | null; cropMetres?: number; z?: number }) {
  const z = opts.z ?? TILE_ZOOM
  const b = tileBlockFor(opts.lon, opts.lat, z)
  const tiles = await Promise.all(b.tiles.map(t => fetchTile(z, t.y, t.x)))
  const composites = tiles.map((input, i) => ({ input, left: (i % 3) * TILE_PX, top: Math.floor(i / 3) * TILE_PX }))
  if (opts.ring && opts.ring.length >= 4) {
    const svg = `<svg width="${BLOCK_PX}" height="${BLOCK_PX}" xmlns="http://www.w3.org/2000/svg"><path d="${polygonToSvgPath(opts.ring, b)}" fill="none" stroke="#ff00ff" stroke-width="3"/></svg>`
    composites.push({ input: Buffer.from(svg), left: 0, top: 0 })
  }
  const box = cropBoxForMetres(opts.lon, opts.lat, opts.cropMetres ?? 120, b)
  const jpeg = await sharp({ create: { width: BLOCK_PX, height: BLOCK_PX, channels: 3, background: '#000' } })
    .composite(composites).extract(box).resize(640, 640).jpeg({ quality: 85 }).toBuffer()
  return { base64: jpeg.toString('base64'), mime: 'image/jpeg', zoom: z, outlined: Boolean(opts.ring && opts.ring.length >= 4) }
}
```

- [ ] **Step 4: Run → passes** (`npx vitest run api/_lib/aerial-tiles.test.ts` → 4 passed). If the `lonLatToTile` expectation is off by one, verify against the Python (`I/scripts/detect_solar_kp.py` slippy function) — the test value comes from real data, the implementation must match it.

- [ ] **Step 5: Rewire `cron-detect-solar.ts`**

Edits (line numbers from `/tmp/sp2-facts.md` §3; re-locate by content):
1. `export const config = { runtime: 'edge' }` → `export const config = { maxDuration: 60 }` (Node). Remove `bufToB64`, `fetchTile`, `fetchAerialAtZoom`, `fetchAerialBase64`, `TILE_ZOOM`, `TILE_ZOOM_FALLBACK`, `MIN_TILE_BYTES`, `ESRI_TILE`.
2. `import { buildOutlinedCrop } from './_lib/aerial-tiles.js'`.
3. In the per-row path (`handleOne`), replace the aerial fetch with:
```ts
const ring = Array.isArray(row.roof_geom?.coordinates?.[0]) ? row.roof_geom.coordinates[0] as number[][] : null
const img = await buildOutlinedCrop({ lon: Number(row.lon), lat: Number(row.lat), ring })
```
   and pass `img.base64` / `img.mime` to the Gemini call. Slot A's select already includes `roof_geom`; add `roof_geom` to Slot B's `properties` select.
4. Replace the prompt text with the Python one (`I/scripts/detect_solar_kp.py:97-111`) — copy it verbatim, keeping the JSON contract `{"has_existing_solar": boolean, "confidence": 0-1, "panel_coverage_pct": 0-100}`. When `img.outlined` is false (no polygon), append one sentence: `"No outline is drawn; judge the building at the exact centre of the image only."`
5. Persist `panel_coverage_pct` on `scan_candidates` (column added in 015): extend the patch `{ existing_solar: r.has_existing_solar, panel_coverage_pct: r.panel_coverage_pct ?? null }` for `scan_candidates` only (properties has no such column).
6. `CONCURRENCY = 5` → `3` (Python found 8 workers → 429 storms; 3 is the verified safe value with the shared key).

- [ ] **Step 6: Typecheck + tests** — `npm run typecheck && npm test` → clean. Check `vercel.json` `functions` block: if other Node crons declare `maxDuration`, mirror for `api/cron-detect-solar.ts`.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "fix(pv): detect-solar uses z18 3x3 stitch with outlined footprint via shared aerial-tiles lib (Node+sharp)"`

---

### Task 4: Proposal prefill from a candidate (and fix the KP Solar Pro CTA)

**Files:**
- Modify: `E/src/lib/bustan-crm-service.ts` — add `fetchScanCandidateById(id)` and `fetchScanCandidateByExternalId(source, id)`
- Modify: `E/src/pages/admin/NewProposalPage.tsx` — new hydration effect next to the `property_id` one (`:325-405`), scalar fallbacks in the block at `:302-322`
- Modify: `I/kp-solar-pro.html:929` CTA + `:934` `annual_savings` bug
- Test: `E/src/lib/candidate-prefill.test.ts` + Create `E/src/lib/candidate-prefill.ts` (pure mapper)

- [ ] **Step 1: Failing test for the pure mapper**

```ts
// E/src/lib/candidate-prefill.test.ts
import { describe, it, expect } from 'vitest'
import { candidateToFormPatch } from './candidate-prefill'

const c = { id: 'u1', name: 'Treechart Hostel', phone: '0946692011', website: null, lat: 9.708598, lon: 99.990975,
  roof_area_sqm: 994.4, estimated_kwp: 126.56, roof_geom: { type: 'Polygon', coordinates: [[[99.99, 9.70], [99.991, 9.70], [99.991, 9.701], [99.99, 9.70]]] } }

describe('candidateToFormPatch', () => {
  it('maps kWp to panel_count at 580 W and carries roof + contact fields', () => {
    const p = candidateToFormPatch(c as never, 580)
    expect(p.panel_count).toBe(218)             // round(126.56*1000/580)
    expect(p.client_name).toBe('Treechart Hostel'); expect(p.client_phone).toBe('0946692011')
    expect(p.roof_lat).toBe(9.708598); expect(p.roof_lng).toBe(99.990975); expect(p.roof_area_sqm).toBe(994.4)
    expect(p.roof_polygon).toEqual(c.roof_geom)
    expect(p.location_preset).toBe('koh_phangan')
  })
  it('falls back to polygon centroid when lat/lon are 0', () => {
    const p = candidateToFormPatch({ ...c, lat: 0, lon: 0 } as never, 580)
    expect(p.roof_lat).toBeCloseTo(9.7003, 3); expect(p.roof_lng).toBeCloseTo(99.9907, 3)
  })
})
```

- [ ] **Step 2: Run → fails.**

- [ ] **Step 3: Implement mapper + fetchers**

```ts
// E/src/lib/candidate-prefill.ts
import type { ScanCandidate } from './bustan-crm-service'
import type { NewProposalForm } from '../hooks/useNewProposalForm'

export function polygonCentroidLonLat(geom: { coordinates: number[][][] } | null | undefined): [number, number] | null {
  const ring = geom?.coordinates?.[0]; if (!ring || ring.length < 3) return null
  const n = ring.length - (ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? 1 : 0)
  let x = 0, y = 0; for (let i = 0; i < n; i++) { x += ring[i][0]; y += ring[i][1] }
  return [x / n, y / n]
}

export function candidateToFormPatch(c: ScanCandidate & { phone?: string | null; website?: string | null }, panelWatt: number): Partial<NewProposalForm> {
  const centroid = polygonCentroidLonLat(c.roof_geom as never)
  const lat = c.lat && c.lat !== 0 ? Number(c.lat) : centroid?.[1] ?? null
  const lng = c.lon && c.lon !== 0 ? Number(c.lon) : centroid?.[0] ?? null
  const kwp = c.estimated_kwp != null ? Number(c.estimated_kwp) : null
  return {
    client_name: c.name ?? '', client_phone: c.phone ?? '', client_email: '',
    location_preset: 'koh_phangan',
    ...(kwp != null ? { panel_count: Math.round((kwp * 1000) / panelWatt) } : {}),
    roof_polygon: (c.roof_geom as never) ?? null, roof_lat: lat, roof_lng: lng,
    roof_area_sqm: c.roof_area_sqm != null ? Number(c.roof_area_sqm) : null,
  }
}
```

In `bustan-crm-service.ts` (next to `fetchScanCandidates`):
```ts
export async function fetchScanCandidateById(id: string): Promise<ScanCandidate | null> {
  const { data, error } = await bustanClient.from('scan_candidates').select('*').eq('id', id).maybeSingle()
  if (error) throw error; return (data as ScanCandidate) ?? null
}
export async function fetchScanCandidateByExternalId(source: string, externalId: string): Promise<ScanCandidate | null> {
  const { data, error } = await bustanClient.from('scan_candidates').select('*')
    .eq('external_source', source).eq('external_id', externalId).maybeSingle()
  if (error) throw error; return (data as ScanCandidate) ?? null
}
```
(Use whatever the file names its bustan Supabase client — check the top of the file.) Extend the `ScanCandidate` interface (`:394-422`) with the 015 columns: `external_source?, external_id?, footprint_class?, roof_pct?, panel_coverage_pct?, estimated_kwp_raw?, category?, phone?, website?`.

- [ ] **Step 4: Wire into `NewProposalPage.tsx`**

1. `:145` — extend `isHydratedFromSource` with `|| Boolean(searchParams.get('candidate_id')) || Boolean(searchParams.get('external_id'))`.
2. Add an effect after the `property_id` effect (same `autoTriggeredRef` conventions):
```tsx
useEffect(() => {
  const cid = searchParams.get('candidate_id'); const ext = searchParams.get('external_id')
  if (!cid && !ext) return
  let cancelled = false
  ;(async () => {
    try {
      const c = cid ? await fetchScanCandidateById(cid)
        : await fetchScanCandidateByExternalId(ext!.includes(':') ? ext!.split(':')[0] : 'osm', ext!.includes(':') ? ext!.split(':')[1] : ext!)
      if (!c) { console.warn('[prefill] candidate not found', cid ?? ext); return }
      if (cancelled) return
      const patch = candidateToFormPatch(c, form.panel_watt)
      replaceForm({ ...form, ...patch })
    } catch (e) { console.warn('[prefill] candidate hydration failed', e) }
  })()
  return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams])
```
3. Scalar fallbacks in the block at `:302-322` — add: `kwp` → `panel_count = round(kwp*1000/form.panel_watt)`, `area` → `roof_area_sqm`, `lat`/`lng` → `roof_lat`/`roof_lng`, `name` → `client_name`. These run only when no `candidate_id`/`external_id`/`property_id`/`lead_id` is present.

- [ ] **Step 5: Fix the static tool CTA** (`I/kp-solar-pro.html`)

`:929`:
```js
const proposalUrl = `https://bustan-energy.com/admin/proposals/new?external_id=osm:${b.i}&name=${encodeURIComponent(b.n||'')}&kwp=${b.kw}&area=${b.a}&lat=${b.la}&lng=${b.lo}`;
```
`:934`: replace `b.annual_savings` with `b.sav`.

- [ ] **Step 6: Typecheck + tests + manual check** — `npm run typecheck && npm test`; `npm run dev` and open `/admin/proposals/new?kwp=126.56&area=994&lat=9.708598&lng=99.990975&name=Test` → panel_count 218, roof coords set (scalar path works without DB).

- [ ] **Step 7: Commit both repos** — E: `feat(proposal): prefill from scan candidate (candidate_id / external_id) + scalar fallbacks`; I: `fix(kp-solar-pro): proposal CTA passes external_id + readable params; fix NaN savings in WhatsApp text`.

---

### Task 5: One-call promotion with dedup

**Files:**
- Modify: `E/src/lib/bustan-crm-service.ts` — add `promoteScanCandidate(id)`; keep `confirmDetectedRoof`/`setScanCandidateStatus` exported (other callers) but unused by the three sites below
- Modify: `E/src/components/Candidates/CandidateReviewPanel.tsx:476` (single) & `:532` (bulk), `E/src/components/Sidebar/CandidateSidebarSection.tsx:80`, `E/src/components/Map/SolarMap.tsx:282`
- Test: `E/src/lib/bustan-crm-service.test.ts` (extend with a mocked-RPC case, following the file's existing mocking pattern)

- [ ] **Step 1: Test**

```ts
// append to E/src/lib/bustan-crm-service.test.ts (adapt to the file's existing client mock helper)
describe('promoteScanCandidate', () => {
  it('returns the RPC result and surfaces duplicates without throwing', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ok: false, reason: 'duplicate', property_id: 'p9' }, error: null })
    const res = await promoteScanCandidate('u1', { rpc } as never)
    expect(rpc).toHaveBeenCalledWith('promote_scan_candidate', { p_id: 'u1' })
    expect(res).toEqual({ ok: false, reason: 'duplicate', property_id: 'p9' })
  })
})
```

- [ ] **Step 2: Run → fails.**

- [ ] **Step 3: Implement**

```ts
export type PromoteResult = { ok: true; property_id: string; already?: boolean } | { ok: false; reason: 'duplicate'; property_id: string }
export async function promoteScanCandidate(id: string, client: { rpc: typeof bustanClient.rpc } = bustanClient): Promise<PromoteResult> {
  const { data, error } = await client.rpc('promote_scan_candidate', { p_id: id })
  if (error) throw error
  return data as PromoteResult
}
```

- [ ] **Step 4: Replace the call sites.** Each site currently does `setScanCandidateStatus(id,'added')` then `confirmDetectedRoof(...)`. Replace both with `const r = await promoteScanCandidate(id)`; on `r.ok === false` show the existing toast/notice mechanism with text `Already in CRM (property ${r.property_id.slice(0,8)}…)` and mark the candidate row as added in local state anyway (it is a dup, not a failure). Bulk: `Promise.allSettled`, summarise `added / duplicates / failed`.

- [ ] **Step 5: `npm run typecheck && npm test` → clean. Commit** — `feat(crm): atomic deduped candidate promotion via promote_scan_candidate RPC`.

---

### Task 6: One pricing source

**Files:**
- Modify: `E/src/lib/solar-financials.ts:1-19`
- Test: `E/tests/solar-financial.test.ts` (extend)

- [ ] **Step 1: Test**

```ts
// append to E/tests/solar-financial.test.ts
import bom from '../tools/proposal-builder/bom-templates.json'
import { TM_SOLAR_ASSUMPTIONS } from '../src/lib/solar-financials'
describe('TM_SOLAR_ASSUMPTIONS is derived from bom-templates.json', () => {
  it('matches locations.koh_phangan', () => {
    const k = bom.locations.koh_phangan
    expect(TM_SOLAR_ASSUMPTIONS.pshAnnual).toBe(k.psh_annual)
    expect(TM_SOLAR_ASSUMPTIONS.performanceRatio).toBe(k.performance_ratio)
    expect(TM_SOLAR_ASSUMPTIONS.soilingFactor).toBe(k.soiling_factor)
    expect(TM_SOLAR_ASSUMPTIONS.retailRateThb).toBe(k.tariff_retail_thb)
    expect(TM_SOLAR_ASSUMPTIONS.exportRateThb).toBe(k.tariff_export_thb)
    expect(TM_SOLAR_ASSUMPTIONS.selfConsumptionGridTied).toBe(k.self_consumption_pct_grid_tied)
    expect(TM_SOLAR_ASSUMPTIONS.selfConsumptionWithBattery).toBe(k.self_consumption_pct_with_battery)
    expect(TM_SOLAR_ASSUMPTIONS.co2KgPerKwh).toBe(k.co2_kg_per_kwh)
    expect(TM_SOLAR_ASSUMPTIONS.discountRate).toBe(k.discount_rate)
    expect(TM_SOLAR_ASSUMPTIONS.tariffEscalation).toBe(k.tariff_escalation)
  })
})
```

- [ ] **Step 2: Implement** — in `solar-financials.ts`:
```ts
import bom from '../../tools/proposal-builder/bom-templates.json'
const K = bom.locations.koh_phangan
export const SOLAR_FINANCIAL_VERSION = 'bustan-financials-2026-09-v1.3'
export const TM_SOLAR_ASSUMPTIONS = {
  locationId: 'koh_phangan',
  pshAnnual: K.psh_annual, performanceRatio: K.performance_ratio, soilingFactor: K.soiling_factor,
  retailRateThb: K.tariff_retail_thb, exportRateThb: K.tariff_export_thb,
  selfConsumptionGridTied: K.self_consumption_pct_grid_tied, selfConsumptionWithBattery: K.self_consumption_pct_with_battery,
  discountRate: K.discount_rate, tariffEscalation: K.tariff_escalation,
  annualDegradation: 0.005, firstYearLid: 0.02, omCostPct: 0.01, systemLifeYears: 25, co2KgPerKwh: K.co2_kg_per_kwh,
} as const
```
The `as const` numbers now come from JSON (type `number`) — if any consumer relied on literal types, widen it. `tsconfig.app.json` must have `resolveJsonModule: true` (api already imports this JSON in `api/admin-bom.ts`).

- [ ] **Step 3: `npm run typecheck && npm test` → all green (existing financial expectations unchanged since values are identical). Commit** — `refactor(pricing): derive TM_SOLAR_ASSUMPTIONS from bom-templates.json (single source)`.

---

### Task 7: Batch enrich + WhatsApp from the lead card

**Files:**
- Create: `E/api/admin-enrich-batch.ts`, `E/api/admin-send-whatsapp.ts`
- Create: `E/api/_lib/whatsapp-safe.ts` + `E/api/_lib/whatsapp-safe.test.ts`
- Modify: the lead detail component used by `/crm` (find via `grep -rl "owner_decision\|LeadDetail" src/components src/pages | grep -v test`) — add two buttons; and the CRM leads table toolbar (`BustanLeadsTable.tsx`) — add "Enrich unenriched (N)".

- [ ] **Step 1: Test the safe-mode resolver**

```ts
// E/api/_lib/whatsapp-safe.test.ts
import { describe, it, expect } from 'vitest'
import { resolveWhatsAppTarget } from './whatsapp-safe.js'
describe('resolveWhatsAppTarget', () => {
  it('redirects to the test number with a prefix when SELF_SEND=1', () => {
    const r = resolveWhatsAppTarget('0946692011', 'Hello', { OUTREACH_SELF_SEND: '1', OUTREACH_TEST_WHATSAPP: '972502213948' })
    expect(r).toEqual({ phone: '972502213948', message: '[TEST→66946692011] Hello', test: true })
  })
  it('sends to the real number when SELF_SEND=0', () => {
    expect(resolveWhatsAppTarget('0946692011', 'Hi', { OUTREACH_SELF_SEND: '0' })).toEqual({ phone: '66946692011', message: 'Hi', test: false })
  })
  it('returns null for an invalid phone', () => {
    expect(resolveWhatsAppTarget('12', 'Hi', {})).toBeNull()
  })
})
```

- [ ] **Step 2: Run → fails. Implement:**

```ts
// E/api/_lib/whatsapp-safe.ts
import { normalizePhone } from './whatsapp.js'
export function resolveWhatsAppTarget(rawPhone: string, message: string, env: Record<string, string | undefined> = process.env) {
  const phone = normalizePhone(rawPhone); if (!phone) return null
  const test = env.OUTREACH_SELF_SEND === '1'
  if (test) return { phone: env.OUTREACH_TEST_WHATSAPP || '972502213948', message: `[TEST→${phone}] ${message}`, test: true }
  return { phone, message, test: false }
}
```

- [ ] **Step 3: `admin-send-whatsapp.ts`** (Node runtime; auth exactly like `admin-create-proposal.ts` — Bearer user token → `isAllowedAdmin(email)`):
- Body `{ propertyId: string, message: string, language?: 'th'|'en' }`.
- Look up phone: `owner_decision.data->>'phone'` for `propertyId` via `bGet`; 400 `no_phone` if absent.
- `resolveWhatsAppTarget` → 400 `invalid_phone` if null.
- `sendWhatsApp(target.phone, target.message)`; on `ok` insert into `bustan.outreach_messages` `{property_id, channel:'whatsapp', language: language ?? 'en', recipient: target.phone, body: message, status:'sent', sent_at: now, thread_ref: idMessage, facts: {test: target.test}}` via `bPost`; on failure insert with `status:'bounced', error`. The unique index `(property_id, channel)` may conflict on a second send — catch 409 and PATCH the existing row's `body/sent_at/thread_ref/status` instead.
- Respond `{ ok, test, idMessage?, error? }`.

- [ ] **Step 4: `admin-enrich-batch.ts`** (Node, `maxDuration: 60`, same admin auth): body `{ limit?: number }` (default 4, max 8). Reuse the exact queue selection from `cron-enrich-contacts.ts:84-142` — extract that block into an exported function `selectUnenrichedProperties(limit)` in `E/api/_lib/enrich-queue.ts` and import it from both the cron and this endpoint (no copy-paste). Run the same per-property core (`find-contact-core.ts`), return `{ processed, deferred, remaining }` where `remaining` = count of unenriched after this pass (compute cheaply: total properties minus stamped `owner_decision` rows).

- [ ] **Step 5: UI**
- Lead card: buttons **"Find contact"** (POST `/api/admin-find-contact` with `{propertyId}` — endpoint exists) and **"WhatsApp"** (textarea prefilled with a 2-line Thai/English intro template using the lead's `estimated_kwp`; POST `/api/admin-send-whatsapp`). Show `TEST MODE → goes to Kaniel` badge when the response has `test:true`.
- Leads table toolbar: **"Enrich unenriched (N)"** → loops POST `/api/admin-enrich-batch` until `remaining === 0` or user stops; progress text `processed X · remaining Y`.

- [ ] **Step 6: `npm run typecheck && npm run lint && npm test` → clean. Commit** — `feat(crm): batch enrich endpoint + WhatsApp send from lead card (SELF_SEND-safe, logged to outreach_messages)`.

---

### Task 8: Apply, ingest, deploy, verify (team lead + implementer)

- [ ] **Step 1 (lead):** apply `015_external_ids_promotion.sql` on `ygoiaabz` via Supabase MCP `apply_migration`; verify: `select count(*) from bustan.scan_candidates where solar_checked_at is null` (should have grown by the requeue) and `\df bustan.promote_scan_candidate`.
- [ ] **Step 2 (implementer):** `BUSTAN_SUPABASE_SERVICE_ROLE_KEY=$BUSTAN_DB_SERVICE_ROLE_KEY node scripts/ingest-kp-scan.mjs --dry-run` → report match/insert counts; then run without `--dry-run`; then re-run `--dry-run` and confirm `insert=0` (idempotency proof).
- [ ] **Step 3:** Vercel env: `OUTREACH_TEST_WHATSAPP=972502213948` (lead adds via dashboard/MCP), `GREENAPI_*` confirmed present.
- [ ] **Step 4:** `git push -u origin sp2/deal-engine`, open PR to `main`, wait for preview; on the preview: `/admin/proposals/new?external_id=osm:479104039` → prefilled "Treechart Hostel", panel_count 218, roof polygon drawn. Approve one candidate from `/admin` map → toast ok → visible in `/crm` pipeline at stage `new`; approve a second candidate 10 m away → duplicate notice.
- [ ] **Step 5:** Trigger `GET /api/cron-detect-solar` with `Authorization: Bearer $CRON_SECRET` on preview once; check logs: no `esri_tile_placeholder` at z18, confidence values written, ≥1 `panel_coverage_pct` set.
- [ ] **Step 6:** Merge PR → production; re-run Step 4 checks on prod; WhatsApp button once → message arrives at 972502213948 with `[TEST→…]` prefix.
- [ ] **Step 7:** Report (≤25 lines): commits, test counts before/after, ingest counts, verification results, anything pending.
