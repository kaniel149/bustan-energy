# TM Energy — Proposal Generation Workflow

Reusable playbook for generating a full 3-option proposal package (client PDFs + internal margin doc + PEA drawings).

Based on the Amir proposal pipeline built 2026-04-23.

---

## Output you get

For client `X-001`:

```
output/
├── X-001-COMBO-he.pdf              ← 3-option comparison, Hebrew
├── X-001-COMBO-en.pdf              ← English
├── X-001-COMBO-th.pdf              ← Thai
├── X-001-INTERNAL-he.pdf           ← INTERNAL ONLY — BOM + margins + profit
├── X-001-roof-before.jpg           ← original drone photo
├── X-001-roof-after.png            ← photo with panels overlaid (Gemini)
└── X-001-PEA-package/
    ├── 01-sld.pdf                  ← Single-Line Diagram
    ├── 02-electrical-plan.pdf      ← cable schedule + voltage drop
    ├── 03-layout.pdf               ← panel arrangement on roof
    ├── 04-specs.pdf                ← equipment specs
    └── 05-application-letter-th.pdf ← Thai PEA letter
```

---

## Pricing formulas (updated 2026-04-23)

All pricing comes from `bom-templates.json > locations.koh_phangan` or similar.

| Item | Rate |
|---|---|
| **Solar grid-tie** (no battery, standard inverter) | ฿28,000/kWp |
| **Solar hybrid-ready** (battery can be added later) | ฿32,000/kWp |
| **Battery storage** (Huawei LUNA installed) | ฿17,500/kWh |

### Equipment cost table (Thailand 2026):

| Item | Price THB |
|---|---|
| JA Solar 580W panel | 4,200 |
| Huawei SUN2000-10KTL (grid-tie) | 55,000 |
| Huawei SUN2000-10KTL-M1 (hybrid) | 88,000 |
| Huawei LUNA2000-10KW-C1 Power Module | 28,700 |
| Huawei LUNA2000-7-E1 Battery 6.9 kWh | 64,500 |
| Mounting (rails+clamps, 18 panels) | 18,000 |
| Cables DC/AC/conduit | 15,000 |
| Protection (SPD+breakers+ground) | 15,000–18,000 |
| Smart meter | 6,500 |
| Huawei Smart Dongle | 3,500 |

**Fixed per-project costs:**
- Labor (2-3 days installation): ฿25,000
- Commissioning + testing: ฿10,000
- PEA application + permits: ฿5,000

### Formula updates (2026-04-23):
- **Payback:** discounted NPV @ 8% (was simple)
- **PR:** 0.77 × soiling 0.97 = 0.747 (was 0.80)
- **Net billing:** 60% self-consume + 40% export @ ฿3.10/kWh = effective ฿3.88/kWh. Battery systems assume 85% self-consume = effective ฿4.205/kWh.
- **Year 1 degradation:** 2% LID before 0.5%/yr (was 0% year 1)
- **CO₂:** 0.477 kg/kWh (EGAT 2023)

---

## Generation pipeline — step by step

### Step 1: Get client data

1. Receive drone photo of roof → save as `output/X-001-roof-before.jpg`
2. Get from client: name, Thai ID (13-digit), address, land deed copy, electricity bill
3. Run KP Solar Pro v2 at energy-tm.com/admin to auto-detect roof area + panel fit
4. Decide system size (e.g. 18 panels × 580W = 10.44 kWp)

### Step 2: Build JSON data files

Copy `clients/amir.json` as template. Create 5 JSONs:
- `clients/X-opt1-gridtie.json`
- `clients/X-opt2-hybrid.json`
- `clients/X-opt3-battery.json`
- `clients/X-3options.json` (combined, for template-dynamic.html)
- `clients/X-internal.json` (BOM + margins for internal doc)

For each, update: `ref_number`, `client_name`, `client_email`, `client_phone`, `client_id_th`, `address`, `panel_count`, `system_kwp`, `total_price_thb`, financial projections.

### Step 3: Generate HTML + PDF

```bash
cd ~/Desktop/projects/solar/tm-energy/solar-intelligence

# 3-option combo in 3 languages (9 files)
node tools/proposal-builder/generate-3opt.mjs --ref X-001 --data clients/X-3options.json

# Internal margin doc (1 file)
node tools/proposal-builder/generate-internal.mjs --ref X-001 --data clients/X-internal.json

# PEA drawings package (5 files)
node tools/proposal-builder/generate-pea.mjs --ref X-001 --data clients/X-opt3-battery.json
```

### Step 4: Overlay panels on drone photo

**Requires Gemini billing enabled** (free tier has 0 quota for image generation).

Option A — via web admin:
- Go to energy-tm.com/admin → open project → "Add Panels" button → upload roof photo → specify panel count + arrangement → wait 30-60s → download result

Option B — CLI (faster for bulk):
```bash
cd tools/proposal-builder/output
uv run ~/Desktop/projects/.agents/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Add X panels, arranged as [specific description]..." \
  --filename "X-001-roof-after.png" \
  --input-image "X-001-roof-before.jpg" \
  --resolution 2K
```

**Prompt tips:**
- Be EXPLICIT about panel positions ("6 on raised central roof, 12 on west wing")
- Specify what should NOT have panels ("east wing empty")
- Use "photorealistic" + "neat parallel rows" + "40cm edge setbacks"
- Specify shadow direction ("cast south")

### Step 5: QA checklist before sending

- [ ] Client name spelled correctly in all 3 languages
- [ ] Thai ID passes checksum (13 digits)
- [ ] Price totals consistent across options
- [ ] Internal doc shows >20% net margin per option
- [ ] PEA SLD has correct kWp + inverter model
- [ ] Before/after image: panels only where specified

### Step 6: Send to client

**Don't send internal doc by mistake!**
1. Create folder `deliverables/X-001/`
2. Copy ONLY: COMBO-he.pdf, COMBO-en.pdf, COMBO-th.pdf, roof-after.png
3. Zip + WhatsApp / email

**Keep internal:** INTERNAL-he.pdf + PEA-package/

### Step 7: After signature

1. Use admin-create-proposal API to register in DB → gets `ref_number` + password
2. Email client the signed URL: `energy-tm.com/p/X-001`
3. Generate PEA package via `/api/admin-pea-package` (uploads to Supabase storage)
4. Submit to PEA Surat Thani → update `projects.pea_status = 'submitted'`

---

## Sample Amir 10.44 kWp pricing

| Option | Client Price | Equipment Cost | Gross Margin | Net Profit (after ฿40K ops) |
|---|---|---|---|---|
| 1. Grid-Tie only | ฿292,320 | ฿188,600 | ฿103,720 (35.5%) | ~฿64,000 (22%) |
| 2. Hybrid-ready (no battery) | ฿334,080 | ฿224,600 | ฿109,480 (32.8%) | ~฿70,000 (21%) |
| 3. Hybrid + 6.9kWh | ฿454,830 | ฿317,800 | ฿137,030 (30.1%) | ~฿96,000 (21%) |

All options maintain ~20%+ net margin.

---

## Known issues / to improve

1. **Gemini billing** — MUST be enabled for image overlay (free tier = 0)
2. **Thai translations** — verify with native speaker before sending (current text uses stock phrases)
3. **PDF size** — COMBO PDFs are 12-13MB each (can compress with Ghostscript if needed)
4. **PEA branch detection** — currently hardcoded to Surat Thani, use `pea-branches.ts > detectBranch(lat,lng)` for other sites
