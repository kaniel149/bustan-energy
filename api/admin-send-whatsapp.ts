// ============================================================
// /api/admin-send-whatsapp — send one WhatsApp message to a lead's contact
//
// POST { propertyId: string, message: string, language?: 'th'|'en' }
//   Bearer <admin user token> (same gate as admin-create-proposal).
//   Phone comes from bustan.owner_decision.data (phone / decisionMakerPhone /
//   operationalContactPhone) — never from the request body, so the UI cannot
//   be used to message arbitrary numbers.
//
// Safe mode: OUTREACH_SELF_SEND=1 redirects to OUTREACH_TEST_WHATSAPP with a
// "[TEST→…]" prefix (see _lib/whatsapp-safe.ts); the response carries
// test:true so the UI can show a badge.
//
// Every attempt is logged to bustan.outreach_messages (channel 'whatsapp'):
// sent → status 'sent'; failure → status 'bounced' + error. The partial unique
// index (property_id, channel) where status not in (skipped,bounced) allows
// one live thread per property, so a re-send PATCHes that row instead.
// ============================================================
export const config = { runtime: 'nodejs' }

import { nodeHandler } from './_lib/node-web-adapter.js'
import { isAllowedAdmin } from './_lib/admin-access.js'
import { bGet, bPost, bPatch } from './_lib/bustan-db.js'
import { sendWhatsApp, isWhatsAppConfigured } from './_lib/whatsapp.js'
import { resolveWhatsAppTarget } from './_lib/whatsapp-safe.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUSTAN_KEY = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY

const MAX_MESSAGE_CHARS = 2000
const PHONE_KEYS = ['phone', 'decisionMakerPhone', 'operationalContactPhone', 'businessPhone'] as const

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

interface OwnerRow { property_id: string; data: Record<string, unknown> | null }
interface OutreachRow { id: string }

function pickPhone(data: Record<string, unknown> | null): string | null {
  for (const k of PHONE_KEYS) {
    const v = data?.[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 })
  if (!SUPABASE_URL || !SUPABASE_KEY || !BUSTAN_KEY) return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })

  const email = await verifyAdmin(req)
  if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { propertyId?: unknown; message?: unknown; language?: unknown }
  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const language = body.language === 'th' ? 'th' : 'en'
  if (!propertyId || !message) return Response.json({ ok: false, error: 'missing_required' }, { status: 400 })
  if (message.length > MAX_MESSAGE_CHARS) return Response.json({ ok: false, error: 'message_too_long' }, { status: 400 })
  if (!isWhatsAppConfigured()) return Response.json({ ok: false, error: 'not_configured' }, { status: 503 })

  const owners = await bGet<OwnerRow>(`owner_decision?property_id=eq.${encodeURIComponent(propertyId)}&select=property_id,data&limit=1`)
  const rawPhone = pickPhone(owners[0]?.data ?? null)
  if (!rawPhone) return Response.json({ ok: false, error: 'no_phone' }, { status: 400 })

  const target = resolveWhatsAppTarget(rawPhone, message)
  if (!target) return Response.json({ ok: false, error: 'invalid_phone' }, { status: 400 })

  const result = await sendWhatsApp(target.phone, target.message)
  const now = new Date().toISOString()

  // Audit trail — one live whatsapp row per property (partial unique index).
  const logRow = {
    property_id: propertyId,
    channel: 'whatsapp',
    language,
    recipient: target.phone,
    body: message,
    status: result.ok ? 'sent' : 'bounced',
    sent_at: result.ok ? now : null,
    thread_ref: result.idMessage ?? null,
    error: result.ok ? null : (result.error ?? 'send_failed'),
    facts: { test: target.test, sent_by: email, real_recipient: target.test ? rawPhone : undefined },
  }
  const live = result.ok
    ? await bGet<OutreachRow>(`outreach_messages?property_id=eq.${encodeURIComponent(propertyId)}&channel=eq.whatsapp&status=not.in.(skipped,bounced)&select=id&limit=1`)
    : []
  if (live[0]) {
    const { language: lang, recipient, body: text, status, sent_at, thread_ref, error, facts } = logRow
    const r = await bPatch(`outreach_messages?id=eq.${live[0].id}`, { language: lang, recipient, body: text, status, sent_at, thread_ref, error, facts })
    if (!r.ok) console.error('admin-send-whatsapp: log patch failed', r.status)
  } else {
    const inserted = await bPost('outreach_messages', logRow)
    if (!inserted) console.error('admin-send-whatsapp: log insert failed')
  }

  if (!result.ok) return Response.json({ ok: false, test: target.test, error: result.error }, { status: 502 })
  return Response.json({ ok: true, test: target.test, idMessage: result.idMessage, recipient: target.phone })
}

// Node runtime passes (IncomingMessage, ServerResponse) — adapt to the web handler above.
export default nodeHandler(handler)
