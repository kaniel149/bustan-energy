# TM Energy Homepage Redesign + SEO — Design Doc

**Date:** 2026-03-30
**Goal:** Full homepage redesign + rank #1 on Google for solar in Ko Phangan / Ko Samui

## Target Keywords

| Keyword | Intent | Competition |
|---------|--------|-------------|
| solar panel koh phangan | High | Low |
| solar installation koh samui | High | Medium |
| solar energy thailand island | Awareness | Low |
| โซลาร์เซลล์ เกาะพะงัน | High | Zero |
| off-grid solar koh phangan | High | Low |
| solar resort samui | Commercial | Low |

## Homepage Sections (in order)

### 1. Hero
- Aerial image background (`strategy-01-aerial.png`) with gradient overlay
- Badge: "Trusted by 500+ Homes & Businesses on Ko Phangan"
- H1: "Power Your Paradise"
- Keyword-rich subtitle
- CTAs: Get Free Quote + WhatsApp Us
- Trust bar below: Longi + Huawei + PEA logos + "Licensed PEA Installer"
- Remove floating panel, add subtle sun ray particles

### 2. Stats Bar + Trust Badges
- 4 counters: 500+ Installations, 15 MW, 40% Savings, 8+ Years on Ko Phangan
- Trust line: "Licensed by PEA · LONGi Certified · Huawei Authorized · Full Warranty"

### 3. Services (4 cards with images)
- Residential Solar (`bizplan-05-villa.png`)
- Commercial Solar (`strategy-03-resort.png`)
- Solar Farms (`strategy-01-aerial.png`)
- Battery Storage (`huawei-inverter.png`)
- 2x2 grid, image background + gradient + bullets

### 4. Solar Installation Scroll Animation
- Integrate existing `SolarInstallationScroll.tsx` component
- Restyle from white bg to dark theme to match site
- 3 house types, 63 frames each, canvas scroll

### 5. Why TM Energy (split layout)
- Left: Installation image with badge overlay
- Right: 4 differentiators (Island Specialists, PEA Licensed, Premium Equipment, Blackout Protection)
- Island-specific pain points (salt air, humidity, blackouts)

### 6. Process (4 steps + HowTo schema)
- Free Site Survey → Custom Design → Professional Installation → Monitor & Save
- Keep existing timeline layout, update content
- Add: "Average installation time: 2 days · Payback period: 3 years"

### 7. Projects Gallery (6 installations)
- 2 rows × 3 cards with images
- Location names across Ko Phangan
- System size + annual savings

### 8. Testimonials (carousel)
- 3 placeholder testimonials (expat, resort manager, Thai homeowner)
- Star ratings + AggregateRating schema
- "4.9/5 from 50+ reviews" badge

### 9. FAQ (accordion)
- 8 questions targeting long-tail keywords
- FAQPage schema markup

### 10. Final CTA
- 3 buttons: Get Free Quote, WhatsApp Us, Call Now
- Urgency line: "Free site survey · No obligation · Response within 24 hours"

### 11. Partners Bar + Footer
- Remove duplicate Footer (Layout already has one)
- Add "Serving Ko Phangan, Ko Samui, and Surat Thani Province"
- LocalBusiness schema in footer

## Technical SEO

- Schema: LocalBusiness, Service, FAQPage, HowTo, AggregateRating, BreadcrumbList
- Meta tags optimized per page
- OG tags for social sharing
- Sitemap.xml + robots.txt
- Canonical URLs + hreflang (en/th)
- Alt text with keywords on all images
- Proper H1 → H2 → H3 hierarchy

## Existing Assets to Integrate

- 189 JPEG frames in `public/frames/` (63 × 3 house types)
- 3 MP4 videos in `public/videos/`
- `SolarInstallationScroll.tsx` canvas scroll component
- 16 images in `public/assets/images/`
- ParallaxImage + Section animation hooks

## Design System

- **Colors:** Dark (#0D1117), Ocean (#0A3D5C), Gold (#E8A820), Sand (#FFF8E7)
- **Fonts:** Instrument Serif (headings) + DM Sans (body)
- **Style:** Dark mode, glassmorphism, rounded corners, Framer Motion animations
- **Scroll animation section:** White background (contrast break from dark sections)
