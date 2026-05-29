# On-Demand Scan Engine (P4)

Draw/point at an area → a worker finds buildings, scores solar potential, dedups,
and inserts leads that appear on the map + CRM.

## Pieces
- **Queue:** `bustan.scan_requests` (migration `bustan-migrations/004`). Status:
  `queued → running → done|failed`, with `counts` + `error`.
- **Request:** client calls `bustan.create_scan_request(area, bbox, filters)`
  (role-checked: admin/sales/engineer). UI = on-map **"⊕ Scan this area"** button
  (queues the current map viewport). Status shown in the "Area Scans" panel.
- **Worker (light tier):** `api/cron-process-scans.ts` (Vercel edge cron, every
  10 min). OSM Overpass acquire → score → dedup → upsert. Bounded: max bbox
  `0.2°`/side, max 1500 buildings/scan, ~28m dedup radius.
- **Worker (heavy tier):** the Python scripts (`scripts/roof_detector.py` for CV
  roof detection on satellite tiles, `scripts/enrich_owners.py` for owner/DBD/
  Places enrichment). Run offline; results feed the same tables. Not wired to the
  cron — invoke per high-value scan to control cost.

## Required Vercel env
- `BUSTAN_SUPABASE_SERVICE_ROLE_KEY` — service role for project `ygoiaabzkuvdsyyduvhv`
  (the scan worker writes the `bustan` schema; **must be set**).
- `CRON_SECRET` — already used by other crons; the worker requires it.
- Optional: `BUSTAN_SUPABASE_URL` (default `https://ygoiaabzkuvdsyyduvhv.supabase.co`),
  `OVERPASS_URL` (default public Overpass).

## Manual trigger
```
curl -X POST https://<host>/api/cron-process-scans \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Notes / next
- Inserts go directly via the service role (worker has no `auth.uid()`), so it
  bypasses the role-checked `insert_detected_roof` RPC by design.
- Cost guards: bbox + building caps, dedup before any (future) paid enrichment.
- TODO when scaling nationwide: extend `RegionConfig`/`regions.ts` beyond Ko
  Phangan/Samui/Surat (per-province irradiance + tariff, or a national default)
  so scores outside those regions use local values, not the current constants.
