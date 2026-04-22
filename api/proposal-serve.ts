// ============================================================
// /api/proposal-serve?ref=XXX
// Returns the rendered proposal HTML from DB
// ============================================================
export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const ref = url.searchParams.get('ref')

  if (!ref) {
    return new Response('Missing ref', { status: 400 })
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/proposals?ref_number=eq.${encodeURIComponent(ref)}&select=ref_number,client_name,metadata`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  )
  if (!res.ok) return new Response('DB error', { status: 500 })
  const arr = await res.json()
  if (!Array.isArray(arr) || !arr.length) {
    return new Response('Not found', { status: 404 })
  }

  const proposal = arr[0]
  const html = proposal.metadata?.rendered_html
  if (!html) {
    return new Response('Proposal not rendered', { status: 404 })
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  })
}
