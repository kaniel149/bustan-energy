/**
 * /api/admin-find-contact
 *
 * POST { propertyId?, lat?, lng?, name?, juristicId?, website? }
 *   → {
 *       ok: true,
 *       company: { name, registrationNo, address, phone, website },
 *       decision_maker: { name, role, phone, email, linkedin },
 *       confidence: 0-1,
 *       sources: string[],
 *       stages: StageReport[],
 *       saved: boolean,
 *     }
 *   → { ok: false, error: string }  (4xx/5xx on hard failures)
 *
 * STAGE ORDER
 *   1. property_load   — load existing row from Supabase if propertyId given
 *   2. geocode         — Nominatim reverse-geocode when coords present but no name
 *   3. overpass        — Overpass API POI lookup (~80 m radius) for business name
 *   4. dbd             — DBD Open API (13-digit juristic ID)
 *   5. firecrawl_search — Firecrawl /v1/search (contact + company web discovery)
 *   6. firecrawl_scrape — Firecrawl /v1/scrape on the known website contact/about page
 *   7. gemini           — LLM extraction of gathered text into structured JSON
 *   8. persist          — UPSERT into owner_decision table + flat contact columns
 *
 * Graceful degradation: each stage may be SKIPPED (no key/data) or FAILED (upstream
 * error). Confidence degrades with each skip/failure. Always returns HTTP 200 with
 * whatever was discovered + a `stages` array reporting what ran / was skipped / failed.
 *
 * LEGAL / PDPA
 *   Only requests and returns BUSINESS / ROLE-BASED contact information found in
 *   public professional sources. The Gemini prompt explicitly forbids private
 *   individual personal data (PDPA B.E. 2562). Directors visible in official DBD
 *   records are public juristic-person data; personal phone numbers of private
 *   individuals are not returned.
 */
export const config = { runtime: 'edge' }

import { isAllowedAdmin } from './_lib/admin-access.js'

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

// Main project (public schema) — proposals, properties flat columns, auth
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Bustan CRM project (bustan schema) — owner_decision, bustan.properties
const BUSTAN_URL = process.env.BUSTAN_SUPABASE_URL || 'https://ygoiaabzkuvdsyyduvhv.supabase.co'
const BUSTAN_KEY = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY!

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NANOBANANA_API_KEY
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestBody {
  propertyId?: unknown
  lat?: unknown
  lng?: unknown
  name?: unknown
  juristicId?: unknown
  website?: unknown
}

type StageStatus = 'ok' | 'skipped' | 'failed'

interface StageReport {
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

export interface FindContactResponse {
  ok: true
  company: CompanyInfo
  decision_maker: DecisionMakerInfo
  confidence: number
  sources: string[]
  stages: StageReport[]
  saved: boolean
}

interface PropertyRow {
  id: string
  owner_name: string | null
  phone: string | null
  website: string | null
  email: string | null
  lat: number | null
  lng: number | null
  title: string | null
}

interface NominatimResponse {
  display_name?: string
  address?: Record<string, string>
  error?: string
  name?: string
  [key: string]: unknown
}

interface OverpassElement {
  tags?: Record<string, string>
}

interface FirecrawlSearchResult {
  url?: string
  markdown?: string
  content?: string
  json?: Record<string, unknown>
  extract?: Record<string, unknown>
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse'
const OVERPASS_API = 'https://overpass-api.de/api/interpreter'
const DBD_BASE = 'https://openapi.dbd.go.th/api/v1/juristic_person'
const FIRECRAWL_SEARCH_URL = 'https://api.firecrawl.dev/v1/search'
const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v1/scrape'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
const USER_AGENT = 'solar-intelligence/1.0 (k@kanielt.com)'

const TIMEOUT_SHORT = 8_000
const TIMEOUT_MED = 15_000
const TIMEOUT_LONG = 20_000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.replace(/\*\*/g, '').replace(/[`_]/g, '').replace(/\s{2,}/g, ' ').trim()
  return s.length ? s : undefined
}

/** Extract 13-digit juristic ID from a string, if present. */
function extractJuristicId(s: string | undefined): string | undefined {
  if (!s) return undefined
  const m = s.replace(/[\s-]/g, '').match(/\b\d{13}\b/)
  return m ? m[0] : undefined
}

async function timedFetch(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ac.signal })
  } finally {
    clearTimeout(t)
  }
}

// ---------------------------------------------------------------------------
// Admin auth — mirrors admin-stats.ts / admin-analyze-roof.ts pattern exactly
// ---------------------------------------------------------------------------

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return null
  const user = await r.json() as { email?: string }
  const email = user?.email?.toLowerCase()
  return email && isAllowedAdmin(email) ? email : null
}

// ---------------------------------------------------------------------------
// Stage 1: Load property row from Supabase
// ---------------------------------------------------------------------------

/**
 * Try main public.properties first (has owner_name/phone/website/email/lat/lng).
 * If not found there, try bustan.properties (bustan schema, uses lat/lon columns
 * and name instead of title) — this handles CRM-only leads that were never in
 * the main project's property catalogue.
 */
async function loadProperty(propertyId: string): Promise<PropertyRow | null> {
  // 1) Main project public schema
  try {
    const url = `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}&select=id,owner_name,phone,website,email,lat,lng,title&limit=1`
    const r = await timedFetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' },
    }, TIMEOUT_SHORT)
    if (r.ok) {
      const rows = await r.json() as PropertyRow[]
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
    // Map bustan schema columns → PropertyRow shape
    return {
      id: row.id,
      owner_name: null,
      phone: null,
      website: null,
      email: null,
      lat: row.lat,
      lng: row.lon,   // bustan uses `lon`, map to our `lng`
      title: row.name,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Stage 2: Nominatim reverse-geocode
// ---------------------------------------------------------------------------

async function reverseGeocode(lat: number, lng: number): Promise<{ name?: string; display_name?: string } | null> {
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

async function overpassPOI(lat: number, lng: number, radiusM = 80): Promise<string | null> {
  // Query named nodes/ways for building, amenity, shop, office, industrial within radius
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
    // Prefer elements with operator tag, then name
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

/** Recursively collect non-PII string leaves from DBD payload. */
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

async function dbdLookup(juristicId: string): Promise<DbdResult | null> {
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
// Stage 5: Firecrawl search (contact discovery)
// ---------------------------------------------------------------------------

async function firecrawlSearch(companyName: string, apiKey: string): Promise<{ results: FirecrawlSearchResult[]; error?: string }> {
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
// Stage 6: Firecrawl scrape (known website contact/about page)
// ---------------------------------------------------------------------------

async function firecrawlScrape(websiteUrl: string, apiKey: string): Promise<{ markdown?: string; error?: string }> {
  // Try /contact then /about-us — pick the first we can hit
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

async function geminiExtract(
  gatheredText: string,
  geminiKey: string,
): Promise<{
  company: CompanyInfo
  decision_maker: DecisionMakerInfo
  confidence: number
  sources: string[]
  error?: string
}> {
  const defaultResult = {
    company: {},
    decision_maker: {},
    confidence: 0,
    sources: [] as string[],
  }

  try {
    const r = await timedFetch(
      `${GEMINI_URL}?key=${geminiKey}`,
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

    if (!r.ok) {
      const detail = await r.text()
      return { ...defaultResult, error: `gemini_http_${r.status}: ${detail.slice(0, 200)}` }
    }

    const result = await r.json() as {
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
    return { ...defaultResult, error: /abort|signal/i.test(msg) ? 'gemini_timeout' : `gemini_error: ${msg}` }
  }
}

// ---------------------------------------------------------------------------
// Stage 8: Persist results to Supabase
// ---------------------------------------------------------------------------

/**
 * Persist contact discovery results.
 *
 * owner_decision lives in the BUSTAN Supabase project (schema `bustan`), not in
 * the main project's public schema. We must use BUSTAN_URL + BUSTAN_KEY with
 * Content-Profile / Accept-Profile: bustan headers, mirroring the pattern from
 * cron-process-scans.ts:bustanHeaders().
 *
 * Before upserting owner_decision we verify the property exists in bustan.properties
 * (same project, same schema). If it does not, we skip the upsert and only update
 * the flat contact columns on main public.properties — those are two different ID
 * spaces and we must not create orphaned owner_decision rows.
 *
 * The flat PATCH to main public.properties (owner_name/phone/website/email) is kept
 * as-is — those columns exist there per migration 002_properties.sql.
 */
async function persistToProperty(
  propertyId: string,
  company: CompanyInfo,
  dm: DecisionMakerInfo,
  confidence: number,
  sources: string[],
): Promise<{ saved: boolean; detail: string }> {
  const now = new Date().toISOString()

  // Build the owner_decision data blob — matches BustanOwnerRow.data jsonb
  const researchStatus = company.name || dm.name ? 'identified' : 'needs_research'
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
    sourceName: sources[0] ?? 'admin-find-contact',
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
  // owner_decision.property_id is a FK to bustan.properties — do not create
  // orphaned rows. IDs in bustan.properties and public.properties are independent.
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
    // Use Content-Profile: bustan for writes (mirrors bustanHeaders(write=true))
    // ?on_conflict=property_id triggers the upsert merge on the unique column
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
  // These columns (owner_name, phone, website, email) live in public.properties
  // on the MAIN project — separate from bustan schema. Always attempt this patch
  // regardless of whether bustan.properties has the property.
  let flatPatchSaved = false
  const contactPatch: Record<string, string | null> = {}
  if (company.name) contactPatch.owner_name = company.name
  if (dm.phone ?? company.phone) contactPatch.phone = (dm.phone ?? company.phone) ?? null
  if (company.website) contactPatch.website = company.website
  if (dm.email) contactPatch.email = dm.email

  if (Object.keys(contactPatch).length > 0) {
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
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 })
  }

  const admin = await verifyAdmin(req)
  if (!admin) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const propertyId = isNonEmptyString(body.propertyId) ? body.propertyId.trim() : undefined
  const inputLat = typeof body.lat === 'string' ? parseFloat(body.lat) : body.lat
  const inputLng = typeof body.lng === 'string' ? parseFloat(body.lng) : body.lng
  const inputLat2 = isFiniteNumber(inputLat) ? inputLat : undefined
  const inputLng2 = isFiniteNumber(inputLng) ? inputLng : undefined
  const inputName = isNonEmptyString(body.name) ? body.name.trim() : undefined
  const inputJuristicId = isNonEmptyString(body.juristicId)
    ? extractJuristicId(body.juristicId.trim()) ?? undefined
    : undefined
  const inputWebsite = isNonEmptyString(body.website) ? body.website.trim() : undefined

  if (!propertyId && inputLat2 === undefined && !inputName && !inputJuristicId && !inputWebsite) {
    return Response.json(
      { ok: false, error: 'Provide at least one of: propertyId, lat+lng, name, juristicId, website' },
      { status: 400 },
    )
  }

  const stages: StageReport[] = []

  // Accumulated context for Gemini
  const textChunks: string[] = []
  const sources: string[] = []

  // Working variables — may be filled by any stage
  let lat = inputLat2
  let lng = inputLng2
  let companyName = inputName
  let juristicId = inputJuristicId ?? extractJuristicId(inputName)
  let website = inputWebsite

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
  // Re-check after name stages may have yielded a new juristicId in companyName
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
        // If we still have no website, pick the first credible URL
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

  // ── Stage 6: Firecrawl scrape (website contact/about page) ────────────────
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

  if (textChunks.length > 0 && GEMINI_KEY) {
    const gathered = textChunks.join('\n\n---\n\n')
    const result = await geminiExtract(gathered, GEMINI_KEY)
    if (result.error) {
      stages.push({ stage: 'gemini', status: 'failed', detail: result.error })
      // Fall back to whatever we have from DBD / geocode
      company = { name: companyName, website }
    } else {
      company = result.company
      decisionMaker = result.decision_maker
      confidence = result.confidence
      for (const s of result.sources) {
        if (!sources.includes(s)) sources.push(s)
      }
      // Back-fill company name from earlier stages if Gemini couldn't find it
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

  // Degrade confidence by number of skipped/failed stages (max -0.3 total)
  const penaltyStages = stages.filter((s) => s.status === 'failed' || (s.status === 'skipped' && s.stage !== 'property_load'))
  confidence = Math.max(0, confidence - penaltyStages.length * 0.04)

  // ── Stage 8: Persist ──────────────────────────────────────────────────────
  let saved = false
  if (propertyId && (company.name || decisionMaker.name)) {
    try {
      const persistResult = await persistToProperty(propertyId, company, decisionMaker, confidence, sources)
      saved = persistResult.saved
      stages.push({ stage: 'persist', status: persistResult.saved ? 'ok' : 'failed', detail: persistResult.detail })
    } catch (e) {
      stages.push({ stage: 'persist', status: 'failed', detail: e instanceof Error ? e.message : 'error' })
    }
  } else {
    stages.push({
      stage: 'persist',
      status: 'skipped',
      detail: !propertyId ? 'no propertyId' : 'nothing to persist',
    })
  }

  const response: FindContactResponse = {
    ok: true,
    company,
    decision_maker: decisionMaker,
    confidence,
    sources,
    stages,
    saved,
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
