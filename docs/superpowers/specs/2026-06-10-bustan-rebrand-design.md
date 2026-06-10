# Bustan Rebrand — Full Migration from TM Energy (Design Spec)

**Date:** 2026-06-10
**Decision maker:** Kaniel Tordjman
**Status:** Approved approach A (staged migration)

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
