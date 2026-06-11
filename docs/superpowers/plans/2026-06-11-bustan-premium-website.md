# Bustan Premium Website Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the public Bustan site (energy-tm.com) to premium quality — keep the tropical-light brand, remove the dark-theme retrofit debt, unify primitives, page-by-page polish, perf ≥ 90.

**Architecture:** React 18 + Vite + Tailwind v4 (`@theme` in `src/index.css`) + Framer Motion. Public pages in `src/pages/`, shared primitives in `src/components/ui/`, layout in `src/components/layout/`. Branch: `fable/premium-website`.

**Tech Stack:** Tailwind v4 CSS tokens, Framer Motion, Playwright (already configured — `npm run test:e2e`), Lighthouse via npx.

**Verification commands:** `npm run typecheck` · `npm run build` · `npm run lint`
**Out of scope:** `src/pages/admin/`, CRM/Scanner/Proposal components, `api/`. The `.bustan-admin-main` CSS block stays.

---

### Task 1: Baseline Audit (Phase 0)

**Files:**
- Create: `scripts/audit-screenshots.mjs`
- Create: `docs/superpowers/audit/2026-06-11-baseline/findings.md`

- [ ] **Step 1: Create the screenshot script**

```js
// scripts/audit-screenshots.mjs
// Usage: node scripts/audit-screenshots.mjs [baseUrl] [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = process.argv[3] ?? 'docs/superpowers/audit/2026-06-11-baseline'
const ROUTES = [
  ['home', '/'],
  ['services', '/services'],
  ['services-residential', '/services/residential'],
  ['services-commercial', '/services/commercial'],
  ['services-offgrid', '/services/off-grid'],
  ['services-maintenance', '/services/maintenance'],
  ['how-it-works', '/how-it-works'],
  ['pricing', '/pricing'],
  ['projects', '/projects'],
  ['about', '/about'],
  ['blog', '/blog'],
  ['contact', '/contact'],
  ['tools', '/tools'],
  ['404', '/this-page-does-not-exist'],
]
const VIEWPORTS = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
for (const [vpName, viewport] of VIEWPORTS) {
  const page = await browser.newPage({ viewport })
  for (const [name, route] of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200) // settle animations
    await page.screenshot({ path: `${OUT}/${name}-${vpName}.png`, fullPage: true })
    console.log(`✓ ${name}-${vpName}`)
  }
  await page.close()
}
await browser.close()
```

- [ ] **Step 2: Build and serve production preview**

Run: `npm run build && npx vite preview --port 4173 &`
Expected: build passes, preview serving at http://localhost:4173

- [ ] **Step 3: Run the screenshot script**

Run: `node scripts/audit-screenshots.mjs`
Expected: 28 PNGs in `docs/superpowers/audit/2026-06-11-baseline/`

- [ ] **Step 4: Lighthouse baseline (mobile) on Home, Pricing, Contact**

Run: `npx lighthouse http://localhost:4173/ --output=json --output-path=docs/superpowers/audit/2026-06-11-baseline/lh-home.json --only-categories=performance,accessibility,seo --form-factor=mobile --screenEmulation.mobile --chrome-flags="--headless"` (repeat for `/pricing`, `/contact`)
Expected: 3 JSON reports. Record the 3 scores per page.

- [ ] **Step 5: Write findings.md** — review each screenshot; for every page list: hero quality, typography consistency, image treatment, broken/dark-theme remnants, mobile issues. Rank top-10 by visual impact. Include the Lighthouse scores table.

- [ ] **Step 6: Commit**

```bash
git add scripts/audit-screenshots.mjs docs/superpowers/audit/
git commit -m "audit: baseline screenshots + lighthouse for premium upgrade"
```

---

### Task 2: Extend Design Tokens + Fix Global Dark-Theme Remnants (Phase 1a)

**Files:**
- Modify: `src/index.css` (the `@theme` block at lines 3–15, scrollbar at ~213–237, `.mobile-bottom-nav` at ~240–258)

- [ ] **Step 1: Extend the `@theme` block** — add after `--color-navy`:

```css
  /* Type scale (Instrument Serif display / DM Sans body) */
  --text-display-xl: 4.5rem;
  --text-display-lg: 3.5rem;
  --text-display-md: 2.5rem;
  --text-display-sm: 1.875rem;
  /* Shadow scale — warm-tinted, 3 levels */
  --shadow-soft: 0 2px 12px rgba(39, 52, 47, 0.07);
  --shadow-lift: 0 8px 28px rgba(39, 52, 47, 0.12);
  --shadow-float: 0 20px 50px rgba(39, 52, 47, 0.18);
  /* Radius scale */
  --radius-card: 1.25rem;
  --radius-button: 9999px;
  /* Motion standards */
  --ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast: 200ms;
  --duration-base: 400ms;
  --duration-slow: 700ms;
```

- [ ] **Step 2: Re-brand the scrollbar** (currently white-on-dark remnant). Replace the `::-webkit-scrollbar-thumb` rules:

```css
::-webkit-scrollbar-thumb {
  background: rgba(36, 70, 62, 0.25);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(36, 70, 62, 0.4);
}
```

- [ ] **Step 3: Re-brand `.mobile-bottom-nav`** (currently navy `rgba(10, 22, 40, 0.95)`):

```css
.mobile-bottom-nav {
  /* keep layout props as-is, change only: */
  background: rgba(255, 244, 226, 0.96); /* --bustan-shell */
  border-top: 1px solid rgba(36, 70, 62, 0.14);
}
```
Then check `src/components/MobileNav/` for text colors that assumed dark bg (white text) and flip them to ink/grove.

- [ ] **Step 4: Verify** — Run: `npm run typecheck && npm run build` → PASS. Spot-check in preview: scrollbar + mobile nav look on brand.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/MobileNav
git commit -m "feat(ds): extend brand tokens, fix dark-theme scrollbar + mobile nav"
```

---

### Task 3: Fix Blog Typography (dark-theme bug — white text on light bg)

**Files:**
- Modify: `src/index.css` (`.blog-content` block, lines ~260–344)
- Verify against: `src/pages/BlogPostPage.tsx`

- [ ] **Step 1: Read `src/pages/BlogPostPage.tsx`** — confirm whether the post body renders on a light background (it does unless the page sets its own dark bg; verify).

- [ ] **Step 2: Replace `.blog-content` colors** with brand-light equivalents (keep all spacing/size rules):

```css
.blog-content { color: rgba(39, 52, 47, 0.78); }
.blog-content h2 { color: var(--bustan-ink); }
.blog-content h3 { color: rgba(39, 52, 47, 0.92); }
.blog-content strong { color: var(--bustan-ink); }
.blog-content a { color: var(--bustan-lagoon); }
.blog-content th {
  color: rgba(39, 52, 47, 0.85);
  background: rgba(216, 236, 232, 0.45);
  border-bottom: 1px solid rgba(36, 70, 62, 0.14);
}
.blog-content td {
  color: rgba(39, 52, 47, 0.72);
  border-bottom: 1px solid rgba(36, 70, 62, 0.08);
}
```

- [ ] **Step 3: Verify** — `npm run build`, open a blog post in preview at desktop + 390px, confirm readable on-brand text.

- [ ] **Step 4: Commit** — `git commit -am "fix(blog): light-theme typography (was dark-theme remnant)"`

---

### Task 4: Standardize UI Primitives (Phase 1b)

**Files:**
- Modify: `src/components/ui/Button.tsx`, `src/components/ui/GlassCard.tsx`, `src/components/ui/Section.tsx`, `src/components/ui/AnimatedCounter.tsx`
- Create: `src/components/ui/SectionHeader.tsx`, `src/components/ui/Badge.tsx`

- [ ] **Step 1: Read all 4 existing ui components** to learn their current APIs and call-sites (`grep -rn "from '.*ui/Button'" src/`).

- [ ] **Step 2: Refit `Button.tsx`** to exactly 4 variants using the new tokens, preserving its existing props API so call-sites don't break:
  - `primary`: bg `--bustan-grove`, text `--bustan-shell`, hover bg `--bustan-canopy`, `--shadow-lift` on hover, radius `--radius-button`
  - `secondary`: 1px border `rgba(36,70,62,0.3)`, text `--bustan-grove`, hover bg `rgba(216,236,232,0.5)`
  - `ghost`: text `--bustan-lagoon`, hover underline, no bg
  - `whatsapp`: bg `#25D366`, white text, MessageCircle icon slot
  All: `transition-all duration-[var(--duration-fast)]`, focus-visible ring `--bustan-lagoon`, `active:scale-[0.98]`.

- [ ] **Step 3: Create `SectionHeader.tsx`**:

```tsx
import { motion } from 'framer-motion'

type Props = {
  tag?: string        // small uppercase kicker, lagoon color
  title: string       // Instrument Serif display
  subtitle?: string
  align?: 'center' | 'left'
  className?: string
}

export function SectionHeader({ tag, title, subtitle, align = 'center', className = '' }: Props) {
  const alignCls = align === 'center' ? 'text-center mx-auto' : 'text-left'
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`max-w-2xl ${alignCls} ${className}`}
    >
      {tag && (
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--bustan-lagoon)] mb-3">
          {tag}
        </p>
      )}
      <h2 className="font-serif text-[2.5rem] leading-[1.1] text-[var(--bustan-ink)] md:text-[3.5rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg leading-relaxed text-[rgba(39,52,47,0.74)]">{subtitle}</p>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 4: Create `Badge.tsx`**:

```tsx
type Props = {
  children: React.ReactNode
  tone?: 'lagoon' | 'sun' | 'grove'
  className?: string
}

const tones = {
  lagoon: 'bg-[rgba(216,236,232,0.7)] text-[var(--bustan-lagoon)] border-[rgba(0,111,107,0.2)]',
  sun: 'bg-[rgba(242,184,75,0.15)] text-[#9a6b12] border-[rgba(242,184,75,0.35)]',
  grove: 'bg-[rgba(36,70,62,0.08)] text-[var(--bustan-grove)] border-[rgba(36,70,62,0.18)]',
}

export function Badge({ children, tone = 'lagoon', className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
```

- [ ] **Step 5: Refit `GlassCard.tsx`** → warm light card: bg `rgba(255,244,226,0.7)`, border `rgba(36,70,62,0.14)`, `backdrop-blur`, radius `--radius-card`, `--shadow-soft`, hover `--shadow-lift` + `-translate-y-0.5` (transition `--duration-base`). Keep component name and props.

- [ ] **Step 6: Verify** — `npm run typecheck && npm run lint && npm run build` → PASS.

- [ ] **Step 7: Commit** — `git commit -am "feat(ds): standardized Button/Card variants, new SectionHeader + Badge"`

---

### Task 5: HomePage Native Rewrite — Delete the Override Layer (Phase 1c)

**Files:**
- Modify: `src/pages/HomePage.tsx` (1307 lines)
- Modify: `src/index.css` (delete `.bustan-home` blocks, lines ~44–102)
- Keep: `.bustan-admin-main` blocks (admin out of scope)

- [ ] **Step 1: Map every overridden class in HomePage.** Run `grep -n "text-white\|bg-white/\|border-white" src/pages/HomePage.tsx`. Replace inline using this mapping (taken from the override layer itself):

| Old class | New class |
|---|---|
| `text-white` | `text-[var(--bustan-ink)]` |
| `text-white/80` | `text-[rgba(39,52,47,0.86)]` |
| `text-white/70` | `text-[rgba(39,52,47,0.78)]` |
| `text-white/60`–`/55` | `text-[rgba(39,52,47,0.74)]` |
| `text-white/50`–`/20` | `text-[rgba(39,52,47,0.72)]` |
| `bg-white/5`, `bg-white/8`, `bg-white/[0.03]`, `bg-white/[0.04]` | `bg-[rgba(255,244,226,0.7)]` |
| `border-white/*` | `border-[rgba(36,70,62,0.14)]` |

**Exception — hero & image captions** (elements inside `.bustan-home-hero` / `.bustan-home-image-caption` sit on photos/dark overlays): those keep light text → `text-[rgba(255,244,226,0.82)]` (hero) / `text-[rgba(255,244,226,0.86)]` (captions).

- [ ] **Step 2: Replace ad-hoc section headers** in HomePage with `<SectionHeader>`, ad-hoc buttons with `<Button>`, stat blocks with the existing counter via a consistent wrapper.

- [ ] **Step 3: Delete the `.bustan-home` override CSS** (the `.bustan-home .text-white …` through `.bustan-home-image-caption` blocks). Keep the `.bustan-home` background gradient rule itself.

- [ ] **Step 4: Verify zero leftovers** — Run: `grep -c "bustan-home .text-white\|bustan-home .bg-white\|bustan-home .border-white" src/index.css` → Expected: `0`. Run `npm run build` → PASS.

- [ ] **Step 5: Screenshot compare** — rerun `node scripts/audit-screenshots.mjs http://localhost:4173 docs/superpowers/audit/2026-06-11-after-task5` for home only (temporarily trim ROUTES or just diff `home-*.png`). Home must look identical-or-better vs baseline.

- [ ] **Step 6: Commit** — `git commit -am "refactor(home): native light-theme classes, delete !important override layer"`

---

### Task 6: HomePage Premium Polish (Phase 2 — flagship)

**Files:**
- Modify: `src/pages/HomePage.tsx`, `src/components/SolarInstallationScroll.tsx` (only if visual constants need tuning)

- [ ] **Step 1: Hero** — display-xl serif headline (`--text-display-xl`, tighten leading to 1.05), one-line subhead, primary + whatsapp CTAs, treated hero image (radius `--radius-card`, `--shadow-float`), subtle entrance: stagger fadeUp 0.08s, no parallax gimmicks. Trust line under CTAs (existing `trustLine` copy).
- [ ] **Step 2: Unify image treatment across all sections** — every `<img>`: `rounded-[var(--radius-card)] shadow-[var(--shadow-lift)] object-cover`, consistent aspect ratios per row, `loading="lazy"` below the fold, explicit `width`/`height` (CLS).
- [ ] **Step 3: Micro-interactions** — cards: hover lift (translate-y −2px + `--shadow-lift`); links: arrow-slide on hover (`group-hover:translate-x-1`); all transitions `--duration-fast`/`--ease-out-soft`. Scroll reveals: `viewport={{ once: true, margin: '-80px' }}` everywhere (no re-triggering).
- [ ] **Step 4: Mobile pass at 390px** — hero text ≤ 2.5rem, CTAs full-width stacked, sections single-column, tap targets ≥ 44px.
- [ ] **Step 5: Verify** — `npm run build`, screenshots desktop+mobile, compare to baseline.
- [ ] **Step 6: Commit** — `git commit -am "feat(home): premium hero, unified imagery, micro-interactions, mobile pass"`

---

### Tasks 7–12: Page-by-Page Polish (Phase 2)

**One task per page-group, identical recipe.** For each:

1. Read the page file fully.
2. Replace ad-hoc headers/buttons/cards/badges with the Task-4 primitives.
3. Apply the Task-6 image treatment + micro-interaction standards.
4. Page-specific items listed below.
5. Verify: `npm run typecheck && npm run build`, screenshot desktop + 390px, compare vs baseline.
6. Commit: `git commit -am "feat(<page>): premium polish pass"`

| Task | Files | Page-specific items |
|---|---|---|
| **7** | `src/pages/ServicesPage.tsx` + 4 service sub-pages (resolve component files via `src/App.tsx` routes `services/*`) | Service cards equal height; icon style unified (lucide, stroke 1.5, lagoon); each sub-page gets SectionHeader hero + WhatsApp CTA block |
| **8** | `src/pages/ProjectsPage.tsx`, `src/pages/CollierPortfolioPage.tsx` | Project cards: image-led, location Badge, kW stat; hover zoom on image (`scale-105`, `--duration-slow`); lightbox/detail untouched |
| **9** | `src/pages/PricingPage.tsx` | Pricing tiers as Cards with one highlighted (`--shadow-float` + sun Badge "Most popular"); comparison rows zebra `rgba(216,236,232,0.3)`; FAQ accordion motion |
| **10** | `src/pages/AboutPage.tsx`, `src/pages/HowItWorksPage.tsx` | Timeline/process steps with numbered Badge circles; team/location imagery treated; stats row with counters |
| **11** | `src/pages/ContactPage.tsx` | **Replace the 2 `bg-[#0D1117]` dark blocks** with `bg-[var(--bustan-grove)]` (text stays light there); form inputs: bg `rgba(255,244,226,0.7)`, border `rgba(36,70,62,0.2)`, focus ring lagoon; WhatsApp primary path above the form |
| **12** | `src/pages/BlogPage.tsx`, `src/pages/BlogPostPage.tsx`, `src/pages/ToolsPage.tsx`, `src/pages/NotFoundPage.tsx`, `src/pages/ResortSolarAssessmentPage.tsx` | Blog cards image-led + read-time Badge; post hero serif; Tools cards uniform; 404: serif headline + Button home + WhatsApp; Resort page: ensure hero + trust + CTA follow standards |

(Note: fix any non-Latin typo artifacts found while editing — e.g. stray text — and keep i18n keys intact; copy changes go through `src/i18n/`.)

---

### Task 13: Navbar + Footer Polish

**Files:**
- Modify: `src/components/layout/Navbar.tsx`, `src/components/layout/Footer.tsx`, `src/components/MobileNav/`

- [ ] **Step 1:** Navbar: scrolled state = `bg-[rgba(255,244,226,0.85)] backdrop-blur-md` + `--shadow-soft`; active link underline in `--bustan-sun`; CTA button = Button primary (small).
- [ ] **Step 2:** Footer: 4-column grid, serif brand line, link hover → lagoon, top border `rgba(36,70,62,0.14)`.
- [ ] **Step 3:** Mobile nav: active tab tint lagoon, labels ink, safe-area respected (already has env()).
- [ ] **Step 4:** Verify build + screenshots; commit `feat(layout): navbar/footer premium pass`.

---

### Task 14: Performance + Final Verification (Phase 3)

**Files:**
- Modify: `index.html`, image call-sites as needed

- [ ] **Step 1: Font loading** — `display=swap` already in the Google Fonts URL; trim unused weights from the URL (DM Sans full variable range + Noto Hebrew 300..900 likely overkill — keep DM Sans `400;500;600;700`, Instrument Serif as-is, drop Noto Hebrew if no Hebrew UI on public pages: `grep -rn "[א-ת]" src/pages/*.tsx src/i18n/` first).
- [ ] **Step 2: LCP** — preload the home hero image: `<link rel="preload" as="image" href="/assets/images/strategy-01-aerial.png">` in `index.html` (verify actual hero asset first); confirm hero `<img>` has `fetchpriority="high"` and explicit dimensions.
- [ ] **Step 3: CLS** — all images explicit width/height or aspect-ratio CSS; verify no font-swap layout jump on hero.
- [ ] **Step 4: Re-run Lighthouse** (same 3 pages, same command as Task 1) → targets: perf ≥ 90, a11y ≥ 95, SEO ≥ 95 mobile. Document delta in `docs/superpowers/audit/2026-06-11-baseline/findings.md` (append "After" table).
- [ ] **Step 5: Full screenshot set** → `docs/superpowers/audit/2026-06-11-after/`. Side-by-side review vs baseline.
- [ ] **Step 6: Commit** — `git commit -am "perf: fonts, LCP preload, CLS fixes + after-audit"`

---

### Task 15: Deploy

- [ ] **Step 1:** `npm run quality && npm run build` → all PASS.
- [ ] **Step 2:** Push branch: `git push -u origin fable/premium-website`. Deploy Vercel **preview**, send preview URL to Kaniel for approval (WhatsApp per CLAUDE.md rules if no response in chat).
- [ ] **Step 3:** After approval: merge to `main`, deploy production, verify energy-tm.com live + spot-check 3 pages.
