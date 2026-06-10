// ── Client-side attribution capture ──────────────────────────
//
// Captures UTM params + click IDs (gclid/fbclid/ttclid) from the URL on page
// load, augments with a document.referrer fallback when no UTM params are
// present, and persists the result in localStorage (first-touch, 30-day TTL)
// so it survives SPA route changes and return visits.
//
// Ported from Solaris Panama platform/src/lib/attribution.ts.
//
// Usage:
//   1. Call `initAttribution()` once at app entry (main.tsx).
//   2. Call `getAttribution()` at form submit time and spread into the
//      /api/contact-lead payload.

const STORAGE_KEY = 'bustan_attribution'
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface AttributionData {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  gclid: string | null
  fbclid: string | null
  ttclid: string | null
  /** Normalised referrer source set when no UTM params are present */
  referrer_source: string | null
  /** Raw document.referrer value at time of capture */
  referrer_url: string | null
  /** Full URL of the first page the visitor landed on */
  landing_page: string | null
}

interface StoredAttribution extends AttributionData {
  captured_at: number
}

/** Infer a canonical referrer_source from document.referrer.
 *  Keep in sync with api/_lib/attribution.ts REFERRER_SOURCE_MAP. */
function parseReferrerSource(referrer: string): string | null {
  if (!referrer) return null
  try {
    const host = new URL(referrer).hostname.toLowerCase()
    if (host.includes('google.')) return 'google_organic'
    if (host.includes('facebook.') || host.includes('fb.com')) return 'facebook'
    if (host.includes('instagram.')) return 'instagram'
    if (host.includes('tiktok.')) return 'tiktok'
    if (host.includes('bing.')) return 'bing_organic'
    if (host.includes('yahoo.')) return 'yahoo_organic'
  } catch {
    // invalid URL — ignore
  }
  return null
}

function readStored(): StoredAttribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAttribution
    if (!parsed.captured_at || Date.now() - parsed.captured_at > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function captureFromUrl(): AttributionData {
  const params = new URLSearchParams(window.location.search)

  const utm_source = params.get('utm_source')
  const gclid = params.get('gclid')
  const fbclid = params.get('fbclid')
  const ttclid = params.get('ttclid')

  // Referrer fallback — only used when no click-id or UTM present
  const referrer_url = document.referrer || null
  const referrer_source =
    !utm_source && !gclid && !fbclid && !ttclid
      ? parseReferrerSource(referrer_url || '')
      : null

  return {
    utm_source: utm_source || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
    utm_content: params.get('utm_content') || null,
    utm_term: params.get('utm_term') || null,
    gclid: gclid || null,
    fbclid: fbclid || null,
    ttclid: ttclid || null,
    referrer_source,
    referrer_url,
    landing_page: window.location.href || null,
  }
}

/**
 * Capture attribution from the current URL + document.referrer.
 * First-touch model: does NOT overwrite an existing (non-expired) entry.
 * No-ops entirely outside the browser or when storage is blocked.
 */
export function initAttribution(): void {
  if (typeof window === 'undefined') return

  try {
    if (readStored()) return // first-touch — keep the original capture
  } catch {
    return
  }

  const data = captureFromUrl()

  // Only persist if there is something worth storing
  const hasData =
    data.utm_source || data.utm_medium || data.gclid || data.fbclid ||
    data.ttclid || data.referrer_source

  if (!hasData) return

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...data, captured_at: Date.now() } satisfies StoredAttribution),
    )
  } catch {
    // localStorage blocked (private mode, full storage) — degrade gracefully
  }
}

/**
 * Return the stored attribution data for inclusion in form submission payloads.
 * Falls back to reading live URL params if localStorage is unavailable.
 */
export function getAttribution(): AttributionData {
  const empty: AttributionData = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    gclid: null,
    fbclid: null,
    ttclid: null,
    referrer_source: null,
    referrer_url: null,
    landing_page: null,
  }

  if (typeof window === 'undefined') return empty

  const stored = readStored()
  if (stored) {
    const data = { ...stored } as Partial<StoredAttribution>
    delete data.captured_at
    return data as AttributionData
  }

  // Fallback: read from current URL (works for single-page visits)
  return captureFromUrl()
}
