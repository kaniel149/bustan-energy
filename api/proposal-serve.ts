// ============================================================
// /api/proposal-serve?ref=XXX
// Serves a server-side password gate, then the rendered proposal HTML from DB.
// Returns 410 Gone with a friendly page if the proposal has expired.
// ============================================================
export const config = { runtime: 'edge' }

import { sha256hex } from './_lib/crypto.js'
import { escapeHtml } from './_lib/html.js'
import { signedPage } from './_lib/proposal-signed-page.js'
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
  status?: string | null
  signed_at?: string | null
  system_size_kwp?: number | string | null
  metadata?: {
    rendered_html?: string
    /** Password-gate throttle state; see recordGateAttempt below. */
    access_gate?: { fails?: number; locked_until?: string }
    [key: string]: unknown
  } | null
}

const securityHeaders = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store, max-age=0',
  // Proposal pages load Google Fonts (stylesheet + gstatic font files),
  // Supabase storage images (roof before/after + logo), and same-origin assets.
  // Scripts and frames are restricted to self only; no eval/inline scripts
  // except what we write directly into the gate-page HTML (covered by 'unsafe-inline'
  // on the gate page only — acceptable for a password-gate form with no user data).
  'Content-Security-Policy': [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://bustan-energy.com https://*.supabase.co",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
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
      <a href="https://bustan-energy.com">bustan-energy.com</a> &nbsp;·&nbsp;
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
    `${SUPABASE_URL}/rest/v1/proposals?ref_number=eq.${encodeURIComponent(ref)}&select=ref_number,client_name,expires_at,password_hash,status,signed_at,system_size_kwp,metadata`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  )
  if (!res.ok) throw new Error('db_error')
  const arr = await res.json()
  return Array.isArray(arr) && arr.length ? arr[0] as ProposalServeRow : null
}

// ── Brute-force throttle ──────────────────────────────────────────────────
// A proposal password is a 6-digit code: 900,000 possibilities, which an
// unthrottled endpoint gives up in hours, and an offline attacker with the
// unsalted SHA-256 hash gives up in milliseconds. Raising the entropy would
// mean handing clients a long code to type, so the defence is here instead:
// after MAX_FAILS wrong guesses the ref is frozen for LOCK_MINUTES.
//
// State lives in the proposal's existing `metadata` JSONB — deliberately, so
// this ships without a migration. Counting per-ref rather than per-IP is the
// point: the attacker rotates IPs, but the thing being attacked is one ref.
// The lockout is short so a griefer can annoy a client, not lock them out.
const MAX_FAILS = 8
const LOCK_MINUTES = 15

interface GateState { fails?: number; locked_until?: string }

function gateState(meta: Record<string, unknown> | null | undefined): GateState {
  const g = (meta as { access_gate?: GateState } | null)?.access_gate
  return g && typeof g === 'object' ? g : {}
}

function lockRemainingMs(meta: Record<string, unknown> | null | undefined): number {
  const until = gateState(meta).locked_until
  if (!until) return 0
  const ms = Date.parse(until) - Date.now()
  return Number.isFinite(ms) && ms > 0 ? ms : 0
}

async function recordGateAttempt(
  ref: string,
  meta: Record<string, unknown> | null | undefined,
  success: boolean,
): Promise<void> {
  const current = gateState(meta)
  const fails = success ? 0 : (current.fails || 0) + 1
  const next: GateState = fails >= MAX_FAILS
    ? { fails: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() }
    : { fails }

  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/proposals?ref_number=eq.${encodeURIComponent(ref)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ metadata: { ...(meta || {}), access_gate: next } }),
      },
    )
  } catch {
    // Never let throttle bookkeeping break a legitimate client's access.
  }
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

  // Post-signature thank-you (`?signed=1`) — only once the row is actually signed,
  // otherwise the flag is ignored and the normal proposal is served.
  const row = proposal
  const wantsSigned = url.searchParams.get('signed') === '1' && row.status === 'signed'
  const signedHtml = () =>
    new Response(
      signedPage({ ref: row.ref_number, clientName: row.client_name, kwp: row.system_size_kwp, signedAt: row.signed_at }),
      { status: 200, headers: { ...securityHeaders, 'Content-Type': 'text/html; charset=utf-8' } },
    )

  // Magic re-entry link from the confirmation email: ?s=<session token> → set the
  // cookie and drop the token from the URL (7-day TTL lives in the token itself).
  const s = url.searchParams.get('s')
  if (req.method === 'GET' && s && (await verifyProposalSession(s, ref))) {
    const clean = `/p/${encodeURIComponent(ref)}${wantsSigned ? '?signed=1' : ''}`
    return new Response(null, {
      status: 302,
      headers: { ...securityHeaders, Location: clean, 'Set-Cookie': proposalSessionCookie(s, url.protocol === 'https:') },
    })
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
    if (wantsSigned) return signedHtml()
  }

  if (req.method === 'POST') {
    const lockedMs = lockRemainingMs(proposal.metadata)
    if (lockedMs > 0) {
      return Response.json(
        { ok: false, error: 'too_many_attempts', retry_after_seconds: Math.ceil(lockedMs / 1000) },
        {
          status: 429,
          headers: { ...securityHeaders, 'Retry-After': String(Math.ceil(lockedMs / 1000)) },
        },
      )
    }

    const body = await req.json().catch(() => null) as { password?: string } | null
    const password = String(body?.password || '').trim()
    const correct = Boolean(
      proposal.password_hash && (await sha256hex(password)) === proposal.password_hash,
    )
    await recordGateAttempt(ref, proposal.metadata, correct)

    if (!correct) {
      // Only log an actual view, not a failed guess — logProposalView emails the
      // team, and a brute-force run would otherwise become a mail flood.
      return Response.json({ ok: false, error: 'wrong_password' }, {
        status: 401,
        headers: securityHeaders,
      })
    }

    await logProposalView(req, ref, password)

    const session = await createProposalSession(ref)
    if (wantsSigned) {
      // The session is minted here, so the thank-you must carry the cookie too.
      const r = signedHtml()
      r.headers.set('Set-Cookie', proposalSessionCookie(session, url.protocol === 'https:'))
      return r
    }
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
