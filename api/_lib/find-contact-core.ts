/**
 * find-contact-core.ts
 *
 * Reusable contact-enrichment pipeline shared by:
 *   - api/admin-find-contact.ts  (interactive, per-property)
 *   - api/cron-enrich-contacts.ts (batch cron, ≤4/tick)
 *
 * Stages (same order as admin-find-contact):
 *   1. property_load   — load bustan.properties row (cron path; admin path may
 *                        also load from main public.properties first)
 *   2. geocode         — Nominatim reverse-geocode
 *   3. overpass        — Overpass POI lookup (~80 m radius)
 *   4. dbd             — DBD Open API (13-digit juristic ID)
 *   5. firecrawl_search — Firecrawl /v1/search
 *   6. firecrawl_scrape — Firecrawl /v1/scrape
 *   7. gemini           — LLM extraction → structured JSON
 *   8. persist          — UPSERT bustan.owner_decision + stamp attempt sentinel
 *
 * The persist stage always writes `lastResearchedAt` + `researchStatus` to the
 * owner_decision.data jsonb, even when nothing was found, so the row exits the
 * cron queue (sentinel pattern identical to solar_checked_at in cron-detect-solar).
 *
 * LEGAL / PDPA: Only public, role-based business contact information is returned.
 * See Gemini prompt for full constraint wording.
 */

// ---------------------------------------------------------------------------
// Env (read once at module load — safe for edge functions)
// ---------------------------------------------------------------------------

// Main project (public schema) — flat contact columns on public.properties
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Bustan CRM project (bustan schema) — owner_decision, bustan.properties
export const BUSTAN_URL = process.env.BUSTAN_SUPABASE_URL || 'https://ygoiaabzkuvdsyyduvhv.supabase.co'
export const BUSTAN_KEY = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY!

export const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NANOBANANA_API_KEY
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type StageStatus = 'ok' | 'skipped' | 'failed'

export interface StageReport {
  stage: string
  status: StageStatus
  detail?: string
}

export interface CompanyInfo {
  name?: string
  registrationNo?: string
  address?: string
  phone?: string
  website?: string
}

export interface DecisionMakerInfo {
  name?: string
  role?: string
  phone?: string
  email?: string
  linkedin?: string
}

export interface FindContactResult {
  company: CompanyInfo
  decision_maker: DecisionMakerInfo
  confidence: number
  sources: string[]
  stages: StageReport[]
  saved: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse'
const OVERPASS_API = 'https://overpass-api.de/api/interpreter'
const DBD_BASE = 'https://openapi.dbd.go.th/api/v1/juristic_person'
const FIRECRAWL_SEARCH_URL = 'https://api.firecrawl.dev/v1/search'
const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v1/scrape'
// Uses gemini-2.0-flash — adequate for text extraction (not vision);
// keeping same model as original for consistency.
export const USER_AGENT = 'solar-intelligence/1.0 (k@kanielt.com)'

export const TIMEOUT_SHORT = 8_000
export const TIMEOUT_MED = 15_000
export const TIMEOUT_LONG = 20_000

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function cleanStr(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.replace(/\*\*/g, '').replace(/[`_]/g, '').replace(/\s{2,}/g, ' ').trim()
  return s.length ? s : undefined
}

/** Extract 13-digit juristic ID from a string, if present. */
export function extractJuristicId(s: string | undefined): string | undefined {
  if (!s) return undefined
  const m = s.replace(/[\s-]/g, '').match(/\b\d{13}\b/)
  return m ? m[0] : undefined
}

export async function timedFetch(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ac.signal })
  } finally {
    clearTimeout(t)
  }
}

// ---------------------------------------------------------------------------
// Bustan REST helpers (mirrors cron-detect-solar.ts exactly)
// ---------------------------------------------------------------------------

function bustanHeaders(write = false): Record<string, string> {
  const h: Record<string, string> = { apikey: BUSTAN_KEY, Authorization: `Bearer ${BUSTAN_KEY}` }
  if (write) { h['Content-Type'] = 'application/json'; h['Content-Profile'] = 'bustan' }
  else h['Accept-Profile'] = 'bustan' as string
  return h
}

export async function bGet<T>(path: string): Promise<T[]> {
  const r = await fetch(`${BUSTAN_URL}/rest/v1/${path}`, { headers: bustanHeaders(false) })
  return r.ok ? r.json() : []
}

export async function bPatch(path: string, body: unknown): Promise<boolean> {
  const r = await fetch(`${BUSTAN_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...bustanHeaders(true), Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  return r.ok
}

// ---------------------------------------------------------------------------
// Stage 1 helper: Load property row
// ---------------------------------------------------------------------------

export interface LoadedProperty {
  id: string
  owner_name: string | null
  phone: string | null
  website: string | null
  email: string | null
  lat: number | null
  lng: number | null
  title: string | null
}

/**
 * Load from main public.properties first, then fall back to bustan.properties.
 * Used by admin-find-contact; the cron uses bGet directly since it already has
 * the bustan row in hand from the queue query.
 */
export async function loadProperty(propertyId: string): Promise<LoadedProperty | null> {
  // 1) Main project public schema
  try {
    const url = `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}&select=id,owner_name,phone,website,email,lat,lng,title&limit=1`
    const r = await timedFetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' },
    }, TIMEOUT_SHORT)
    if (r.ok) {
      const rows = await r.json() as LoadedProperty[]
      if (rows[0]) return rows[0]
    }
  } catch {
    // fall through to bustan project
  }

  // 2) Bustan project (separate Supabase project, bustan schema)
  try {
    const url = `${BUSTAN_URL}/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}&select=id,name,lat,lon&limit=1`
    const r = await timedFetch(url, {
      headers: {
        apikey: BUSTAN_KEY,
        Authorization: `Bearer ${BUSTAN_KEY}`,
        Accept: 'application/json',
        'Accept-Profile': 'bustan',
      },
    }, TIMEOUT_SHORT)
    if (!r.ok) return null
    const rows = await r.json() as Array<{
      id: string
      name: string | null
      lat: number | null
      lon: number | null
    }>
    const row = rows[0]
    if (!row) return null
    return {
      id: row.id,
      owner_name: null,
      phone: null,
      website: null,
      email: null,
      lat: row.lat,
      lng: row.lon, // bustan uses `lon`, map to our `lng`
      title: row.name,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Stage 2: Nominatim reverse-geocode
// ---------------------------------------------------------------------------

interface NominatimResponse {
  display_name?: string
  address?: Record<string, string>
  error?: string
  name?: string
  [key: string]: unknown
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ name?: string; display_name?: string } | null> {
  const url = new URL(NOMINATIM_BASE)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('accept-language', 'en,th')
  url.searchParams.set('addressdetails', '1')
  try {
    const r = await timedFetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    }, TIMEOUT_SHORT)
    if (!r.ok) return null
    const data = await r.json() as NominatimResponse
    if (data.error) return null
    return { name: data.name, display_name: data.display_name }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Stage 3: Overpass POI lookup (~80 m radius)
// ---------------------------------------------------------------------------

interface OverpassElement {
  tags?: Record<string, string>
}

export async function overpassPOI(lat: number, lng: number, radiusM = 80): Promise<string | null> {
  const query = `[out:json][timeout:8];
(
  node(around:${radiusM},${lat},${lng})[name];
  way(around:${radiusM},${lat},${lng})[name];
)[building,amenity,shop,office,industrial];
out center 5;`
  try {
    const r = await timedFetch(OVERPASS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    }, TIMEOUT_SHORT)
    if (!r.ok) return null
    const data = await r.json() as { elements?: OverpassElement[] }
    const elements = data.elements ?? []
    for (const el of elements) {
      const tags = el.tags ?? {}
      const n = tags['operator'] ?? tags['name']
      if (n && n.trim()) return n.trim()
    }
    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Stage 4: DBD juristic lookup
// ---------------------------------------------------------------------------

interface DbdResult {
  name?: string
  registrationNo?: string
  address?: string
  phone?: string
  website?: string
  businessType?: string
}

function collectDbdFields(node: unknown, out: Record<string, string>, depth = 0): void {
  if (depth > 8 || node == null) return
  if (Array.isArray(node)) {
    for (const item of node) collectDbdFields(item, out, depth + 1)
    return
  }
  if (typeof node !== 'object') return
  const PII = /committee|director|shareholder|firstname|lastname|person(?!.*juristic)|ผู้ถือหุ้น|กรรมการ/i
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (PII.test(key)) continue
    const bare = key.replace(/^.*:/, '').toLowerCase()
    if (value && typeof value === 'object') {
      collectDbdFields(value, out, depth + 1)
      continue
    }
    if ((typeof value === 'string' || typeof value === 'number') && out[bare] === undefined) {
      out[bare] = String(value).trim()
    }
  }
}

function pick(flat: Record<string, string>, ...needles: string[]): string | undefined {
  for (const n of needles) {
    const hit = Object.keys(flat).find((k) => k.includes(n))
    if (hit && flat[hit]) return cleanStr(flat[hit])
  }
  return undefined
}

export async function dbdLookup(juristicId: string): Promise<DbdResult | null> {
  const apiKey = process.env.DBD_API_KEY
  if (!apiKey) return null
  const scheme = (process.env.DBD_AUTH_SCHEME ?? 'Token').trim()
  try {
    const r = await timedFetch(`${DBD_BASE}/${encodeURIComponent(juristicId)}`, {
      headers: {
        Accept: 'application/json',
        Authorization: scheme ? `${scheme} ${apiKey}` : apiKey,
      },
    }, TIMEOUT_MED)
    if (r.status === 404) return null
    if (!r.ok) return null
    const payload = await r.json() as unknown
    const flat: Record<string, string> = {}
    collectDbdFields(payload, flat)
    const addressParts = Object.keys(flat)
      .filter((k) => /address|building|street|road|subdistrict|district|province|postal|tambol|amphur/.test(k))
      .map((k) => flat[k]).filter(Boolean)
    return {
      name: pick(flat, 'juristicnameen', 'nameen') ?? pick(flat, 'juristicnameth', 'nameth', 'juristicname', 'name'),
      registrationNo: pick(flat, 'juristicid', 'registerno', 'regno') ?? juristicId,
      address: pick(flat, 'fulladdress', 'addressfull') ?? (addressParts.length ? cleanStr(addressParts.join(' ')) : undefined),
      phone: pick(flat, 'phone', 'tel'),
      website: pick(flat, 'website', 'web', 'url'),
      businessType: pick(flat, 'juristictype', 'type'),
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Stage 5: Firecrawl search
// ---------------------------------------------------------------------------

interface FirecrawlSearchResult {
  url?: string
  markdown?: string
  content?: string
  json?: Record<string, unknown>
  extract?: Record<string, unknown>
  [key: string]: unknown
}

export async function firecrawlSearch(
  companyName: string,
  apiKey: string,
): Promise<{ results: FirecrawlSearchResult[]; error?: string }> {
  const query = `"${companyName}" (managing director OR owner OR กรรมการผู้จัดการ OR ติดต่อ) contact`
  try {
    const r = await timedFetch(FIRECRAWL_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        query,
        limit: 5,
        location: 'Thailand',
        scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
      }),
    }, TIMEOUT_LONG)
    if (!r.ok) return { results: [], error: `HTTP ${r.status}` }
    const json = await r.json() as { success?: boolean; data?: FirecrawlSearchResult[] }
    if (!json.success || !Array.isArray(json.data)) return { results: [] }
    return { results: json.data }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { results: [], error: /abort|signal/i.test(msg) ? 'timeout' : msg }
  }
}

// ---------------------------------------------------------------------------
// Stage 6: Firecrawl scrape
// ---------------------------------------------------------------------------

export async function firecrawlScrape(
  websiteUrl: string,
  apiKey: string,
): Promise<{ markdown?: string; error?: string }> {
  const candidates: string[] = []
  try {
    const base = new URL(websiteUrl)
    const origin = base.origin
    candidates.push(`${origin}/contact`, `${origin}/about-us`, `${origin}/about`, websiteUrl)
  } catch {
    candidates.push(websiteUrl)
  }

  for (const url of candidates.slice(0, 2)) {
    try {
      const r = await timedFetch(FIRECRAWL_SCRAPE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
          onlyMainContent: true,
          timeout: 12_000,
        }),
      }, TIMEOUT_MED)
      if (!r.ok) continue
      const json = await r.json() as { success?: boolean; data?: { markdown?: string; content?: string } }
      if (!json.success) continue
      const md = json.data?.markdown ?? json.data?.content ?? ''
      if (md.length > 100) return { markdown: md }
    } catch {
      // Try next candidate
    }
  }
  return { error: 'no_content' }
}

// ---------------------------------------------------------------------------
// Stage 7: Gemini extraction
// ---------------------------------------------------------------------------

const GEMINI_PROMPT = `You are a B2B solar sales researcher. From the gathered business text below, extract ONLY professional business contact information found in PUBLIC BUSINESS SOURCES. Return ONLY strict JSON matching this schema exactly.

PDPA RULE: Return only role-based / business contact information (job title + work phone / work email / LinkedIn profile of a named role). NEVER return private individuals' home addresses, personal phone numbers, or personal data not published in a professional business capacity.

If a field is not found, return null for that field.

Schema:
{
  "company": {
    "name": string | null,
    "registrationNo": string | null,
    "address": string | null,
    "phone": string | null,
    "website": string | null
  },
  "decision_maker": {
    "name": string | null,
    "role": string | null,
    "phone": string | null,
    "email": string | null,
    "linkedin": string | null
  },
  "confidence": number (0.0 to 1.0),
  "sources": [string]
}

Gathered text:
`

export interface GeminiExtractResult {
  company: CompanyInfo
  decision_maker: DecisionMakerInfo
  confidence: number
  sources: string[]
  error?: string
  /** Set to true when Gemini returned HTTP 429 on all models — signals transient quota. */
  quota_exhausted?: boolean
}

// Model fallback chain: mirrors cron-detect-solar approach for text extraction.
const GEMINI_MODELS = [
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
]

export async function geminiExtract(
  gatheredText: string,
  geminiKey: string,
): Promise<GeminiExtractResult> {
  const defaultResult: GeminiExtractResult = {
    company: {},
    decision_maker: {},
    confidence: 0,
    sources: [],
  }

  let lastErr = ''
  let allQuota = true

  for (const model of GEMINI_MODELS) {
    let res: Response
    try {
      res = await timedFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: GEMINI_PROMPT + gatheredText.slice(0, 8000) }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
              maxOutputTokens: 600,
            },
          }),
        },
        TIMEOUT_LONG,
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      lastErr = /abort|signal/i.test(msg) ? `gemini_${model}_timeout` : `gemini_${model}_error: ${msg}`
      allQuota = false
      continue
    }

    if (res.ok) {
      // Successfully got a response — parse it
      try {
        const result = await res.json() as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        }
        const raw = result?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!raw) return { ...defaultResult, error: 'no_text_in_gemini_response' }

        const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim()
        const parsed = JSON.parse(cleaned) as {
          company?: {
            name?: string | null
            registrationNo?: string | null
            address?: string | null
            phone?: string | null
            website?: string | null
          }
          decision_maker?: {
            name?: string | null
            role?: string | null
            phone?: string | null
            email?: string | null
            linkedin?: string | null
          }
          confidence?: number
          sources?: string[]
        }

        return {
          company: {
            name: cleanStr(parsed.company?.name ?? undefined) ?? undefined,
            registrationNo: cleanStr(parsed.company?.registrationNo ?? undefined) ?? undefined,
            address: cleanStr(parsed.company?.address ?? undefined) ?? undefined,
            phone: cleanStr(parsed.company?.phone ?? undefined) ?? undefined,
            website: cleanStr(parsed.company?.website ?? undefined) ?? undefined,
          },
          decision_maker: {
            name: cleanStr(parsed.decision_maker?.name ?? undefined) ?? undefined,
            role: cleanStr(parsed.decision_maker?.role ?? undefined) ?? undefined,
            phone: cleanStr(parsed.decision_maker?.phone ?? undefined) ?? undefined,
            email: cleanStr(parsed.decision_maker?.email ?? undefined) ?? undefined,
            linkedin: cleanStr(parsed.decision_maker?.linkedin ?? undefined) ?? undefined,
          },
          confidence: typeof parsed.confidence === 'number'
            ? Math.max(0, Math.min(1, parsed.confidence))
            : 0,
          sources: Array.isArray(parsed.sources)
            ? parsed.sources.filter((s): s is string => typeof s === 'string')
            : [],
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return { ...defaultResult, error: `gemini_parse_error: ${msg}` }
      }
    }

    // Non-OK response
    const statusText = await res.text().catch(() => '')
    lastErr = `gemini_${model}_${res.status}: ${statusText.slice(0, 120)}`

    if (res.status === 429 || res.status === 404) {
      // 429 = quota exhausted for this model; 404 = model unavailable → try next
      continue
    }

    // Any other HTTP error is non-transient — bail immediately
    allQuota = false
    return { ...defaultResult, error: lastErr }
  }

  // All models exhausted
  return {
    ...defaultResult,
    error: lastErr || 'gemini_all_models_exhausted',
    quota_exhausted: allQuota,
  }
}

// ---------------------------------------------------------------------------
// Stage 8: Persist to Supabase
// ---------------------------------------------------------------------------

/**
 * Persist contact discovery results.
 *
 * Always stamps lastResearchedAt + researchStatus in owner_decision.data so
 * the cron queue sentinel is satisfied even when nothing was found.
 *
 * owner_decision lives in the BUSTAN project (schema `bustan`).
 * The flat PATCH to main public.properties (owner_name/phone/website/email)
 * is attempted separately when SUPABASE_URL + SUPABASE_KEY are set.
 */
export async function persistToProperty(
  propertyId: string,
  company: CompanyInfo,
  dm: DecisionMakerInfo,
  confidence: number,
  sources: string[],
  callerName = 'find-contact-core',
): Promise<{ saved: boolean; detail: string }> {
  const now = new Date().toISOString()

  const researchStatus = company.name || dm.name ? 'identified' : 'not_found'
  const sourceUrl = sources.find((s) => /^https?:\/\//.test(s)) ?? ''
  const ownerData: Record<string, unknown> = {
    legalOwnerName: company.name ?? '',
    decisionMakerName: dm.name ?? '',
    decisionMakerRole: dm.role ?? '',
    decisionMakerPhone: dm.phone ?? '',
    decisionMakerEmail: dm.email ?? '',
    decisionMakerLinkedIn: dm.linkedin ?? '',
    companyWebsite: company.website ?? '',
    ownerConfidence: confidence >= 0.7 ? 'high' : confidence >= 0.4 ? 'medium' : 'low',
    decisionMakerConfidence: dm.name ? (confidence >= 0.6 ? 'high' : 'medium') : '',
    sourceName: sources[0] ?? callerName,
    sourceUrl,
    lastResearchedAt: now,
    researchStatus,
    operationalContactName: '',
    operationalContactRole: '',
    operationalContactPhone: '',
    operationalContactEmail: '',
    existingSolarInstallerName: '',
    existingSolarDeveloperName: '',
    existingSolarSourceName: '',
    existingSolarSourceUrl: '',
  }

  // ── Step A: verify property exists in bustan.properties ───────────────────
  let existsInBustan = false
  try {
    const checkUrl = `${BUSTAN_URL}/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}&select=id&limit=1`
    const checkRes = await timedFetch(checkUrl, {
      headers: {
        apikey: BUSTAN_KEY,
        Authorization: `Bearer ${BUSTAN_KEY}`,
        Accept: 'application/json',
        'Accept-Profile': 'bustan',
      },
    }, TIMEOUT_SHORT)
    if (checkRes.ok) {
      const rows = await checkRes.json() as Array<{ id: string }>
      existsInBustan = rows.length > 0
    }
  } catch {
    existsInBustan = false
  }

  // ── Step B: UPSERT bustan.owner_decision (only when FK is satisfied) ───────
  let ownerDecisionSaved = false
  if (existsInBustan) {
    const upsertRes = await fetch(
      `${BUSTAN_URL}/rest/v1/owner_decision?on_conflict=property_id`,
      {
        method: 'POST',
        headers: {
          apikey: BUSTAN_KEY,
          Authorization: `Bearer ${BUSTAN_KEY}`,
          'Content-Type': 'application/json',
          'Content-Profile': 'bustan',
          Prefer: 'return=minimal,resolution=merge-duplicates',
        },
        body: JSON.stringify({
          property_id: propertyId,
          legal_owner_name: company.name ?? null,
          decision_maker_name: dm.name ?? null,
          research_status: researchStatus,
          source_url: sourceUrl,
          data: ownerData,
        }),
      },
    )
    ownerDecisionSaved = upsertRes.ok
  }

  // ── Step C: PATCH flat contact columns on main public.properties ───────────
  let flatPatchSaved = false
  const contactPatch: Record<string, string | null> = {}
  if (company.name) contactPatch.owner_name = company.name
  if (dm.phone ?? company.phone) contactPatch.phone = (dm.phone ?? company.phone) ?? null
  if (company.website) contactPatch.website = company.website
  if (dm.email) contactPatch.email = dm.email

  if (Object.keys(contactPatch).length > 0 && SUPABASE_URL && SUPABASE_KEY) {
    try {
      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(contactPatch),
        },
      )
      flatPatchSaved = patchRes.ok
    } catch {
      flatPatchSaved = false
    }
  } else {
    flatPatchSaved = true // nothing to patch — not a failure
  }

  if (!existsInBustan) {
    return {
      saved: flatPatchSaved,
      detail: 'property not in bustan CRM — flat columns only',
    }
  }

  return {
    saved: ownerDecisionSaved || flatPatchSaved,
    detail: [
      ownerDecisionSaved ? 'owner_decision upserted' : 'owner_decision upsert failed',
      Object.keys(contactPatch).length > 0
        ? (flatPatchSaved ? 'flat columns patched' : 'flat patch failed')
        : '',
    ].filter(Boolean).join(', '),
  }
}

// ---------------------------------------------------------------------------
// Core pipeline — runs all 8 stages for one property
// ---------------------------------------------------------------------------

export interface PipelineInput {
  /** Bustan property id — required; drives the property_load + persist stages. */
  propertyId: string
  /** Pre-seeded from the queue row — saves one network call in the cron path. */
  lat?: number
  lng?: number
  /** Pre-seeded business name (e.g. from bustan.properties.name). */
  name?: string
  juristicId?: string
  website?: string
  /** Label shown in persist.sourceName — defaults to 'find-contact-core'. */
  callerName?: string
}

/**
 * Run the full 8-stage enrichment pipeline for a single property.
 *
 * Returns the full FindContactResult including a `stages` trace.
 * Callers (admin-find-contact, cron-enrich-contacts) layer their own
 * auth + queue logic on top of this function.
 *
 * On Gemini 429 quota exhaustion, `result.stages` will contain a gemini stage
 * with status='failed' and detail containing '_429', and `quota_exhausted` is
 * set on the gemini stage's detail. The cron uses this to defer without stamping.
 */
export async function runFindContactPipeline(input: PipelineInput): Promise<FindContactResult & { gemini_quota_exhausted?: boolean }> {
  const {
    propertyId,
    lat: seedLat,
    lng: seedLng,
    name: seedName,
    juristicId: seedJuristicId,
    website: seedWebsite,
    callerName = 'find-contact-core',
  } = input

  const stages: StageReport[] = []
  const textChunks: string[] = []
  const sources: string[] = []

  let lat = seedLat
  let lng = seedLng
  let companyName = seedName
  let juristicId = seedJuristicId ?? extractJuristicId(seedName)
  let website = seedWebsite

  // ── Stage 1: property_load ─────────────────────────────────────────────────
  if (propertyId) {
    try {
      const row = await loadProperty(propertyId)
      if (row) {
        if (!lat && row.lat != null) lat = row.lat
        if (!lng && row.lng != null) lng = row.lng
        if (!companyName && row.owner_name) companyName = row.owner_name
        if (!website && row.website) website = row.website
        if (!juristicId) juristicId = extractJuristicId(row.owner_name ?? undefined)
        stages.push({ stage: 'property_load', status: 'ok', detail: `loaded: ${row.title ?? propertyId}` })
      } else {
        stages.push({ stage: 'property_load', status: 'failed', detail: 'property not found' })
      }
    } catch (e) {
      stages.push({ stage: 'property_load', status: 'failed', detail: e instanceof Error ? e.message : 'unknown error' })
    }
  } else {
    stages.push({ stage: 'property_load', status: 'skipped', detail: 'no propertyId' })
  }

  // ── Stage 2: geocode (Nominatim) ──────────────────────────────────────────
  if (lat !== undefined && lng !== undefined && !companyName) {
    try {
      const geo = await reverseGeocode(lat, lng)
      if (geo?.name) {
        companyName = geo.name
        textChunks.push(`Reverse geocode result: ${geo.display_name ?? geo.name}`)
        sources.push(`nominatim: ${geo.display_name ?? ''}`)
        stages.push({ stage: 'geocode', status: 'ok', detail: geo.name })
      } else {
        stages.push({ stage: 'geocode', status: 'ok', detail: 'no name returned' })
      }
    } catch (e) {
      stages.push({ stage: 'geocode', status: 'failed', detail: e instanceof Error ? e.message : 'error' })
    }
  } else if (lat === undefined || lng === undefined) {
    stages.push({ stage: 'geocode', status: 'skipped', detail: 'no coordinates' })
  } else {
    stages.push({ stage: 'geocode', status: 'skipped', detail: 'name already known' })
  }

  // ── Stage 3: Overpass POI ──────────────────────────────────────────────────
  if (lat !== undefined && lng !== undefined && !companyName) {
    try {
      const poi = await overpassPOI(lat, lng)
      if (poi) {
        companyName = poi
        textChunks.push(`Overpass POI near coordinates: ${poi}`)
        sources.push(`overpass: ${poi}`)
        stages.push({ stage: 'overpass', status: 'ok', detail: poi })
      } else {
        stages.push({ stage: 'overpass', status: 'ok', detail: 'no named POI found' })
      }
    } catch (e) {
      stages.push({ stage: 'overpass', status: 'failed', detail: e instanceof Error ? e.message : 'error' })
    }
  } else if (lat === undefined || lng === undefined) {
    stages.push({ stage: 'overpass', status: 'skipped', detail: 'no coordinates' })
  } else {
    stages.push({ stage: 'overpass', status: 'skipped', detail: 'name already known' })
  }

  // ── Stage 4: DBD juristic lookup ──────────────────────────────────────────
  if (!juristicId) juristicId = extractJuristicId(companyName)

  if (juristicId) {
    try {
      const dbd = await dbdLookup(juristicId)
      if (dbd) {
        if (!companyName && dbd.name) companyName = dbd.name
        if (!website && dbd.website) website = dbd.website
        const parts = [
          dbd.name ? `Company: ${dbd.name}` : '',
          dbd.registrationNo ? `Registration: ${dbd.registrationNo}` : '',
          dbd.address ? `Address: ${dbd.address}` : '',
          dbd.phone ? `Phone: ${dbd.phone}` : '',
          dbd.website ? `Website: ${dbd.website}` : '',
          dbd.businessType ? `Type: ${dbd.businessType}` : '',
        ].filter(Boolean).join('\n')
        textChunks.push(`DBD official registry data:\n${parts}`)
        sources.push(`dbd.go.th: ${juristicId}`)
        stages.push({ stage: 'dbd', status: 'ok', detail: dbd.name ?? juristicId })
      } else if (!process.env.DBD_API_KEY) {
        stages.push({ stage: 'dbd', status: 'skipped', detail: 'DBD_API_KEY not set' })
      } else {
        stages.push({ stage: 'dbd', status: 'ok', detail: 'not found in registry' })
      }
    } catch (e) {
      stages.push({ stage: 'dbd', status: 'failed', detail: e instanceof Error ? e.message : 'error' })
    }
  } else {
    stages.push({ stage: 'dbd', status: 'skipped', detail: 'no 13-digit juristic ID' })
  }

  // ── Stage 5: Firecrawl search ─────────────────────────────────────────────
  if (companyName && FIRECRAWL_KEY) {
    const { results, error } = await firecrawlSearch(companyName, FIRECRAWL_KEY)
    if (error) {
      stages.push({ stage: 'firecrawl_search', status: 'failed', detail: error })
    } else if (results.length > 0) {
      for (const item of results) {
        const md = (item.markdown ?? item.content ?? '') as string
        if (md.length > 80) {
          textChunks.push(`Web search result (${(item.url as string) ?? 'unknown url'}):\n${md.slice(0, 2000)}`)
          sources.push(String(item.url ?? 'web-search'))
        }
        if (!website && item.url && typeof item.url === 'string') {
          try {
            const u = new URL(item.url)
            if (!u.hostname.includes('google') && !u.hostname.includes('facebook')) {
              website = item.url
            }
          } catch {
            // ignore invalid URL
          }
        }
      }
      stages.push({ stage: 'firecrawl_search', status: 'ok', detail: `${results.length} results` })
    } else {
      stages.push({ stage: 'firecrawl_search', status: 'ok', detail: 'no results' })
    }
  } else if (!FIRECRAWL_KEY) {
    stages.push({ stage: 'firecrawl_search', status: 'skipped', detail: 'FIRECRAWL_API_KEY not set' })
  } else {
    stages.push({ stage: 'firecrawl_search', status: 'skipped', detail: 'no company name to search' })
  }

  // ── Stage 6: Firecrawl scrape ─────────────────────────────────────────────
  if (website && FIRECRAWL_KEY) {
    const { markdown, error } = await firecrawlScrape(website, FIRECRAWL_KEY)
    if (error && error !== 'no_content') {
      stages.push({ stage: 'firecrawl_scrape', status: 'failed', detail: error })
    } else if (markdown) {
      textChunks.push(`Company website contact page:\n${markdown.slice(0, 2000)}`)
      sources.push(website)
      stages.push({ stage: 'firecrawl_scrape', status: 'ok', detail: `${markdown.length} chars` })
    } else {
      stages.push({ stage: 'firecrawl_scrape', status: 'ok', detail: 'no content returned' })
    }
  } else if (!FIRECRAWL_KEY) {
    stages.push({ stage: 'firecrawl_scrape', status: 'skipped', detail: 'FIRECRAWL_API_KEY not set' })
  } else {
    stages.push({ stage: 'firecrawl_scrape', status: 'skipped', detail: 'no website URL' })
  }

  // ── Stage 7: Gemini extraction ────────────────────────────────────────────
  let company: CompanyInfo = {}
  let decisionMaker: DecisionMakerInfo = {}
  let confidence = 0
  let geminiQuotaExhausted = false

  if (textChunks.length > 0 && GEMINI_KEY) {
    const gathered = textChunks.join('\n\n---\n\n')
    const result = await geminiExtract(gathered, GEMINI_KEY)
    if (result.quota_exhausted) {
      // Transient quota — propagate upward so cron can defer without stamping
      geminiQuotaExhausted = true
      stages.push({ stage: 'gemini', status: 'failed', detail: result.error ?? 'gemini_quota_429' })
      company = { name: companyName, website }
    } else if (result.error) {
      stages.push({ stage: 'gemini', status: 'failed', detail: result.error })
      company = { name: companyName, website }
    } else {
      company = result.company
      decisionMaker = result.decision_maker
      confidence = result.confidence
      for (const s of result.sources) {
        if (!sources.includes(s)) sources.push(s)
      }
      if (!company.name && companyName) company.name = companyName
      if (!company.website && website) company.website = website
      stages.push({ stage: 'gemini', status: 'ok', detail: `confidence ${confidence.toFixed(2)}` })
    }
  } else if (!GEMINI_KEY) {
    stages.push({ stage: 'gemini', status: 'skipped', detail: 'GEMINI_API_KEY not set — using raw stage data' })
    company = { name: companyName, website }
    confidence = 0.1
  } else {
    stages.push({ stage: 'gemini', status: 'skipped', detail: 'no gathered text to analyse' })
    company = { name: companyName, website }
    confidence = 0.05
  }

  // Confidence penalty for skipped/failed stages
  const penaltyStages = stages.filter(
    (s) => s.status === 'failed' || (s.status === 'skipped' && s.stage !== 'property_load'),
  )
  confidence = Math.max(0, confidence - penaltyStages.length * 0.04)

  // If Gemini quota was exhausted, return early WITHOUT persisting — the cron
  // will leave the row unstamped so it retries on the next tick.
  if (geminiQuotaExhausted) {
    return {
      company,
      decision_maker: decisionMaker,
      confidence,
      sources,
      stages,
      saved: false,
      gemini_quota_exhausted: true,
    }
  }

  // ── Stage 8: Persist ──────────────────────────────────────────────────────
  let saved = false
  try {
    const persistResult = await persistToProperty(propertyId, company, decisionMaker, confidence, sources, callerName)
    saved = persistResult.saved
    stages.push({ stage: 'persist', status: persistResult.saved ? 'ok' : 'failed', detail: persistResult.detail })
  } catch (e) {
    stages.push({ stage: 'persist', status: 'failed', detail: e instanceof Error ? e.message : 'error' })
  }

  return {
    company,
    decision_maker: decisionMaker,
    confidence,
    sources,
    stages,
    saved,
  }
}

