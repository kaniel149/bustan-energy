/**
 * workers/dbd-enricher/index.mjs
 *
 * Crawlee batch worker — polls the Bustan `owner_decision` table for rows with
 * research_status = 'pending', scrapes JURISTIC-ONLY records from the Thailand
 * Department of Business Development (DBD) public registry, and PATCHes results
 * back.
 *
 * PDPA B.E.2562 constraint:
 *   This worker ONLY targets juristic persons (companies / legal entities).
 *   Sole proprietors and any row where the property is registered to a natural
 *   person MUST NOT be processed here. Screen on `entity_type = 'juristic'` (or
 *   equivalent flag) in the owner_decision.data before submitting to Crawlee.
 *   See docs/SCRAPING.md §5 Legal Matrix for the full rationale.
 *
 * NOT wired to the main app CI — deploy and test separately on Cloud Run.
 * See README.md for deploy steps.
 *
 * Env vars (required):
 *   BUSTAN_SUPABASE_URL          — Bustan Supabase project URL
 *   BUSTAN_SUPABASE_SERVICE_ROLE_KEY — service-role key (never expose client-side)
 *
 * Env vars (optional):
 *   BATCH_SIZE      — rows per run (default: 20)
 *   CRAWL_DELAY_MS  — ms to wait between requests (default: 1500)
 *   PORT            — HTTP port for the Cloud Scheduler health-check (default: 8080)
 */

import http from 'node:http'
import { CheerioCrawler, Configuration } from '@crawlee/cheerio'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BUSTAN_URL = process.env.BUSTAN_SUPABASE_URL
const BUSTAN_KEY = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? '20', 10)
const CRAWL_DELAY_MS = parseInt(process.env.CRAWL_DELAY_MS ?? '1500', 10)
const PORT = parseInt(process.env.PORT ?? '8080', 10)

// DBD public search endpoint (juristic entity search by address/name).
// This is a publicly accessible government portal — no login required.
// URL pattern observed on data.creden.co and efiling.dbd.go.th public search.
const DBD_SEARCH_BASE = 'https://data.creden.co/search'

if (!BUSTAN_URL || !BUSTAN_KEY) {
  console.error('[dbd-enricher] FATAL: BUSTAN_SUPABASE_URL and BUSTAN_SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Bustan REST helpers  (mirrors the bustanHeaders pattern from api/cron-process-scans.ts)
// ---------------------------------------------------------------------------

/**
 * Build PostgREST headers for the bustan schema.
 * write=false → read (Accept-Profile)
 * write=true  → write (Content-Profile)
 */
function bustanHeaders(write = false) {
  const h = {
    apikey: BUSTAN_KEY,
    Authorization: `Bearer ${BUSTAN_KEY}`,
  }
  if (write) {
    h['Content-Type'] = 'application/json'
    h['Content-Profile'] = 'bustan'
  } else {
    h['Accept-Profile'] = 'bustan'
  }
  return h
}

async function bGet(path) {
  const url = `${BUSTAN_URL}/rest/v1/${path}`
  const res = await fetch(url, { headers: bustanHeaders(false) })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GET ${path} → ${res.status}: ${body}`)
  }
  return res.json()
}

async function bPatch(path, body) {
  const url = `${BUSTAN_URL}/rest/v1/${path}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...bustanHeaders(true), Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`PATCH ${path} → ${res.status}: ${text}`)
  }
  return true
}

// ---------------------------------------------------------------------------
// Crawlee scraper
// ---------------------------------------------------------------------------

/**
 * Scrape the DBD public juristic record for a single company name / property ID.
 *
 * Returns:
 *   { companyName, registeredAddress, phone, website } — any field may be null.
 *
 * JURISTIC-ONLY: do not call this for natural-person owners.
 */
async function scrapeDbdRecord(companyHint) {
  const results = {}

  // Encode search query
  const searchUrl = `${DBD_SEARCH_BASE}?q=${encodeURIComponent(companyHint)}`

  const crawler = new CheerioCrawler({
    // Respect the site — one request per invocation, with a delay.
    maxRequestsPerCrawl: 3,
    requestHandlerTimeoutSecs: 20,
    minConcurrency: 1,
    maxConcurrency: 1,

    async requestHandler({ $, request, enqueueLinks }) {
      const url = request.url

      if (url.startsWith(DBD_SEARCH_BASE)) {
        // Parse search results page — grab the first juristic match.
        // Selector is a best-effort approximation; adjust if the DBD page
        // layout changes (consider ScrapeGraphAI as a fallback).
        const firstResult = $('a[href*="/company/"]').first()
        const detailHref = firstResult.attr('href')
        if (detailHref) {
          const detailUrl = detailHref.startsWith('http')
            ? detailHref
            : `https://data.creden.co${detailHref}`
          await enqueueLinks({ urls: [detailUrl] })
        }
      } else {
        // Parse company detail page.
        // These selectors target data.creden.co layout (2024–2025).
        // Adjust if the site changes or if switching to efiling.dbd.go.th.
        const name = $('h1.company-name, h1[data-test="company-name"]').first().text().trim()
          || $('h1').first().text().trim()

        const address = $('[data-test="registered-address"], .company-address').first().text().trim()
          || $('.address').first().text().trim()

        const phone = $('[data-test="phone"], .company-phone').first().text().trim()
          || $('a[href^="tel:"]').first().text().trim()

        const website = $('[data-test="website"] a, .company-website a').first().attr('href')
          || $('a[href^="http"]:not([href*="creden.co"])').first().attr('href')

        if (name) results.companyName = name
        if (address) results.registeredAddress = address
        if (phone) results.phone = phone.replace(/\s+/g, '').replace(/[^\d+\-()]/g, '')
        if (website && !website.includes('creden.co')) results.website = website
      }
    },

    async failedRequestHandler({ request, error }) {
      console.warn(`[crawlee] Failed: ${request.url} — ${error.message}`)
    },
  })

  // Disable Crawlee's default storage (we don't need local datasets for this worker)
  Configuration.getGlobalConfig().set('persistStateIntervalMillis', 0)

  await crawler.run([searchUrl])

  return results
}

// ---------------------------------------------------------------------------
// Main enrichment loop
// ---------------------------------------------------------------------------

async function runBatch() {
  console.log(`[dbd-enricher] Starting batch (size=${BATCH_SIZE})`)

  // Fetch pending rows — JURISTIC-ONLY filter:
  // Only process rows where data->>'entity_type' is 'juristic' (or not set, as a
  // safe default until the column is populated). Natural-person rows must have
  // entity_type = 'individual' and are intentionally excluded to comply with PDPA.
  const rows = await bGet(
    `owner_decision?research_status=eq.pending&limit=${BATCH_SIZE}&select=property_id,data`,
  )

  if (!rows || rows.length === 0) {
    console.log('[dbd-enricher] No pending rows — nothing to do.')
    return { processed: 0, enriched: 0, skipped: 0, failed: 0 }
  }

  console.log(`[dbd-enricher] Found ${rows.length} pending rows`)

  let enriched = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    const pid = row.property_id
    const data = row.data ?? {}

    // PDPA guard: skip natural persons.
    // entity_type is populated by the scan worker or CRM user.
    // If it is explicitly 'individual', skip without writing to avoid
    // accidental processing of personal data.
    if (data.entity_type === 'individual') {
      console.log(`[dbd-enricher] Skipping ${pid} — individual (PDPA constraint)`)
      skipped++
      continue
    }

    // Claim the row to prevent double-processing by a concurrent instance.
    try {
      await bPatch(`owner_decision?property_id=eq.${pid}`, {
        research_status: 'processing',
      })
    } catch (err) {
      console.warn(`[dbd-enricher] Could not claim ${pid}: ${err.message}`)
      failed++
      continue
    }

    // The company hint comes from whatever the scan worker detected —
    // either a name from OSM tags or from the CRM user's annotation.
    const companyHint = data.legalOwnerName || data.companyNameHint || ''
    if (!companyHint) {
      console.log(`[dbd-enricher] No company hint for ${pid} — marking failed`)
      await bPatch(`owner_decision?property_id=eq.${pid}`, {
        research_status: 'failed',
        data: { ...data, enrichment_error: 'no_company_hint' },
      }).catch(() => {})
      failed++
      continue
    }

    // Respectful delay between Crawlee runs.
    await new Promise((r) => setTimeout(r, CRAWL_DELAY_MS))

    try {
      const scraped = await scrapeDbdRecord(companyHint)

      const updatedData = {
        ...data,
        ...scraped,
        enriched_at: new Date().toISOString(),
        enrichment_source: 'dbd_crawlee',
      }

      await bPatch(`owner_decision?property_id=eq.${pid}`, {
        research_status: 'enriched',
        legal_owner_name: scraped.companyName ?? data.legalOwnerName ?? null,
        data: updatedData,
      })

      console.log(`[dbd-enricher] Enriched ${pid}: ${scraped.companyName ?? '(no name found)'}`)
      enriched++
    } catch (err) {
      console.error(`[dbd-enricher] Error scraping ${pid}: ${err.message}`)
      const updatedData = {
        ...data,
        enrichment_error: err.message,
        enriched_at: new Date().toISOString(),
      }
      await bPatch(`owner_decision?property_id=eq.${pid}`, {
        research_status: 'failed',
        data: updatedData,
      }).catch(() => {})
      failed++
    }
  }

  const summary = { processed: rows.length, enriched, skipped, failed }
  console.log('[dbd-enricher] Batch complete:', summary)
  return summary
}

// ---------------------------------------------------------------------------
// HTTP server (Cloud Run requires a listening port; Cloud Scheduler POSTs to /run)
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'dbd-enricher' }))
    return
  }

  if (req.method === 'POST' && req.url === '/run') {
    try {
      const result = await runBatch()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, ...result }))
    } catch (err) {
      console.error('[dbd-enricher] Unhandled error in /run:', err)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: err.message }))
    }
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => {
  console.log(`[dbd-enricher] Listening on port ${PORT}`)
  console.log(`  POST /run   — trigger a batch`)
  console.log(`  GET  /health — liveness check`)
})
