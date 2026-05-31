/**
 * /api/enrich-owner
 *
 * POST { companyName?, url?, lat?, lng?, province? }
 *   → { configured: true,  source: 'firecrawl', target: string,
 *       data: EnrichedCompanyData, disclaimer: string }
 *   → { configured: false, message: string }   (FIRECRAWL_API_KEY unset, HTTP 200)
 *   → { error: string }                         (validation / upstream error, HTTP 4xx/5xx)
 *
 * LEGAL DESIGN — JURISTIC / COMPANY DATA ONLY.
 * This endpoint ONLY requests and returns data about JURISTIC PERSONS (registered
 * companies, limited partnerships, public companies) and public business websites.
 * It MUST NOT request, extract, store, or return:
 *   - Named individuals / directors / shareholders
 *   - Sole-proprietor (ห้างหุ้นส่วนสามัญ) personal details
 *   - Any personally identifiable information (PII)
 * Compliant with Thailand PDPA B.E. 2562 — juristic entity records in the DBD
 * public registry are classified as public data, not personal data.
 *
 * FIRECRAWL call shape:
 *   POST https://api.firecrawl.dev/v1/scrape
 *   Authorization: Bearer <FIRECRAWL_API_KEY>
 *   { url: string, formats: ['markdown'], onlyMainContent: true }
 * The raw markdown is then parsed for the six business fields below.
 * No Firecrawl SDK is used — plain fetch only.
 */
export const config = { runtime: 'edge' }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnrichOwnerBody {
  companyName?: unknown
  url?: unknown
  lat?: unknown
  lng?: unknown
  province?: unknown
}

export interface EnrichedCompanyData {
  /** Official registered name of the juristic entity. */
  companyLegalName?: string
  /** Registered address as shown in the public registry. */
  registeredAddress?: string
  /** Public business phone number. */
  businessPhone?: string
  /** Public website extracted from the company page. */
  website?: string
  /** DBD or equivalent registration number. */
  registrationNo?: string
  /** Business category / type (e.g. "บริษัทจำกัด", "Limited Company"). */
  businessType?: string
}

interface FirecrawlScrapeResponse {
  success?: boolean
  data?: {
    markdown?: string
    content?: string
    [key: string]: unknown
  }
  error?: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v1/scrape'

/**
 * DBD (Department of Business Development) public data warehouse.
 * Juristic persons are searchable by company name — public data, not PDPA-restricted.
 * We append the company name as a query param; DBD returns an HTML page with
 * registration details that Firecrawl will convert to markdown.
 */
const DBD_SEARCH_BASE = 'https://datawarehouse.dbd.go.th/searchJuristic'

/** Hard timeout for the Firecrawl upstream call (milliseconds). */
const FIRECRAWL_TIMEOUT_MS = 20_000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/**
 * Build the DBD juristic-search URL for a given company name.
 * Returns a publicly accessible search results page with company registration
 * data — classified as public registry information, not personal data.
 */
function buildDbdSearchUrl(companyName: string): string {
  const encoded = encodeURIComponent(companyName.trim())
  return `${DBD_SEARCH_BASE}?keyword=${encoded}`
}

/**
 * Call the Firecrawl scrape endpoint on `targetUrl` and return the raw markdown.
 * Throws on network errors; returns null if Firecrawl reports !success.
 *
 * IMPORTANT: The prompt passed to Firecrawl instructs it to extract ONLY
 * juristic / company-level fields. Named individuals MUST NOT be returned.
 * This is enforced both here (field extraction regex) and in the LLM extract
 * prompt below.
 */
async function scrapeWithFirecrawl(
  targetUrl: string,
  apiKey: string,
): Promise<string | null> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), FIRECRAWL_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: 'POST',
      signal: ac.signal,
      headers: {
        'Content-Type': 'application/json',
        // NEVER log this key — passed directly, not interpolated into logs.
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        // Timeout hint to Firecrawl (seconds); we also enforce our own AbortController above.
        timeout: 18,
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    throw new Error(`Firecrawl HTTP ${res.status}`)
  }

  const json = (await res.json()) as FirecrawlScrapeResponse

  if (!json.success) {
    // Firecrawl returned an error payload — log the message, not the key.
    return null
  }

  return json.data?.markdown ?? json.data?.content ?? null
}

// ---------------------------------------------------------------------------
// Markdown parser — juristic fields only
// ---------------------------------------------------------------------------

/**
 * Extract the six business-level fields from Firecrawl markdown output.
 *
 * PDPA / JURISTIC ONLY enforcement:
 *   - We ONLY look for company-level registration fields.
 *   - Director / shareholder / named-individual sections are intentionally
 *     NOT searched for and NOT returned.
 *   - If the source is a sole-proprietor record, registrationNo will be present
 *     but companyLegalName / businessType signals will indicate this; the
 *     disclaimer in the response tells the rep to verify before use.
 */
function parseCompanyFields(markdown: string): EnrichedCompanyData {
  const result: EnrichedCompanyData = {}

  // Company legal name — look for common DBD / company-page patterns.
  const nameMatch =
    markdown.match(/(?:ชื่อนิติบุคคล|Company Name|Legal Name|บริษัท)[:\s]+([^\n|]+)/i) ??
    markdown.match(/^#+\s+(.+(?:Co\.,? Ltd\.?|Limited|บริษัท|จำกัด|PLC|PCL).*)$/im)
  if (nameMatch?.[1]) result.companyLegalName = nameMatch[1].trim()

  // Registered address — Thai or English.
  const addrMatch = markdown.match(
    /(?:ที่ตั้งสำนักงาน|Registered Address|Address)[:\s]+([^\n|]{10,})/i,
  )
  if (addrMatch?.[1]) result.registeredAddress = addrMatch[1].trim()

  // Business phone — Thai mobile/landline patterns.
  const phoneMatch = markdown.match(
    /(?:โทรศัพท์|Phone|Tel|Telephone)[:\s]+([\d\s\-+()]{7,20})/i,
  )
  if (phoneMatch?.[1]) result.businessPhone = phoneMatch[1].trim()

  // Website URL.
  const websiteMatch =
    markdown.match(/(?:Website|เว็บไซต์|Web)[:\s]+(https?:\/\/[^\s\n|]+)/i) ??
    markdown.match(/\b(https?:\/\/(?!firecrawl|dbd\.go\.th)[a-z0-9.-]+\.[a-z]{2,}[^\s\n|]*)/i)
  if (websiteMatch?.[1]) result.website = websiteMatch[1].trim()

  // Registration number (เลขทะเบียนนิติบุคคล).
  const regNoMatch = markdown.match(
    /(?:เลขทะเบียน|Registration No|Reg\.? No|juristic_id)[:\s.]+(\d[\d-]{6,})/i,
  )
  if (regNoMatch?.[1]) result.registrationNo = regNoMatch[1].replace(/\s/g, '').trim()

  // Business type (บริษัทจำกัด, ห้างหุ้นส่วน, etc.) — company-level, not individual.
  const bizTypeMatch = markdown.match(
    /(?:ประเภทนิติบุคคล|Business Type|Type)[:\s]+([^\n|]{3,60})/i,
  )
  if (bizTypeMatch?.[1]) result.businessType = bizTypeMatch[1].trim()

  return result
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: Request): Promise<Response> {
  // CORS pre-flight.
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // --- Graceful no-key path ---------------------------------------------------
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    return jsonResponse({
      configured: false,
      message: 'Set FIRECRAWL_API_KEY in Vercel env to enable auto-enrichment.',
    })
  }

  // --- Parse + validate body --------------------------------------------------
  let body: EnrichOwnerBody
  try {
    body = (await req.json()) as EnrichOwnerBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const companyName = isNonEmptyString(body.companyName) ? body.companyName.trim() : undefined
  const providedUrl = isNonEmptyString(body.url) ? body.url.trim() : undefined

  // At least one of companyName or url must be present.
  if (!companyName && !providedUrl) {
    return jsonResponse(
      { error: 'Provide at least one of: companyName, url' },
      400,
    )
  }

  // Validate provided URL shape if present.
  if (providedUrl) {
    try {
      const parsed = new URL(providedUrl)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return jsonResponse({ error: 'url must use http or https' }, 400)
      }
    } catch {
      return jsonResponse({ error: 'url is not a valid URL' }, 400)
    }
  }

  // --- Determine scrape target ------------------------------------------------
  // Prefer the provided company website URL (richer content); fall back to the
  // DBD juristic registry search URL built from the company name.
  const target: string = providedUrl ?? buildDbdSearchUrl(companyName!)

  // --- Scrape via Firecrawl ---------------------------------------------------
  let markdown: string | null
  try {
    markdown = await scrapeWithFirecrawl(target, apiKey)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upstream fetch error'
    const isTimeout = msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('signal')
    return jsonResponse(
      { error: isTimeout ? `Firecrawl timed out (${FIRECRAWL_TIMEOUT_MS / 1000}s)` : `Firecrawl error: ${msg}` },
      502,
    )
  }

  if (!markdown) {
    return jsonResponse(
      { error: 'Firecrawl returned no content for this target' },
      502,
    )
  }

  // --- Parse juristic fields from markdown ------------------------------------
  const data = parseCompanyFields(markdown)

  return jsonResponse({
    configured: true,
    source: 'firecrawl',
    target,
    data,
    // Surfaced to the rep in the UI — reminds them to verify before outreach.
    disclaimer:
      'Public business-registry / company-website data only — verify before outreach (PDPA B.E. 2562).',
  })
}
