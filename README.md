# TM Energy — Solar Intelligence Platform

## Status: Live
- **URL:** https://energy-tm.com
- **CRM:** crm.energy-tm.com
- **Supabase:** trvgpgpsqvvdsudpgwpm
- **Vercel:** solar-intelligence

## Quick Links
- [App](./src/) — React + TypeScript platform
- [Proposals](./sales/proposals/) — Beamtech templates (EN/TH/HE)
- [Contracts](./business/legal/) — EPC, PPA
- [Research](./business/research/) — 12 Thailand market reports
- [Ads](./marketing/ads/) — 20 creatives + 8 HTML ads
- [Brand Kit](./marketing/brand/) — 18 mockups + logo variants
- [Podcasts](./marketing/content/) — 10 episodes
- [CRM Steps](./tools/crm-steps/) — 10-step solar workflow
- [PEA Permits](./pea-docs/) — Beamtech 32.5kWp
- [GIS Data](./data/gis/) — 14 GeoJSON layers
- [Drone Ops](./tools/drone/) — Flight plans + guides

## Data
- 27,800 buildings | 3 regions | 625 MWp
- Ko Phangan: 16,196 | Ko Samui: 8,350 | Surat Thani: 3,254

## Scripts
- `scripts/roof_detector.py` — 4-phase pipeline (dedup->validate->discover->score)
- `scripts/download_osm_buildings.py` — Download buildings for new regions
- `scripts/enrich_owners.py` — Google Places enrichment

## Directory Structure

```
solar-intelligence/
├── src/                    # React app source
├── public/                 # Static assets
├── business/
│   ├── legal/              # EPC, PPA, legal contracts
│   ├── finance/            # P&L, financial dashboard, business plan
│   ├── research/           # 12 Thailand market research reports
│   └── strategy/           # Strategy, planning tracker, value chain
├── marketing/
│   ├── ads/                # 20 PNG creatives + 8 HTML ads
│   ├── brand/              # 18 mockups, logo variants, print templates
│   └── content/            # 10 podcast episodes (MP3)
├── sales/
│   ├── proposals/          # Beamtech proposal (EN/TH/HE) + renders
│   ├── presentations/      # (empty — add decks here)
│   └── playbooks/          # Sales process, customer avatars
├── tools/
│   ├── bill-scanner/       # Electricity bill analyzer
│   ├── drone/              # Drone flight plans + guides
│   ├── solar-atlas/        # Solar farm atlas + scout tools
│   └── crm-steps/          # 10-step CRM workflow (HTML)
├── data/
│   └── gis/                # 14 GeoJSON layers + grid scripts
├── pea-docs/               # PEA permit documents (Beamtech 32.5kWp)
├── legacy/
│   ├── roof-scanner-v1/    # Original roof scanner app
│   ├── tm-energy-landing/  # Original landing page
│   └── utils/              # Legacy utility scripts
└── scripts/                # Python pipeline scripts
```
