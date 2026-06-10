// ── GA4 / Google Ads ───────────────────────────────────────
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined
const GOOGLE_ADS_LEAD_LABEL = import.meta.env
  .VITE_GOOGLE_ADS_LEAD_CONVERSION_LABEL as string | undefined

// ── Meta Pixel ─────────────────────────────────────────────
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined

/** Inject the GA4 gtag.js script dynamically */
function initGA4() {
  if (!GA4_ID && !GOOGLE_ADS_ID) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID || GOOGLE_ADS_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  if (GA4_ID) window.gtag('config', GA4_ID)
  if (GOOGLE_ADS_ID) window.gtag('config', GOOGLE_ADS_ID)
}

/** Inject the Meta Pixel — no-op until VITE_META_PIXEL_ID is set
 *  (TM Meta business verification pending). */
function initMetaPixel() {
  if (!META_PIXEL_ID || window.fbq) return

  const fbq = ((...args: unknown[]) => {
    const pixel = window.fbq
    if (pixel?.callMethod) {
      pixel.callMethod(...args)
    } else {
      pixel?.queue?.push(args)
    }
  }) as NonNullable<Window['fbq']>

  window.fbq = fbq
  window._fbq = fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)

  fbq('init', META_PIXEL_ID)
  fbq('track', 'PageView')
}

// ── Public API ─────────────────────────────────────────────

/** Call once at app startup (e.g. in main.tsx) */
export function initAnalytics() {
  // PostHog is initialized via snippet in index.html
  // GA4 + Meta Pixel are initialized dynamically here
  initGA4()
  initMetaPixel()
}

/** Identify a logged-in user (call after auth) */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>,
) {
  if (window.posthog?.identify) {
    window.posthog.identify(userId, properties)
  }
  if (GA4_ID && window.gtag) {
    window.gtag('set', { user_id: userId })
  }
}

/** Track a custom event */
export function trackEvent(
  name: string,
  properties?: Record<string, unknown>,
) {
  if (window.posthog?.capture) {
    window.posthog.capture(name, properties)
  }
  if (GA4_ID && window.gtag) {
    window.gtag('event', name, properties)
  }
}

/** Reset analytics state on logout */
export function resetAnalytics() {
  if (window.posthog?.reset) {
    window.posthog.reset()
  }
}

// ── Lead conversion tracking (GA4 + Google Ads EC + Meta Pixel) ──

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Generate a stable Meta dedup event id (one per form submission —
 *  reuse across retries, never regenerate). */
export function newEventId(): string {
  return uuid()
}

async function sha256(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return text
  const buf = new TextEncoder().encode(text.trim().toLowerCase())
  const hashBuf = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

/** Thai phone → E.164 (0812345678 → +66812345678) */
function normalizePhoneE164TH(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('66')) return `+${digits}`
  if (digits.startsWith('0')) return `+66${digits.slice(1)}`
  return `+${digits}`
}

/**
 * Read the _fbc/_fbp Meta cookies — required by CAPI for click matching.
 * Builds _fbc on the fly when the URL still carries fbclid.
 */
export function getMetaClickIds(): { fbc: string | null; fbp: string | null } {
  let fbc = getCookie('_fbc')
  const fbp = getCookie('_fbp')
  if (!fbc && typeof window !== 'undefined') {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid')
    if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`
  }
  return { fbc, fbp }
}

export interface LeadConversionParams {
  /** Stable event id for browser-pixel/CAPI dedup — pass the SAME id sent to /api/contact-lead */
  eventId: string
  email?: string | null
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  value?: number
  currency?: string // default 'THB'
}

/**
 * Fire the browser-side lead conversion:
 *   - GA4 `generate_lead`
 *   - Google Ads conversion + Enhanced Conversions (hashed user_data) when
 *     VITE_GOOGLE_ADS_ID + VITE_GOOGLE_ADS_LEAD_CONVERSION_LABEL are set
 *   - Meta Pixel `Lead` with eventID matching the server CAPI event
 * Every branch no-ops when its env var is missing; never throws
 * (ad-blockers must not break form submission).
 */
export async function trackLeadConversion(params: LeadConversionParams): Promise<void> {
  if (typeof window === 'undefined') return

  const value = params.value ?? 1.0
  const currency = params.currency ?? 'THB'

  // Google — GA4 event + Ads conversion with Enhanced Conversions
  try {
    if (typeof window.gtag === 'function') {
      if (params.email || params.phone) {
        const userData: Record<string, unknown> = {}
        if (params.email) userData.sha256_email_address = await sha256(params.email)
        if (params.phone) {
          userData.sha256_phone_number = await sha256(normalizePhoneE164TH(params.phone))
        }
        if (params.firstName) userData.sha256_first_name = await sha256(params.firstName)
        if (params.lastName) userData.sha256_last_name = await sha256(params.lastName)
        window.gtag('set', 'user_data', userData)
      }

      if (GA4_ID) {
        window.gtag('event', 'generate_lead', {
          value,
          currency,
          transaction_id: params.eventId,
        })
      }

      if (GOOGLE_ADS_ID && GOOGLE_ADS_LEAD_LABEL) {
        window.gtag('event', 'conversion', {
          send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_LEAD_LABEL}`,
          value,
          currency,
          transaction_id: params.eventId, // dedup
        })
      }
    }
  } catch {
    /* ad-blocker — ignore */
  }

  // Meta Pixel — eventID must match server CAPI event_id for dedup
  try {
    if (META_PIXEL_ID && typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', { value, currency }, { eventID: params.eventId })
    }
  } catch {
    /* ad-blocker — ignore */
  }
}
