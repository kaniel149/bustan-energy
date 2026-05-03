// ============================================================
// /api/admin-analyze-roof
// Fetches roof image from Supabase URL, compresses to <500KB,
// analyzes with Gemini 2.0 Flash. Target: <20s total on edge.
// ============================================================
export const config = { runtime: 'edge' }

import { isAllowedAdmin } from './_lib/admin-access.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NANOBANANA_API_KEY!
const allowed = isAllowedAdmin

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

// Panel dimensions by wattage (Jinko Tiger Neo / N-Type mono spec)
function panelAreaForWatt(w: number): number {
  if (w >= 620) return 2.42   // Jinko 620W ~1.90×1.13 + frame
  if (w >= 600) return 2.38   // 600W
  if (w >= 580) return 2.28   // 580W ~1.80×1.13
  if (w >= 550) return 2.18   // 550W ~1.76×1.13
  return 2.10                  // <=540W
}

// Build the prompt dynamically based on panel watt + usability % the caller wants
function buildPrompt(panelWatt: number, panelArea: number, usablePct: number): string {
  return `You are a solar PV designer. Analyze this roof photo (drone or aerial view).

CRITICAL: Count the TOTAL combined roof area across ALL visible buildings/structures in the frame. Include every separate building roof that could host panels. Do NOT limit yourself to the largest visible roof. Commercial sites often have 2-10+ buildings.

Panel spec: ${panelWatt}W, each ~${panelArea}m² (Jinko mono).
Site: Thailand. PSH=5.0, PR=0.78.
Usable fraction: target ${usablePct}% of total roof (typical commercial flat/low-pitch roofs can reach 75-85%; residential with obstacles 55-70%).

Return ONLY JSON:
{"roof_area_m2":int,"usable_area_m2":int,"suggested_panel_count":int,"suggested_system_kwp":float,"estimated_annual_kwh":int,"roof_type":"concrete"|"tile"|"metal"|"mixed"|"unknown","orientation":"south"|"east"|"west"|"east-west"|"mixed"|"unknown","shading":"none"|"partial"|"heavy","tilt_deg_estimate":int,"confidence":0-1,"notes":"3 short Hebrew sentences: total area counting, building count, any constraints"}`
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const t0 = Date.now()

  try {
    const email = await verifyAdmin(req)
    if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      image_url,
      image_base64,
      panel_watt = 580,
      usable_pct = 75,
    } = body as {
      image_url?: string
      image_base64?: string
      panel_watt?: number
      usable_pct?: number
    }
    const panelArea = panelAreaForWatt(panel_watt)
    const PROMPT = buildPrompt(panel_watt, panelArea, usable_pct)

    let b64: string
    const mime = 'image/jpeg'

    if (image_url) {
      const imgRes = await fetch(image_url)
      if (!imgRes.ok) {
        return Response.json({ ok: false, error: 'image_fetch_failed' }, { status: 400 })
      }
      const buf = await imgRes.arrayBuffer()
      // Reject only if ludicrously big (guard rails)
      if (buf.byteLength > 6 * 1024 * 1024) {
        return Response.json(
          { ok: false, error: 'image_too_large', size_mb: (buf.byteLength / 1024 / 1024).toFixed(1), hint: 'העלה תמונה חדשה — הישנה גדולה מדי (החדשות נדחסות אוטומטית)' },
          { status: 400 }
        )
      }
      const bytes = new Uint8Array(buf)
      let binary = ''
      // Chunked to avoid "Maximum call stack" on large arrays
      const CHUNK = 0x8000
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[])
      }
      b64 = btoa(binary)
    } else if (image_base64) {
      b64 = image_base64.replace(/^data:image\/\w+;base64,/, '')
    } else {
      return Response.json({ ok: false, error: 'missing_image_or_url' }, { status: 400 })
    }

    const tFetch = Date.now() - t0

    // Gemini 2.0 Flash — older but faster + more consistent than 2.5
    // Target: <15s for vision + JSON output on a 500KB-2MB image
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mime, data: b64 } },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            maxOutputTokens: 500,
          },
        }),
      }
    ).catch((e) => {
      if (e?.name === 'AbortError') {
        throw new Error(`gemini_timeout_20s (fetch was ${tFetch}ms)`)
      }
      throw new Error(`gemini_fetch_error: ${e?.message || e}`)
    })
    clearTimeout(timeout)

    const tGemini = Date.now() - t0 - tFetch
    console.log(`fetch:${tFetch}ms gemini:${tGemini}ms status:${geminiRes.status}`)

    if (!geminiRes.ok) {
      const txt = await geminiRes.text()
      return Response.json(
        { ok: false, error: 'gemini_failed', status: geminiRes.status, detail: txt.slice(0, 300) },
        { status: 500 }
      )
    }

    const result = await geminiRes.json()
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return Response.json({ ok: false, error: 'no_text_in_response' }, { status: 500 })
    }

    let analysis: RoofAnalysis
    try {
      const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      return Response.json(
        { ok: false, error: 'invalid_json', raw: text.slice(0, 300) },
        { status: 500 }
      )
    }

    // Recompute derived values server-side using the ACTUAL panel wattage
    const panels = Math.max(1, Math.round(Number(analysis.suggested_panel_count) || 0))
    const kwp = Math.round(panels * (panel_watt / 1000) * 100) / 100
    const annualKwh = Math.round(kwp * 5.0 * 365 * 0.78)

    return Response.json({
      ok: true,
      analysis: {
        ...analysis,
        suggested_panel_count: panels,
        suggested_system_kwp: kwp,
        estimated_annual_kwh: annualKwh,
        panel_watt_used: panel_watt,
        panel_area_m2: panelArea,
      },
      _timing: { fetch_ms: tFetch, gemini_ms: tGemini, total_ms: Date.now() - t0 },
    })
  } catch (e: unknown) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), total_ms: Date.now() - t0 },
      { status: 500 }
    )
  }
}
