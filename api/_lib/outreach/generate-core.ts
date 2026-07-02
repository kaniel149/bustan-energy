// ============================================================
// api/_lib/outreach/generate-core.ts
// Pure helpers for outreach draft generation: language pick,
// prompt building, and post-generation validation.
// ============================================================
import type { SolarFacts } from './assumptions.js'

export interface OutreachFacts extends SolarFacts {
  roofSqm: number
  district: string | null
  companyName: string | null
  contactName: string | null
}

export const MAX_LEN: Record<'line' | 'whatsapp' | 'email', number> = {
  line: 300,
  whatsapp: 600,
  email: 5000,
}

export function pickLanguage(companyName: string | null | undefined): 'th' | 'en' {
  if (!companyName) return 'th'
  return /[฀-๿]/.test(companyName) ? 'th' : 'en'
}

export function buildPrompt(template: string, facts: OutreachFacts): string {
  return template
    .replaceAll('{company_name}', facts.companyName ?? 'your company')
    .replaceAll('{contact_name}', facts.contactName ?? '')
    .replaceAll('{district}', facts.district ?? 'your area')
    .replaceAll('{roof_sqm}', String(Math.round(facts.roofSqm)))
    .replaceAll('{kwp}', String(facts.kwp))
    .replaceAll('{monthly_saving_thb}', facts.monthlySavingThb.toLocaleString('en-US'))
}

export interface DraftCheck { ok: boolean; reason?: string }

/**
 * Digit-normalise text so number matching is tolerant of formatting: converts
 * Thai numerals to Arabic and strips thousands separators / spaces. This keeps
 * the anti-hallucination guarantee (the exact numeric VALUE must still appear)
 * while accepting "100000", "100,000", "100 000" or Thai-digit variants — the
 * LLM does not always echo the en-US comma format.
 */
function normalizeDigits(s: string): string {
  return s
    .replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0e50)) // Thai → Arabic
    .replace(/[,\s  .]/g, '')                                    // strip separators
}

export function validateDraft(
  body: string,
  facts: OutreachFacts,
  channel: 'line' | 'whatsapp' | 'email',
): DraftCheck {
  if (!body.trim()) return { ok: false, reason: 'empty' }
  if (body.length > MAX_LEN[channel]) return { ok: false, reason: `too_long:${body.length}` }
  const normalized = normalizeDigits(body)
  if (!normalized.includes(String(facts.monthlySavingThb))) {
    return { ok: false, reason: 'missing_or_wrong_saving_figure' }
  }
  if (!normalized.includes(String(facts.kwp))) return { ok: false, reason: 'missing_kwp' }
  return { ok: true }
}
