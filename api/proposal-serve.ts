// ============================================================
// /api/proposal-serve?ref=XXX
// Serves a server-side password gate, then the rendered proposal HTML from DB.
// Returns 410 Gone with a friendly page if the proposal has expired.
// ============================================================
export const config = { runtime: 'edge' }

import { sha256hex } from './_lib/crypto.js'
import { escapeHtml } from './_lib/html.js'
import {
  createProposalSession,
  getProposalSessionCookie,
  proposalSessionCookie,
  verifyProposalSession,
} from './_lib/proposal-session.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface ProposalServeRow {
  ref_number: string
  client_name?: string | null
  expires_at?: string | null
  password_hash?: string | null
  metadata?: {
    rendered_html?: string
  } | null
}

const securityHeaders = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store, max-age=0',
}

const expiredPage = (ref: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Proposal Expired · Bustan Energy</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
         background:#f4ead8;font-family:system-ui;color:#27342f;text-align:center;}
    .box{max-width:400px;padding:40px 32px;}
    h1{font-size:24px;margin-bottom:12px;}
    p{opacity:.72;line-height:1.6;}
    a{color:#006f6b;text-decoration:none;font-weight:700;}
  </style>
</head>
<body>
  <div class="box">
    <h1>Proposal Expired</h1>
    <p>Proposal <b>${escapeHtml(ref)}</b> has expired.<br>Please contact Bustan Energy to receive an updated quote.</p>
    <p style="margin-top:24px;">
      <a href="https://energy-tm.com">energy-tm.com</a> &nbsp;·&nbsp;
      <a href="https://wa.me/66946692011">WhatsApp</a>
    </p>
  </div>
</body>
</html>`

const gatePage = (ref: string, error = '') => `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>Bustan Energy · הצעה פרטית</title>
  <style>
    :root{--ink:#27342f;--grove:#24463e;--lagoon:#006f6b;--sun:#f2b84b;--paper:#f4ead8;--shell:#fff4e2;--mist:#d8ece8;--papaya:#ff6b4a}
    *{box-sizing:border-box} body{margin:0;min-height:100vh;display:grid;place-items:center;background:
      linear-gradient(150deg,rgba(216,236,232,.7),transparent 42%),
      linear-gradient(20deg,rgba(242,184,75,.18),transparent 46%),var(--paper);
      color:var(--ink);font-family:"Noto Sans Hebrew",system-ui,-apple-system,sans-serif;padding:24px}
    .box{width:min(420px,100%);background:rgba(255,244,226,.88);border:1px solid rgba(36,70,62,.14);border-radius:18px;padding:34px 28px;box-shadow:0 24px 80px rgba(39,52,47,.18)}
    .logo{display:block;height:54px;margin:0 auto 20px}.eyebrow{color:var(--lagoon);font-size:12px;font-weight:800;letter-spacing:.16em;text-align:center;text-transform:uppercase}
    h1{font-size:25px;line-height:1.2;text-align:center;margin:8px 0 10px}.desc{font-size:14px;line-height:1.7;text-align:center;color:rgba(39,52,47,.68);margin:0 0 24px}
    label{display:block;font-size:12px;font-weight:800;color:rgba(39,52,47,.68);margin-bottom:8px}
    input{width:100%;height:48px;border-radius:12px;border:1px solid rgba(36,70,62,.2);background:white;color:var(--ink);font-size:20px;text-align:center;letter-spacing:.36em;font-weight:800;direction:ltr}
    input:focus{outline:3px solid rgba(0,111,107,.18);border-color:var(--lagoon)}
    button{width:100%;height:48px;margin-top:14px;border:0;border-radius:12px;background:var(--lagoon);color:white;font-weight:800;font-size:15px;cursor:pointer}
    button:hover{background:#008f8a}button:disabled{opacity:.62;cursor:wait}.error{min-height:18px;margin-top:12px;color:#b94436;font-size:13px;text-align:center}
    .ref{margin-top:22px;text-align:center;color:rgba(39,52,47,.45);font:700 11px ui-monospace,monospace;letter-spacing:.14em;direction:ltr}
  </style>
</head>
<body>
  <main class="box">
    <img class="logo" src="/assets/logo/bustan-energy.svg" alt="Bustan Energy">
    <div class="eyebrow">Private proposal</div>
    <h1>הצעת מחיר אישית</h1>
    <p class="desc">הכנס את הסיסמה שנשלחה אליך כדי לפתוח את ההצעה המאובטחת.</p>
    <form id="gateForm">
      <label for="password">סיסמת הצעה</label>
      <input id="password" name="password" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="12" autocomplete="off" autofocus>
      <button id="submitBtn" type="submit">פתח הצעה</button>
      <div id="error" class="error">${escapeHtml(error)}</div>
    </form>
    <div class="ref">REF · ${escapeHtml(ref)}</div>
  </main>
  <script>
    const form = document.getElementById('gateForm');
    const input = document.getElementById('password');
    const button = document.getElementById('submitBtn');
    const error = document.getElementById('error');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.textContent = '';
      button.disabled = true;
      button.textContent = 'בודק...';
      try {
        const response = await fetch(window.location.href, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/html' },
          body: JSON.stringify({ password: input.value })
        });
        if (!response.ok) throw new Error('bad_password');
        const html = await response.text();
        document.open();
        document.write(html);
        document.close();
      } catch {
        error.textContent = 'הסיסמה לא נכונה או שההצעה לא זמינה.';
        input.value = '';
        input.focus();
      } finally {
        button.disabled = false;
        button.textContent = 'פתח הצעה';
      }
    });
  </script>
</body>
</html>`

function stripLegacyClientGate(html: string): string {
  const gateStart = html.indexOf('<style id="gate-style">')
  if (gateStart === -1) return html
  const bodyClose = html.lastIndexOf('</body>')
  return html.slice(0, gateStart) + (bodyClose === -1 ? '' : html.slice(bodyClose))
}

async function loadProposal(ref: string): Promise<ProposalServeRow | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/proposals?ref_number=eq.${encodeURIComponent(ref)}&select=ref_number,client_name,expires_at,password_hash,metadata`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  )
  if (!res.ok) throw new Error('db_error')
  const arr = await res.json()
  return Array.isArray(arr) && arr.length ? arr[0] as ProposalServeRow : null
}

async function logProposalView(req: Request, ref: string, password: string): Promise<void> {
  try {
    await fetch(new URL('/api/proposal-view', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, password }),
    })
  } catch {
    // The proposal page should not fail just because analytics/email logging failed.
  }
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const ref = url.searchParams.get('ref')

  if (!ref || !/^[a-z0-9][a-z0-9._-]{1,80}$/i.test(ref)) {
    return new Response('Missing ref', { status: 400 })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: securityHeaders })
  }

  let proposal: ProposalServeRow | null = null
  try {
    proposal = await loadProposal(ref)
  } catch {
    return new Response('DB error', { status: 500, headers: securityHeaders })
  }

  if (!proposal) {
    return new Response('Not found', { status: 404 })
  }

  // Return 410 Gone for expired proposals
  if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
    return new Response(expiredPage(proposal.ref_number), {
      status: 410,
      headers: { ...securityHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const html = proposal.metadata?.rendered_html
  if (!html) {
    return new Response('Proposal not rendered', { status: 404 })
  }

  if (req.method === 'GET') {
    const session = getProposalSessionCookie(req)
    const verified = await verifyProposalSession(session, ref)
    if (!verified) {
      return new Response(gatePage(ref), {
        status: 200,
        headers: { ...securityHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null) as { password?: string } | null
    const password = String(body?.password || '').trim()
    const correct = proposal.password_hash && (await sha256hex(password)) === proposal.password_hash
    await logProposalView(req, ref, password)

    if (!correct) {
      return Response.json({ ok: false, error: 'wrong_password' }, {
        status: 401,
        headers: securityHeaders,
      })
    }

    const session = await createProposalSession(ref)
    return new Response(stripLegacyClientGate(html), {
      status: 200,
      headers: {
        ...securityHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': proposalSessionCookie(session, url.protocol === 'https:'),
      },
    })
  }

  return new Response(stripLegacyClientGate(html), {
    status: 200,
    headers: {
      ...securityHeaders,
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
