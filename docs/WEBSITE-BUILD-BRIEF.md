# Bustan Energy Website — Full Build Brief

## Domain: energy-tm.com
## Stack: React + TypeScript + Vite + Tailwind + Framer Motion + Zustand
## Deploy: Vercel (project: solar-intelligence)
## Supabase: trvgpgpsqvvdsudpgwpm (Bustan Energy)

---

## Goal

Build a world-class solar energy company website at energy-tm.com.
Apple-level design quality — animated product showcases, scroll-driven animations,
smooth transitions, premium feel. Full SEO optimization.

## What Exists Today

### Current App (solar-intelligence)
The current app at energy-tm.com is a **GIS solar intelligence platform** (map + buildings).
This should become ONE SECTION of the new website, not the whole site.

### copenhagen-solar Repo (source material)
Path: `~/Desktop/projects/copenhagen-solar` (618 files)

**43 HTML pages to migrate/redesign:**

#### Tools (keep as interactive features)
- roof-scanner.html — 2,467-building interactive map + solar ROI
- solar-atlas.html — Solar resource mapping
- power-grid-map.html — Electrical grid infrastructure
- bill-scanner.html — Electricity bill analyzer
- planning-tracker.html — Project management

#### CRM Pipeline (10-step value chain)
- crm-step1-lead-capture.html through crm-step10-om.html
- crm-value-chain.html — Master overview

#### Business & Proposals
- business-plan.html (96 KB)
- proposal.html (88 KB) — Dynamic proposal generator
- financial-dashboard.html (68 KB)
- pnl-plan.html (110 KB)

#### Technical & Regulatory
- licensing.html — VSPP + ERC licensing
- legal-contracts.html, epc-contract.html, ppa-contract.html
- procurement-engineering.html, equipment-list.html
- financing.html

#### Operations
- drone-guide.html, drone-ops.html
- installation.html, monitoring-maintenance.html
- solar-farm-guide.html

#### Marketing & Strategy
- sales-marketing.html, strategy.html
- customer-avatars.html, brand-kit.html
- kp-solar-pro.html

### Assets Available
- `/avatars/` — 6 brand logos (Bustan Energy logo: 792 KB)
- `/visuals/` — 53 high-quality images (financial, installation, legal, monitoring, products)
- `/ads-pro/` — 8 Facebook/Instagram ad creatives
- `/brand-kit/` — 19 merchandise mockups (t-shirts, caps, banners, vehicle wraps)
- `/podcasts/` — 10 MP3 episodes
- `/research/` — 12 comprehensive Thai solar market research docs (9,240 lines)
- `/proposals/` — 3 language versions (EN/HE/TH)

### Brand Identity
- **Company:** Bustan Energy (Bustan Energy)
- **Colors:** Ocean blue (#0A3D5C), Sun gold (#E8A820), Palm green (#1B5E20), Sand (#FFF8E7)
- **Fonts:** Instrument Serif (headers), DM Sans (body)
- **Vibe:** Premium, tropical, tech-forward, trustworthy

---

## Website Structure (Proposed)

### Public Pages (marketing website)
1. **Homepage** — Hero with animated solar panels/products, value proposition, CTA
2. **Services** — Residential, Commercial, Solar Farm development
3. **How It Works** — 4-step process with scroll animations
4. **Our Technology** — Interactive showcase of tools (roof scanner, GIS, proposals)
5. **Projects/Portfolio** — Case studies with before/after
6. **Pricing** — EPC vs PPA comparison, ROI calculator
7. **About** — Team, mission, Ko Phangan story
8. **Resources/Blog** — Research articles, guides, podcasts
9. **Contact** — Form + WhatsApp + LINE

### Interactive Tools (embedded or linked)
- Solar Intelligence Map (existing app)
- Roof Scanner
- Bill Scanner
- Proposal Generator

### Internal/Admin (authenticated)
- CRM Pipeline (10-step)
- Financial Dashboard
- Planning Tracker

---

## Design Requirements (Apple-Level)

### Visual Style
- Dark mode primary with light accents
- Glassmorphism cards with backdrop-blur
- Full-bleed hero sections with video/animation backgrounds
- Product images that float and rotate on scroll (like Apple product pages)
- Parallax scrolling
- Micro-interactions on every hover/click
- Smooth page transitions (Framer Motion AnimatePresence)

### Scroll Animations
- Elements fade/slide in as they enter viewport
- Sticky sections that transform as you scroll
- Number counters that animate up (kWh produced, buildings scanned, etc.)
- Progress indicators tied to scroll position
- Product showcase with 3D-like perspective shifts

### Typography
- Large, bold headlines (48-72px)
- Generous whitespace
- Contrast between serif headers and sans-serif body

### Mobile
- Mobile-first responsive
- Touch-optimized interactions
- Bottom sheet patterns for mobile tools

---

## SEO Requirements

### Technical SEO
- Semantic HTML5 (header, main, section, article, nav, footer)
- Meta tags per page (title, description, og:image, twitter:card)
- JSON-LD structured data (LocalBusiness, Service, FAQ, Article)
- XML sitemap.xml
- robots.txt
- Canonical URLs
- Lazy loading images with proper alt text
- Core Web Vitals optimized (LCP < 2.5s, CLS < 0.1)

### Content SEO
- Target keywords: "solar energy koh phangan", "solar panel thailand",
  "solar installation koh phangan", "PPA thailand", "rooftop solar thailand"
- H1/H2/H3 hierarchy per page
- Internal linking between pages
- Blog with 5+ initial articles (from research docs)

### Local SEO
- Google Business Profile integration
- LocalBusiness schema with address, phone, hours
- Thailand-specific content (THB pricing, PEA/EGAT references)

---

## Migration Strategy

1. Create new page structure in React (routes, layouts, components)
2. Extract content from 43 HTML pages → React components
3. Move all assets (images, podcasts) to /public/assets/
4. Build shared design system (buttons, cards, sections, animations)
5. Implement scroll animations with Framer Motion
6. Add SEO layer (meta tags, schema, sitemap)
7. Keep existing solar-intelligence map as /platform or /map route
8. Deploy incrementally

---

## Key Files to Reference

- Current app: `~/Desktop/projects/solar-intelligence/`
- Source content: `~/Desktop/projects/copenhagen-solar/`
- Supabase MCP: `.mcp.json` (project scope, trvgpgpsqvvdsudpgwpm)
- Vercel env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (already set)
- Domain: energy-tm.com (GoDaddy → Vercel DNS, SSL active)
