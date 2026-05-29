# Map + Roof-Detection Upgrade — Handoff Prompt

> **North-star:** the platform must end up able to **scan any area in Thailand on demand** — you point
> it at a region / draw an area / give an address, and it detects roofs & buildings, scores solar
> potential, enriches owners, and creates leads that show up in the CRM. The 85 seeded Ko Phangan leads
> are just the seed; the goal is a repeatable, nationwide scanning engine.

Paste the block below into a new Claude Code session opened in the **solar-intelligence** repo
(`~/Desktop/projects/solar/tm-energy/solar-intelligence`, live at `bustan-energy.com/platform`).

---

## PROMPT (copy from here)

You are upgrading the **map + roof detection/marking** of the Bustan Solar Intelligence `/platform`
SPA. `/platform` is the live system the team works from — **never break it**. Build incrementally,
commit + verify per step, deploy to production only via PR → merge → Vercel (as we did for the CRM).

### 0. Understand the current map first
- **`src/components/Map/SolarMap.tsx`** (~508 lines) — MapLibre GL v5 (`maplibre-gl@^5`), raster
  **satellite** tiles (Mapbox via `VITE_MAPBOX_TOKEN`, with a fallback source), GeoJSON grid-feature
  circles, popups, layers/sources. **No clustering, no draw/measure, no roof-polygon overlay yet.**
- Data: leads load from the `bustan` schema via **`src/lib/bustan-crm-service.ts`** →
  `mapLeadToProperty()` (each `Property` has `lat/lng`, `area` = roof m², `solarScore`, `priority`,
  `capacityKwp`). Store: `src/lib/store.ts`. Selecting a property opens `BustanLeadEditor`.
- Roof detection (offline, Python): `scripts/roof_detector.py`, `scripts/scan_all_roofs.py`,
  `scripts/download_osm_buildings.py` + `osm_*_buildings.json`. These produce roof candidates but are
  **not surfaced on the live map**.
- bustan schema: `properties(lat, lon, roof_area_sqm, solar_potential_score, map_x/y)`. There is **no
  roof-geometry (polygon) column yet** — adding one is part of this work.

### 1. Deliver a phased plan first (get approval before building)
Audit the map, then propose a prioritized plan covering the backlog below. Implement in phases, each
with a commit + verification, behind the existing auth (RLS-gated bustan data).

### 2. Map UX backlog
1. **Marker clustering** — cluster 85→505+ pins by zoom (MapLibre `cluster: true` on a GeoJSON source);
   un-cluster on zoom; cluster count badges. Fixes overlap/perf as leads grow.
2. **Priority-coded markers** — color by `priority` (A/B/C) + shape/size by `capacityKwp`; legend already
   exists in `PlatformPage` — keep it in sync.
3. **Roof polygon overlay** — render each property's roof footprint as a fill+outline layer (from OSM
   buildings / the detector output), colored by `solar_potential_score`. Click a roof → select the lead.
4. **Satellite ↔ street toggle** + optional **terrain/hillshade**; remember the choice.
5. **Fit-to-bounds** on load (all leads) + **fly-to** the selected lead; sync map selection ↔ list/sidebar.
6. **Filter sync** — the map should respect the active FilterBar/leads-table filters (priority/stage/reach).
7. **Performance** — one GeoJSON source updated in place (not per-marker DOM); debounce viewport work.

### 3. Roof detection / marking backlog
8. **Draw-to-measure** — add `@mapbox/mapbox-gl-draw` (or a MapLibre-compatible draw) + **`@turf/turf`**;
   let an engineer draw/edit a roof polygon, auto-compute area (`turf.area`) → estimated kWp via the
   ported `computeEstimatedKwp` (roof × ~0.10). Persist geometry.
9. **Persist roof geometry** — add `bustan.properties.roof_geom jsonb` (GeoJSON Polygon) + a migration
   (role-gated write, mirror `bustan-role_based_rls`); save drawn/edited roofs back. Recompute
   `roof_area_sqm` + `estimated_kwp` from geometry on save (with a save toast).
10. **Surface the Python detector** — wire `roof_detector.py` / OSM buildings output into a reviewable
    layer: detected candidates → confirm/reject in the UI → write confirmed roofs to `properties`/`roof_geom`.
    (Keep heavy detection offline; the SPA reviews + persists.)
11. **Panel-layout preview (stretch)** — given a roof polygon + kWp, sketch a rough panel grid (650 W
    modules) for the quote/proposal; ties into the existing `bom.ts` auto-BOM.
12. **Drone orthomosaic (stretch)** — there is prior drone/PMTiles work (see copenhagen-solar repo); allow
    a per-site high-res raster overlay (PMTiles/raster source) for accurate roof tracing.

### 4. NORTH-STAR — on-demand Thailand-wide scanning engine
This is the end state. Everything above feeds it. Scanning is heavy (CV + external APIs) → it runs
**server/offline, never in the browser**; the SPA requests a scan and reviews/persists results.

**Flow:**
1. **Request (UI)** — "Scan area": draw a polygon / pick a region / enter a Thai address or bbox, with
   filters (property type, min roof m², commercial-only…). Persist a `bustan.scan_requests` row
   (area GeoJSON, filters, status `queued|running|done|failed`, requested_by, counts).
2. **Acquire** — a worker fetches buildings in the bbox from **OSM Overpass** (reuse
   `scripts/download_osm_buildings.py`), and optionally runs **CV roof detection** on satellite tiles
   (`scripts/roof_detector.py`) for buildings OSM misses. Parameterize by bbox — not hard-coded to
   Samui/Surat.
3. **Score** — roof area (from geometry), orientation/shading heuristics, **Thailand irradiance & tariff
   by region** (extend `RegionConfig` in `src/types` — today it's Ko Phangan/Samui/Surat; cover more
   provinces or add a national default) → `solar_potential_score`, `estimated_kwp` (reuse
   `computeEstimatedKwp`), `derivePriority`.
4. **Dedup** — skip buildings already in `bustan.properties` (by id / geometry proximity).
5. **Enrich** — owner / decision-maker via Google Places (`scripts/enrich_owners.py`) → Thai DBD →
   LinkedIn MCP; fill `owner_decision.data` (phone, website, decision-maker) → drives reachability.
6. **Persist** — idempotent upsert into `properties` (+ `roof_geom`), `owner_decision`, `crm_pipeline`
   (stage `new`, derived priority/kWp). New leads immediately appear on the map + CRM, filterable.
7. **Report** — update `scan_requests.status` + counts; surface progress in the UI; `log()` anything
   skipped (rate-limit caps, tiles missing) — never silently truncate.

**Orchestration options (pick per cost/infra):** a Vercel serverless/edge function for light OSM-only
scans; a Python worker (the existing scripts) triggered by a queue/cron polling `scan_requests` for
heavy CV + enrichment. Keep API keys (Overpass is free; Google Places, Mapbox, DBD) **server-side**.
Be cost-aware: cap area size per request, batch enrichment, dedupe before paid lookups.

**Definition of done:** an operator draws any area in Thailand → within minutes new scored, owner-enriched
leads appear in the CRM, with a clear scan status and counts.

### 5. Constraints + verification
- Client uses the **publishable** bustan key; RLS enforces access. Any new write = role-gated
  (engineer/admin) + save toast; never swallow errors. Service keys → env only.
- Reuse existing logic: `owner-decision-layer.ts` (`computeEstimatedKwp`), `bustan-crm-service.ts`,
  `bustan-permissions.ts` (`can`), the toast + bustan stores.
- Keep i18n: add new strings to the `crm`/map namespaces in `src/i18n/translations.ts` (en + he), RTL-safe.
- Verify each phase: `npm run typecheck`, `npx vitest run`, `npm run build` all green; manual map check
  (clusters expand, roof draws + area→kWp persists, selection syncs). Deploy via PR → merge → Vercel.
- **Never** alter the TM-Energy proposal/admin system or break existing `/platform` views.

### 6. Suggested phase order (culminates in the scanning engine)
P0 cluster + priority markers (pure UX, no DB) → P1 roof-polygon overlay (read-only) → P2 draw/measure +
`roof_geom` migration + persist → P3 detector review flow → **P4 on-demand scan engine** (`scan_requests`
+ worker: OSM acquire → score → dedup → enrich → upsert leads, area-parameterized for all of Thailand) →
P5 panel layout / drone stretch. The map work (P0–P3) is the cockpit; P4 is the engine behind it.

## END PROMPT
