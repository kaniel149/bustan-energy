import { describe, it, expect } from 'vitest'
import { parseGeminiResponse, splitSubject } from '../../api/_lib/outreach/gemini-text'

describe('parseGeminiResponse', () => {
  it('extracts joined text from candidates', () => {
    const j = { candidates: [{ content: { parts: [{ text: 'Hello ' }, { text: 'world' }] } }] }
    expect(parseGeminiResponse(j)).toBe('Hello world')
  })
  it('returns null on empty/malformed payloads', () => {
    expect(parseGeminiResponse({})).toBeNull()
    expect(parseGeminiResponse({ candidates: [] })).toBeNull()
  })
})

describe('splitSubject', () => {
  it('splits SUBJECT: line from body', () => {
    const r = splitSubject('SUBJECT: ประหยัดค่าไฟ\n\nสวัสดีครับ...')
    expect(r.subject).toBe('ประหยัดค่าไฟ')
    expect(r.body).toBe('สวัสดีครับ...')
  })
  it('falls back to default subject when format missing', () => {
    const r = splitSubject('just a body')
    expect(r.subject).toBe('Solar savings for your roof')
    expect(r.body).toBe('just a body')
  })
})
