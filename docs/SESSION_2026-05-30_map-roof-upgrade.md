# Session — Map + Roof-Detection Upgrade (P0–P4) + bustan auth fix
**Date:** 2026-05-29 → 2026-05-30 · **Repo:** `solar-intelligence` · **Branch:** `feat/map-roof-upgrade` (merged to `main`)
**Plan file:** `~/.claude/plans/parallel-wishing-zephyr.md`

## What shipped (all live on main + Vercel prod, bustan-energy.com / bustan-energy.com)
| Phase | Feature | Commit |
|---|---|---|
| P0 | fit-to-bounds, fly-to-selected, persisted map style, legend synced to priority colors | `adbdfb9` |
| P1 | read-only roof-polygon overlay (color by solar score) + `showRoofDetection` toggle | `5539a0d` |
| P2 | draw/measure roof → persist `roof_geom` + kWp | `985c645` |
| P3 | detector candidates → confirm/reject review layer; detector emits `roofGeom` | `6bf33af` |
| P4a | `scan_requests` + `create_scan_request` RPC + "⊕ Scan this area" + status panel | `b467258` |
| P4b | edge worker `api/cron-process-scans.ts` (OSM acquire→score→dedup→upsert), cron /10min | `43f35e6` |
| — | scan engine ops doc | `7eaf39a` |
| fix | **bustan dual sign-in** (login was authing wrong project) | `8465f94` |

PRs: #17 (P0–P4, merged). Then auth fix pushed direct to main.

## DB — bustan project `ygoiaabzkuvdsyyduvhv` (schema `bustan`) — ALL APPLIED to prod
- `bustan-migrations/002_roof_geom.sql` → migration `bustan_roof_geom`: `roof_geom` col + `save_roof_geom()` RPC (admin/sales/engineer). Branch-verified end-to-end.
- `003_detected_roofs.sql` → `bustan_detected_roofs`: `insert_detected_roof()` RPC. Insert-validated.
- `004_scan_requests.sql` → `bustan_scan_requests`: `scan_requests` table + RLS + `create_scan_request()` RPC.
- **app_users backfilled** (was empty!): all 15 auth users → roles; `k@kanielt.com` → **admin**.

## Verified
- typecheck · 39/39 tests · build · py compile — green every phase.
- **Worker proven live:** queued a Chaweng bbox → found 49 → deduped 22 → inserted 27 leads → status `done`. Test data cleaned up (0 leftover).
- New frontend code confirmed in live SolarMap chunk (`Scan this area`, `Drawing roof`, `roofs-src`, `cand-fill`).

## Vercel env set
- `BUSTAN_SUPABASE_SERVICE_ROLE_KEY` (production) — validated against bustan project (200). Local copy in `.env` (gitignored).
- Existing: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (Bustan Energy), VITE_* keys.

## ⚠️ Root cause why features were invisible (FIXED)
1. `bustan.app_users` empty → everyone `viewer` → all bustan-gated UI hidden. **Fixed** (backfill).
2. Login authenticated only the **main Bustan Energy project** (`trvgpgpsqvvdsudpgwpm`), never the separate bustan client → 85 leads never loaded (showed demo `16,253`). **Fixed** (dual sign-in in LoginModal + CRMPage; sign-out clears both).

## ⏳ Remaining manual step (only thing left)
Dual sign-in succeeds only if the **bustan password == main password** for the same email.
- Test: `bustan-energy.com/platform` → hard refresh (Cmd+Shift+R) → log in `k@kanielt.com`.
  - Success = lead count drops 16,253 → ~85, "⊕ Scan this area" + 🏠 toggle + sidebar "Draw/Edit Roof Footprint" appear.
- If still demo data: console shows `[bustan] dual sign-in failed` → set bustan password to match main at
  `https://supabase.com/dashboard/project/ygoiaabzkuvdsyyduvhv/auth/users` → k@kanielt.com → set password.

## Deferred (per scope decision)
- P5 (panel-layout preview / drone orthomosaic) — stretch.
- i18n on new buttons (PropertySidebar/FilterBar are English-only, no namespace yet).
- Nationwide scoring: extend `RegionConfig`/`regions.ts` beyond Ko Phangan/Samui/Surat.
- **Pre-existing broken migration** `create_proposals_and_rls` blocks Supabase branching — fix separately.

## Known follow-ups for the scan engine
- Heavy tier (CV detection + paid owner enrichment) stays in Python workers (`scripts/roof_detector.py`, `enrich_owners.py`) — not wired to cron; run per high-value scan.
- Candidate review layer needs `public/data/roof-candidates.json` (detector output) to show magenta candidates.
