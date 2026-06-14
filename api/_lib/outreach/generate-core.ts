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

export function validateDraft(
  body: string,
  facts: OutreachFacts,
  channel: 'line' | 'whatsapp' | 'email',
): DraftCheck {
  if (!body.trim()) return { ok: false, reason: 'empty' }
  if (body.length > MAX_LEN[channel]) return { ok: false, reason: `too_long:${body.length}` }
  const thb = facts.monthlySavingThb.toLocaleString('en-US')
  if (!body.includes(thb)) return { ok: false, reason: 'missing_or_wrong_saving_figure' }
  if (!body.includes(String(facts.kwp))) return { ok: false, reason: 'missing_kwp' }
  return { ok: true }
}
