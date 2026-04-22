# TM Energy — SEO Strategy
## energy-tm.com | Ko Phangan Solar Installation

**Created:** 2026-04-08
**Current ranking:** #2 for "solar energy ko phangan" | Missing from all other keywords
**Indexed pages:** 1 (homepage only, despite sitemap existing)
**Goal:** #1 for all solar keywords on Ko Phangan within 6 months

---

## Current State

| Metric | Now | Target (6mo) |
|--------|-----|---------------|
| Indexed pages | 1 | 15+ |
| Keywords in top 10 | 1 | 12+ |
| Organic traffic/mo | ~50 | 500+ |
| Schema markup | ❌ None | ✅ Full |
| Blog posts | 0 | 12+ |
| Google Business | ❌ | ✅ Claimed |
| Domain Authority | ~5 | 15+ |

---

## Competitive Landscape

| Competitor | Indexed Pages | Blog | Schema | Weakness |
|------------|--------------|------|--------|----------|
| **phangan.solar** (#1) | ~5-10 | ❌ | ❌ | No blog, product-catalog only |
| **canvasspv.com** (#2) | ~3 | ❌ | ❌ | Few pages, no content marketing |
| **phanganliving.com** | ~1 | ❌ | ❌ | Stale content (2021) |
| **kpgsolar.com** | ~2 | ❌ | ❌ | SSL issues, Facebook-dependent |
| **thaiecosun.com** | ~2 | ❌ | ❌ | Samui-focused, not Phangan |

**Key insight:** ZERO competitors have blogs or schema. First mover advantage is massive.

---

## Critical Fixes (Week 1)

### 1. Unique Page Titles
Currently ALL pages have: "TM Energy — Ko Phangan Solar Solutions"

```
Homepage:     TM Energy — #1 Solar Installer on Ko Phangan, Thailand
Services:     Solar Installation Services | Residential & Commercial — TM Energy
Pricing:      Solar Panel Prices Ko Phangan | Get a Free Quote — TM Energy
About:        About TM Energy | Ko Phangan's Trusted Solar Company
Blog:         Solar Energy Blog | Tips & Guides for Ko Phangan — TM Energy
Contact:      Contact TM Energy | Free Solar Consultation Ko Phangan
How It Works: How Solar Installation Works | 4 Easy Steps — TM Energy
Projects:     Our Solar Projects | Ko Phangan Installations — TM Energy
```

### 2. Meta Descriptions (unique per page)
Each page needs a unique, compelling meta description (150-160 chars) with CTA.

### 3. Canonical URLs
Add `<link rel="canonical" href="https://energy-tm.com/[page]">` to every page.

### 4. Open Graph Tags
```html
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="https://energy-tm.com/og-image.jpg">
<meta property="og:url" content="https://energy-tm.com/[page]">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_US">
```

### 5. Schema Markup (JSON-LD)

**Organization + LocalBusiness (every page):**
```json
{
  "@context": "https://schema.org",
  "@type": ["SolarEnergyCompany", "LocalBusiness"],
  "name": "TM Energy",
  "url": "https://energy-tm.com",
  "logo": "https://energy-tm.com/logo.png",
  "description": "Premium solar energy solutions for Ko Phangan, Thailand",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Ko Phangan",
    "addressRegion": "Surat Thani",
    "addressCountry": "TH"
  },
  "areaServed": "Ko Phangan",
  "telephone": "+66-XX-XXX-XXXX",
  "priceRange": "$$"
}
```

**Service pages:** Add `Service` schema per service type.
**Blog posts:** Add `Article` schema with author info.
**Projects:** Add `ImageGallery` + `Review` schema.

---

## Keyword Strategy

### Primary Keywords (High Intent)

| Keyword | Volume | Difficulty | Current Rank | Target |
|---------|--------|-----------|-------------|--------|
| solar energy ko phangan | Medium | Low | #2 | #1 |
| solar panel installation koh phangan | Medium | Low | — | Top 3 |
| solar company koh phangan | Low | Low | — | #1 |
| solar panel price koh phangan | Low | Low | — | #1 |
| best solar installer koh phangan | Low | Low | — | #1 |

### Secondary Keywords (Informational)

| Keyword | Target Page |
|---------|------------|
| off grid solar koh phangan | Blog post |
| solar battery storage thailand | Blog post |
| how much does solar cost in thailand | Blog post + Pricing page |
| solar panel roi thailand | Blog post |
| koh phangan electricity problems | Blog post |
| solar power for villa thailand | Services page |
| hybrid solar system thailand | Blog post |

### Long-tail Opportunities (No Competition)

| Keyword | Content Type |
|---------|-------------|
| solar panel maintenance koh phangan | Blog |
| PEA solar permit thailand | Blog (How-to guide) |
| solar power for resort koh phangan | Case study |
| monsoon season solar performance thailand | Blog |
| electric vehicle charging koh phangan solar | Blog |

---

## Site Architecture

```
energy-tm.com/
├── / (Homepage — hero, services overview, social proof)
├── /services (Overview — links to sub-services)
│   ├── /services/residential (Home solar systems)
│   ├── /services/commercial (Business & resort)
│   ├── /services/off-grid (Battery + off-grid)
│   └── /services/maintenance (Ongoing support)
├── /pricing (Transparent pricing + calculator)
├── /projects (Portfolio with case studies)
│   └── /projects/[slug] (Individual project pages)
├── /how-it-works (4-step process)
├── /about (Team, story, credentials)
├── /blog (Content hub)
│   └── /blog/[slug] (Individual posts)
├── /contact (Form + map + phone)
├── /th/* (Thai versions of all pages)
├── /sitemap.xml ✅ (already exists)
└── /robots.txt ✅ (already exists)
```

---

## Content Calendar

### Month 1 — Foundation

| Week | Task | Priority |
|------|------|----------|
| 1 | Fix page titles, meta descriptions, canonical URLs, OG tags | 🔴 Critical |
| 1 | Add schema markup (Organization + LocalBusiness) | 🔴 Critical |
| 1 | Claim Google Business Profile | 🔴 Critical |
| 2 | Create sub-service pages (/services/residential, commercial, off-grid, maintenance) | 🟠 High |
| 2 | Blog #1: "Complete Guide to Solar Energy on Koh Phangan (2026)" | 🟠 High |
| 3 | Blog #2: "How Much Do Solar Panels Cost in Thailand?" | 🟠 High |
| 3 | Blog #3: "Off-Grid Solar on Koh Phangan: What You Need to Know" | 🟠 High |
| 4 | Add 3 project case studies with photos + ROI data | 🟠 High |
| 4 | Blog #4: "Koh Phangan Power Outages: Why Solar Is the Solution" | 🟡 Medium |

### Month 2 — Expansion

| Week | Task |
|------|------|
| 5 | Blog #5: "Solar Battery Storage Guide for Thai Islands" |
| 5 | Add Service schema to each service page |
| 6 | Blog #6: "PEA Solar Permit Process in Thailand — Step by Step" |
| 6 | Create FAQ page (with FAQ schema) — only for factual Q&A |
| 7 | Blog #7: "Hybrid Solar Systems: Best Option for Koh Phangan Resorts" |
| 7 | Add project photos with alt text optimization |
| 8 | Blog #8: "Solar Panel Maintenance in Tropical Climates" |
| 8 | Submit site to Thai business directories |

### Month 3 — Authority

| Week | Task |
|------|------|
| 9 | Blog #9: "Solar ROI Calculator — Is It Worth It in Thailand?" |
| 10 | Blog #10: "EV Charging with Solar Power on Koh Phangan" |
| 11 | Blog #11: "Monsoon Season: How Solar Panels Perform in Rainy Thailand" |
| 12 | Blog #12: "Comparing Solar Installers on Koh Phangan (2026)" |
| 12 | Review + update all existing content, add internal links |

### Months 4-6 — Scale

- 2 blog posts per month (long-tail keywords)
- Guest posts on Thailand expat / travel sites
- Link building: Thai solar industry directories
- GEO optimization for AI search (ChatGPT, Perplexity)
- Monitor and respond to Google Business reviews
- A/B test page titles and meta descriptions

---

## Technical SEO Checklist

- [x] Sitemap.xml exists and is valid
- [x] Robots.txt properly configured
- [x] Hreflang for EN/TH versions
- [ ] **Unique page titles per page**
- [ ] **Canonical URLs on all pages**
- [ ] **Open Graph tags on all pages**
- [ ] **JSON-LD schema (Organization + LocalBusiness)**
- [ ] **Service schema per service page**
- [ ] **Article schema on blog posts**
- [ ] Google Search Console — verify + submit sitemap
- [ ] Google Business Profile — claim + verify
- [ ] Image alt text on all images
- [ ] WebP image format
- [ ] Lazy loading for below-fold images
- [ ] Internal linking between related pages
- [ ] Breadcrumb navigation + BreadcrumbList schema

---

## KPI Targets

| Metric | Now | Month 1 | Month 3 | Month 6 |
|--------|-----|---------|---------|---------|
| Indexed pages | 1 | 8 | 15 | 25+ |
| Keywords top 10 | 1 | 5 | 10 | 15+ |
| Organic visits/mo | ~50 | 100 | 300 | 500+ |
| Blog posts | 0 | 4 | 8 | 14+ |
| Backlinks | 0 | 3 | 10 | 20+ |
| Google Business reviews | 0 | 3 | 8 | 15+ |
| Schema types | 0 | 3 | 5 | 7 |

---

## Implementation Plan — Phase 1 (This Week)

### Step 1: SEO Component (code change)
Create a reusable `<SEOHead>` component that injects per-page:
- Unique title
- Unique meta description
- Canonical URL
- Open Graph tags
- JSON-LD schema

### Step 2: Apply to all routes
Map each route to its SEO config (title, description, schema type).

### Step 3: Google Search Console
1. Go to search.google.com/search-console
2. Add property: energy-tm.com
3. Submit sitemap: energy-tm.com/sitemap.xml

### Step 4: Google Business Profile
1. Go to business.google.com
2. Create listing for "TM Energy"
3. Set category: "Solar Energy Company"
4. Add photos, hours, service area (Ko Phangan)

### Step 5: Deploy + Verify
1. Deploy changes
2. Use Google's Rich Results Test to verify schema
3. Request indexing in Search Console for all pages
