// ============================================================
// /api/admin-overlay-panels
// Takes drone image (base64) + panel count → returns overlaid image
// Uses Gemini 3 Pro Image (Nano Banana Pro) — model: gemini-3-pro-image-preview
// ============================================================
// Pro image gen takes 30-60s → Node runtime with 60s maxDuration.
// (Edge caps at 25s on Hobby, too tight for Pro.)
export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

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
  return email && allowed(email.toLowerCase()) ? email : null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const email = await verifyAdmin(req)
    if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const { image_url, image_base64, panel_count = 18, notes = '' } = body as {
      image_url?: string
      image_base64?: string
      panel_count?: number
      notes?: string
    }

    let b64: string
    let mime: string

    if (image_url) {
      try {
        const imgRes = await fetch(image_url)
        if (!imgRes.ok) {
          return Response.json({ ok: false, error: 'image_fetch_failed', status: imgRes.status }, { status: 400 })
        }
        mime = imgRes.headers.get('content-type') || 'image/jpeg'
        const buf = await imgRes.arrayBuffer()
        if (buf.byteLength > 6 * 1024 * 1024) {
          return Response.json(
            { ok: false, error: 'image_too_large', size_mb: (buf.byteLength / 1024 / 1024).toFixed(1), hint: 'העלה תמונה חדשה — הישנה גדולה מדי' },
            { status: 400 }
          )
        }
        const bytes = new Uint8Array(buf)
        let binary = ''
        const CHUNK = 0x8000
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[])
        }
        b64 = btoa(binary)
      } catch (e: unknown) {
        return Response.json({ ok: false, error: 'image_fetch_error', detail: e instanceof Error ? e.message : String(e) }, { status: 400 })
      }
    } else if (image_base64) {
      b64 = image_base64.replace(/^data:image\/\w+;base64,/, '')
      const mimeMatch = image_base64.match(/^data:(image\/\w+);/)
      mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    } else {
      return Response.json({ ok: false, error: 'missing_image_or_url' }, { status: 400 })
    }

    const prompt = `Add ${panel_count} black monocrystalline solar panels on the sloped roofs of this building. Arrange in neat parallel rows with 40cm edge setbacks. Keep everything else identical — same lighting, colors, angle, surroundings. Panels should be solid black with thin aluminum frames, realistic shadows, photorealistic.${notes ? ' ' + notes : ''}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 55_000)
    const t0 = Date.now()

    // Nano Banana Pro (Gemini 3 Pro Image) — higher quality than Flash
    // Typically 30-60s on REST. Requires responseModalities: ['TEXT','IMAGE'].
    // imageConfig.imageSize: '1K' | '2K' | '4K' (1K = fastest, good for overlays).
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: mime, data: b64 } },
          ]}],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 0.4,
            imageConfig: { imageSize: '1K' },
          },
        }),
      }
    ).catch((e) => {
      if (e?.name === 'AbortError') {
        throw new Error(`gemini_image_gen_timeout_55s — Nano Banana Pro לא הגיב. נסה תמונה קטנה יותר (עד 2MB) או חזור על הפעולה.`)
      }
      throw new Error(`gemini_fetch_error: ${e?.message || e}`)
    })
    clearTimeout(timeout)
    console.log(`overlay-panels gemini (3-pro-image): ${Date.now() - t0}ms status ${geminiRes.status}`)

    if (!geminiRes.ok) {
      const txt = await geminiRes.text()
      return Response.json(
        { ok: false, error: 'gemini_failed', detail: txt.slice(0, 500) },
        { status: 500 }
      )
    }

    const result = await geminiRes.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ inline_data?: { data: string; mime_type?: string }; inlineData?: { data: string; mimeType?: string } }> } }>
    }
    const parts = result?.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p) => p.inline_data || p.inlineData)
    if (!imagePart) {
      return Response.json(
        { ok: false, error: 'no_image_in_response', parts_count: parts.length },
        { status: 500 }
      )
    }
    const data = imagePart.inline_data
      ? { base64: imagePart.inline_data.data, mime: imagePart.inline_data.mime_type }
      : { base64: imagePart.inlineData!.data, mime: imagePart.inlineData!.mimeType }
    const outBase64 = data.base64
    const outMime = data.mime || 'image/png'

    return Response.json({
      ok: true,
      image_base64: `data:${outMime};base64,${outBase64}`,
      size_bytes: outBase64.length,
    })
  } catch (e: unknown) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
