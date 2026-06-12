# Bustan Energy — Baseline Visual Audit (2026-06-11)

Branch: `fable/premium-website` · Build: `npm run build` (passes) · Server: `vite preview` @ localhost:4173
Captured with `scripts/audit-screenshots.mjs` — 14 routes x 2 viewports (1440x900 desktop, 390x844 mobile), full-page PNGs, plus 2 optional blog-post captures (30 PNGs total).

## TL;DR

**The light "tropical-paper" brand exists on exactly one page: Home.** Every other public page (services, all 4 service subpages, how-it-works, pricing, projects, about, blog, blog post, contact, tools, 404) still runs the old dark navy/forest theme with white text and gold accents. Home itself is light only via a `.bustan-home` wrapper with ~40 `!important` CSS overrides (src/index.css:44-110) that remap `.text-white` utilities to ink colors — a fragile retrofit, not a real theme.

## Capture caveat (verified, important for interpretation)

Full-page screenshots show **huge blank regions** on most pages. This was verified to be scroll-gated entrance animations (framer-motion `whileInView`, initial opacity 0): re-capturing after a slow programmatic scroll makes all content appear. So the blank areas are **not missing content** — but they are a real-world bug class of their own:

- **Count-up stats never animate without intersection**: About page shows "0+ systems installed / 0MW / 0+ years / 0 incidents" in the static capture — if IntersectionObserver fails or user prints/uses reader mode, the company literally claims zero experience.
- Content below the fold is invisible to any non-scrolling consumer (some crawlers, link previews, print).
- Animation distance is long enough that whole sections render as empty walls during capture.

## Lighthouse (mobile emulation, performance/accessibility/SEO)

| Page | Perf | A11y | SEO | Key metrics / failures |
|---|---|---|---|---|
| Home `/` | **67** | 94 | 92 | LCP **6.0s**, FCP 3.5s, TBT 20ms, CLS 0 · fails: color-contrast, heading-order, link-text |
| Pricing `/pricing` | **89** | 95 | **69** | LCP 3.4s, CLS 0 · fails: color-contrast, **is-crawlable** |
| Contact `/contact` | **84** | 94 | 100 | LCP 3.3s, CLS 0 · fails: color-contrast, heading-order |

**SEO bug found (real, high impact):** `public/robots.txt` line 25 has `Disallow: /p` under `User-agent: *`. robots.txt rules are prefix matches — this blocks **`/pricing` and `/projects`** (and `/platform`, `/proposals`) from all non-Google/Bing crawlers. Should be `Disallow: /p/`. This is why Lighthouse flags pricing as not crawlable.

**Perf:** Home LCP 6.0s on mobile is driven by the full-bleed hero photo; `index-*.js` is 487KB (151KB gzip) and maplibre chunk 1.02MB lazy. CLS is 0 everywhere (good).

## Page-by-page review

### Home (`/`) — the only light page
- **Hero:** Aerial island photo, dark-green overlay. "Solar for" white serif + "Island Properties" gold italic Instrument Serif. Looks premium at first glance, but the white subtitle paragraph sits over the brightest part of the photo (turquoise sea/beach) → **legibility dips badly mid-sentence**; Lighthouse color-contrast failure corroborates.
- **Theme retrofit:** light paper bg achieved by `.bustan-home` + ~40 `!important` rules remapping `text-white` utilities (src/index.css:52+). Works visually but any new component using non-mapped utilities will break; this is the documented tech debt.
- **Typography:** Instrument Serif headings + DM Sans body used consistently here. Section eyebrow labels (teal smallcaps) are on-brand.
- **Services cards section** (after scroll): clean — paper bg, rounded photo cards, green "Learn More" links. The best-looking section on the site; this is the visual target the rest should match.
- **Stats band** below hero is dark forest green — intentional contrast band, works.
- **Mobile:** sticky header is a **dark navy-green bar with the logo in its own dark box** sitting on the light page — the logo lockup looks like a leftover dark-theme chip. 17,393px tall full-page capture; FAQ/CTA render fine.
- **Heading order + generic link text** flagged by Lighthouse (multiple "Learn More").

### Services (`/services`)
- **Entire page dark theme** (forest/navy gradient, white text, gold serif accents). Off-brand vs tropical-light spec.
- Desktop static capture shows only the Residential card; verified after scroll that Commercial / Solar Farm / Battery / O&M sections do render (dark cards with photos, decent layout) — dark theme is real, not a capture artifact.
- Photos themselves are good (drone/installation shots); treatment (dark cards, white text) is the issue.

### Service subpages (`/services/residential`, `/commercial`, `/off-grid`, `/maintenance`)
- All four share the same dark template: dark gradient hero with gold serif highlight word, gold primary CTA + ghost secondary, then (scroll-gated) dark body sections.
- Static captures are ~70-80% empty dark wall between hero and footer — worst offenders of the animation gating (residential desktop: ~4,400 of 5,086px is blank dark).
- Heroes themselves are typographically fine (serif + gold highlights) but 100% dark-theme.

### How It Works (`/how-it-works`)
- Dark theme. Only "Step 01" card visible statically; steps 2+ animation-gated.
- **Mobile bug — horizontal overflow:** full-page mobile capture is **406px wide on a 390px viewport** (16px overflow). The light body background shows as a cream strip down the right edge of the dark page. Only page with this defect; some element exceeds viewport width.

### Pricing (`/pricing`)
- Dark theme. EPC vs PPA comparison cards render statically and read well (gold icons, checklists); everything below them is animation-gated blank.
- **Blocked from crawlers by the robots.txt `/p` prefix bug** (SEO 69).
- Gold-on-dark muted text fails contrast (Lighthouse).

### Projects (`/projects`)
- Dark theme but **fully rendered on desktop** — 6 project cards with strong photos (Villa Sunset, Coconut Beach Resort, etc.), kW badges, location pins. Content is portfolio gold; only the theme is off-brand.
- **Mobile:** static capture shows only the 3 category headers and **zero project cards** (animation-gated). Verified cards do appear after scroll, but the flagship social proof is fragile on the most common device class.
- Also caught by the robots.txt `/p` prefix bug.

### About (`/about`)
- Dark theme. "Our Story" + island photo render well.
- **Stats counters show "0+ / 0MW / 0+ / 0" in static state** (count-up only fires on intersection) — actively harmful if animations don't run.
- Mission/Vision cards readable but dark.

### Blog (`/blog`) and blog post (`/blog/solar-energy-koh-phangan-guide`)
- Dark theme, fully rendered card grid (12 posts), category chips colored, layout solid.
- **`.blog-content` typography is hard-coded white-on-dark** (src/index.css:261+ — body `rgba(255,255,255,0.6)`, h2 `white`, table borders `rgba(255,255,255,...)`). The moment blog pages flip to the light theme, every post body becomes white-on-paper = invisible. This is the known dark remnant; confirmed in code and screenshots.
- Long-form post readability on dark at 60% white is below premium standard even today.

### Contact (`/contact`)
- Dark theme. Form card, dark inputs, WhatsApp/LINE/office cards on the right.
- **`bg-[#0D1117]` dark remnants confirmed in code**: ContactPage.tsx:99-101 (select option styling). Sibling remnants: ErrorBoundary.tsx:27, CRM components, Section.tsx whose API is literally "true = bg-dark (#0D1117), false = bg-navy (#0D2137)".
- Form renders statically (good — no animation gating on the form itself). Labels/placeholder contrast is low (white/40 on dark).

### Tools (`/tools`)
- Dark theme, 4 tool cards render statically (Bill Scanner, Energy Atlas, Farm Scout, Grid Map) with colored "Free Tool / Map Tool / Advanced / Grid data" chips. Layout fine; theme off-brand.

### 404 (`/this-page-does-not-exist`)
- Dark theme, fully rendered, actually well-composed (gold serif 404, 3 quick-link cards, gold CTA). Just needs re-theming.

### Mobile bottom nav
- `MobileBottomNav` (src/components/MobileNav/MobileBottomNav.tsx) uses `.mobile-bottom-nav` with `background: rgba(10, 22, 40, 0.95)` — **navy** (src/index.css:246) and `#00D68F` active green that belongs to the old platform palette. It is only mounted on `/platform` (internal app), not on public marketing routes — so it does not pollute the public site today, but it is the documented navy remnant and will clash if ever reused.

## Top 10 issues by visual impact

1. **Whole-site dark theme except Home** — 13 of 14 public routes are off-brand dark navy/forest. The "premium tropical-light" brand effectively doesn't exist beyond the homepage. (services, subpages, how-it-works, pricing, projects, about, blog, contact, tools, 404)
2. **`.blog-content` white-on-dark typography hard-coded in CSS** (index.css:261+) — guarantees invisible text the moment blog goes light; already sub-premium contrast today.
3. **Scroll-gated animations leave pages structurally blank** — service subpages are ~75% empty wall in static state; Projects mobile shows zero portfolio cards; fragile on slow devices, print, crawlers, reduced-motion users.
4. **About-page counters display "0+ systems / 0MW / 0 years" until animated** — actively damages credibility in any non-animated context.
5. **robots.txt `Disallow: /p` prefix bug blocks /pricing and /projects** for all non-Google/Bing crawlers (Lighthouse SEO 69 on pricing). One-line fix, big reach.
6. **Home hero subtitle legibility** — white text over bright turquoise photo region; Lighthouse color-contrast fail. The first thing every visitor reads is the hardest to read.
7. **Home light theme is an `!important` override hack** (~40 rules on `.bustan-home`) — not a finding visible in pixels but the root cause that makes every future page-level fix risky; must be replaced by real tokens before polishing.
8. **/how-it-works mobile horizontal overflow (406px > 390px)** — cream strip down the right edge of a dark page + sideways scroll wobble.
9. **Home mobile sticky header: dark navy bar + boxed logo chip on light page** — reads as an unfinished dark-theme leftover at the very top of the flagship page.
10. **Home mobile LCP 6.0s / perf 67** — full-bleed hero photo + 487KB main JS chunk; premium feel dies on a 6-second hero.

Honorable mentions: generic "Learn More" link text everywhere (a11y + SEO), heading-order skips on home/contact, low-contrast gold-muted text on dark pricing cards, form label contrast (white/40) on contact.

## What already works (keep)

- Photography is genuinely strong across projects/services (drone + install shots).
- Instrument Serif + DM Sans pairing applied consistently; serif+gold-italic highlight pattern is distinctive.
- Home services-card section is the quality bar — paper bg, rounded photo cards, teal accents.
- CLS = 0 on all three audited pages; 404 page is well-composed; footer structure is complete and consistent.

## Artifacts

- 30 screenshots: `docs/superpowers/audit/2026-06-11-baseline/*.png` (28 required + blog-post desktop/mobile)
- Lighthouse JSON: `lh-home.json`, `lh-pricing.json`, `lh-contact.json` (same dir)
- Capture script: `scripts/audit-screenshots.mjs`

---

# After (2026-06-12)

Post-redesign + performance pass (Tasks 7-14). Same methodology: `vite preview`, Lighthouse mobile emulation (performance/accessibility/seo), full screenshot set at `docs/superpowers/audit/2026-06-12-after/`.

## Lighthouse before → after

| Page | Perf | A11y | SEO | Key metrics after |
|---|---|---|---|---|
| Home `/` | 67 → **76** | 94 → **95** | 92 → **92** | LCP 5.9s, FCP 2.2s (was 3.5s), TBT 0ms, CLS 0, SI 2.6s · page weight 15.7MB → **1.1MB** |
| Pricing `/pricing` | 89 → **90** | 95 → **95** | 69 → **100** | LCP 3.4s, FCP 2.2s, TBT 0ms, CLS 0.02 · is-crawlable passes |
| Contact `/contact` | 84 → **90** | 94 → **96** | 100 → **100** | LCP 3.3s, FCP 2.1s, TBT 0ms, CLS 0 |

Perf changes in this pass: robots `/p` → `/p/`; hero converted to 243KB JPEG (was 1.1MB PNG) + route-gated `rel=preload` + `fetchpriority=high`; all 8 home card images converted PNG→JPEG (~7MB → ~1.4MB); SolarInstallationScroll frame sequences (189 requests / 11.4MB — the real LCP killer) now load only when the section nears the viewport, and inactive house-type preloads wait until the active set finishes; Google Fonts trimmed (DM Sans 400-700 upright, Noto Hebrew 400-700) and loaded async (est. 1.3s FCP saving); footer `h4` → `p` (heading-order fix sitewide); Layout wrapper `bg-dark` → paper + Navbar transparent state simplified.

**Home perf 76 (target was 90) — honest assessment:** LCP is pinned at ~5.9s by *element render delay* (~2.2s observed, 4x under simulated mobile CPU): the hero image is fetched in <50ms thanks to the preload, but nothing paints until the 487KB (151KB gzip) main bundle boots React. The remaining lever is the main chunk (react-dom + framer-motion + router + i18n all in one). **Follow-up (deferred, riskier):** manualChunks vendor splitting and/or prerendering the marketing shell; route-level code-splitting already exists.

**Home SEO 92 (target 95):** sole failing audit is `link-text` — four generic "Learn More" service-card CTAs. Copy lives in `src/i18n/translations.ts` (en/th/he); needs a copywriting decision in 3 languages, deferred.

## Top-10 baseline findings — status

1. Whole-site dark theme → **FIXED** (Tasks 7-13; after-screenshots show tropical-light on all public routes)
2. `.blog-content` white-on-dark CSS → **FIXED** (now ink-on-paper, index.css:265+)
3. Scroll-gated animations leave pages blank → **PARTIAL** (entrance animations remain; full-page captures still show gated regions)
4. About counters show "0+ / 0MW" un-animated → **DEFERRED** (still 0s in static capture)
5. robots.txt `Disallow: /p` prefix bug → **FIXED** (`/p/` in all 3 UA groups; also added `/th/platform`, `/he/platform`, `/colliers`; pricing is-crawlable passes, SEO 69→100)
6. Home hero subtitle legibility → **PARTIAL** (overlay deepened behind text; hero passes visually, but color-contrast still fails on other home elements: `text-ink/55-64` spans/links)
7. `.bustan-home` `!important` retrofit → **PARTIAL** (real tokens exist; ~59 `!important` rules remain in index.css)
8. /how-it-works mobile horizontal overflow → **FIXED** (after capture is exactly 390px wide)
9. Home mobile sticky header dark strip → **FIXED** (Layout wrapper now paper, Navbar truly transparent; verified no dark strip on home/pricing/about tops. The dark *logo chip* is part of the logo SVG itself — separate asset decision)
10. Home mobile LCP 6.0s / perf 67 → **PARTIAL** (perf 76; weight 15.7MB→1.1MB, TBT 0, frames deferred; LCP still ~5.9s — gated by main-bundle boot, see follow-up above)

## Artifacts (after)

- 28 screenshots + `lh-home.json`, `lh-pricing.json`, `lh-contact.json`: `docs/superpowers/audit/2026-06-12-after/`
