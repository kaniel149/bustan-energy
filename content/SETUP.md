# Bustan Energy Social Media Setup

## Facebook Page

- [ ] Create page: **"Bustan Energy"** — Category: "Solar Energy Company"
- [ ] Profile pic: Bustan Energy logo (circle crop from `marketing/brand/brand-kit.html`)
- [ ] Cover photo: Dark hero image (render from templates or use AI-generated villa+solar scene)
- [ ] About section:
  > Solar intelligence for Koh Phangan. We scan your roof from space before we ever step on your property. Premium solar solutions for resorts, villas, and businesses across Thailand's islands.
- [ ] CTA button: **"Contact Us"** → energy-tm.com/contact
- [ ] Location: Koh Phangan, Surat Thani, Thailand
- [ ] Hours: Mon-Sat 9:00-18:00
- [ ] Phone: Add business WhatsApp number
- [ ] Website: energy-tm.com

## Instagram

- [ ] Account: **@bustanenergy.th** (already created per project records)
- [ ] Switch to **Professional Account → Business**
- [ ] Connect to Facebook page
- [ ] Profile pic: Same as FB (Bustan Energy logo)
- [ ] Bio:
  ```
  Solar Intelligence for Koh Phangan
  We scan your roof from space
  Free assessment ↓
  ```
- [ ] Link in bio: energy-tm.com
- [ ] Contact options: Email + WhatsApp

## Profile Assets to Create

- [ ] Logo circle crop (400x400 PNG, transparent bg)
- [ ] FB cover photo (1640x856, dark + solar + ocean scene)
- [ ] IG highlight covers (5 circles: About, Projects, Savings, FAQ, Contact)

## First Week Actions

### Before First Post
- [ ] Follow 50 accounts: resorts, eco-brands, expat pages, villa rental companies
- [ ] Like 20 posts from target accounts
- [ ] Join 3 Facebook expat groups:
  - Koh Phangan Community / Expats
  - Koh Samui Expats
  - Phuket Expats & Digital Nomads

### Post Schedule
- [ ] Sunday: Publish Reel #1 (Satellite Scan)
- [ ] Tuesday: Publish Carousel #1 (ROI)
- [ ] Thursday: Publish Reel #2 (Solar Myths)
- [ ] Saturday: Publish Static #1 (Thailand vs Germany)

### After First Posts
- [ ] Reply to every comment within 2 hours
- [ ] Share each post to Stories with engagement sticker
- [ ] DM 5 resort accounts that engage with posts
- [ ] Post 2 story polls during the week

## Content Production Pipeline

```
1. Write script (scripts/*.txt)
2. Generate voiceover: python scripts/generate_voiceover.py <script> <output-name>
3. Preview in Remotion: npm run studio (in content/)
4. Render video: npm run render:reel -- <CompositionID> public/output/<name>.mp4
5. Render carousels: python scripts/render_carousel.py <html> <output-dir>
6. Open static posts in browser, screenshot at 1080x1080
7. Upload to Meta Business Suite for scheduling
```

## Tools & Accounts Needed

- [ ] Meta Business Suite (manage FB + IG from one dashboard)
- [ ] ElevenLabs account (for voiceover generation — API key in env)
- [ ] Remotion (installed in content/ directory)
- [ ] Later.com or Buffer (optional — for scheduling posts)
