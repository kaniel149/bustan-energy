// ============================================================
// /api/proposal-serve?ref=XXX
// Returns the rendered proposal HTML from DB.
// Returns 410 Gone with a friendly page if the proposal has expired.
// ============================================================
export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const expiredPage = (ref: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Proposal Expired · TM Energy</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
         background:linear-gradient(135deg,#0D2137,#132D4A);font-family:system-ui;color:white;text-align:center;}
    .box{max-width:400px;padding:40px 32px;}
    h1{font-size:24px;margin-bottom:12px;}
    p{opacity:.7;line-height:1.6;}
    a{color:#E8A820;text-decoration:none;font-weight:700;}
  </style>
</head>
<body>
  <div class="box">
    <div style="font-size:48px;margin-bottom:16px;">⏰</div>
    <h1>Proposal Expired</h1>
    <p>Proposal <b>${ref}</b> has expired.<br>Please contact TM Energy to receive an updated quote.</p>
    <p style="margin-top:24px;">
      <a href="https://energy-tm.com">energy-tm.com</a> &nbsp;·&nbsp;
      <a href="https://wa.me/66946692011">WhatsApp</a>
    </p>
  </div>
</body>
</html>`

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const ref = url.searchParams.get('ref')

  if (!ref) {
    return new Response('Missing ref', { status: 400 })
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/proposals?ref_number=eq.${encodeURIComponent(ref)}&select=ref_number,client_name,expires_at,metadata`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  )
  if (!res.ok) return new Response('DB error', { status: 500 })
  const arr = await res.json()
  if (!Array.isArray(arr) || !arr.length) {
    return new Response('Not found', { status: 404 })
  }

  const proposal = arr[0]

  // Return 410 Gone for expired proposals
  if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
    return new Response(expiredPage(proposal.ref_number), {
      status: 410,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }

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
