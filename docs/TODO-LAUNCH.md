# Bustan Energy — Launch TODO List
## Last updated: 2026-03-13

### CRITICAL (Before Launch)

- [ ] **Real WhatsApp number** — Replace `+66 00 000 0000` placeholder in Footer.tsx, ContactPage.tsx, translations.ts (EN+TH)
- [ ] **LINE OA ID** — Fix `~your-line-id` placeholder in Footer.tsx, set `VITE_LINE_OA_ID` env var
- [ ] **Contact form backend** — Currently fakes submission with setTimeout. Wire to Supabase leads table or Resend email
- [ ] **Run Supabase migrations** — Verify 7 migrations (001-007) ran on project `trvgpgpsqvvdsudpgwpm`
- [ ] **Instagram account** — Create @tmenergy or @tmenergy_solar, add link to Footer

### IMPORTANT (Week 1)

- [ ] **Google Analytics 4** — Create GA4 property, set `VITE_GA4_MEASUREMENT_ID` in Vercel
- [ ] **Meta Pixel** — Create Meta Business account + Pixel, set `VITE_FB_PIXEL_ID` in Vercel
- [ ] **Google Places API key** — Set `VITE_GOOGLE_PLACES_API_KEY` in Vercel (for owner enrichment)
- [ ] **Open Graph image** — Create og-default.jpg (1200x630) for social sharing
- [ ] **Facebook page** — Create Bustan Energy Ko Phangan page (required for Meta Pixel + ads)
- [ ] **Email service** — Set up Resend API for contact form emails, set `RESEND_API_KEY`
- [ ] **info@energy-tm.com** — Set up email (Google Workspace / Zoho Mail)

### OPTIMIZATION (Week 2-3)

- [ ] **Lead notifications** — Send LINE/WhatsApp alert when new lead from scanner or contact form
- [ ] **Google Business Profile** — Create GBP in Thong Sala, Ko Phangan (critical for local SEO)
- [ ] **Conversion events** — GA4 events: form_submit, whatsapp_click, line_click, quote_request
- [ ] **Buffer/social scheduling** — Connect IG + FB for auto-posting
- [ ] **Code splitting** — PlatformPage chunk = 1.5MB, lazy load internal tools
- [ ] **Schema markup audit** — Verify LocalBusiness + Organization schemas render on all pages

### Vercel Env Vars Needed

```
VITE_SUPABASE_URL          ✅ Set
VITE_SUPABASE_ANON_KEY     ✅ Set
VITE_GOOGLE_PLACES_API_KEY ❌ Missing
VITE_LINE_OA_ID            ❌ Missing
VITE_GA4_MEASUREMENT_ID    ❌ Missing
VITE_FB_PIXEL_ID           ❌ Missing
RESEND_API_KEY             ❌ Missing
```

### Social Accounts Needed

| Platform | Status | Action |
|----------|--------|--------|
| Instagram | ❌ | Create @tmenergy_solar |
| Facebook Page | ❌ | Create Bustan Energy Ko Phangan |
| LINE Official | ⚠️ | Verify @tmenergy is active |
| WhatsApp Business | ❌ | Get Thai number +66 → WhatsApp Business |
| Google Business | ❌ | Create GBP in Thong Sala |
