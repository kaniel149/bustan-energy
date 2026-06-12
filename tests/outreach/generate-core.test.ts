import { describe, it, expect } from 'vitest'
import {
  pickLanguage, buildPrompt, validateDraft, type OutreachFacts,
} from '../../api/_lib/outreach/generate-core'

const facts: OutreachFacts = {
  kwp: 340, monthlySavingThb: 193000, annualSavingThb: 2316000,
  roofSqm: 2400, district: 'Rayong', companyName: 'สยามพลาสติก จำกัด', contactName: 'คุณสมชาย',
}

describe('pickLanguage', () => {
  it('Thai company name → th', () => expect(pickLanguage('สยามพลาสติก จำกัด')).toBe('th'))
  it('Latin-only company name → en', () => expect(pickLanguage('Mitsui Chemicals (Thailand)')).toBe('en'))
  it('missing name → th', () => expect(pickLanguage(null)).toBe('th'))
})

describe('buildPrompt', () => {
  it('substitutes all placeholders', () => {
    const p = buildPrompt('{company_name}|{contact_name}|{district}|{roof_sqm}|{kwp}|{monthly_saving_thb}', facts)
    expect(p).toBe('สยามพลาสติก จำกัด|คุณสมชาย|Rayong|2400|340|193,000')
  })
})

describe('validateDraft', () => {
  const goodBody = 'สวัสดีครับ ระบบ 340 kWp ประหยัด ฿193,000 ต่อเดือน'
  it('accepts a body containing the exact numbers', () => {
    expect(validateDraft(goodBody, facts, 'email').ok).toBe(true)
  })
  it('rejects when the saving figure is missing or wrong', () => {
    expect(validateDraft('ประหยัด ฿250,000 ต่อเดือน ระบบ 340 kWp', facts, 'email').ok).toBe(false)
  })
  it('rejects when kwp is missing', () => {
    expect(validateDraft('ประหยัด ฿193,000 ต่อเดือน', facts, 'email').ok).toBe(false)
  })
  it('rejects over-length bodies per channel', () => {
    expect(validateDraft(goodBody + 'x'.repeat(300), facts, 'line').ok).toBe(false)
  })
})
