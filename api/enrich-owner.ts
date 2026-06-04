/**
 * /api/enrich-owner
 *
 * POST { juristicId?, companyName?, url?, lat?, lng?, province? }
 *   → { configured: true,  source: 'dbd' | 'firecrawl', target: string,
 *       data: EnrichedCompanyData, disclaimer: string }
 *   → { configured: false, message: string }   (no provider key set, HTTP 200)
 *   → { error: string }                         (validation / upstream error, HTTP 4xx/5xx)
 *
 * RESOLUTION ORDER
 *   1. juristicId (13-digit) — or a 13-digit number found in companyName —
 *      → DBD Open API (openapi.dbd.go.th), official JSON. REAL registry data.
 *   2. url — Firecrawl scrape + LLM JSON-extract of the six juristic fields.
 *   3. companyName only (no id, no url) — cannot be resolved by the official
 *      DBD Open API (it is keyed by 13-digit ID, no name search), so we return
 *      a structured hint asking for a website URL or a juristic ID.
 *
 * LEGAL DESIGN — JURISTIC / COMPANY DATA ONLY.
 * This endpoint ONLY requests and returns data about JURISTIC PERSONS (registered
 * companies, limited partnerships, public companies) and public business websites.
 * It MUST NOT request, extract, store, or return:
 *   - Named individuals / directors / shareholders / committee members
 *   - Sole-proprietor (ห้างหุ้นส่วนสามัญ) personal details
 *   - Any personally identifiable information (PII)
 * Compliant with Thailand PDPA B.E. 2562 — juristic entity records in the DBD
 * public registry are classified as public data, not personal data.
 */
export const config = { runtime: 'edge' }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnrichOwnerBody {
  juristicId?: unknown
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
    json?: Record<string, unknown>
    extract?: Record<string, unknown>
    [key: string]: unknown
  }
  error?: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v1/scrape'
const FIRECRAWL_SEARCH_URL = 'https://api.firecrawl.dev/v1/search'

/**
 * DBD (Department of Business Development) Open API — official JSON registry.
 * Keyed by the 13-digit juristic registration number. Public juristic data,
 * not PDPA-restricted. Requires DBD_API_KEY (register at openapi.dbd.go.th).
 */
const DBD_OPENAPI_BASE = 'https://openapi.dbd.go.th/api/v1/juristic_person'

/** Hard timeout for upstream calls (milliseconds). */
const FIRECRAWL_TIMEOUT_MS = 20_000
const DBD_TIMEOUT_MS = 12_000

/** Keys we MUST NOT read from any registry payload (PDPA — individual PII). */
const PII_KEY_PATTERN =
  /committee|director|shareholder|firstname|lastname|person(?!.*juristic)|ผู้ถือหุ้น|กรรมการ/i

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
 * Strip markdown / formatting artifacts from an extracted string value:
 * leading/trailing `**` bold markers, surrounding quotes, list bullets and
 * collapsed whitespace. Returns undefined for empty results.
 */
function cleanValue(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  let s = raw
    .replace(/\*\*/g, '') // markdown bold
    .replace(/[`_]/g, '') // code / italic markers
    .replace(/^[\s\-•|>#]+/, '') // leading bullets / pipes / heading marks
    .replace(/[\s|]+$/, '') // trailing pipes / space
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '') // wrapping quotes
    .replace(/\s{2,}/g, ' ')
    .trim()
  return s.length ? s : undefined
}

/** Extract a 13-digit juristic ID from an arbitrary string, if present. */
function extractJuristicId(s: string | undefined): string | undefined {
  if (!s) return undefined
  const m = s.replace(/[\s-]/g, '').match(/\b\d{13}\b/)
  return m ? m[0] : undefined
}

// ---------------------------------------------------------------------------
// DBD Open API — official JSON path
// ---------------------------------------------------------------------------

/**
 * Recursively collect string leaves from the DBD payload keyed by what their
 * key name contains, while NEVER descending into PII branches (committee /
 * director / shareholder). Robust to the `cd:`-namespaced field names DBD uses
 * and to nested address objects.
 */
function collectDbdFields(node: unknown, out: Record<string, string>, depth = 0): void {
  if (depth > 8 || node == null) return
  if (Array.isArray(node)) {
    for (const item of node) collectDbdFields(item, out, depth + 1)
    return
  }
  if (typeof node !== 'object') return

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    // Hard PDPA guard — skip any branch that could hold individual PII.
    if (PII_KEY_PATTERN.test(key)) continue

    const bareKey = key.replace(/^.*:/, '').toLowerCase() // drop `cd:` prefix

    if (value && typeof value === 'object') {
      collectDbdFields(value, out, depth + 1)
      continue
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const str = String(value).trim()
      if (str && out[bareKey] === undefined) out[bareKey] = str
    }
  }
}

/** Map collected DBD fields → the six juristic fields we expose. */
function mapDbdToCompanyData(flat: Record<string, string>): EnrichedCompanyData {
  const pick = (...needles: string[]): string | undefined => {
    for (const n of needles) {
      const hit = Object.keys(flat).find((k) => k.includes(n))
      if (hit && flat[hit]) return cleanValue(flat[hit])
    }
    return undefined
  }

  // Address may arrive as several parts — assemble building/road/sub-district…
  const addressParts = Object.keys(flat)
    .filter((k) => /address|building|street|road|subdistrict|district|province|postal|tambol|amphur/.test(k))
    .map((k) => flat[k])
    .filter(Boolean)
  const assembledAddress = addressParts.length ? cleanValue(addressParts.join(' ')) : undefined

  return {
    companyLegalName:
      pick('juristicnameen', 'nameen') ?? pick('juristicnameth', 'nameth', 'juristicname', 'name'),
    businessType: pick('juristictype', 'type'),
    registrationNo: pick('juristicid', 'registerno', 'regno'),
    registeredAddress: pick('fulladdress', 'addressfull') ?? assembledAddress,
    businessPhone: pick('phone', 'tel'),
    website: pick('website', 'web', 'url'),
  }
}

/**
 * Call the DBD Open API for a 13-digit juristic ID. Returns mapped juristic
 * fields, or null when the entity is not found / payload has no usable fields.
 * Throws on network / auth errors so the handler can surface a clear message.
 *
 * Auth is configurable because DBD's portal documents the token under an
 * `Authorization` header; DBD_AUTH_SCHEME lets you switch the prefix
 * (default "Token") without a code change after you read your key's docs.
 */
async function fetchDbdJuristic(
  juristicId: string,
  apiKey: string,
): Promise<EnrichedCompanyData | null> {
  const scheme = (process.env.DBD_AUTH_SCHEME ?? 'Token').trim()
  const authValue = scheme ? `${scheme} ${apiKey}` : apiKey

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), DBD_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${DBD_OPENAPI_BASE}/${encodeURIComponent(juristicId)}`, {
      method: 'GET',
      signal: ac.signal,
      headers: {
        Accept: 'application/json',
        // NEVER logged. DBD documents the credential on the Authorization header.
        Authorization: authValue,
      },
    })
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error('DBD auth rejected — check DBD_API_KEY / DBD_AUTH_SCHEME')
  }
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`DBD HTTP ${res.status}`)

  const payload = (await res.json()) as unknown
  const flat: Record<string, string> = {}
  collectDbdFields(payload, flat)

  const data = mapDbdToCompanyData(flat)
  data.registrationNo ??= juristicId
  // Require at least a name to count as a hit.
  return data.companyLegalName ? data : null
}

// ---------------------------------------------------------------------------
// Firecrawl — URL path (LLM JSON extract, regex fallback)
// ---------------------------------------------------------------------------

/** JSON schema describing the six juristic fields for Firecrawl's extractor. */
const FIRECRAWL_EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    companyLegalName: {
      type: 'string',
      description: 'Official registered legal name of the company / juristic entity only.',
    },
    registeredAddress: { type: 'string', description: 'Registered business address.' },
    businessPhone: { type: 'string', description: 'Public business phone number.' },
    website: { type: 'string', description: 'Company website URL.' },
    registrationNo: { type: 'string', description: 'Business / DBD registration number.' },
    businessType: { type: 'string', description: 'Business type, e.g. Limited Company / บริษัทจำกัด.' },
  },
} as const

const FIRECRAWL_EXTRACT_PROMPT =
  'Extract ONLY juristic / company-level registration fields about the business entity. ' +
  'Do NOT extract any named individuals, directors, shareholders, or personal data. ' +
  'Leave a field empty if it is not clearly present.'

/**
 * Scrape a company website with Firecrawl, requesting BOTH an LLM JSON extract
 * (preferred — structured, robust) and markdown (regex fallback). Returns the
 * raw response so the caller can prefer json then fall back to markdown parse.
 */
async function scrapeWithFirecrawl(
  targetUrl: string,
  apiKey: string,
): Promise<FirecrawlScrapeResponse | null> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), FIRECRAWL_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: 'POST',
      signal: ac.signal,
      headers: {
        'Content-Type': 'application/json',
        // NEVER logged — passed directly.
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ['json', 'markdown'],
        onlyMainContent: true,
        timeout: 18_000,
        jsonOptions: {
          schema: FIRECRAWL_EXTRACT_SCHEMA,
          prompt: FIRECRAWL_EXTRACT_PROMPT,
        },
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) throw new Error(`Firecrawl HTTP ${res.status}`)
  const json = (await res.json()) as FirecrawlScrapeResponse
  if (!json.success) return null
  return json
}

/**
 * Resolve a company NAME → its best public web page via Firecrawl /v1/search,
 * scraping + LLM-extracting the six juristic fields in the same call. Returns
 * the first result that yields a company legal name, plus the URL it came from.
 * PDPA-safe: the extract prompt forbids individuals; we only keep juristic fields.
 */
async function searchWithFirecrawl(
  companyName: string,
  province: string | undefined,
  apiKey: string,
): Promise<{ data: EnrichedCompanyData; url: string } | null> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), FIRECRAWL_TIMEOUT_MS)

  const query = [companyName, province, 'company Thailand'].filter(Boolean).join(' ')

  let res: Response
  try {
    res = await fetch(FIRECRAWL_SEARCH_URL, {
      method: 'POST',
      signal: ac.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        limit: 3,
        location: 'Thailand',
        scrapeOptions: {
          formats: ['json', 'markdown'],
          onlyMainContent: true,
          jsonOptions: {
            schema: FIRECRAWL_EXTRACT_SCHEMA,
            prompt: FIRECRAWL_EXTRACT_PROMPT,
          },
        },
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) throw new Error(`Firecrawl search HTTP ${res.status}`)
  const json = (await res.json()) as {
    success?: boolean
    data?: Array<FirecrawlScrapeResponse['data'] & { url?: string }>
  }
  if (!json.success || !Array.isArray(json.data)) return null

  for (const item of json.data) {
    if (!item) continue
    const built = buildFromFirecrawl({ success: true, data: item })
    if (built.companyLegalName) {
      return { data: built, url: (item.url as string) ?? '' }
    }
  }
  return null
}

/**
 * Build EnrichedCompanyData from a Firecrawl response — prefer the structured
 * LLM extract, fall back to regex over markdown. All values are cleaned of
 * markdown artifacts (e.g. trailing `**`).
 */
function buildFromFirecrawl(resp: FirecrawlScrapeResponse): EnrichedCompanyData {
  const extracted = (resp.data?.json ?? resp.data?.extract) as
    | Partial<Record<keyof EnrichedCompanyData, unknown>>
    | undefined

  if (extracted && typeof extracted === 'object') {
    const fromLlm: EnrichedCompanyData = {
      companyLegalName: cleanValue(extracted.companyLegalName),
      registeredAddress: cleanValue(extracted.registeredAddress),
      businessPhone: cleanValue(extracted.businessPhone),
      website: cleanValue(extracted.website),
      registrationNo: cleanValue(extracted.registrationNo),
      businessType: cleanValue(extracted.businessType),
    }
    // If the extractor found at least the name, trust it.
    if (fromLlm.companyLegalName) return fromLlm
  }

  const markdown = resp.data?.markdown ?? resp.data?.content ?? ''
  return parseCompanyFields(markdown)
}

/**
 * Regex fallback parser — juristic fields only, PDPA-safe (no individuals).
 * Used only when the LLM extract produced nothing usable.
 */
function parseCompanyFields(markdown: string): EnrichedCompanyData {
  const result: EnrichedCompanyData = {}

  const nameMatch =
    markdown.match(/(?:ชื่อนิติบุคคล|Company Name|Legal Name|บริษัท)[:\s]+([^\n|]+)/i) ??
    markdown.match(/^#+\s+(.+(?:Co\.,? Ltd\.?|Limited|บริษัท|จำกัด|PLC|PCL).*)$/im)
  if (nameMatch?.[1]) result.companyLegalName = cleanValue(nameMatch[1])

  const addrMatch = markdown.match(
    /(?:ที่ตั้งสำนักงาน|Registered Address|Address)[:\s]+([^\n|]{10,})/i,
  )
  if (addrMatch?.[1]) result.registeredAddress = cleanValue(addrMatch[1])

  const phoneMatch = markdown.match(
    /(?:โทรศัพท์|Phone|Tel|Telephone)[:\s]+([\d\s\-+()]{7,20})/i,
  )
  if (phoneMatch?.[1]) result.businessPhone = cleanValue(phoneMatch[1])

  const websiteMatch =
    markdown.match(/(?:Website|เว็บไซต์|Web)[:\s]+(https?:\/\/[^\s\n|]+)/i) ??
    markdown.match(/\b(https?:\/\/(?!firecrawl|dbd\.go\.th)[a-z0-9.-]+\.[a-z]{2,}[^\s\n|]*)/i)
  if (websiteMatch?.[1]) result.website = cleanValue(websiteMatch[1])

  const regNoMatch = markdown.match(
    /(?:เลขทะเบียน|Registration No|Reg\.? No|juristic_id)[:\s.]+(\d[\d-]{6,})/i,
  )
  if (regNoMatch?.[1]) result.registrationNo = regNoMatch[1].replace(/\s/g, '').trim()

  const bizTypeMatch = markdown.match(
    /(?:ประเภทนิติบุคคล|Business Type|Type)[:\s]+([^\n|]{3,60})/i,
  )
  if (bizTypeMatch?.[1]) result.businessType = cleanValue(bizTypeMatch[1])

  return result
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: Request): Promise<Response> {
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

  let body: EnrichOwnerBody
  try {
    body = (await req.json()) as EnrichOwnerBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const companyName = isNonEmptyString(body.companyName) ? body.companyName.trim() : undefined
  const providedUrl = isNonEmptyString(body.url) ? body.url.trim() : undefined
  const juristicId =
    extractJuristicId(isNonEmptyString(body.juristicId) ? body.juristicId : undefined) ??
    extractJuristicId(companyName)

  if (!juristicId && !companyName && !providedUrl) {
    return jsonResponse(
      { error: 'Provide at least one of: juristicId, companyName, url' },
      400,
    )
  }

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

  const disclaimer =
    'Public business-registry / company-website data only — verify before outreach (PDPA B.E. 2562).'

  // --- 1) DBD Open API (official JSON, real data) ---------------------------
  if (juristicId) {
    const dbdKey = process.env.DBD_API_KEY
    if (dbdKey) {
      try {
        const data = await fetchDbdJuristic(juristicId, dbdKey)
        if (data) {
          return jsonResponse({
            configured: true,
            source: 'dbd',
            target: `${DBD_OPENAPI_BASE}/${juristicId}`,
            data,
            disclaimer,
          })
        }
        // Found nothing for that ID — fall through to URL scrape if available.
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'DBD upstream error'
        // If we have no URL fallback, surface the DBD error; else try the URL.
        if (!providedUrl) return jsonResponse({ error: msg }, 502)
      }
    } else if (!providedUrl) {
      return jsonResponse({
        configured: false,
        message:
          'Set DBD_API_KEY in Vercel env to enable official DBD registry lookup (register at openapi.dbd.go.th).',
      })
    }
  }

  // --- 2) Firecrawl URL scrape + extract ------------------------------------
  const firecrawlKey = process.env.FIRECRAWL_API_KEY
  if (providedUrl) {
    if (!firecrawlKey) {
      return jsonResponse({
        configured: false,
        message: 'Set FIRECRAWL_API_KEY in Vercel env to enable website enrichment.',
      })
    }
    let resp: FirecrawlScrapeResponse | null
    try {
      resp = await scrapeWithFirecrawl(providedUrl, firecrawlKey)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upstream fetch error'
      const isTimeout = /abort|signal/i.test(msg)
      return jsonResponse(
        { error: isTimeout ? `Firecrawl timed out (${FIRECRAWL_TIMEOUT_MS / 1000}s)` : `Firecrawl error: ${msg}` },
        502,
      )
    }
    if (!resp) {
      return jsonResponse({ error: 'Firecrawl returned no content for this target' }, 502)
    }
    return jsonResponse({
      configured: true,
      source: 'firecrawl',
      target: providedUrl,
      data: buildFromFirecrawl(resp),
      disclaimer,
    })
  }

  // --- 3) companyName only — Firecrawl web search → extract -----------------
  if (companyName) {
    if (!firecrawlKey) {
      return jsonResponse({
        configured: false,
        message: 'Set FIRECRAWL_API_KEY in Vercel env to enable company-name search enrichment.',
      })
    }
    const province = isNonEmptyString(body.province) ? body.province.trim() : undefined
    let found: { data: EnrichedCompanyData; url: string } | null
    try {
      found = await searchWithFirecrawl(companyName, province, firecrawlKey)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upstream fetch error'
      const isTimeout = /abort|signal/i.test(msg)
      return jsonResponse(
        { error: isTimeout ? `Firecrawl search timed out (${FIRECRAWL_TIMEOUT_MS / 1000}s)` : `Firecrawl error: ${msg}` },
        502,
      )
    }
    if (!found) {
      return jsonResponse({
        configured: false,
        message: `No public company page found for "${companyName}". Provide a website URL or a 13-digit DBD juristic ID.`,
      })
    }
    return jsonResponse({
      configured: true,
      source: 'firecrawl-search',
      target: found.url || `search:${companyName}`,
      data: found.data,
      disclaimer,
    })
  }

  // Should be unreachable — earlier guard requires at least one input.
  return jsonResponse({ error: 'Nothing to enrich' }, 400)
}
