# Bustan Rebrand — Full Migration from TM Energy (Design Spec)

**Date:** 2026-06-10
**Decision maker:** Kaniel Tordjman
**Status:** Stage 1 ✅ DONE (2026-06-10). Stage 2 ✅ 90% (2026-06-11): energy-tm.com + www → 301 bustan-energy.com (path-preserving, verified /p/AMIR-001) · crm.energy-tm.com → 301 crm.bustan-energy.com (live, DNS exists) · index.energy-tm.com → dormant 301 to index.bustan-energy.com (Vercel-side configured; waits on 2 GoDaddy CNAMEs + CS/CNAME file flip). Stage 3 ✅ DONE (2026-06-11): GitHub `solar-intelligence`→`bustan-energy`, `copenhagen-solar`→`bustan-index`, old prototype→`bustan-energy-legacy` (repo + Vercel project) · Vercel project renamed `bustan-energy` · local `solar/tm-energy/`→`solar/bustan/` (inner dirs match repo names) · remotes updated · zshrc `TM_SUPABASE_*`→`BUSTAN_DB_*` · project-dashboard registry+handlers rebranded · GATE passed: push → auto-deploy READY. Manual left: Supabase project display name (dashboard UI). Stage 4 pending.
**Discovered pre-existing:** project already had bustan-energy.com primary + crm/map/proposals/solar-intelligence subdomains + bustanenergy.com (no hyphen) redirects. energy-tm.com NS = GoDaddy (not Vercel DNS — MEMORY.md outdated).

**Stage 1 outcome notes:**
- SI + CS fully swept (0 TM refs except transitional: `crm.energy-tm.com` in App.tsx, old admin emails in admin-access/admin-auth defaults, CS/CNAME)
- bustan-energy.com confirmed attached to Vercel project `solar-intelligence`; deployed + smoke passed (/p/AMIR-001 200, Bustan branding, sitemap 96/0)
- Resend: old failed energy-tm.com domain DELETED; bustan-energy.com added (id a54afb7b-f297-4251-b088-be9c81866782), status not_started — WAITING on 3 GoDaddy DNS records (DKIM + send MX/TXT)
- Prod has NO email env vars — senders/admin lists come from code defaults (now bustan-energy.com). Fixed stray `bustan.energy` senders in 6 api files.
- Reply-to/notify = @bustan-energy.com (Mailgun MX exists on domain) — mailbox receipt NOT yet confirmed
- ⚠️ Rotate RESEND_API_KEY (full key surfaced in session output) — add to security TODO
- ⚠️ Stage 4: remove duplicate "* 2.*" files (api/contact-lead 2.ts, proposal-builder " 2" files) — macOS copy artifacts

## Goal

Migrate everything branded "TM Energy" (Thailand operation) to the new brand **Bustan (בוסתן)** at **bustan-energy.com**, then remove all TM branding traces. Copenhagen Solar also consolidates under the Bustan brand.

## Decisions (confirmed with user)

| Question | Decision |
|---|---|
| New domain | `bustan-energy.com` (already live on Vercel, HTTP 200) |
| Copenhagen Solar (index.energy-tm.com) | Also rebrands to Bustan |
| energy-tm.com fate | Kept in GoDaddy as **301 redirect only** → bustan-energy.com (client proposal links `/p/{REF}` must survive) |
| Social (FB "TM Energy", IG @tmenergy.th) | Rename to Bustan — manual checklist (Meta approval required) |
| Technical rename depth | Full: folders + GitHub repos + Vercel projects + env vars + code branding |

## Current TM Footprint

- **Live site:** energy-tm.com (Vercel project `solar-intelligence`, prj_tM1jJxGlOjnHo9bIWQpjzzigssUP)
- **Static hub:** index.energy-tm.com (repo `copenhagen-solar`, CNAME)
- **Local folder:** `~/Desktop/projects/solar/tm-energy/` containing repos `solar-intelligence` + `copenhagen-solar`
- **Supabase:** `trvgpgpsqvvdsudpgwpm` (display name references TM)
- **Env var:** `TM_SUPABASE_SERVICE_ROLE_KEY` in `~/.zshrc`
- **Email:** admin magic-links `@energy-tm.com`; Resend DKIM/SPF DNS was pending on energy-tm.com
- **Meta:** FB page "TM Energy" + IG @tmenergy.th (connected to Developer App "Solar OS Automation")
- **Docs:** CLAUDE.md project rows #17/#18, MEMORY.md sections, in-repo docs

## Staged Plan (Approach A)

### Stage 1 — Content & Code Rebrand (no infra changes)
- Replace TM Energy branding in both repos: UI strings, meta tags, og tags, email templates, proposal templates, sitemap/robots, hardcoded `energy-tm.com` URLs → `bustan-energy.com`
- Email sender domain → `@bustan-energy.com`: set up Resend domain (DKIM + SPF DNS records) on **bustan-energy.com** — replaces the previously planned energy-tm.com Resend DNS fix
- Verify `bustan-energy.com/p/{REF}` proposal flow works (password gate, signature, view tracking)
- Verify admin login still works (magic-link emails — keep both email domains accepted during transition)
- **Gate:** full build + deploy + manual smoke test before Stage 2

### Stage 2 — 301 Redirects
- `energy-tm.com/*` → `bustan-energy.com/*` (path-preserving 301, especially `/p/{REF}`)
- `index.energy-tm.com` → new Copenhagen home under Bustan (e.g. `index.bustan-energy.com` or path on main domain — decide at implementation by checking current CNAME setup)
- **Gate:** curl tests on old proposal URLs return 301 → 200

### Stage 3 — Infrastructure Renames
- Local: `solar/tm-energy/` → `solar/bustan/` (folder only; update any scripts/cron referencing old paths)
- GitHub: rename repos (`solar-intelligence` → `bustan-energy` or similar; `copenhagen-solar` keeps or renames — GitHub auto-redirects old URLs); update local git remotes
- Vercel: rename project `solar-intelligence` → `bustan-energy`; verify git integration still triggers deploys after repo rename
- Supabase: rename project display name to Bustan (ref `trvgpgpsqvvdsudpgwpm` is immutable — fine)
- `~/.zshrc`: `TM_SUPABASE_SERVICE_ROLE_KEY` → `BUSTAN_SUPABASE_SERVICE_ROLE_KEY` (+ grep all repos/scripts for usages)
- **Gate:** push a trivial commit → auto-deploy works → site healthy

### Stage 4 — Cleanup & TM Erasure
- Grep both repos for remaining `TM Energy|tm-energy|energy-tm|tmenergy` (keep ONLY the 301 redirect config)
- Update CLAUDE.md (rows #17/#18 → Bustan) and MEMORY.md (paths, routing table "TM"/"תאילנד" keywords → Bustan)
- Manual social checklist for user: FB page rename, IG handle change, update bio links
- **Gate:** final grep returns only redirect config + this spec's history

## Out of Scope

- Logo/visual identity redesign (separate task if needed)
- Deleting energy-tm.com from GoDaddy (kept as redirect per decision)
- Social rename automation (Meta requires manual approval)

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Client proposal links break | Stage 2 path-preserving 301 + curl verification before any deletion |
| Vercel git integration breaks on repo rename | Stage 3 gate: test deploy immediately after rename; relink if needed |
| Emails bounce during Resend domain switch | Verify Resend domain status = verified before switching sender |
| Admin lockout (magic-link domain change) | Accept both old/new admin emails during transition |
| Hidden TM references in DB content (proposals, email logs) | Stage 4 grep includes Supabase content check (read-only scan) |
