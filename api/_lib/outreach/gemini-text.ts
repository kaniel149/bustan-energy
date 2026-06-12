// ============================================================
// api/_lib/outreach/gemini-text.ts
// Thin Gemini 2.0 Flash text wrapper with 429 quota signaling
// (mirrors the deferral pattern in find-contact-core.ts).
// ============================================================

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface GeminiTextResult {
  ok: boolean
  text?: string
  quotaExhausted?: boolean
  error?: string
}

export function parseGeminiResponse(json: unknown): string | null {
  const j = json as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim()
  return text || null
}

export interface SubjectBody { subject: string; body: string }

export function splitSubject(text: string): SubjectBody {
  const m = text.match(/^SUBJECT:\s*(.+)\n+([\s\S]+)$/)
  return m
    ? { subject: m[1].trim(), body: m[2].trim() }
    : { subject: 'Solar savings for your roof', body: text.trim() }
}

export async function geminiText(prompt: string): Promise<GeminiTextResult> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { ok: false, error: 'gemini_not_configured' }
  const r = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })
  if (r.status === 429) return { ok: false, quotaExhausted: true }
  if (!r.ok) return { ok: false, error: `gemini_${r.status}` }
  const text = parseGeminiResponse(await r.json())
  return text ? { ok: true, text } : { ok: false, error: 'empty_response' }
}
