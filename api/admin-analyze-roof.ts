// ============================================================
// /api/admin-analyze-roof
// Takes roof image (base64) → analyzes with Gemini Vision
// Returns suggested system size, panel count, annual kWh, etc.
// ============================================================
export const config = { runtime: 'edge', maxDuration: 30 }

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NANOBANANA_API_KEY!
const ADMIN_DOMAIN = '@energy-tm.com'
const EXTRA = ['k@kanielt.com']
const allowed = (e: string) => e.endsWith(ADMIN_DOMAIN) || EXTRA.includes(e)

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return null
  const user = await r.json()
  const email = user?.email?.toLowerCase()
  return email && allowed(email) ? email : null
}

export interface RoofAnalysis {
  roof_area_m2: number
  usable_area_m2: number
  suggested_panel_count: number
  suggested_system_kwp: number
  estimated_annual_kwh: number
  roof_type: 'concrete' | 'tile' | 'metal' | 'mixed' | 'unknown'
  orientation: 'south' | 'east' | 'west' | 'east-west' | 'mixed' | 'unknown'
  shading: 'none' | 'partial' | 'heavy'
  tilt_deg_estimate: number
  confidence: number
  notes: string
}

const PROMPT = `You are a senior solar PV designer in Thailand (Koh Phangan region, 9.7°N).
Analyze this roof image (drone top-down or oblique) and estimate a realistic solar PV system sizing.

Assumptions:
- Panel: Jinko N-Type 580W monocrystalline (2.28 m² each, ~1.80m × 1.13m)
- PSH (peak sun hours) for Koh Phangan: ~5.0 kWh/m²/day
- Performance ratio (PR): 0.78
- Required setbacks: 40cm from all edges, 60cm walkway every 8 panels
- Prefer south/south-east facing slopes, avoid heavy shading

Return ONLY valid JSON with these exact keys (no markdown, no code fences, no commentary):

{
  "roof_area_m2": <total roof area in m², integer>,
  "usable_area_m2": <usable area for panels after setbacks/obstructions, integer>,
  "suggested_panel_count": <realistic panel count, integer>,
  "suggested_system_kwp": <panel_count × 0.580, rounded to 2 decimals>,
  "estimated_annual_kwh": <suggested_system_kwp × 5.0 × 365 × 0.78, integer>,
  "roof_type": "concrete" | "tile" | "metal" | "mixed" | "unknown",
  "orientation": "south" | "east" | "west" | "east-west" | "mixed" | "unknown",
  "shading": "none" | "partial" | "heavy",
  "tilt_deg_estimate": <roof tilt in degrees, integer 0-45>,
  "confidence": <0.0 to 1.0, your confidence in these estimates>,
  "notes": "<2-3 sentences in Hebrew describing the roof, any obstructions (water tanks, chimneys, trees), orientation quality, and recommendations>"
}`

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const email = await verifyAdmin(req)
    if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const { image_url, image_base64 } = body as { image_url?: string; image_base64?: string }

    let b64: string
    let mime: string

    if (image_url) {
      // Preferred path — server fetches image directly (avoids client 4.5MB body limit)
      try {
        const imgRes = await fetch(image_url)
        if (!imgRes.ok) {
          return Response.json(
            { ok: false, error: 'image_fetch_failed', status: imgRes.status },
            { status: 400 }
          )
        }
        mime = imgRes.headers.get('content-type') || 'image/jpeg'
        const buf = await imgRes.arrayBuffer()
        // Resize guardrail — if >8MB, reject (Gemini inline limit is ~20MB)
        if (buf.byteLength > 8 * 1024 * 1024) {
          return Response.json(
            { ok: false, error: 'image_too_large', size_mb: (buf.byteLength / 1024 / 1024).toFixed(1) },
            { status: 400 }
          )
        }
        // Convert ArrayBuffer to base64 (edge-compatible)
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        b64 = btoa(binary)
      } catch (e: any) {
        return Response.json(
          { ok: false, error: 'image_fetch_error', detail: String(e?.message || e) },
          { status: 400 }
        )
      }
    } else if (image_base64) {
      // Legacy path — base64 from client (kept for backward compat)
      b64 = image_base64.replace(/^data:image\/\w+;base64,/, '')
      const mimeMatch = image_base64.match(/^data:(image\/\w+);/)
      mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    } else {
      return Response.json({ ok: false, error: 'missing_image_or_url' }, { status: 400 })
    }

    // Call Gemini 2.5 Pro (text + vision, cheaper + faster than image-gen model)
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: mime, data: b64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const txt = await geminiRes.text()
      return Response.json(
        { ok: false, error: 'gemini_failed', detail: txt.slice(0, 500) },
        { status: 500 }
      )
    }

    const result = await geminiRes.json()
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return Response.json(
        { ok: false, error: 'no_text_in_response' },
        { status: 500 }
      )
    }

    // Parse JSON (Gemini may wrap it despite responseMimeType)
    let analysis: RoofAnalysis
    try {
      const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      return Response.json(
        { ok: false, error: 'invalid_json', raw: text.slice(0, 500) },
        { status: 500 }
      )
    }

    // Sanity-check and recompute derived values server-side
    const panels = Math.max(1, Math.round(Number(analysis.suggested_panel_count) || 0))
    const kwp = Math.round(panels * 0.580 * 100) / 100
    const annualKwh = Math.round(kwp * 5.0 * 365 * 0.78)

    return Response.json({
      ok: true,
      analysis: {
        ...analysis,
        suggested_panel_count: panels,
        suggested_system_kwp: kwp,
        estimated_annual_kwh: annualKwh,
      },
    })
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
