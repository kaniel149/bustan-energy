// ── GreenAPI WhatsApp helpers (Edge-compatible, fetch-only) ──
// Sends plain-text WhatsApp messages through GreenAPI.
// Graceful no-op when GREENAPI_INSTANCE_ID / GREENAPI_TOKEN are unset.

const INSTANCE_ID = process.env.GREENAPI_INSTANCE_ID || ''
const TOKEN = process.env.GREENAPI_TOKEN || ''

// Newer GreenAPI instances are routed through a per-shard host derived from
// the first 4 digits of the instance id (e.g. 7107xxxxxx → 7107.api.greenapi.com).
// Override with GREENAPI_API_URL if the console shows a different host.
const API_URL =
  process.env.GREENAPI_API_URL ||
  (INSTANCE_ID.length >= 4
    ? `https://${INSTANCE_ID.slice(0, 4)}.api.greenapi.com`
    : 'https://api.green-api.com')

export function isWhatsAppConfigured(): boolean {
  return Boolean(INSTANCE_ID && TOKEN)
}

/**
 * Normalize a phone number to international digits for a GreenAPI chatId.
 * Thai local format ("0XX-XXX-XXXX") becomes "66XXXXXXXXX"; numbers already
 * in international form ("+66...", "0066...") keep their country code.
 * Returns null when the input cannot be a valid phone number.
 */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = `66${digits.slice(1)}`
  return digits.length >= 9 && digits.length <= 15 ? digits : null
}

export interface WhatsAppSendResult {
  ok: boolean
  idMessage?: string
  error?: string
}

/** Send a plain-text WhatsApp message via GreenAPI. Never throws. */
export async function sendWhatsApp(phone: string, message: string): Promise<WhatsAppSendResult> {
  if (!isWhatsAppConfigured()) return { ok: false, error: 'not_configured' }
  const digits = normalizePhone(phone)
  if (!digits) return { ok: false, error: 'invalid_phone' }

  try {
    const r = await fetch(`${API_URL}/waInstance${INSTANCE_ID}/sendMessage/${TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${digits}@c.us`, message }),
    })
    if (!r.ok) return { ok: false, error: `greenapi_${r.status}` }
    const json = (await r.json().catch(() => null)) as { idMessage?: string } | null
    return { ok: true, idMessage: json?.idMessage }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
