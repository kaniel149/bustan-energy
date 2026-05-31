# Scraping Architecture — Solar Intelligence

Authoritative reference for all data-acquisition tooling in the Bustan / TM Energy stack.
Last updated: 2026-05-31.

---

## 1. Tool Verdict Table

| Tool | Decision | Reason |
|------|----------|--------|
| **Firecrawl** | **USE — P1** | Managed API; callable from Vercel Edge/Serverless (no headless browser needed). Handles JS rendering, retries, and anti-bot rotation on their infra. Pay-per-call cost is acceptable for on-demand owner lookup. Wired as `api/enrich-owner.ts` (in progress). |
| **Crawlee** | **USE — P2 (batch worker)** | Node.js library that wraps Playwright/Puppeteer. Needs a real server (cannot run on Vercel). Deployed on Cloud Run as `workers/dbd-enricher`. Used for batch DBD juristic scraping. |
| **Playwright** | **SKIP** | Covered by Crawlee. Running raw Playwright on Cloud Run is an option for one-off debugging; not wired as a recurring pipeline. |
| **Scrapy** | **SKIP** | Python only; no advantage over `requests` + `beautifulsoup4` for the targets we have. `scripts/enrich_owners.py` already handles the Python batch path. |
| **ScrapeGraphAI** | **OPTIONAL** | LLM-guided extraction useful when DBD page layout changes without warning. Add later if Crawlee selectors break repeatedly. |
| **Crawl4AI** | **LATER** | Async Python crawler; evaluate when replacing `scripts/enrich_owners.py` with a faster async version. |

---

## 2. Integration Points

### P1 — DBD Owner Lookup (juristic entities)
**Status:** scaffold ready (`workers/dbd-enricher/`), not deployed to production.
**What:** Scrape Thailand Department of Business Development (`data.creden.co` / `efiling.dbd.go.th`) for juristic person records — company name, registered address, phone, website. Juristic entities are **public records**; no PDPA constraint.
**How (Vercel side):** `api/enrich-owner.ts` (being wired) calls Firecrawl `scrapeUrl` for on-demand single-property lookup triggered from the CRM UI.
**How (batch side):** `workers/dbd-enricher/index.mjs` polls `owner_decision` rows with `research_status = 'pending'`, scrapes DBD with Crawlee, PATCHes results back.

### P2 — Company Website Contact Enrichment
**Status:** not built.
**What:** Once a company website is known (from DBD or Google Places), extract the contact page for phone / email / LINE ID.
**How:** Firecrawl `scrapeUrl` with `formats: ['markdown']`. Add as a second pass in `api/enrich-owner.ts` after the DBD lookup sets `data.companyWebsite`.

### P3 — Google Places (server-side)
**Status:** done — `scripts/enrich_owners.py` Phase 2.
**What:** Nearby Search + Place Details for Grade A/B buildings without an owner. Returns business name, phone, website, category.
**How:** Direct Google Places REST API; runs as a local Python script. `GOOGLE_MAPS_API_KEY` must be set in the shell environment when running the script (not deployed to Vercel — too expensive at scale).

### P4 — Overture Footprints
**Status:** done — `scripts/process_overture.py`.
**What:** Open building footprints from Overture Maps. Cross-referenced with existing `buildings_all.json` by proximity (rounded lat/lng). Provides polygon areas, building class/subtype, and named buildings — all open-data, no PDPA concern.
**How to run:**
```bash
# 1. Download the Overture parquet file for Thailand and convert to GeoJSON:
#    (see scripts/download_osm_buildings.py for bbox reference)
#    python-duckdb query or overturemaps CLI → public/data/overture_buildings.geojson

# 2. Run the processor:
python scripts/process_overture.py
# Output: public/data/buildings_all.json (updated in-place)
```
No API key required; Overture data is open-licence. Run locally or on a CI box — the output file is committed/uploaded to the public data bucket.

### P5 — LinkedIn (NOT BUILT)
**Status:** NOT BUILT — by design, permanently.
**Why:** LinkedIn Terms of Service explicitly prohibit automated scraping (Section 8.2). Risk of account ban + legal action (hiQ Labs v. LinkedIn established scraping public data is legal under CFAA in the US, but LinkedIn's ToS still applies and Thai courts are unpredictable). More critically: individual-level data (director names, personal profiles) falls under **PDPA B.E.2562 Section 19** — processing sensitive personal data about identifiable natural persons without consent requires a lawful basis. We do not have one. This integration point is documented here only to record the decision, not as future work.

### P6 — Competitor / Existing-Solar Intel
**Status:** not built.
**What:** Identify buildings that already have solar panels (competitor installations or self-owned) so sales reps skip them or offer O&M instead. Sources: PEA interconnection announcements (public PDFs), Google Solar API coverage tiles, manual drone imagery.
**How (planned):** Firecrawl PDF extraction on PEA public PDFs + Google Solar API Buildings layer for the Ko Phangan bbox. No personal data involved — all property-level.

---

## 3. Environment Variables

### Vercel Dashboard (solar-intelligence project)

| Variable | Where used | Notes |
|----------|-----------|-------|
| `FIRECRAWL_API_KEY` | `api/enrich-owner.ts` | Get from app.firecrawl.dev → API Keys |
| `GOOGLE_MAPS_API_KEY` | `scripts/enrich_owners.py` (local) | Not deployed to Vercel; set in shell env when running the script. For Vercel usage (P6 Solar API) use `GOOGLE_SOLAR_API_KEY` as a separate key with only Solar API enabled. |
| `BUSTAN_SUPABASE_URL` | `api/cron-process-scans.ts`, `workers/dbd-enricher` | Bustan project URL (not the TM Energy project) |
| `BUSTAN_SUPABASE_SERVICE_ROLE_KEY` | Same | Service-role key; never expose client-side |
| `CRON_SECRET` | `api/cron-process-scans.ts` | Bearer token used by Vercel cron + Cloud Scheduler |

Set in Vercel: Dashboard → Project → Settings → Environment Variables. All variables above are already defined for the `solar-intelligence` project except `FIRECRAWL_API_KEY` (add when wiring `api/enrich-owner.ts`).

---

## 4. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  LIGHT TIER — Vercel (Edge / Serverless)                         │
│                                                                  │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐  │
│  │  Vercel Cron         │   │  CRM UI action                   │  │
│  │  (every 5 min)       │   │  (user clicks "Enrich Owner")    │  │
│  └──────────┬──────────┘   └─────────────┬────────────────────┘  │
│             │                            │                        │
│             v                            v                        │
│  ┌──────────────────┐       ┌────────────────────────────────┐   │
│  │ api/cron-process │       │ api/enrich-owner.ts            │   │
│  │ -scans.ts        │       │  → Firecrawl.scrapeUrl(DBD)    │   │
│  │  → Overpass OSM  │       │  → PATCH owner_decision        │   │
│  │  → bInsert       │       └────────────────────────────────┘   │
│  │    owner_decision│                                            │
│  │    (status=      │                                            │
│  │     'pending')   │                                            │
│  └──────────────────┘                                            │
└──────────────────────────────────────────────────────────────────┘
              │ rows with research_status='pending' written to DB
              │
              v
┌─────────────────────────────────────────────────────────────────┐
│  Supabase (bustan schema)                                       │
│  owner_decision table                                           │
│  ─ property_id, research_status, legal_owner_name,             │
│    data JSONB (company_address, phone, website …)               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ poll pending rows
                       │
                       v
┌──────────────────────────────────────────────────────────────────┐
│  HEAVY TIER — Cloud Run (workers/dbd-enricher)                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  index.mjs (Crawlee CheerioCrawler / PlaywrightCrawler)  │    │
│  │                                                          │    │
│  │  1. GET /rest/v1/owner_decision                          │    │
│  │     ?research_status=eq.pending&limit=50                 │    │
│  │     (Accept-Profile: bustan header)                      │    │
│  │                                                          │    │
│  │  2. For each property_id:                                │    │
│  │     a. Claim row → PATCH research_status='processing'    │    │
│  │     b. Crawlee: scrape DBD juristic search               │    │
│  │        (data.creden.co / efiling.dbd.go.th)              │    │
│  │     c. Extract: company_name, address, phone, website    │    │
│  │     d. PATCH research_status='enriched'                  │    │
│  │        + legal_owner_name + data JSONB                   │    │
│  │     e. On error → PATCH research_status='failed'         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Trigger: Cloud Scheduler → HTTP POST /run every N minutes       │
│  Scale: min 0 / max 2 instances (cost-safe)                     │
└──────────────────────────────────────────────────────────────────┘

PYTHON BATCH (local / CI — no server):
  scripts/process_overture.py  →  public/data/buildings_all.json  (open data, no API key)
  scripts/enrich_owners.py     →  buildings_validated.json         (Google Places, needs key)
```

---

## 5. Legal Matrix

| Data source | Entity type | Legal status (Thailand) | Use in pipeline |
|-------------|-------------|------------------------|-----------------|
| DBD juristic registry | Company / juristic person | **Public record** — freely accessible | OK. Company name, reg. address, representative name. |
| Company website (contact page) | Company | **Public** — published intentionally | OK. Phone, email, LINE ID listed by the company. |
| Google Places / Overture | Business premises (place) | **Public** — aggregated by Google/Overture from public sources | OK for business name, category, hours. |
| Overture Maps building footprints | Physical building polygon | **Open data** (ODbL licence) | OK. No personal data. |
| OSM Overpass | Physical building / road | **Open data** (ODbL licence) | OK. |
| LinkedIn profiles | Individual person | **Gated** — ToS + PDPA B.E.2562 s.19 | **NOT BUILT** — see P5 above. |
| DBD director names (sole proprietor / natural person) | Individual person | Mixed — name is public but combined with contact info = personal data under PDPA | Treat with care: display name only; do NOT store contact info without consent. |
| Israeli Tabu (land registry) | Property owner (individual) | **PROHIBITED** for automated scraping under Israeli Data Protection | Not applicable to Thailand operations; documented for completeness. |
| CAPTCHA bypass / credential stuffing | Any | **Illegal** (Computer Crime Act B.E.2550 + CFAA equivalent) | **NEVER** — hard rule. |

---

## 6. Running P4: Overture as the Overpass Alternative

Overture Maps provides pre-built building footprints without hitting a live API quota. Use it when:
- Overpass is rate-limiting or timing out (common on free mirrors).
- You need full polygon geometry for roof-area calculation rather than just a centroid.
- You want named buildings (hotels, resorts, schools) without a Google Places call.

**Steps:**
```bash
# Install overturemaps CLI (one-time)
pip install overturemaps

# Download Ko Phangan buildings (~20 MB parquet)
# Bounding box: W=100.00, S=9.45, E=100.10, N=9.80  (Ko Phangan)
overturemaps download \
  --bbox=100.00,9.45,100.10,9.80 \
  -f geojson \
  --type=building \
  -o public/data/overture_buildings.geojson

# Process and merge with existing scored buildings
python scripts/process_overture.py
# Outputs: public/data/buildings_all.json
```

`process_overture.py` preserves any existing rich data (existing_lookup keyed by rounded lat/lng) and only generates new entries for buildings not already in `buildings_all.json`. Re-run whenever a new Overture quarterly release drops or when you expand to a new region.
