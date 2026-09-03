# Bustan Energy — Final-Grade Overhaul (Design)

**Date:** 2026-09-03 · **Owner:** Kaniel · **Approach:** A — "spine first" (approved)
**Audit source:** `/tmp/bustan-audit.md` (2026-09-03 inventory of both repos)

## Goal
One internal command center (`bustan-energy.com/admin`) from which a roof is scanned → owner/contact found → proposal generated → lead tracked to signature, plus a single hub for all knowledge (academy, business docs, presentations). Internal first; external (client/partner portal) last.

## Canonical decisions
| Concern | Canonical | Non-canonical (to retire) |
|---|---|---|
| App, API, DB, CRM, admin, proposal generation | `bustan-energy` | — |
| Static knowledge: academy, blog, business docs, presentations, PEA docs, research | `bustan-index` (index.bustan-energy.com) | `bustan-energy/{business,marketing,sales,tools/*.html,pea-docs}` mirrors |
| Roof map tool | `bustan-index/kp-solar-pro.html` → migrates into `bustan-energy` `/admin/scan` (React, Supabase-backed) | `platform/pro/`, `archive/`, `legacy/roof-scanner-v1`, `business/research/kp-solar-pro.html` |
| Proposal generator | Web (`/admin/proposals/new` + `api/admin-create-proposal`) | CLI kept only for PDF/PEA package rendering; both read pricing from one `tools/proposal-builder/bom-templates.json` |
| Scan data | Supabase `ygoiaabz` schema `bustan` | `bustan-index/roof-scanner/*.json` (becomes an ingestion source, then frozen) |
| Business-plan xlsx | `bustan-index/Ko_Phangan_Solar_Business_Plan.xlsx` (newer, keep both until diffed) | — |

## Sub-projects (sequential; each gets its own plan)

### SP1 — Cleanup & canonicalization
- Merge `fix/p0-security-2026-08` (energy) and `fix/esri-tiles-and-secrets` (index) into `main`; commit real untracked work (`docs/hiring`, `CLAUDE.md`, `.claude/`).
- Remove iCloud `* 2.*`/`* 3.*` dupes (~80 files) — **requires Kaniel's explicit OK (CLAUDE.md rule: no delete without request).**
- Retire mirrors listed above → move to `bustan-energy/_retired/` (move, not delete) with `_move-log.csv`; delete only after OK.
- Rebrand leftovers: `presentations/tm-energy-company-2026.html`, `legal/nda-tm-energy-*`, `proposals/tm-factory-001.*`.
- Fix `vercel.json` `/crm → /platform` redirect vs live `/crm` routes (decide: `/crm` stays live, redirect removed).
- Move orphan SQL (`bustan-index/supabase/*.sql`) into the correct migration tree or mark applied.

### SP2 — Deal Engine connected (the spine)
1. **Ingest Aug scan outputs** (`footprint_quality_merged.json`, `solar_detected.json`, `unmapped_roofs.json`) into `bustan.scan_candidates` / `roof_meta` via a one-shot script; add `roof_pct`, `footprint_class`, `panel_detected` columns (migration 015).
2. **Fix `cron-detect-solar`**: z18 + tile-size check (port from `detect_solar_kp.py`); re-queue low-confidence (0.1–0.2) rows (roadmap F3).
3. **Scanner → proposal prefill**: `NewProposalPage` accepts `candidate_id` (and `building_id`), hydrates kWp/area/centroid/roofGeom from DB. Kills the dead CTA.
4. **Candidate → lead promotion**: "Approve" on a candidate creates `crm_pipeline` row stage=new, dedup by geom/phone/email (roadmap I7 + Q5).
5. **One pricing source**: web generator and CLI both import `bom-templates.json`; delete inline pricing constants.
6. **Batch enrich button + WhatsApp (GreenAPI) send** from lead card (Q1, Q3).
Out of scope for SP2: DBD key (external blocker), national scans (S2).

### SP3 — Command center
- `/admin` home = funnel dashboard: scans → candidates → approved → with-contact → proposed → viewed → signed (Q4), live from both DBs.
- `/admin/scan` = KP Solar Pro ported to React (MapLibre, reads `scan_candidates`, writes approvals). Static `kp-solar-pro.html` becomes a redirect.
- `/admin/knowledge` = internal knowledge hub: links + search over bustan-index docs (business, research, PEA, drone, SOPs), grouped by layer (internal / team / client).
- Alerts: new approved candidate + first proposal view → WhatsApp 972502213948 (I6).

### SP4 — Academy & presentations
- Academy hub lists all 24 lessons; track pages; progress persisted (existing `academy/admin.html` + migration reviewed, applied or dropped).
- Images optimized (43 MB → <8 MB webp).
- Trilingual: HE + TH translations of the 24 lessons (Gemini draft → Kaniel review for HE).
- Presentations: one `presentations/index.html`; rebrand TM deck; validate numbers in financing deck vs xlsx; reconcile the two xlsx copies into one.
- Business docs: single index page on bustan-index, dedup vs bustan-energy mirrors (done in SP1).

### SP5 — External layer
- Client portal `/p/{REF}` polish (already live) + partner/investor page with the validated deck.
- Public academy (selected tracks) at `academy.bustan-energy.com`.
- Scope details decided after SP1–SP4 ship.

## Data flow (target)
```
KP Solar Pro (/admin/scan) ──approve──▶ scan_candidates(approved) ──auto──▶ crm_pipeline(new)
        ▲                                        │ enrich (Places/Firecrawl/DBD)
   Aug JSON ingest                               ▼
                                     /admin/proposals/new?candidate_id ──▶ /p/{REF} ──▶ sign
                                                 │
                                        outreach (email + WhatsApp)
```

## Error handling / safety
- All ingestion scripts idempotent (upsert on stable building id).
- `OUTREACH_SELF_SEND=1` stays until Kaniel flips it.
- Nothing deleted without explicit OK; moves logged.
- Each SP ends with: tests green (`vitest` + Playwright smoke), deploy preview verified, WhatsApp summary.

## Testing
- SP2: unit tests for prefill hydration + dedup; integration test hitting `detect-solar` on a known KP tile (asserts non-placeholder).
- SP3: Playwright smoke for `/admin` dashboard + `/admin/scan` approve flow.
- SP4: link checker over academy hub (0 dead links), lighthouse image budget.

## Order & gates
SP1 → SP2 → SP3 → SP4 → SP5. Kaniel reviews at end of each SP before the next plan is written.
