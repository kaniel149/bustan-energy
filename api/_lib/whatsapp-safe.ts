// ── SELF_SEND-safe WhatsApp target resolution ──
// OUTREACH_SELF_SEND=1 (the outreach crons' safe mode) applies to ad-hoc sends
// too: the message is redirected to OUTREACH_TEST_WHATSAPP with a visible
// "[TEST→<real number>]" prefix so nothing reaches a prospect by accident.
import { normalizePhone } from './whatsapp.js'

export const DEFAULT_TEST_WHATSAPP = '972502213948'

export interface WhatsAppTarget { phone: string; message: string; test: boolean }

export function resolveWhatsAppTarget(
  rawPhone: string,
  message: string,
  env: Record<string, string | undefined> = process.env,
): WhatsAppTarget | null {
  const phone = normalizePhone(rawPhone)
  if (!phone) return null
  const test = env.OUTREACH_SELF_SEND === '1'
  if (test) return { phone: env.OUTREACH_TEST_WHATSAPP || DEFAULT_TEST_WHATSAPP, message: `[TEST→${phone}] ${message}`, test: true }
  return { phone, message, test: false }
}
