# Owner Enrichment — Status & DBD TODO

_Last verified live: 2026-06-01 (energy-tm.com production)._

## Current state

| Path | Endpoint | Status | Notes |
|---|---|---|---|
| **Google Places owner** | `/api/enrich-place?action=contact` | ✅ **Works** | Migrated to **Places API (New)** `places:searchNearby`. Returns name + website + category. Verified: "2 Bedroom Villa & Outdoor Cinema" + Agoda URL. Used by PropertySidebar → "Enrich" button. |
| **Satellite thumbnail** | `/api/enrich-place?action=satellite` | ⚠️ 403 → OSM fallback | Maps Static API returns 403 ("API not activated on your project"). Either propagation delay or enabled on a different GCP project than the key (`223019860758`). Falls back to OSM tile gracefully. |
| **Firecrawl — URL extract** | `/api/enrich-owner` `{url}` | ✅ **Works (LLM extract)** | Now uses Firecrawl `jsonOptions` schema extract for the 6 juristic fields (regex markdown is fallback only). `**` artifacts stripped via `cleanValue()`. |
| **DBD Open API** | `/api/enrich-owner` `{juristicId}` | ✅ **Wired (needs key)** | Migrated off the SPA → official JSON `openapi.dbd.go.th/api/v1/juristic_person/{13-digit-id}`. Returns real registry fields. Needs `DBD_API_KEY` in Vercel (register at openapi.dbd.go.th). PII branches (committee/director/shareholder) skipped. |
| **companyName only** | `/api/enrich-owner` `{companyName}` | ℹ️ **By design** | Official DBD API has no name search (keyed by 13-digit ID). Returns a hint to supply a URL or juristic ID. |

## How to get `DBD_API_KEY` (register)
1. Go to **https://openapi.dbd.go.th** → สมัครสมาชิก / Register (Thai national ID or company; an email works for the developer portal).
2. Create an application → request access to **ข้อมูลนิติบุคคล (juristic_person) v1**.
3. Copy the issued **token/consumer key**.
4. Vercel → `solar-intelligence` → Settings → Environment Variables → add `DBD_API_KEY` = `<token>` (Production).
5. If your key's docs show a header prefix other than `Token`, also set `DBD_AUTH_SCHEME` (e.g. `Bearer`, or empty string for raw token). Default = `Token` → sends `Authorization: Token <key>`.
6. Redeploy. Test: POST `/api/enrich-owner` `{ "juristicId": "0105536000000" }` → expect `source:"dbd"` + real fields.

## Env vars (Vercel `solar-intelligence`, Production)
- `DBD_API_KEY` ⬜ **needs registration** (openapi.dbd.go.th) · optional `DBD_AUTH_SCHEME` (default `Token`)
- `GOOGLE_MAPS_API_KEY` ✅ set (Places API New + Maps Static API)
- `FIRECRAWL_API_KEY` ✅ set

## Fixes already shipped
- `GOOGLE_MAPS_API_KEY` / `FIRECRAWL_API_KEY` added to Vercel Production.
- `enrich-place.ts`: legacy Places endpoints → **Places API (New)** (PR #35).
- `enrich-owner.ts`: Firecrawl `timeout` must be **ms ≥ 1000** — was `18`, now `18_000` (was causing HTTP 400 on every call).

## TODO — make DBD juristic lookup actually return data

1. **The blocker:** `datawarehouse.dbd.go.th` is a client-rendered SPA. A simple
   `?keyword=` GET + Firecrawl markdown returns no registry rows.
2. **Option A — official API (preferred):** use **`openapi.dbd.go.th`** (DBD Open
   API). Requires registering for an API key. Endpoints return JSON juristic
   records by name / registration number — no scraping, PDPA-safe (juristic data
   is public). Replace `buildDbdSearchUrl()` + Firecrawl with a direct JSON call.
3. **Option B — Firecrawl with JS render:** hit the SPA's underlying XHR/results
   URL (inspect the network tab on a real DBD search) and/or use Firecrawl
   `actions`/`waitFor` to render before scrape. More brittle than Option A.
4. **Replace regex parser with LLM extract:** `parseCompanyFields()` is tuned for
   DBD-label markdown; for arbitrary company pages use Firecrawl's `extract`
   (JSON schema) or an LLM extract for the 6 juristic fields.
5. **Parser cleanup:** strip trailing markdown artifacts (e.g. `**`) from
   `companyLegalName` in `parseCompanyFields()`.

## Misc to confirm
- Verify **Maps Static API** is enabled on the **same** GCP project as the key
  (`223019860758`) and billing is active → satellite thumbnails (vs OSM fallback).
- `PropertySidebar` enrich silently shows nothing when no place is found within
  ~50 m. Consider a small toast ("no registered business at this location") so it
  isn't mistaken for a failure.

**Key files:** `api/enrich-place.ts`, `api/enrich-owner.ts`,
`src/lib/enrich-building.ts`, `src/components/Sidebar/PropertySidebar.tsx`,
`src/components/CRM/BustanLeadEditor.tsx`.
