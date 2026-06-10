// ── Meta Conversions API (CAPI) — server-side event reporting ──
//
// Why this exists: client-side `fbq('track','Lead')` loses ~30% of events on
// iOS (ITP, ad-blockers, network errors). CAPI sends the event server-side
// with hashed user data so Meta can match it back to the click.
//
// Edge-compatible port of Solaris Panama platform/api/lib/meta-capi.ts
// (Web Crypto instead of node:crypto — works in Vercel Edge runtime).
//
// Dedup with browser pixel: pass the SAME event_id to both fbq() and CAPI.
// Meta dedups on (event_name, event_id) within a 7-day window.
// IMPORTANT (Panama lesson): never regenerate event_id on retries — the
// client generates it once per submission and the server reuses it as-is.
//
// Env vars (ALL optional — module no-ops gracefully when missing, since
// TM's Meta business verification is still pending):
//   - META_PIXEL_ID          (Pixel ID from Events Manager)
//   - META_ACCESS_TOKEN      (System User token w/ ads_management permission)
//   - META_TEST_EVENT_CODE   (optional — TEST123... from Events Manager Test Events)

import { sha256hex } from './crypto.js'
import { supaPost } from './supa.js'

const GRAPH_VERSION = 'v21.0'

export type MetaEventName = 'Lead' | 'CompleteRegistration' | 'Purchase' | 'Contact' | 'Schedule'

export interface CapiEventParams {
  eventName: MetaEventName
  eventId: string // stable UUID — must match browser fbq eventID (do NOT regenerate)
  eventTime?: number // unix seconds (default: now)
  email?: string | null
  phone?: string | null // any format — normalized to digits before hashing
  firstName?: string | null
  lastName?: string | null
  city?: string | null
  country?: string // 2-letter ISO, default 'th'
  externalId?: string // internal lead/project id
  fbc?: string | null // _fbc cookie (fb.1.<ts>.<fbclid>)
  fbp?: string | null // _fbp cookie (fb.1.<ts>.<random>)
  clientIp?: string | null
  clientUserAgent?: string | null
  sourceUrl?: string
  value?: number // for Purchase events
  currency?: string // 'THB' | 'USD'
  contentName?: string
  customData?: Record<string, unknown>
}

export interface CapiResult {
  ok: boolean
  /** false when META_PIXEL_ID / META_ACCESS_TOKEN are not configured */
  enabled: boolean
  status: number
  body: unknown
  durationMs: number
}

export function isMetaCapiEnabled(): boolean {
  return !!(process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN)
}

const hash = (s: string) => sha256hex(s.trim().toLowerCase())

const normalizePhone = (p: string): string => p.replace(/\D/g, '')

export async function sendMetaCapiEvent(params: CapiEventParams): Promise<CapiResult> {
  const start = Date.now()
  const pixelId = process.env.META_PIXEL_ID
  const accessToken = process.env.META_ACCESS_TOKEN
  const testCode = process.env.META_TEST_EVENT_CODE

  if (!pixelId || !accessToken) {
    // Graceful no-op — TM Meta business verification pending
    return { ok: false, enabled: false, status: 0, body: { skipped: 'META_PIXEL_ID or META_ACCESS_TOKEN not set' }, durationMs: 0 }
  }

  const userData: Record<string, unknown> = {}
  if (params.email) userData.em = [await hash(params.email)]
  if (params.phone) userData.ph = [await hash(normalizePhone(params.phone))]
  if (params.firstName) userData.fn = [await hash(params.firstName)]
  if (params.lastName) userData.ln = [await hash(params.lastName)]
  if (params.city) userData.ct = [await hash(params.city)]
  userData.country = [await hash(params.country || 'th')]
  if (params.externalId) userData.external_id = [await hash(params.externalId)]
  if (params.fbc) userData.fbc = params.fbc
  if (params.fbp) userData.fbp = params.fbp
  if (params.clientIp) userData.client_ip_address = params.clientIp
  if (params.clientUserAgent) userData.client_user_agent = params.clientUserAgent

  const customData: Record<string, unknown> = { ...(params.customData || {}) }
  if (params.value !== undefined) customData.value = params.value
  if (params.currency) customData.currency = params.currency
  if (params.contentName) customData.content_name = params.contentName

  const event: Record<string, unknown> = {
    event_name: params.eventName,
    event_time: params.eventTime || Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    action_source: 'website',
    user_data: userData,
  }
  if (params.sourceUrl) event.event_source_url = params.sourceUrl
  if (Object.keys(customData).length > 0) event.custom_data = customData

  const payload: Record<string, unknown> = { data: [event] }
  if (testCode) payload.test_event_code = testCode

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${accessToken}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body: unknown = await res.json().catch(() => ({}))
    return { ok: res.ok, enabled: true, status: res.status, body, durationMs: Date.now() - start }
  } catch (err) {
    return { ok: false, enabled: true, status: 0, body: { error: String(err) }, durationMs: Date.now() - start }
  }
}

/**
 * CAPI send + audit trail in Supabase webhook_logs (migration 019).
 * Never throws; skips the log row entirely when CAPI is not configured.
 */
export async function sendMetaCapiEventLogged(params: CapiEventParams): Promise<CapiResult> {
  const result = await sendMetaCapiEvent(params)
  if (!result.enabled) return result

  try {
    const errBody = result.body as { error?: { message?: string } } | null
    await supaPost('webhook_logs', {
      source: 'capi',
      direction: 'out',
      status_code: result.status,
      payload: { event_name: params.eventName, event_id: params.eventId, value: params.value ?? null },
      response: result.body,
      error: result.ok ? null : errBody?.error?.message || 'capi_failed',
      duration_ms: result.durationMs,
    })
  } catch {
    /* swallow — logging failure shouldn't break lead flow */
  }
  return result
}
