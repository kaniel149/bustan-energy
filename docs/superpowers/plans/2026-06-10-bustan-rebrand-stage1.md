# Bustan Rebrand — Stage 1 Implementation Plan (Content & Code)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all user-visible TM Energy branding (domains, emails, names) with Bustan / bustan-energy.com in `solar-intelligence` and `copenhagen-solar`, set up Resend on the new domain, and verify the proposal flow — WITHOUT touching infra names (Stage 3) or redirects (Stage 2).

**Architecture:** Pure string/config migration. Code edits via Edit for surgical changes, `sed` sweeps for bulk content, grep-zero as the "test" for each task. Email cutover is gated: Vercel env vars flip only after Resend domain verifies.

**Tech Stack:** React+Vite+Vercel (solar-intelligence), static GitHub Pages (copenhagen-solar, has CNAME), Resend, Supabase, GoDaddy DNS (bustan-energy.com — MX already on Mailgun, SPF mailgun.org).

**Repo paths:**
- SI = `/Users/kanieltordjman/Desktop/projects/solar/tm-energy/solar-intelligence`
- CS = `/Users/kanieltordjman/Desktop/projects/solar/tm-energy/copenhagen-solar`

**Discovery facts (2026-06-10):**
- SI: 258 `energy-tm.com` refs in 65 files; UI already mostly "Bustan Energy" (1,784 refs). Git clean at `e3d6624`.
- CS: 194 `energy-tm.com` + ~998 "TM Energy" refs (marketing/docs heavy). 1 uncommitted file `drone-mission-plan.html`.
- bustan-energy.com: live on Vercel (A 76.76.21.21), NS GoDaddy, MX Mailgun.
- Key emails: `erez@energy-tm.com`, `kaniel@energy-tm.com` (reply-to + notify). New-domain mailboxes presumed via Mailgun routes — MUST verify before flipping reply-to.

**Do-NOT-touch list (Stage 1):**
- `CS/CNAME` (`index.energy-tm.com`) — Stage 2
- `vercel.json` redirects — Stage 2
- Repo/folder/Vercel/env-var NAMES — Stage 3
- `SI/docs/superpowers/**` (spec/plan history) — excluded from sweeps
- Binary/tiles dirs: `drone-tiles/`, `drone-imagery/`, `node_modules/`, `dist/`, `.git/`

---

### Task 1: SI core domain constants

**Files:**
- Modify: `SI/src/components/seo/SEOHead.tsx` (BASE_URL)
- Modify: `SI/src/App.tsx` (isCrmDomain check)
- Modify: `SI/src/lib/generate-proposal.ts` (footer `www.tmenergy.co`)

- [ ] **Step 1: Confirm current values**

Run: `grep -n "energy-tm.com\|tmenergy" src/components/seo/SEOHead.tsx src/App.tsx src/lib/generate-proposal.ts` (cwd SI)
Expected: BASE_URL line, isCrmDomain line(s), footer line.

- [ ] **Step 2: Edit SEOHead.tsx**

Change `const BASE_URL = 'https://energy-tm.com'` → `'https://bustan-energy.com'` (match exact quoting from Step 1).

- [ ] **Step 3: Edit App.tsx — accept BOTH crm hostnames during transition**

Replace the `crm.energy-tm.com` equality check with:
```ts
const isCrmDomain = ['crm.energy-tm.com', 'crm.bustan-energy.com'].includes(window.location.hostname)
```
(adapt to the actual surrounding code from Step 1; keep old hostname until Stage 4).

- [ ] **Step 4: Edit generate-proposal.ts footer** → `www.bustan-energy.com`

- [ ] **Step 5: Verify**

Run: `grep -rn "energy-tm.com\|tmenergy" src/components/seo/SEOHead.tsx src/lib/generate-proposal.ts`
Expected: 0 matches. `grep -n "energy-tm" src/App.tsx` → only the transitional crm hostname.
Run: `npm run build` → exit 0.

- [ ] **Step 6: Commit**
```bash
git add -A src/ && git commit -m "rebrand: core domain constants → bustan-energy.com"
```

### Task 2: SI email layer (templates + env example + README)

**Files:**
- Modify: `SI/api/_lib/drip-templates.ts` (SITE_URL fallback + footer)
- Modify: `SI/.env.example` (lines ~18–29: RESEND_FROM, EMAIL_FROM, EMAIL_REPLY_TO, LEAD_NOTIFY_EMAILS, SITE_URL, PROPOSAL_BASE_URL)
- Modify: `SI/README.md` (crm.energy-tm.com link, LEAD_NOTIFY section)

- [ ] **Step 1: Edit drip-templates.ts** — every `energy-tm.com` → `bustan-energy.com` (grep file first, edit each hit)
- [ ] **Step 2: Rewrite .env.example email block**
```
RESEND_FROM="Bustan Energy Leads <leads@bustan-energy.com>"
EMAIL_FROM="Bustan Energy <proposals@bustan-energy.com>"
EMAIL_REPLY_TO=erez@bustan-energy.com
LEAD_NOTIFY_EMAILS=erez@bustan-energy.com,kaniel@bustan-energy.com
SITE_URL=https://bustan-energy.com
PROPOSAL_BASE_URL=https://bustan-energy.com/p
```
(keep any other vars untouched; match existing var names exactly)
- [ ] **Step 3: README.md** — `crm.energy-tm.com` → `crm.bustan-energy.com`, emails → new domain
- [ ] **Step 4: Verify:** `grep -rn "energy-tm" api/_lib/drip-templates.ts .env.example README.md` → 0
- [ ] **Step 5: Commit** `git add api/_lib/drip-templates.ts .env.example README.md && git commit -m "rebrand: email templates + env example → bustan-energy.com"`

### Task 3: SI proposal-builder templates

**Files:** Modify all `SI/tools/proposal-builder/template-*.html` (~6 files: contract, dynamic, en, th, client-prep, …) + any `.mjs` with domain refs

- [ ] **Step 1: List hits:** `grep -rln "energy-tm\|tmenergy" tools/proposal-builder/`
- [ ] **Step 2: Bulk replace (text files only):**
```bash
grep -rIl "energy-tm.com" tools/proposal-builder/ | xargs sed -i '' 's/energy-tm\.com/bustan-energy.com/g'
grep -rIl "tmenergy.asia" tools/proposal-builder/ | xargs sed -i '' 's/proposal\.tmenergy\.asia/bustan-energy.com\/p/g; s/tmenergy\.asia/bustan-energy.com/g'
grep -rIl "tmenergy" tools/proposal-builder/ | xargs sed -i '' 's/www\.tmenergy\.co/www.bustan-energy.com/g; s/TM Energy/Bustan Energy/g; s/tmenergy/bustan-energy/g'
```
- [ ] **Step 3: Verify:** `grep -rn "energy-tm\|tmenergy\|TM Energy" tools/proposal-builder/` → 0
- [ ] **Step 4: Spot-check one template renders:** open `template-dynamic.html` head/footer diff (`git diff --stat tools/proposal-builder/`) — only string changes
- [ ] **Step 5: Commit** `git add tools/proposal-builder && git commit -m "rebrand: proposal templates → Bustan / bustan-energy.com"`

### Task 4: SI sitemap + remaining sweep

**Files:** `SI/public/sitemap.xml` (96 refs), `SI/public/robots.txt`, all remaining text files in `src/ api/ public/ tools/ docs/` (EXCLUDING `docs/superpowers/`, `legacy/`, `tools/output/` — those are Stage 4)

- [ ] **Step 1: Sitemap+robots:** `sed -i '' 's/energy-tm\.com/bustan-energy.com/g' public/sitemap.xml public/robots.txt`
- [ ] **Step 2: Residual sweep:**
```bash
grep -rIl --exclude-dir={node_modules,dist,.git,legacy,output,superpowers} "energy-tm\.com" src api public tools docs | xargs -I{} sed -i '' 's/energy-tm\.com/bustan-energy.com/g' {}
grep -rIl --exclude-dir={node_modules,dist,.git,legacy,output,superpowers} "TM Energy" src api public tools docs | xargs -I{} sed -i '' 's/TM Energy/Bustan Energy/g' {}
```
- [ ] **Step 3: Verify:** `grep -rIn --exclude-dir={node_modules,dist,.git,legacy,output,superpowers} "energy-tm\.com\|TM Energy" src api public tools docs` → 0 (App.tsx transitional hostname allowed)
- [ ] **Step 4: Build + typecheck:** `npm run build && npm run typecheck` (or the api/ typecheck script added in `1b70751`) → exit 0
- [ ] **Step 5: Commit** `git commit -am "rebrand: sitemap + full content sweep TM → Bustan"`

### Task 5: CS (copenhagen-solar) sweep

**Files:** `CS/index.html` (title/og/meta/schema), `CS/sitemap.xml` (22 refs), `CS/robots.txt`, all `.html .md .txt .js .json .xml` (~184 files with TM refs). NOT `CNAME`.

- [ ] **Step 1: Commit the pre-existing dirty file separately:**
```bash
git add drone-mission-plan.html && git commit -m "chore: commit pending drone-mission-plan before rebrand sweep"
```
- [ ] **Step 2: index.html by hand (Edit tool):** title → "Bustan Energy — Ko Phangan Solar", og:title/og:site_name/og:url (`https://bustan-energy.com`), schema org name → Bustan Energy. Keep og:image asset as-is (existing asset rule).
- [ ] **Step 3: Bulk sweep (text files, skip CNAME + binaries):**
```bash
grep -rIl --exclude-dir={.git,node_modules,drone-tiles,drone-imagery} --exclude=CNAME "energy-tm\.com" . | xargs -I{} sed -i '' 's/index\.energy-tm\.com/index.bustan-energy.com/g; s/energy-tm\.com/bustan-energy.com/g' {}
grep -rIl --exclude-dir={.git,node_modules,drone-tiles,drone-imagery} --exclude=CNAME "TM Energy\|TM-Energy\|tmenergy" . | xargs -I{} sed -i '' 's/TM Energy/Bustan Energy/g; s/TM-Energy/Bustan-Energy/g; s/@tmenergy\.th/@bustan.energy/g; s/tmenergy/bustan-energy/g' {}
```
(Note: `index.bustan-energy.com` refs become live only in Stage 2 when CNAME/DNS move; acceptable ordering since CS deploys with site already reachable via old CNAME until then — verify nothing 404s by keeping relative links untouched.)
- [ ] **Step 4: Verify:** same grep → 0 matches (except CNAME). `git diff --stat | tail -1` sanity (~180 files).
- [ ] **Step 5: Commit + push (GitHub Pages auto-deploys):** `git commit -am "rebrand: full TM → Bustan sweep" && git push`

### Task 6: Resend domain bustan-energy.com

- [ ] **Step 1: Add domain via Resend API** (key from Vercel env `RESEND_API_KEY`, pull with `npx vercel env pull` in SI or read from dashboard):
```bash
curl -s -X POST https://api.resend.com/domains -H "Authorization: Bearer $RESEND_API_KEY" -H "Content-Type: application/json" -d '{"name":"bustan-energy.com"}'
```
Expected: JSON with `records[]` — DKIM TXT (`resend._domainkey`), SPF TXT+MX on `send.bustan-energy.com`. (Coexists with Mailgun root MX/SPF — no conflict.)
- [ ] **Step 2: Add the records in GoDaddy DNS** (bustan-energy.com zone). If CLI access unavailable → output exact records for user to paste (mobile-friendly list).
- [ ] **Step 3: Trigger verify + poll:**
```bash
curl -s -X POST https://api.resend.com/domains/{id}/verify -H "Authorization: Bearer $RESEND_API_KEY"
curl -s https://api.resend.com/domains/{id} -H "Authorization: Bearer $RESEND_API_KEY" | jq .status
```
Expected: `"verified"` (may take minutes–hours; do NOT proceed to Task 7 until verified).
- [ ] **Step 4: Inbox check (reply-to gate):** send test via Resend to `erez@bustan-energy.com` + `kaniel@bustan-energy.com`; ask user to confirm receipt (Mailgun routes). If NOT received → keep `EMAIL_REPLY_TO`/`LEAD_NOTIFY_EMAILS` on `@energy-tm.com` in Task 7 and flag for follow-up.

### Task 7: Vercel env cutover + deploy + smoke

**Pre-req:** Task 6 Step 3 = verified.

- [ ] **Step 1: Confirm domain attachment:** `npx vercel domains ls` / `npx vercel project ls` — verify `bustan-energy.com` is attached to the SI Vercel project (`solar-intelligence`). If not attached → add it before deploy.
- [ ] **Step 2: Update Vercel env (production):** `RESEND_FROM`, `EMAIL_FROM`, `SITE_URL`, `PROPOSAL_BASE_URL` → new domain values from Task 2 Step 2. `EMAIL_REPLY_TO`/`LEAD_NOTIFY_EMAILS` per Task 6 Step 4 outcome. Use `npx vercel env rm <NAME> production && npx vercel env add <NAME> production`.
- [ ] **Step 3: Deploy:** `npx vercel --prod` from SI. Expected: ready, no build errors.
- [ ] **Step 4: Smoke tests:**
```bash
curl -s https://bustan-energy.com | grep -io "bustan" | head -1        # → bustan
curl -s https://bustan-energy.com/sitemap.xml | grep -c "bustan-energy.com"  # → ~96
curl -s https://bustan-energy.com/sitemap.xml | grep -c "energy-tm"    # → 0
```
Proposal flow: fetch one real ref from Supabase (`select ref from proposals order by created_at desc limit 1` via MCP execute_sql on `trvgpgpsqvvdsudpgwpm`), then `curl -sI https://bustan-energy.com/p/{REF}` → 200 (password gate page).
Admin: load `https://bustan-energy.com/admin` → 200; request magic link; confirm email arrives FROM `@bustan-energy.com`.
- [ ] **Step 5: Old domain still serves (Stage 2 not done yet):** `curl -sI https://energy-tm.com` → 200. Client links unbroken. ✅ Stage 1 gate passed.

### Task 8: Stage-1 close-out

- [ ] Update `SI/docs/superpowers/specs/2026-06-10-bustan-rebrand-design.md` — mark Stage 1 done, record Task 6 Step 4 outcome
- [ ] Push SI: `git push`
- [ ] Report to user: what shipped, grep counts before/after, email verification status, what waits for Stage 2 (301s + CNAME)

---

## Self-review notes
- Spec coverage: Stage 1 bullets all mapped (branding ✓ Tasks 1–5, Resend ✓ Task 6, /p/{REF} verify ✓ Task 7, admin transition ✓ Task 1 Step 3 + Task 7). Redirects/infra explicitly out (Stages 2–3).
- `sed -i ''` = macOS syntax (host is a Mac). All sweeps `grep -rIl` (text-only) with binary dirs excluded.
- Risk: bulk `s/tmenergy/bustan-energy/g` could mangle identifiers in JS — Step verify includes build (Task 4) and CS is static HTML (no build) → manual `git diff --stat` sanity instead.
