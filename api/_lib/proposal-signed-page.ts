// Post-signature thank-you page. Pure HTML builder served by proposal-serve on
// `?signed=1` (only when the row's status is 'signed'), so proposals whose
// rendered_html is already frozen in the DB get it too.
import { escapeHtml } from './html.js'

export interface SignedPageInput {
  ref: string
  clientName?: string | null
  kwp?: number | string | null
  signedAt?: string | null
}

// Mirrors the PEA timeline on /about and the 40/40/20 payment schedule.
export const NEXT_STEPS = [
  { when: 'Day 1–2', title: 'Welcome call & site survey', body: 'We confirm the design on site and collect the PEA paperwork (ID, house book, latest bill).' },
  { when: 'Weeks 1–3', title: 'PEA application & procurement', body: 'Single-line diagram, panel layout and PEA summary are filed; equipment is ordered on the 40% deposit invoice.' },
  { when: 'Weeks 4–6', title: 'Installation', body: 'Mounting, panels, inverters and wiring by our on-island team. 40% due on equipment arrival.' },
  { when: 'Weeks 6–8', title: 'PEA inspection & go-live', body: 'Inspection, meter change, grid connection, monitoring app handover. Final 20% on commissioning.' },
] as const

export function signedPage(p: SignedPageInput): string {
  const when = p.signedAt ? new Date(p.signedAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok' }) : ''
  const steps = NEXT_STEPS.map((s, i) => `<li><span class="n">${i + 1}</span><div><div class="w">${s.when}</div><b>${s.title}</b><p>${s.body}</p></div></li>`).join('')
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><title>Agreement signed · ${escapeHtml(p.ref)} · Bustan Energy</title>
<style>body{margin:0;background:#f4ead8;color:#27342f;font-family:system-ui,sans-serif}.box{max-width:640px;margin:0 auto;padding:40px 24px}h1{font-size:28px;margin:12px 0}.ref{font:700 12px ui-monospace,monospace;letter-spacing:.14em;color:#006f6b}ol{list-style:none;padding:0}
li{display:flex;gap:14px;background:#fff4e2;border:1px solid rgba(36,70,62,.14);border-radius:14px;padding:16px;margin:10px 0}.n{font:700 20px serif;color:#f2b84b}.w{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#006f6b}p{margin:4px 0 0;font-size:14px;opacity:.75}a.btn{display:inline-block;margin-top:20px;background:#006f6b;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700}</style></head>
<body><main class="box"><img src="/assets/logo/bustan-energy.svg" alt="Bustan Energy" height="48">
<div class="ref">REF · ${escapeHtml(p.ref)}${when ? ` · signed ${when}` : ''}</div>
<h1>✓ Thank you${p.clientName ? `, ${escapeHtml(p.clientName)}` : ''} — your agreement is signed.</h1>
<p>${p.kwp ? `${escapeHtml(String(p.kwp))} kWp system. ` : ''}A confirmation with your signed copy is on its way by email. Here is what happens next:</p>
<ol>${steps}</ol>
<a class="btn" href="https://wa.me/66946692011">Questions? WhatsApp us</a>
<p style="margin-top:24px">Your proposal stays available at this link for 7 days: <a href="/p/${escapeHtml(p.ref)}">bustan-energy.com/p/${escapeHtml(p.ref)}</a></p>
</main></body></html>`
}
