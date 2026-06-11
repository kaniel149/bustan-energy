# Bustan Website — Premium ("Million Dollar") Upgrade Design

**Date:** 2026-06-11
**Repo:** bustan-energy (energy-tm.com)
**Approved by:** Kaniel

## Goal

Elevate the public Bustan website to top-tier premium quality — both visual prestige AND conversion — while **keeping the existing tropical-light brand language** (paper/sand background, grove green, lagoon teal, sun gold, papaya accent, Instrument Serif + DM Sans). No redesign; deep polish.

## Scope

**In:** Public pages — Home, Services, Projects, Pricing, About, Contact, HowItWorks, Platform, Tools, Blog (list + post), ResortSolarAssessment, NotFound.
**Out:** admin/, CRM, Scanner, Proposal components, api/.

## Current Problems

1. HomePage was retrofitted from a dark theme to light via a `.bustan-home … !important` CSS override layer in `src/index.css` (~250 lines) — blocks real polish, causes inconsistency.
2. No shared UI primitives — buttons/cards/section headers re-implemented per page.
3. Image treatment inconsistent (grading, radius, shadows vary).
4. Mobile polish and performance (LCP/CLS, font loading) unverified.

## Phases

### Phase 0 — Baseline Audit
- Playwright screenshots of all public pages, desktop (1440) + mobile (390).
- Lighthouse scores (performance, a11y, SEO) for Home + 2 key pages.
- Findings list ranked by visual impact. Output: `docs/superpowers/audit/2026-06-11-baseline/`.

### Phase 1 — Clean Design System
- Rewrite HomePage sections natively in Bustan tokens; delete the `!important` override layer entirely.
- Extend `@theme` tokens: type scale (Instrument Serif display sizes, DM Sans body), spacing rhythm, shadow scale (3 levels), radius scale, standard motion durations/easings.
- Shared UI primitives in `src/components/ui/`: Button (primary/secondary/ghost + WhatsApp variant), Card, SectionHeader (tag + serif title + subtitle), Stat (count-up), Badge.
- Gate: build + typecheck pass; Home visually identical-or-better vs baseline screenshots.

### Phase 2 — Page-by-Page Polish
Order: Home → Services → Projects → Pricing → About → Contact → rest.
Per page:
- Hero: large serif typography, treated imagery, subtle micro-animations (no gimmicks).
- Consistent image treatment (single grading recipe, unified radius/shadow).
- Micro-interactions: hover states, refined scroll reveals, smooth transitions.
- Trust layer: stats, logos, certifications, testimonials where content exists.
- Unified CTA system: WhatsApp + roof/resort assessment.
- Mobile-first verification per page (390px screenshots).

### Phase 3 — Performance & Verification
- LCP/CLS budget: LCP < 2.5s, CLS < 0.1 on Home (mobile, throttled).
- Font loading (`font-display: swap`, preload display font), lazy/sized images.
- Verify: build, typecheck, before/after screenshots, Lighthouse delta.
- Deploy: Vercel preview → manual check → production.

## Error Handling / Rollback

- Each phase = separate commit(s) on a feature branch `fable/premium-website`; merge to main only after screenshot verification.
- If a page regresses visually, revert that page's commit — phases are page-isolated.

## Success Criteria

1. Zero `!important` brand overrides in `index.css`.
2. All public pages share the same primitives and image treatment.
3. Lighthouse performance ≥ 90 mobile on Home (or documented blocker).
4. Before/after screenshot set demonstrates clear premium lift.
