# SP5 — External Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The outside world gets four doors: (1) a public academy (Solar Fundamentals + EV & Storage) reachable from a "Learn" link on bustan-energy.com and the vanity host `academy.bustan-energy.com`, with the three team tracks behind a shared passcode; (2) `/partners` — investor/partner page with the financing deck, a facts grid fed by one constants file (with an "under review" badge until Kaniel resolves `VALIDATION.md §2`), and a "request the data room" form into the existing lead pipeline; (3) a signed-proposal thank-you page with the PEA timeline plus a 7-day re-entry link in the confirmation email; (4) an expanded `/about` trust page (team, licensing, PEA process, academy). Plus sitemap/JSON-LD/OG fixes and a Playwright smoke.

**Architecture:** Academy stays where it is served today — GitHub Pages `index.bustan-energy.com/academy/` (option **c**, plus a vanity host). Reasons: GH Pages allows one custom domain per repo (already `index.bustan-energy.com`, `CNAME` at root); proxying `/academy/*` through Vercel (option a) would duplicate 25 already-indexed URLs on a second host, break the academy's relative refs that escape `/academy/` (`../proposals/tm-logo.png`, `../index.html` in every lesson) and need canonical tags on every lesson. Instead: `academy.bustan-energy.com` is added to the Vercel project and a host-matched **308 redirect** in `vercel.json` sends `academy.bustan-energy.com/*` → `https://index.bustan-energy.com/academy/*`. One canonical host, one DNS record, no proxy. Team-track gate = `academy/assets/gate.js` (pure functions, sha256 of a shared passcode, `?key=` → localStorage). **This is not authentication** — the lesson HTML is public on GitHub Pages; the gate only keeps team material out of search and casual view (team lessons also get `noindex` and leave the index sitemap). Facts for `/partners` live in `src/data/investor-facts.ts` with `pending: true` on the three open mismatches. Signed page = pure HTML builder in `api/_lib/proposal-signed-page.ts` served by `proposal-serve.ts` on `?signed=1`, so *existing* proposals (whose `rendered_html` is frozen in the DB) get it too.

**Tech Stack:** E: React 19 + TS + react-router 7, react-helmet-async, vitest 4 (unit), Playwright (`tests/e2e`, dev server on 5177), Vercel edge functions, Resend. I: static HTML/JS on GitHub Pages, Node test scripts in `academy/tests/*.mjs` (run by `node academy/tests/run-all.mjs`, no deps).

**Key facts (verified 2026-09-03 — do not re-derive):**
- E routes: `src/App.tsx` `PageRoutes()` is mounted under `/`, `/th`, `/he` inside `Layout` (Navbar + Footer). `useLanguage().langPath(p)` prefixes the lang. `Lang = 'en'|'th'|'he'`; `translations = { en, th: deepMerge(en, th), he: deepMerge(en, he) }` — missing keys fall back to EN, so TH/HE blocks may be partial but the EN block must be complete. Nav: `Navbar.tsx` `NAV_LINKS` (`{label, path}` → `<Link to={langPath(path)}>`) used in desktop + mobile; `Footer.tsx` `QUICK_LINKS` same shape. Hero CTAs: `HomePage.tsx:175-200`.
- SEO: `src/components/seo/SEOHead.tsx` (title/desc/canonical/hreflang en+th/OG/JSON-LD; `robots` prop default `index, follow`). `DEFAULT_OG_IMAGE` = `/assets/images/og-default.jpg` which **does not exist** (`strategy-01-aerial.jpg` exists and is `index.html`'s `og:image`). Schema helpers in `schemas.ts`: `organizationSchema()`, `breadcrumbSchema()`, `pageBreadcrumb(lang, label, path)`. Sitemap: `public/sitemap.xml`, 48 `<url>` entries with en/th/x-default `xhtml:link` (`/about` block at lines 169-185). `vercel.json` `rewrites`: `/api/*`, `/p/:ref → /api/proposal-serve?ref=:ref`, static dirs, then `/(.*) → /index.html`; `redirects: []`; query strings are preserved through rewrites; `X-Robots-Tag: noindex` on `/admin /crm /platform /p /proposals`.
- Lead endpoint: `api/contact-lead.ts` (POST JSON `{name,email,phone,propertyType,systemInterest,message,source,website(honeypot),…attribution}`; needs name + valid email or phone; inserts `projects` row, emails `LEAD_NOTIFY_EMAILS`, CAPI, drip). `ContactPage.tsx:141-165` shows the client call (`getAttribution()`, `getMetaClickIds()`, `newEventId()`, `trackEvent`, `trackLeadConversion`).
- Proposals: `/p/:ref` → `api/proposal-serve.ts` (GET no session → password `gatePage`; POST `{password}` → sets HMAC cookie `bustan_proposal_session` (7-day TTL, `api/_lib/proposal-session.ts`: `createProposalSession(ref)`, `verifyProposalSession(token, ref)`, `proposalSessionCookie`) and returns `metadata.rendered_html`). Signature UI is `public/proposal-templates/contract-snippet.html` (injected at creation by `admin-create-proposal.ts:718`; on `json.ok` it shows `#signedBanner`). `api/proposal-sign.ts` inserts `proposal_signatures`, PATCHes status `signed`, emails team (HE) + client (`clientEmail()`, EN, says "4-6 weeks" while `proposal.html` says 6–8 weeks and payment is 40/40/20 per `admin-create-proposal.ts:247`). Resend helper: `api/_lib/resend.ts` `sendResendEmail(to, subject, html)`.
- I academy: hub `academy/index.html` (5 static `.track-card[data-track]` anchors at lines 523-640, lesson lists rendered from `window.ACADEMY_LESSONS` at 748-770), 24 lessons `academy/courses/<track>-NN.html` (each loads `../assets/academy.js` defer, no robots meta), `academy/assets/lessons.js` is **generated** by `academy/tools/build-lessons-index.mjs` (don't hand-edit). `academy.js`: localStorage progress, `setLanguage()`, quiz. Tests: `academy/tests/{_util,links,lessons-chain,i18n-coverage,image-budget,docs-index}.mjs`; `_util.mjs` exports `ROOT, rel, htmlIn, read, localRefs, fail, LESSON_RE`. `sitemap.xml` lists the hub + all 24 lessons (lines 93-122). `robots.txt` allows `/academy/`, disallows `/pea-docs/` (still publicly reachable). Presentations: `presentations/VALIDATION.md §2/§4` — open: cost/kWp (deck ฿12K/฿20K vs workbook 11,800), sale price/kWp (deck ≈฿30K vs 32,500), PPA tariff (4.5 vs 4.20 vs 4.40); PEA retail 6 THB/kWh and 4.5 sun-hours agree; Krungsri loan 3.5%/10y is deck-only.
- Financing deck: `E/public/bustan-financing-deck.html` (54 KB, HE/RTL with built-in EN/TH), live at `https://bustan-energy.com/bustan-financing-deck.html`. Team facts available in-repo: Kaniel Tordjman (founder); `erez@bustan-energy.com` is reply-to for contracts and leads. **Confirm Erez's full name/title with Kaniel before merge** (Task 6 uses "Erez — Operations & contracts, Ko Phangan").

**Repos:** `E` = `~/Desktop/projects/solar/bustan/bustan-energy`, `I` = `~/Desktop/projects/solar/bustan/bustan-index`. Branch `sp5/external` in both. Ignore files containing ` 2.`/` 3.`.

**Hard rules:**
- No DB migration, no deletes. No secrets in code. `OUTREACH_SELF_SEND=1` untouched.
- Nothing merges; PRs only. DNS + Vercel domain are Kaniel's manual steps (Task 3 lists them exactly).
- Commit trailer on every commit:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_017JbAbFU9Nekc5oHPiezgru
  ```

---

### Task 0: Branches + baseline

- [ ] `cd $E && git checkout main && git pull --ff-only origin main && git checkout -b sp5/external && npm test && npm run typecheck` → record vitest count; typecheck clean.
- [ ] `cd $I && git checkout main && git pull --ff-only origin main && git checkout -b sp5/external && node academy/tests/run-all.mjs` → "all checks passed".

---

### Task 1: Investor facts — one constants file

**Files:**
- Create: `E/src/data/investor-facts.ts`, `E/src/data/investor-facts.test.ts`
- [ ] **Step 1: Failing test**

```ts
// E/src/data/investor-facts.test.ts
import { describe, it, expect } from 'vitest'
import { INVESTOR_FACTS, VALIDATED_AT, pendingFacts, hasPendingFacts } from './investor-facts'

describe('investor facts', () => {
  it('exactly the three VALIDATION.md §2 mismatches are pending, each with a note; VALIDATED_AT is an ISO date', () => {
    expect(VALIDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(pendingFacts().sort()).toEqual(['installedCostPerKwp', 'ppaTariff', 'salePricePerKwp'])
    for (const k of pendingFacts()) expect(INVESTOR_FACTS[k].note).toMatch(/deck/i)
    expect(hasPendingFacts()).toBe(true)
  })
  it('agreed figures are workbook-sourced and not pending', () => {
    expect(INVESTOR_FACTS.peaTariff).toMatchObject({ value: 6, unit: 'THB/kWh', source: 'workbook', pending: false })
    expect(INVESTOR_FACTS.sunHours).toMatchObject({ value: 4.5, pending: false })
  })
})
```

- [ ] **Step 2: Run → fails** — `npx vitest run src/data/investor-facts.test.ts` → "Failed to resolve import".
- [ ] **Step 3: Implement**

```ts
// E/src/data/investor-facts.ts
// Single source for every number shown on /partners. `pending: true` = Kaniel has not yet
// closed the item in bustan-index/presentations/VALIDATION.md §4; the page shows a badge.
export const VALIDATED_AT = '2026-09-03'
export type FactKey = 'peaTariff' | 'ppaTariff' | 'installedCostPerKwp' | 'salePricePerKwp' | 'sunHours' | 'loanRate' | 'loanTermYears'
export interface InvestorFact {
  value: number
  unit: string
  source: 'workbook' | 'deck'
  pending: boolean
  /** Required when pending: what disagrees with what. */
  note?: string
}
export const INVESTOR_FACTS: Record<FactKey, InvestorFact> = {
  peaTariff: { value: 6, unit: 'THB/kWh', source: 'workbook', pending: false },
  sunHours: { value: 4.5, unit: 'h/day', source: 'workbook', pending: false },
  ppaTariff: { value: 4.5, unit: 'THB/kWh', source: 'workbook', pending: true,
    note: 'Deck uses 4.5 in examples and 4.20 as default; workbook QA retail 4.40 — one number to be chosen.' },
  installedCostPerKwp: { value: 11_800, unit: 'THB/kWp', source: 'workbook', pending: true,
    note: 'Deck shows ฿12K (EPC) and ฿20K (ESCO 500 kWp) vs workbook 11,800 — basis per system size to be chosen.' },
  salePricePerKwp: { value: 32_500, unit: 'THB/kWp', source: 'workbook', pending: true,
    note: 'Deck examples (villa 10 kW ฿300K, resort 50 kW ฿1.5M) imply ~฿30K/kWp vs workbook 32,500.' },
  loanRate: { value: 3.5, unit: '%', source: 'deck', pending: false },
  loanTermYears: { value: 10, unit: 'years', source: 'deck', pending: false },
}
export function pendingFacts(): FactKey[] {
  return (Object.keys(INVESTOR_FACTS) as FactKey[]).filter((k) => INVESTOR_FACTS[k].pending)
}
export function hasPendingFacts(): boolean {
  return pendingFacts().length > 0
}
```

- [ ] **Step 4: Run → passes**; `git add src/data/investor-facts.ts src/data/investor-facts.test.ts && git commit -m "feat(partners): investor-facts constants with VALIDATED_AT + pending flags for VALIDATION.md §2 mismatches"`

---

### Task 2 (repo I): Public tracks, team passcode gate, noindex, sitemap, Course JSON-LD

**Files:**
- Create: `I/academy/assets/gate.js`, `I/academy/tests/gate.mjs`, `I/academy/tests/public-tracks.mjs`
- Modify: all 24 `I/academy/courses/*.html` (add gate script; team lessons add robots meta), `I/academy/index.html`, `I/academy/assets/academy.css`, `I/sitemap.xml`
- [ ] **Step 1: Failing tests**

```js
// I/academy/tests/gate.mjs — pure gate logic evaluated in a sandbox (no browser)
import vm from 'node:vm'; import crypto from 'node:crypto';
import { read, fail } from './_util.mjs';
const root = {}; vm.runInNewContext(read('academy/assets/gate.js'), { root, window: undefined });
const G = root.AcademyGate; if (!G) fail('gate.js must export root.AcademyGate');
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${m}: got ${JSON.stringify(a)}`); };
eq(G.PUBLIC_TRACKS, ['solar-fundamentals', 'ev-storage'], 'public tracks'); eq(G.TEAM_TRACKS, ['sales-bd', 'technical', 'management'], 'team tracks');
eq(G.trackOf('courses/sales-bd-02.html'), 'sales-bd', 'trackOf lesson'); eq(G.trackOf('/academy/courses/technical-01.html'), 'technical', 'trackOf abs path');
eq(G.trackOf('/academy/index.html'), null, 'trackOf hub'); eq(G.isTeamTrack('management'), true, 'team'); eq(G.isTeamTrack('ev-storage'), false, 'public');
eq(G.KEY_HASH, crypto.createHash('sha256').update('bustan-team-2026').digest('hex'), 'hash of the shared passcode');
console.log('gate: ok');
```

```js
// I/academy/tests/public-tracks.mjs — team lessons noindex + gated; public lessons indexable; sitemap = public only; Course JSON-LD
import { htmlIn, read, fail, LESSON_RE } from './_util.mjs';
import path from 'node:path';
const TEAM = ['sales-bd', 'technical', 'management'];
const sitemap = read('sitemap.xml'); const hub = read('academy/index.html');
for (const f of htmlIn('academy/courses')) {
  const m = path.basename(f).match(LESSON_RE); if (!m) continue;
  const html = read(f), team = TEAM.includes(m[1]);
  const noindex = /<meta name="robots" content="noindex,nofollow">/.test(html), inMap = sitemap.includes(`/academy/${f.replace(/^academy\//, '')}`);
  if (!html.includes('../assets/gate.js')) fail(`${f}: missing gate.js`);
  if (team !== noindex) fail(`${f}: team lessons must be noindex, public lessons indexable`);
  if (team === inMap) fail(`${f}: sitemap must list public lessons only`);
}
if (!sitemap.includes('/academy/</loc>')) fail('sitemap: hub missing');
const ld = [...hub.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const courses = ld.flatMap(d => d['@graph'] || [d]).filter(d => d['@type'] === 'Course');
if (courses.length !== 2) fail(`hub: expected 2 Course schemas, got ${courses.length}`);
for (const t of TEAM) if (!hub.includes(`data-track="${t}" data-team="1"`)) fail(`hub: ${t} card needs data-team`);
console.log('public-tracks: ok');
```

- [ ] **Step 2: Run → fails** — `node academy/tests/gate.mjs; node academy/tests/public-tracks.mjs` → FAIL lines.
- [ ] **Step 3: gate.js**

```js
// I/academy/assets/gate.js — shared-passcode gate for team tracks.
// NOT authentication: every lesson is a public file on GitHub Pages. This hides team
// material from casual visitors and (with noindex) from search. Rotate: replace KEY_HASH
// with  node -e "console.log(require('crypto').createHash('sha256').update('NEW').digest('hex'))"
(function (root) {
  const PUBLIC_TRACKS = ['solar-fundamentals', 'ev-storage'];
  const TEAM_TRACKS = ['sales-bd', 'technical', 'management'];
  const KEY_HASH = '410db3ada1cea7e8db8bcbee91b354991a1ee41db076e42dad483609c5bac864'; // sha256('bustan-team-2026')
  const STORE = 'bustan_academy_key';
  const trackOf = (p) => { const m = String(p).match(/(solar-fundamentals|sales-bd|technical|ev-storage|management)-\d{2}\.html$/); return m ? m[1] : null; };
  const isTeamTrack = (t) => TEAM_TRACKS.includes(t);
  async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  const unlocked = () => { try { return localStorage.getItem(STORE) === KEY_HASH; } catch { return false; } };
  async function acceptKey(key) { if (!key) return unlocked(); const ok = (await sha256(key.trim())) === KEY_HASH; if (ok) localStorage.setItem(STORE, KEY_HASH); return ok; }
  const T = { en: ['Team material', 'This track is for Bustan Energy staff. Enter the team passcode to continue.', 'Passcode', 'Unlock', 'Wrong passcode', '← Back to Academy'],
    he: ['חומר לצוות', 'המסלול הזה מיועד לצוות Bustan Energy. הזינו את קוד הצוות כדי להמשיך.', 'קוד', 'פתח', 'קוד שגוי', '← חזרה לאקדמיה'],
    th: ['เนื้อหาสำหรับทีม', 'หลักสูตรนี้สำหรับทีม Bustan Energy กรุณาใส่รหัสทีมเพื่อดำเนินการต่อ', 'รหัส', 'ปลดล็อก', 'รหัสไม่ถูกต้อง', '← กลับไปที่ Academy'] };
  function renderGate(container) {
    const s = T[document.body.getAttribute('data-lang') || 'en'] || T.en;
    container.innerHTML = `<section class="glass-card gate-box"><h1>🔒 ${s[0]}</h1><p>${s[1]}</p>
      <form id="gate-form"><label>${s[2]} <input id="gate-key" type="password" autocomplete="off" autofocus></label>
      <button type="submit" class="complete-btn">${s[3]}</button><p id="gate-err" class="gate-err"></p></form><a href="../index.html">${s[5]}</a></section>`;
    container.querySelector('#gate-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (await acceptKey(container.querySelector('#gate-key').value)) location.reload(); else container.querySelector('#gate-err').textContent = s[4];
    });
  }
  async function init() {
    await acceptKey(new URLSearchParams(location.search).get('key')); const on = unlocked();
    document.querySelectorAll('.track-card[data-team]').forEach(c => c.classList.toggle('locked', !on));
    const track = trackOf(location.pathname);
    if (track && isTeamTrack(track) && !on) { const c = document.querySelector('.lesson-container'); if (c) renderGate(c); }
  }
  root.AcademyGate = { PUBLIC_TRACKS, TEAM_TRACKS, KEY_HASH, trackOf, isTeamTrack, unlocked, acceptKey };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : root);
```

- [ ] **Step 4: Wire lessons + hub + sitemap** (from `$I`):

```bash
for f in academy/courses/*.html; do case "$f" in *" 2."*|*" 3."*) continue;; esac
  grep -q 'assets/gate.js' "$f" || sed -i '' 's#<script src="../assets/academy.js" defer></script>#&\n  <script src="../assets/gate.js" defer></script>#' "$f"
  case "$(basename "$f")" in sales-bd-*|technical-*|management-*)
    grep -q 'name="robots"' "$f" || sed -i '' 's#<meta name="viewport"[^>]*>#&\n  <meta name="robots" content="noindex,nofollow">#' "$f";; esac
done
# hub: gate script + team markers
sed -i '' 's#<script src="assets/academy.js" defer></script>#&\n  <script src="assets/gate.js" defer></script>#' academy/index.html
for t in sales-bd technical management; do sed -i '' "s#data-track=\"$t\" data-total#data-track=\"$t\" data-team=\"1\" data-total#" academy/index.html; done
# sitemap: drop team lessons
sed -i '' '/\/academy\/courses\/\(sales-bd\|technical\|management\)-[0-9][0-9]\.html/d' sitemap.xml
```
Then by hand in `academy/index.html`: inside each of the three team `.track-card`s, after the `.difficulty-badge`, add `<span class="lock-badge"><span data-en>🔒 Team</span><span data-he>🔒 צוות</span><span data-th>🔒 ทีม</span></span>`; set the hub `<url>` `lastmod` to `2026-09-03` in `sitemap.xml`; add before `</head>`:

```html
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
 {"@type":"Course","@id":"https://index.bustan-energy.com/academy/#solar-fundamentals","name":"Solar Fundamentals","description":"8 lessons: how PV works, panels, inverters, system types, site assessment, sizing, energy economics — for Thailand's islands. Free, in English, Hebrew and Thai.","url":"https://index.bustan-energy.com/academy/#track-solar-fundamentals","inLanguage":["en","he","th"],"isAccessibleForFree":true,"provider":{"@type":"Organization","name":"Bustan Energy","url":"https://bustan-energy.com"},"hasCourseInstance":{"@type":"CourseInstance","courseMode":"online","courseWorkload":"PT4H"}},
 {"@type":"Course","@id":"https://index.bustan-energy.com/academy/#ev-storage","name":"EV & Energy Storage","description":"3 lessons on EV charging and battery storage for solar homes, resorts and businesses in Thailand. Free, trilingual.","url":"https://index.bustan-energy.com/academy/#track-ev-storage","inLanguage":["en","he","th"],"isAccessibleForFree":true,"provider":{"@type":"Organization","name":"Bustan Energy","url":"https://bustan-energy.com"},"hasCourseInstance":{"@type":"CourseInstance","courseMode":"online","courseWorkload":"PT1H30M"}}]}</script>
```
And in `academy/assets/academy.css` append:
```css
.track-card.locked { opacity: .78; } .track-card.locked .lock-badge { display: inline-block; } .lock-badge { display: none; font-size: .75rem; margin-inline-start: .5rem; padding: .15rem .5rem; border-radius: 999px; background: rgba(255,184,0,.15); color: #FFB800; }
.gate-box { max-width: 480px; margin: 4rem auto; padding: 2rem; text-align: center; } .gate-box input { display:block; width:100%; margin:.75rem 0 1rem; padding:.6rem; border-radius:8px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.05); color:inherit; } .gate-err { color:#ff6b6b; min-height:1.2em; }
```

- [ ] **Step 5: Run → passes** — `node academy/tests/run-all.mjs` → all checks passed (links test also covers `gate.js`). Manual: open `academy/courses/sales-bd-01.html` via `python3 -m http.server` → gate shows; `?key=bustan-team-2026` → lesson shows; `solar-fundamentals-01.html` never gated.
- [ ] **Step 6: Commit** — `git add academy sitemap.xml && git commit -m "feat(academy): public tracks (solar-fundamentals, ev-storage) + team passcode gate, noindex team lessons, Course JSON-LD, sitemap"`

---

### Task 3 (repo E): Vanity host `academy.bustan-energy.com` → redirect, DNS list

**Files:**
- Modify: `E/vercel.json` (`redirects`)
- Create: `E/tests/vercel-config.test.ts`
- [ ] **Step 1: Failing test**

```ts
// E/tests/vercel-config.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
type Rule = { source: string; destination: string; has?: { type: string; value: string }[]; permanent?: boolean }
const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as { redirects: Rule[]; rewrites: Rule[] }

describe('vercel.json external layer', () => {
  it('redirects the academy vanity host to the canonical GitHub Pages academy (no proxy); SPA catch-all stays last', () => {
    const r = cfg.redirects.find((x) => x.has?.some((h) => h.type === 'host' && h.value === 'academy.bustan-energy.com'))
    expect(r).toMatchObject({ source: '/:path*', destination: 'https://index.bustan-energy.com/academy/:path*', permanent: true })
    expect(cfg.rewrites.some((x) => x.source.startsWith('/academy'))).toBe(false)
    expect(cfg.rewrites.at(-1)).toEqual({ source: '/(.*)', destination: '/index.html' })
  })
})
```

- [ ] **Step 2: Run → fails**; then set in `vercel.json`:
```json
"redirects": [
  { "source": "/:path*", "has": [{ "type": "host", "value": "academy.bustan-energy.com" }],
    "destination": "https://index.bustan-energy.com/academy/:path*", "permanent": true }
],
```
- [ ] **Step 3: Run → passes**; commit `chore(vercel): academy.bustan-energy.com → 308 to index.bustan-energy.com/academy`.
- [ ] **Step 4: Records for Kaniel (manual, GoDaddy + Vercel):**
  1. Vercel → project `bustan-energy` → Settings → Domains → Add `academy.bustan-energy.com` (no redirect option in the dialog; the JSON rule does it).
  2. GoDaddy DNS for `bustan-energy.com`: `CNAME  academy  →  cname.vercel-dns.com  TTL 600`.
  3. Nothing changes for `index` (already `CNAME index → kaniel149.github.io`) or the apex.
  4. Verify after propagation: `curl -sI https://academy.bustan-energy.com/courses/solar-fundamentals-01.html | grep -i '^location'` → `https://index.bustan-energy.com/academy/courses/solar-fundamentals-01.html`.

---

### Task 4: "Learn" in nav, footer and hero

**Files:**
- Modify: `E/src/lib/constants.ts`, `E/src/i18n/translations.ts` (en/th/he `nav.learn`, `home.hero.ctaLearn`), `E/src/components/layout/Navbar.tsx`, `E/src/components/layout/Footer.tsx`, `E/src/pages/HomePage.tsx`
- [ ] **Step 1:** `constants.ts` add `export const ACADEMY_URL = 'https://index.bustan-energy.com/academy/'`. Translations: `nav.learn: 'Learn'` / th `'เรียนรู้'` / he `'אקדמיה'`; `home.hero.ctaLearn: 'Free solar academy →'` / th `'อคาเดมีโซลาร์ฟรี →'` / he `'אקדמיה סולארית חינם →'`.
- [ ] **Step 2: Navbar** — extend the link type and both render sites:
```tsx
type NavLink = { label: string; path: string; external?: boolean }
const NAV_LINKS: NavLink[] = [ /* existing seven */, { label: t.nav.learn, path: ACADEMY_URL, external: true } ]
// desktop + mobile map bodies:
if (link.external) return <a key={link.path} href={link.path} target="_blank" rel="noopener" className={desktopLink(false)} data-testid="nav-learn">{link.label}</a>
```
(mobile: same `<a>` with the mobile classes and `onClick={() => setMobileOpen(false)}`.)
- [ ] **Step 3: Footer** — `QUICK_LINKS` add `{ label: t.nav.learn, path: ACADEMY_URL, external: true }` and render `external ? <a href … target="_blank" rel="noopener" className={footerLink}>` else `<Link>`.
- [ ] **Step 4: Hero** — after the two `Button`s' wrapper `motion.div` (HomePage ~line 200) add:
```tsx
<motion.a variants={fadeUp} href={ACADEMY_URL} target="_blank" rel="noopener"
  className="mt-4 inline-block text-sm text-shell/78 hover:text-gold underline-offset-4 hover:underline">{t.home.hero.ctaLearn}</motion.a>
```
- [ ] **Step 5:** `npm run typecheck && npm run lint` clean; `npm run dev` → nav shows "Learn" opening the academy in a new tab on `/`, `/th`, `/he`. Commit `feat(nav): Learn link (academy) in navbar, footer, hero`.

---

### Task 5: `/partners` page + data-room form

**Files:**
- Create: `E/src/pages/PartnersPage.tsx`
- Modify: `E/src/i18n/translations.ts` (`partners`, `seo.partners` in en/th/he), `E/src/App.tsx` (route), `E/api/contact-lead.ts` (source label), `E/public/sitemap.xml`
- [ ] **Step 1: Translations (EN complete; TH/HE fall back per key)**

```ts
// en
partners: {
  hero: { tag: 'Partners & Investors', title: 'Own the sun on Ko Phangan', subtitle: 'Island electricity costs ฿5–7/kWh and rises yearly. Bustan Energy builds and operates rooftop solar under EPC and PPA — and opens both to partners: lenders, PPA capital, and EPC/installer partners.' },
  why: [ { title: 'A scanned pipeline, not a wish list', body: 'Every roof on the island has been mapped and graded; candidates flow through owner research, proposals and e-signature in one system.' },
    { title: 'Two revenue models', body: 'EPC (client owns the system) for cash flow; PPA (we own it, the client buys power) for long-dated yield.' },
    { title: 'PEA-ready delivery', body: 'Single-line diagrams, layouts and application packages are produced in-house; grid connection is part of the scope.' } ],
  facts: { title: 'Key figures', badge: 'Figures under review', badgeHint: 'Three inputs differ between the financing deck and the business-plan workbook and await a final decision.', validated: 'Workbook validated', labels: {
    peaTariff: 'PEA retail tariff', ppaTariff: 'PPA tariff', installedCostPerKwp: 'Installed cost', salePricePerKwp: 'EPC sale price', sunHours: 'Peak sun hours', loanRate: 'Krungsri solar loan rate', loanTermYears: 'Loan term' } },
  deck: { title: 'Financing deep-dive', open: 'Open the deck full screen' },
  form: { title: 'Request the data room', subtitle: 'Business plan workbook, scan inventory, proposal pipeline and PPA model. We reply within 2 business days.', name: 'Full name', email: 'Work email', company: 'Company / fund', role: 'I am a…', roles: { investor: 'Investor / PPA capital', lender: 'Bank / lender', epc: 'EPC or installer partner', other: 'Other' }, message: 'What are you evaluating?', submit: 'Request access', sent: 'Thanks — we will send the data-room link by email.', error: 'Could not send right now. Please reach us on WhatsApp.' },
},
seo: { …, partners: { title: 'Partners & Investors — Solar EPC/PPA on Ko Phangan', description: 'Invest in or partner with Bustan Energy: island-scale solar pipeline, EPC and PPA models, Krungsri financing, PEA-ready delivery. Request the data room.' } },
```
TH: `partners: { hero: { tag: 'พันธมิตรและนักลงทุน', title: 'ร่วมเป็นเจ้าของพลังงานแสงอาทิตย์บนเกาะพะงัน' }, facts: { title: 'ตัวเลขสำคัญ', badge: 'ตัวเลขอยู่ระหว่างตรวจสอบ' }, deck: { title: 'เจาะลึกการเงิน', open: 'เปิดเต็มจอ' }, form: { title: 'ขอเข้าถึงข้อมูล', name: 'ชื่อ-นามสกุล', email: 'อีเมล', company: 'บริษัท / กองทุน', submit: 'ขอเข้าถึง', sent: 'ขอบคุณ — เราจะส่งลิงก์ทางอีเมล', error: 'ส่งไม่ได้ในขณะนี้ กรุณาติดต่อทาง WhatsApp' } }, seo.partners: { title: 'พันธมิตรและนักลงทุน — โซลาร์ EPC/PPA เกาะพะงัน', description: 'ร่วมลงทุนหรือเป็นพันธมิตรกับ Bustan Energy: โครงการโซลาร์ทั่วเกาะ โมเดล EPC และ PPA สินเชื่อกรุงศรี ขอเข้าถึง data room' }`.
HE: `partners: { hero: { tag: 'שותפים ומשקיעים', title: 'להיות הבעלים של השמש בקו פנגן' }, facts: { title: 'מספרים מרכזיים', badge: 'הנתונים בבדיקה' }, deck: { title: 'מצגת מימון', open: 'פתח במסך מלא' }, form: { title: 'בקשת גישה ל-Data Room', name: 'שם מלא', email: 'אימייל', company: 'חברה / קרן', submit: 'בקש גישה', sent: 'תודה — נשלח קישור במייל', error: 'לא ניתן לשלוח כרגע. פנו אלינו בוואטסאפ' } }, seo.partners: { title: 'שותפים ומשקיעים — סולארי EPC/PPA בקו פנגן', description: 'השקעה או שותפות עם Bustan Energy: צבר גגות סרוק, מודלים EPC ו-PPA, מימון Krungsri. בקשו גישה ל-Data Room.' }`.

- [ ] **Step 2: Page**

```tsx
// E/src/pages/PartnersPage.tsx
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Handshake, Sun } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { organizationSchema, breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Button } from '../components/ui/Button'
import { fadeUp, stagger, heroStagger, revealViewport, Divider, IconTile } from './services/shared'
import { INVESTOR_FACTS, VALIDATED_AT, hasPendingFacts, type FactKey } from '../data/investor-facts'
import { getAttribution } from '../lib/attribution'
import { getMetaClickIds, newEventId, trackEvent } from '../lib/analytics'

const FACT_ORDER: FactKey[] = ['peaTariff', 'ppaTariff', 'installedCostPerKwp', 'salePricePerKwp', 'sunHours', 'loanRate', 'loanTermYears']
const fmt = (v: number) => v.toLocaleString('en-US')

function FactsGrid() {
  const { t } = useTranslation(); const f = t.partners.facts
  return (
    <section className="py-16"><div className="max-w-7xl mx-auto px-6">
      <SectionHeader title={f.title} className="mb-6" />
      {hasPendingFacts() && (
        <div data-testid="facts-review-badge" className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-ink" title={f.badgeHint}>
          ⚠︎ {f.badge} · {f.validated} {VALIDATED_AT}
        </div>)}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FACT_ORDER.map((k) => { const x = INVESTOR_FACTS[k]; return (
          <div key={k} className="rounded-card border border-grove/14 bg-shell/76 p-5 shadow-soft">
            <div className="text-xs uppercase tracking-widest text-ink/45 mb-1">{f.labels[k]}</div>
            <div className="font-serif text-3xl text-ink">{fmt(x.value)} <span className="text-base text-ink/60">{x.unit}</span></div>
            {x.pending && <span className="mt-2 inline-block rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-ink/80" title={x.note}>{f.badge}</span>}
          </div>) })}
      </div>
    </div></section>)
}

function DataRoomForm() {
  const { t } = useTranslation(); const c = t.partners.form
  const [form, setForm] = useState({ name: '', email: '', company: '', role: 'investor', message: '', website: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const eventId = useRef(newEventId())
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState('sending')
    try {
      const { fbc, fbp } = getMetaClickIds()
      const res = await fetch('/api/contact-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, propertyType: form.company, systemInterest: `data-room:${form.role}`,
          message: form.message, website: form.website, source: 'partners', ...getAttribution(), event_id: eventId.current, fbc: fbc || undefined, fbp: fbp || undefined }) })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'submit_failed')
      trackEvent('data_room_request', { role: form.role }); setState('sent')
    } catch { setState('error') }
  }
  if (state === 'sent') return <p role="status" className="text-ink text-lg">{c.sent}</p>
  return (
    <form onSubmit={submit} className="space-y-4" aria-label={c.title}>
      <input className="field" required placeholder={c.name} aria-label={c.name} value={form.name} onChange={set('name')} />
      <input className="field" required type="email" placeholder={c.email} aria-label={c.email} value={form.email} onChange={set('email')} />
      <input className="field" placeholder={c.company} aria-label={c.company} value={form.company} onChange={set('company')} />
      <select className="field" aria-label={c.role} value={form.role} onChange={set('role')}>{Object.entries(c.roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <textarea className="field" rows={4} placeholder={c.message} aria-label={c.message} value={form.message} onChange={set('message')} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={set('website')} />
      <Button variant="primary" size="lg" type="submit" disabled={state === 'sending'}>{c.submit}</Button>
      {state === 'error' && <p role="alert" className="text-sm text-red-700">{c.error}</p>}
    </form>)
}

export default function PartnersPage() {
  const { t, lang } = useTranslation(); const { langPath } = useLanguage(); const p = t.partners
  return (
    <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
      <SEOHead title={t.seo.partners.title} description={t.seo.partners.description} path="/partners" lang={lang}
        schema={[organizationSchema(), breadcrumbSchema(pageBreadcrumb(lang, p.hero.tag, '/partners'))]} />
      <section className="relative overflow-hidden px-6 pt-32 pb-16"><motion.div variants={heroStagger} initial="hidden" animate="visible" className="relative max-w-4xl mx-auto text-center space-y-6">
          <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-ocean/20 bg-shell/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-ocean"><Handshake size={14} aria-hidden />{p.hero.tag}</motion.span>
          <motion.h1 variants={fadeUp} className="font-serif text-display-md md:text-display-xl leading-[1.05] tracking-tight">{p.hero.title}</motion.h1>
          <motion.p variants={fadeUp} className="text-ink/74 text-lg leading-relaxed">{p.hero.subtitle}</motion.p>
      </motion.div></section>
      <section className="py-12"><div className="max-w-7xl mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={revealViewport} variants={stagger} className="grid md:grid-cols-3 gap-6">
          {p.why.map((w) => (<motion.div key={w.title} variants={fadeUp} className="rounded-card border border-grove/14 bg-shell/76 p-6 shadow-soft">
            <IconTile className="mb-4"><Sun size={22} strokeWidth={1.5} aria-hidden /></IconTile><h3 className="text-lg font-semibold mb-2">{w.title}</h3><p className="text-ink/60 text-sm leading-relaxed">{w.body}</p></motion.div>))}
        </motion.div></div></section>
      <Divider /><FactsGrid /><Divider />
      <section className="py-16"><div className="max-w-6xl mx-auto px-6">
        <SectionHeader title={p.deck.title} className="mb-6" />
        <iframe src="/bustan-financing-deck.html" title={p.deck.title} loading="lazy" className="w-full aspect-video rounded-card border border-grove/14 bg-black shadow-lift" />
        <a href="/bustan-financing-deck.html" target="_blank" rel="noopener" className="mt-3 inline-block text-sm text-ocean hover:underline">{p.deck.open} ↗</a>
      </div></section>
      <section id="data-room" className="py-20"><div className="max-w-2xl mx-auto px-6">
        <SectionHeader title={p.form.title} subtitle={p.form.subtitle} className="mb-8" /><DataRoomForm />
        <p className="mt-6 text-xs text-ink/45"><a href={langPath('/about')} className="hover:underline">{t.nav.about}</a> · <a href="https://wa.me/66946692011">WhatsApp</a></p></div></section>
    </div>)
}
```
Add `.field { @apply w-full rounded-xl border border-grove/20 bg-white px-4 py-3 text-ink; }` to `src/index.css` if no equivalent exists (check `ContactPage.tsx` input classes first and reuse the same class string instead if one exists).

- [ ] **Step 3: Route + endpoint + sitemap** — `App.tsx`: `const PartnersPage = lazy(() => import('./pages/PartnersPage'))` and `<Route path="partners" element={<PartnersPage />} />` in `PageRoutes` (before the SEO pages). `contact-lead.ts`: replace the ternary in `sendLeadEmail` with
```ts
const SOURCE_LABELS: Record<string, string> = { 'bill-scanner': 'Bill Scanner lead magnet', partners: 'Partners page — data-room request' }
const sourceLabel = SOURCE_LABELS[lead.source] || 'Website contact form'
… subject: `New Bustan Energy lead · ${lead.name}${lead.source !== 'website' ? ` (${sourceLabel})` : ''}`,
```
`public/sitemap.xml`: copy the `/about` + `/th/about` blocks → `/partners` + `/th/partners`, `changefreq monthly`, `priority 0.7`.
- [ ] **Step 4: Verify** — `npm run typecheck && npm run lint`; `npm run dev` → `/partners`, `/th/partners`, `/he/partners` render; badge visible; iframe loads the deck; submit form with a real email → 200 `{ok:true}` and lead email received with "(Partners page — data-room request)". Commit `feat(partners): /partners — value prop, facts grid (pending badges), financing deck, data-room form → contact-lead`.

---

### Task 6: `/about` trust expansion — team, licensing, PEA process, academy

**Files:**
- Modify: `E/src/i18n/translations.ts` (`about.trust` en/th/he), `E/src/pages/AboutPage.tsx`
- [ ] **Step 1: Translations (EN)**

```ts
trust: {
  team: { title: 'Who you work with', members: [
    { name: 'Kaniel Tordjman', role: 'Founder · engineering, software, proposals' },
    { name: 'Erez', role: 'Operations & contracts, Ko Phangan' } ] },
  licensing: { title: 'Licensing & grid connection', body: 'Grid-tied systems in Thailand are licensed through the Provincial Electricity Authority (PEA). We prepare the full application — single-line diagram, panel layout, PEA summary — and manage the inspection and meter change.', link: 'See a real PEA application package' },
  pea: { title: 'From signature to grid in 6–8 weeks', steps: [
    { title: 'Survey & design', body: 'Site measurement, electrical assessment, system design (week 1)' },
    { title: 'PEA application & procurement', body: 'SLD, layout and summary filed; equipment ordered on the 40% deposit (weeks 1–3)' },
    { title: 'Installation', body: 'Mounting, panels, inverters, wiring (weeks 4–6)' },
    { title: 'Inspection & go-live', body: 'PEA inspection, grid connection, monitoring handover; 20% on commissioning (weeks 6–8)' } ] },
  academy: { title: 'Learn how it works', body: 'Our free academy explains solar, batteries and EV charging for Thailand — in English, Thai and Hebrew.', cta: 'Open the academy' },
},
```
TH/HE: translate `team.title`, `licensing.title`, `pea.title`, `academy.{title,body,cta}` (roles/step bodies fall back to EN). HE `pea.title: 'מחתימה לחיבור לרשת ב-6–8 שבועות'`, `academy.cta: 'לאקדמיה'`; TH `pea.title: 'จากเซ็นสัญญาถึงเชื่อมต่อกริดใน 6–8 สัปดาห์'`, `academy.cta: 'เปิดอคาเดมี'`.

- [ ] **Step 2: AboutPage** — between the Values section and `<StatsSection>` insert (use `p.trust`; `ACADEMY_URL` from constants; `PEA_DOCS_URL = 'https://index.bustan-energy.com/pea-docs/'`):
```tsx
<Divider />
<section id="trust" className="py-20"><div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12">
  <div><SectionHeader title={p.trust.team.title} className="mb-6" />
    <ul className="space-y-3">{p.trust.team.members.map((m) => <li key={m.name} className="rounded-card border border-grove/14 bg-shell/76 p-4"><b>{m.name}</b><span className="block text-sm text-ink/60">{m.role}</span></li>)}</ul></div>
  <div><SectionHeader title={p.trust.licensing.title} className="mb-6" />
    <p className="text-ink/74 leading-relaxed">{p.trust.licensing.body}</p>
    <a href={PEA_DOCS_URL} target="_blank" rel="noopener" className="mt-3 inline-block text-ocean hover:underline">{p.trust.licensing.link} ↗</a></div>
</div></section>
<section id="pea-process" className="py-20 bg-mist/30"><div className="max-w-7xl mx-auto px-6">
  <SectionHeader title={p.trust.pea.title} className="mb-10" />
  <ol className="grid md:grid-cols-4 gap-6">{p.trust.pea.steps.map((s, i) => <li key={s.title} className="rounded-card border border-grove/14 bg-shell/76 p-6"><div className="font-serif text-3xl text-gold mb-2">{i + 1}</div><h3 className="font-semibold mb-1">{s.title}</h3><p className="text-sm text-ink/60">{s.body}</p></li>)}</ol>
</div></section>
<section className="py-12"><div className="max-w-3xl mx-auto px-6 text-center">
  <h2 className="font-serif text-display-sm mb-3">{p.trust.academy.title}</h2><p className="text-ink/70 mb-5">{p.trust.academy.body}</p>
  <Button variant="primary" size="md" href={ACADEMY_URL} target="_blank" rel="noopener">{p.trust.academy.cta}</Button>
</div></section>
```
- [ ] **Step 3:** typecheck/lint clean; `/about`, `/th/about`, `/he/about` render the three sections. Commit `feat(about): team, licensing, PEA process timeline, academy link`.

---

### Task 7: Signed-proposal thank-you page + 7-day re-entry link

**Files:**
- Create: `E/api/_lib/proposal-signed-page.ts`, `E/api/_lib/proposal-signed-page.test.ts`
- Modify: `E/api/proposal-serve.ts`, `E/api/proposal-sign.ts`, `E/public/proposal-templates/contract-snippet.html`
- [ ] **Step 1: Failing test**

```ts
// E/api/_lib/proposal-signed-page.test.ts
import { describe, it, expect } from 'vitest'
import { signedPage, NEXT_STEPS } from './proposal-signed-page.js'

describe('signedPage', () => {
  const html = signedPage({ ref: 'BE-2026-0042', clientName: '<script>x</script>Villa Mango', kwp: 32.5, signedAt: '2026-09-03T04:00:00Z' })
  it('is a noindex page that names the ref, escapes the client and lists the four PEA steps', () => {
    expect(html).toContain('noindex')
    expect(html).toContain('BE-2026-0042')
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(NEXT_STEPS).toHaveLength(4)
    for (const s of NEXT_STEPS) expect(html).toContain(s.title)
    expect(html).toContain('wa.me/66946692011')
    expect(html).toContain('32.5 kWp')
    expect(signedPage({ ref: 'X1' })).toContain('X1')   // optional fields absent
  })
})
```

- [ ] **Step 2: Run → fails**; implement:

```ts
// E/api/_lib/proposal-signed-page.ts — post-signature page; pure, served by proposal-serve on ?signed=1
import { escapeHtml } from './html.js'
export interface SignedPageInput { ref: string; clientName?: string | null; kwp?: number | string | null; signedAt?: string | null }
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
```

- [ ] **Step 3: proposal-serve.ts** — (a) extend `ProposalServeRow` and the `select=` in `loadProposal` with `status,signed_at,system_size_kwp`; (b) import `signedPage`; (c) at the top of `handler` after loading the proposal:
```ts
const wantsSigned = url.searchParams.get('signed') === '1' && proposal.status === 'signed'
const signedHtml = () => new Response(signedPage({ ref: proposal!.ref_number, clientName: proposal!.client_name, kwp: proposal!.system_size_kwp, signedAt: proposal!.signed_at }),
  { status: 200, headers: { ...securityHeaders, 'Content-Type': 'text/html; charset=utf-8' } })
// Magic re-entry link from the confirmation email: ?s=<session token> → set cookie, drop token from URL
const s = url.searchParams.get('s')
if (req.method === 'GET' && s && (await verifyProposalSession(s, ref))) {
  const clean = `/p/${encodeURIComponent(ref)}${wantsSigned ? '?signed=1' : ''}`
  return new Response(null, { status: 302, headers: { ...securityHeaders, Location: clean, 'Set-Cookie': proposalSessionCookie(s, url.protocol === 'https:') } })
}
```
(d) in the GET branch, after `verified` is true: `if (wantsSigned) return signedHtml()`; (e) in the POST success branch, before returning the html: `if (wantsSigned) { const r = signedHtml(); r.headers.set('Set-Cookie', proposalSessionCookie(session, url.protocol === 'https:')); return r }` — note the cookie must be set *with* the session created there. Keep `expiresPage`/410 precedence unchanged.
- [ ] **Step 4: contract-snippet.html** — in the `if (json.ok)` branch, after the banner lines add `setTimeout(() => location.assign(location.pathname + '?signed=1'), 600);`. `proposal-sign.ts`: `import { createProposalSession } from './_lib/proposal-session.js'`; in the handler before building `postSignTasks`: `const reentry = \`https://bustan-energy.com/p/${encodeURIComponent(ref)}?signed=1&s=${encodeURIComponent(await createProposalSession(ref))}\``; pass it as a third arg to `clientEmail(p, s, reentry)`, which renders `<p><a href="${escapeHtml(reentry)}">View your next steps and proposal</a> (link valid 7 days)</p>` and change the steps list to `Site survey within the first days`, `40% deposit invoice will be sent separately`, `Installation and PEA go-live within 6–8 weeks`.
- [ ] **Step 5: Run → passes** — `npx vitest run api/_lib/proposal-signed-page.test.ts`; `npm run typecheck`. Manual on the Vercel preview: open a test proposal, enter password, sign → lands on `/p/REF?signed=1` thank-you; email contains the re-entry link; opening it in a private window skips the password gate and shows the thank-you; `/p/REF?signed=1` for an unsigned proposal shows the normal proposal. Commit `feat(proposal): signed thank-you page (PEA timeline) on ?signed=1 + 7-day re-entry link in client email`.

---

### Task 8: SEO — OG image fix, sitemap test

**Files:**
- Modify: `E/src/components/seo/SEOHead.tsx` (`DEFAULT_OG_IMAGE`)
- Create: `E/tests/sitemap.test.ts`
- [ ] **Step 1: Failing test**

```ts
// E/tests/sitemap.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
const xml = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
describe('public sitemap', () => {
  it('lists the new public pages in en + th; never private surfaces or other hosts', () => {
    for (const p of ['/partners', '/th/partners', '/about', '/th/about']) expect(locs).toContain(`https://bustan-energy.com${p}`)
    for (const l of locs) { expect(l).toMatch(/^https:\/\/bustan-energy\.com\//); expect(l).not.toMatch(/\/(admin|crm|platform|p|proposals|colliers)\b/) }
  })
})
```
- [ ] **Step 2:** run → passes only if Task 5 added the entries (else fix). `SEOHead.tsx`: `const DEFAULT_OG_IMAGE = \`${BASE_URL}/assets/images/strategy-01-aerial.jpg\`` (the file that exists; matches `index.html`). Commit `fix(seo): default OG image points at an existing asset; sitemap test`.

---

### Task 9: Smoke tests, verification, push, PRs

**Files:**
- Modify: `E/tests/e2e/smoke.spec.ts` (append)
- [ ] **Step 1: Playwright**

```ts
test('partners page: facts under review, deck iframe, data-room form', async ({ page }) => {
  await page.goto('/partners')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByTestId('facts-review-badge')).toBeVisible()
  await expect(page.locator('iframe[src="/bustan-financing-deck.html"]')).toBeVisible()
  await expect(page.getByLabel(/full name|ชื่อ|שם/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /request access|ขอเข้าถึง|בקש/i })).toBeVisible()
})
test('about page carries the trust sections and the academy link', async ({ page }) => {
  await page.goto('/about')
  await expect(page.locator('#trust')).toBeVisible()
  await expect(page.locator('#pea-process li')).toHaveCount(4)
  await expect(page.getByRole('link', { name: /open the academy/i })).toHaveAttribute('href', /index\.bustan-energy\.com\/academy/)
})
test('Learn link points at the academy from every locale', async ({ page }) => {
  for (const p of ['/', '/th', '/he']) {
    await page.goto(p)
    await expect(page.getByTestId('nav-learn').first()).toHaveAttribute('href', 'https://index.bustan-energy.com/academy/')
  }
})
```
- [ ] **Step 2: Full gate (E)** — `npm run typecheck && npm run lint && npm test && npm run build && npx playwright test` → all green; record vitest count vs Task 0 (+4 files). **(I)** — `node academy/tests/run-all.mjs` → all checks passed.
- [ ] **Step 3: Push + PRs (no merge)** — `cd $E && git push -u origin sp5/external && gh pr create --base main --title "SP5 — External layer: partners, about trust, signed page, academy links" --body-file <(printf 'Academy served from index.bustan-energy.com/academy (option c) + vanity 308 from academy.bustan-energy.com.\n\nKaniel manual steps: Vercel domain + GoDaddy CNAME academy → cname.vercel-dns.com; resolve VALIDATION.md §4 then flip pending flags in src/data/investor-facts.ts; confirm Erez title on /about.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nhttps://claude.ai/code/session_017JbAbFU9Nekc5oHPiezgru')`; same for `$I` (`gh pr create --base main --title "SP5 — academy public tracks + team passcode gate"`). Note: GitHub Pages deploys only from `main`, so the academy changes go live at merge time.
- [ ] **Step 4: Preview checks (lead, Vercel preview URL)** — `/partners` badge + iframe + form submission produces a lead email; `/about#pea-process`; `/he/partners` is RTL; `/p/<test ref>` sign flow → thank-you; re-entry link works in a private window.
- [ ] **Step 5: Report (≤25 lines):** commits (both repos), test counts before/after, the Kaniel checklist: (1) Vercel domain + CNAME record (Task 3 Step 4), (2) VALIDATION.md §4 decisions → set `pending: false` + update `VALIDATED_AT`, (3) team passcode `bustan-team-2026` — share with staff via `https://index.bustan-energy.com/academy/?key=bustan-team-2026`, rotate by replacing `KEY_HASH`, (4) Erez's display name/title. WhatsApp summary to 972502213948.
