# /platform Bustan CRM Migration — Design

**Date:** 2026-05-29
**Repo:** `kaniel149/solar-intelligence` (Vite + React 19 + TS + Tailwind + react-router-dom + Zustand + Supabase + MapLibre + framer-motion + dnd-kit + jspdf + PostHog) — serves `bustan-energy.com/platform`.
**Goal:** Bring the backend + data + business logic (built in a prior session against the old static `/crm` app) down into the live `/platform` SPA, without breaking `/platform` or the TM Energy proposal/admin system. Retire the old `/crm` only at the very end, after full migration + verification.

## Locked decisions

1. **Dedicated `bustan` Supabase client.** Add a second client pointed at `ygoiaabzkuvdsyyduvhv` schema `bustan` (the seeded 85-property dataset) for CRM/Solar-Intelligence reads/writes only. The existing TM Energy proposal/admin system stays on `trvgpgpsqvvdsudpgwpm` (`public` schema) — untouched.
2. **Git safety done.** 134 uncommitted files preserved on `codex/solar-intelligence-roof-map-improvements @ 353575a`. This work proceeds on a fresh branch `feat/platform-bustan-crm` off `main`.

## Current state (step 0)

- `/platform` is **already mature**: Auth (`LoginModal`, `SystemAccessGate`), CRM (`Dashboard`, `Pipeline`/`PipelineColumn`/`PipelineFunnel`, `LeadCard`, `LeadDetail`, `KPICards`, `ActivityFeed/Timeline`, `ChecklistPanel`), `SolarMap` (MapLibre), `FilterBar`, i18n (`LanguageContext`), `MobileBottomNav`, admin proposal suite (BOM/procurement/PEA/suppliers).
- Data: Zustand store (`src/lib/store.ts`), properties held in state via `setProperties` (loaded in `PlatformPage`), some localStorage persistence. `src/lib/supabase.ts` → `trvgpgpsqvvdsudpgwpm`. `realtime.ts` subscribes to `public.crm_projects` / `public.activity_log`.
- **Not yet present:** ported `owner-decision-layer` logic, BOM auto-build, bustan-schema data wiring. `src/data/supplier-prices.ts` already exists (verify vs old CSV).

## bustan schema (RLS-enabled, project ygoiaabzkuvdsyyduvhv)

`properties(id,name,area_name,property_type,roof_area_sqm,solar_potential_score,existing_solar,map_x,map_y,lat,lon)` · `owner_decision(property_id, legal_owner_name, decision_maker_name, research_status, source_url, data jsonb)` · `crm_pipeline(property_id, stage[new|contacted|survey|proposal|won|lost], priority[A|B|C], estimated_kwp, estimated_annual_thb, next_action, assigned_to, last_verified_at, source_confidence)` · `site_surveys` · `om_sites` · `app_users(role[admin|sales|engineer|viewer])` · `activity_log` (append-only, trigger-written, read-only client).
Live data: 85 properties · 64 phones · A=17/B=61/C=7 · ~6,925 kWp · reachability 1/66/18.

## Phased plan (commit + verify each phase)

**Phase 0 — Wiring (no UI change).** Add `src/lib/bustan-supabase.ts` (`createClient(url, publishableKey, { db: { schema: 'bustan' } })`); env `VITE_BUSTAN_SUPABASE_URL` / `VITE_BUSTAN_SUPABASE_ANON_KEY`. Publishable key is client-safe (RLS enforces). *Verify:* read `bustan.properties` count = 85.

**Phase 1 — Port domain logic (pure, unit-tested).** Port `owner-decision-layer.js` → `src/lib/owner-decision-layer.ts`: `normalizeCrmLayer` (reachability contactable/partial/cold, `lead_score` 0–100 = 50% size + 30% reachability + 20% solar, estimated_kwp, next_action), `derivePriority`, `computeEstimatedKwp` (roof×0.10), `CRM_PIPELINE_STAGES`, `summarizeCrmRecords`. Port BOM auto-build (`selectInverters` + `autoBuildSystem`, 650W panels, DC:AC 1.15, Antai racking, ฿4,500/kWp labor) → `src/lib/bom.ts`; reconcile `supplier-prices.ts`. *Verify:* `node --test` passes.

**Phase 2 — Read layer.** `src/lib/bustan-crm-service.ts`: fetch properties + owner_decision + crm_pipeline, map to `Property` type, recompute reachability/lead_score at read. Wire `PlatformPage`/CRM to load Bustan data into the store. *Verify:* sign in → 85 on the map; A=17/B=61/C=7; phones visible on enriched leads.

**Phase 3 — Writes + roles + toasts.** Stage change / reassignment / field edits → upsert `bustan.crm_pipeline` with save toasts (never swallow errors). Real login via existing `LoginModal`/`SystemAccessGate` against `bustan.app_users.role`; role-aware writes (admin=all, sales=crm+quote, engineer=survey+O&M, viewer=read-only). *Verify:* change stage → `activity_log` row appears; viewer edit blocked.

**Phase 4 — Lead detail: survey + O&M + quote.** `LeadDetail`: owner + decision-maker, editable CRM fields, reachability+lead_score, phone (click-to-call / WhatsApp link), **Site Survey** workflow (`site_surveys`), **O&M** block when stage=won (`om_sites`). Quote desk: auto-BOM from estimated kWp → proposal/PDF (jspdf). *Verify:* survey persists; quote PDF renders.

**Phase 5 — Dashboards + activity log + notifications + search.** Dashboards: funnel, win rate, pipeline kWp/value, reachability breakdown, by area/assignee (wire `KPICards`/`PipelineFunnel`). Activity-log view (read `bustan.activity_log`). WhatsApp/email notify on stage change / new A-lead (WhatsApp MCP → 972502213948). Search/filter/sort/saved views + bulk actions (extend `FilterBar`). *Verify:* dashboards reflect live data; test notification delivered.

**Phase 6 — i18n + mobile + enrichment (stretch).** HE/EN/TH coverage for CRM; mobile-responsive field survey; owner enrichment to contactable (LinkedIn MCP / Thai DBD); optional 505-lead expansion reseed.

**Phase 7 — FINAL: retire old `/crm` (only after full migration + user confirm; never touch `/platform`).** In `~/Documents/New project` (bustan-energy repo): redirect `/crm` → `/platform` (vercel rewrite), remove `["crm","crm"]` from `scripts/build-static-site.mjs`, update the `/crm` link in `public/bustan/index.html` → `/platform`. Archive old crm UI (keep history). Shared Supabase data is NOT deleted.

## Risks / boundaries

- TM Energy proposal/admin system + `energy-tm.com` deployment stay on `trvgpgpsqvvdsudpgwpm`; the additive bustan client is scoped to CRM/Solar-Intelligence and won't affect them.
- O&M live monitoring (SolarEdge/Huawei/Sungrow) deferred — needs API keys, only after real installs exist.
- Service-side keys (if any) go to env only, never committed; publishable key in client is fine.

## Progress log

Branch `feat/platform-bustan-crm` (off clean `main`). 39 tests, typecheck + build green.

- ✅ **Phase 0** `ea5ab90` — dedicated bustan client; data confirmed 85/A17/B61/C7.
- ✅ **Phase 1a** `b2838f4` — `owner-decision-layer.ts` ported (15 tests).
- ✅ **Phase 1b** `a6d7599` — `bom.ts` auto-BOM (7 tests).
- ✅ **Phase 2a** `5c99864` — `bustan-crm-service.ts` read layer; verified vs real 85-lead fixture (priorities exact, 64 phones, ~6.9 MWp; reachability **1/64/20** vs handoff's stale 1/66/18 — 2 leads drifted).
- ✅ **Phase 2b** `d7d96bf` — PlatformPage loads live leads on sign-in (additive/reversible).
- ✅ **Phase 3** `2d66a02` — `bustan-permissions` (role matrix + can, 6 tests), write service (updateLeadPipeline/Stage/assignLead), toast-store + Toast, bustan-store, `BustanLeadEditor` (role-gated, optimistic). DB-verified: stage change → `trg_log_crm_change` → activity_log.
- ✅ **Phase 4** `1657ca7` — lead detail: service fetch/upsert for `site_surveys` + `om_sites`; `BustanLeadEditor` → tabbed panel (CRM | Quote | Survey | O&M-when-won). Quote tab reuses tested `bom.ts` (line items + equipment + labor + total). DB-verified: site_surveys upsert.
- ✅ **Phase 5** `42502da` — `fetchActivityLog`; `BustanDashboard` (KPIs, stage funnel, reachability, top areas, activity feed) from the bustan store; rendered in the dashboard view when live leads are loaded. WhatsApp/email alerts deferred (need an edge function/cron — not a client concern).
- ✅ **Phase 6** `9d65a21` — `BustanLeadsTable` (search + priority/stage/reach filters, sort by lead_score, click-to-call, row→editor, multi-select **bulk stage change**, role-gated) rendered in scanner view when live leads loaded; `BustanLeadEditor` made responsive (mobile bottom-sheet). i18n: framework is EN/TH only (no HE) — new CRM strings left in English; full i18n is a follow-up.

**✅ Authenticated round-trip VERIFIED (2026-05-29)** via the Auth REST API with a throwaway test user (signup → JWT → PostgREST, the same path the SPA uses; user since deleted, demo lead + activity_log restored):
- viewer login → reads **85 leads** (`content-range 0-84/85`); anonymous blocked
- stage change as admin → `crm_pipeline` updated → `activity_log` row with **actor = auth.uid()**
- **viewer write blocked** (0 rows) after the RLS migration; viewer reads still work

**✅ RLS role enforcement APPLIED** (`supabase/bustan-migrations/001_role_based_rls.sql`, Supabase migration `bustan_role_based_rls`). Before: writes allowed any authenticated user (role gap — only the client `can()` gated it). Now: role-based write policies via `bustan.current_role()` enforce the matrix server-side (admin=all, sales=crm/owner, engineer=survey/om, viewer=read-only). Reads unchanged. Verified as above.

**Remaining browser-only nicety:** confirming the same flow through the actual SPA UI in a browser (the data/auth/RLS layers are now proven; the UI calls the identical client paths).

**Architecture note for Phase 4+:** the existing `Pipeline`/`Dashboard`/`CRMPanel` use a *separate* `crm_projects` model (TM Energy, `crm-service.ts`). The bustan leads currently flow through `properties` + `BustanLeadEditor` (map sidebar). Re-pointing the Pipeline board + Dashboard to the bustan model is the main Phase 4/5 task and is a sizeable refactor — decide whether to migrate those components or keep the map-sidebar CRM.

### Remaining
- **Phase 4 follow-on** — optional: export the Quote as a branded PDF (jspdf via `generate-proposal.ts`); attach roof photos to surveys (storage).
- **Phase 5** — Dashboards (funnel/win-rate/pipeline/reachability) on bustan data; activity-log view; WhatsApp/email alerts; search/filter/bulk. Decide: re-point `Pipeline`/`Dashboard`/`CRMPanel` (currently `crm_projects`) to the bustan model, or build bustan dashboards fresh from `summarizeCrmRecords`.
- **Phase 6** — i18n HE/EN/TH; mobile; enrichment; 505-lead reseed.
- **Phase 7** — retire old `/crm` (redirect, build-script, landing link) — only after full migration + user confirm.

## Verification gate (every phase, per handoff §6)

Sign in → 85 properties on the map · change a stage → `activity_log` row appears · edit blocked for `viewer` · phone numbers visible on enriched leads · client uses publishable key (RLS) · no server keys committed.
