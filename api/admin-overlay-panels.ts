// ============================================================
// /api/admin-overlay-panels
// Takes drone image (base64) + panel count → returns overlaid image
// Uses Gemini 3 Pro Image (Nano Banana Pro)
// ============================================================
export const config = { runtime: 'edge', maxDuration: 60 }

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
  return email && allowed(email.toLowerCase()) ? email : null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const email = await verifyAdmin(req)
    if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const { image_base64, panel_count = 18, notes = '' } = body

    if (!image_base64) {
      return Response.json({ ok: false, error: 'missing_image' }, { status: 400 })
    }

    // Strip data URL prefix if present
    const b64 = image_base64.replace(/^data:image\/\w+;base64,/, '')
    const mimeMatch = image_base64.match(/^data:(image\/\w+);/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'

    const prompt = `Add exactly ${panel_count} black monocrystalline solar panels to the sloped roof sections of this building (drone top-down view).

Layout rules:
- Distribute panels evenly across the MAIN roof slopes
- Arrange panels in neat rows parallel to roof ridges
- Keep 40cm setback from all roof edges
- Panels are sleek solid black with thin silver aluminum frames
- Cast realistic soft shadows on the roof surface
- Slight glossy reflection indicating glass

${notes ? 'Additional notes: ' + notes : ''}

CRITICAL PRESERVATION: Keep exactly the original colors, trees, vehicles, surroundings, drone angle, and lighting. Only ADD the panels. Photorealistic output, same camera framing.`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mime, data: b64 } },
              ],
            },
          ],
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
    const parts = result?.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: any) => p.inline_data || p.inlineData)
    if (!imagePart) {
      return Response.json(
        { ok: false, error: 'no_image_in_response', parts_count: parts.length },
        { status: 500 }
      )
    }
    const data = imagePart.inline_data || imagePart.inlineData
    const outBase64 = data.data
    const outMime = data.mime_type || data.mimeType || 'image/png'

    return Response.json({
      ok: true,
      image_base64: `data:${outMime};base64,${outBase64}`,
      size_bytes: outBase64.length,
    })
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
