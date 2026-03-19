# 09. Financial Models & Financing for Solar Farms in Thailand

## Table of Contents
1. [Revenue Models Overview](#1-revenue-models-overview)
2. [Community Solar FiT Model Economics](#2-community-solar-fit-model-economics)
3. [Private PPA Model Economics](#3-private-ppa-model-economics)
4. [Self-Consumption Model Economics](#4-self-consumption-model-economics)
5. [Key Financial Metrics](#5-key-financial-metrics)
6. [Financing Sources](#6-financing-sources)
7. [Capital Structure & Debt](#7-capital-structure--debt)
8. [Tax Incentives & Depreciation](#8-tax-incentives--depreciation)
9. [Carbon Credits](#9-carbon-credits)
10. [Cash Flow Modeling](#10-cash-flow-modeling)
11. [Sensitivity Analysis](#11-sensitivity-analysis)
12. [Bankability Requirements](#12-bankability-requirements)
13. [Financial Model Templates](#13-financial-model-templates)

---

## 1. Revenue Models Overview

Thailand offers three primary revenue models for solar farm development, each with distinct risk-return profiles:

| Model | Tariff Rate (THB/kWh) | Contract Term | Target IRR | Risk Level |
|-------|----------------------|---------------|------------|------------|
| Community Solar FiT | 2.25 | 25 years | 8-12% | Low (government PPA) |
| Private Corporate PPA | 4.50-5.00 | 15-20 years | 12-18% | Medium (corporate credit) |
| Self-Consumption | Avoided cost (~4.00-5.50) | N/A | 15-25% | Low-Medium (own use) |
| Government FiT (5 GW program) | 2.1679 | 20-25 years | 7-10% | Low (EGAT PPA) |

**Source:** Krungsri Research, "Renewable Energy 2026-2028 Outlook" (2025); Hunton Andrews Kurth, "Thailand Launches Community Solar Power Initiative" (2025)

---

## 2. Community Solar FiT Model Economics

### 2.1 Program Structure
- **Tariff rate:** THB 2.25/kWh (fixed for 25 years)
- **Total program capacity:** 1,500 MW nationwide
- **Maximum per site:** 10 MW (VSPP category)
- **Offtaker:** Provincial Electricity Authority (PEA) or Metropolitan Electricity Authority (MEA)
- **PPA term:** 25 years, non-firm (solar is intermittent)
- **Community requirement:** Local Administrative Organization (LAO) consent required
- **Target:** 300+ communities across Thailand
- **Annual allocation:** ~400 MW/year starting 2025

**Source:** PV Magazine, "Thailand develops solar plan for community power supply" (Nov 2025); ERC draft regulations (Dec 2025)

### 2.2 Revenue Projection (5 MW Example)

```
Project Capacity:           5 MW (DC), ~4.5 MW (AC)
Capacity Factor:            18-20% (Thailand average for ground-mount)
Annual Generation:          ~7,884 MWh (at 18% CF)
                            ~8,760 MWh (at 20% CF)

Annual Revenue:
  At 18% CF: 7,884 MWh × ฿2,250 = ฿17.74M/year
  At 20% CF: 8,760 MWh × ฿2,250 = ฿19.71M/year

25-Year Gross Revenue:
  At 18% CF: ~฿443.5M
  At 20% CF: ~฿492.8M
```

### 2.3 Cost Structure (5 MW Ground-Mount)

```
Capital Expenditure (CAPEX):
  Solar modules:            ฿35-45M  (฿7-9M/MW)
  Inverters:                ฿8-12M   (฿1.6-2.4M/MW)
  Mounting & BOS:           ฿15-20M  (฿3-4M/MW)
  Civil works:              ฿10-15M  (฿2-3M/MW)
  Grid connection:          ฿5-10M   (฿1-2M/MW)
  EPC margin & management:  ฿7-10M   (฿1.4-2M/MW)
  Development costs:        ฿5-8M    (฿1-1.6M/MW)
  Contingency (5-10%):      ฿4-6M
  -----------------------------------------
  Total CAPEX:              ฿89-126M (฿17.8-25.2M/MW)
                            (~$2.5-3.5M USD total)
                            (~$500-700K USD/MW)

Operating Expenditure (OPEX) Annual:
  O&M (fixed):              ฿1.0-1.5M/year
  Insurance:                ฿0.3-0.5M/year
  Land lease:               ฿0.5-1.0M/year
  Administration:           ฿0.3-0.5M/year
  Grid charges:             ฿0.2-0.4M/year
  Module degradation cost:  Built into declining output (~0.5%/year)
  -----------------------------------------
  Total OPEX:               ฿2.3-3.9M/year
```

### 2.4 Pro Forma IRR Analysis

```
Assumptions:
  CAPEX:                    ฿100M (฿20M/MW)
  Annual Revenue (Year 1):  ฿19.0M
  Annual OPEX:              ฿3.0M
  Module degradation:       0.5%/year
  Debt/Equity:              70/30
  Interest rate:            5.0%
  Loan term:                15 years
  Tax rate:                 0% (BOI exempt, 8 years)
                            20% (years 9-25)

Results:
  Pre-tax Equity IRR:       10-14%
  After-tax Equity IRR:     9-12%
  Project IRR (unlevered):  8-10%
  Payback period:           7-9 years
  NPV (at 7% WACC):        ฿35-65M
  DSCR (min):               1.25-1.40x
```

**Note:** The ฿2.25/kWh rate is lower than the 5 GW FiT program rate of ฿2.1679/kWh — the community solar rate is actually slightly higher, reflecting smaller project scale and community coordination costs.

**Source:** Watson Farley & Williams, "Thailand's 5 GW Renewable PPA FIT Scheme 2022-2030" (2023); Krungsri Research (2025)

---

## 3. Private PPA Model Economics

### 3.1 Market Overview
- **Tariff range:** THB 4.50-5.00/kWh (negotiated per contract)
- **Contract term:** 15-20 years (some as short as 10)
- **Offtaker:** Private corporations (factories, data centers, commercial buildings)
- **Key advantage:** ~2x revenue compared to FiT models
- **Grid retail comparison:** THB 4.00-5.50/kWh (typical industrial rate)
- **Buyer savings:** 15-25% on electricity bills

**Source:** ETTH Co., Ltd., "Solar PPA Service" (2025); Krungsri Research (2025)

### 3.2 Direct PPA Pilot Program (2026)
- **Capacity:** Up to 2,000 MW
- **Structure:** Direct power purchase agreements bypassing state utilities (EGAT/PEA)
- **Target:** Data centers, large industrial users
- **Effective:** January 2026
- **Significance:** First time corporates can buy directly from generators in Thailand

**Source:** GovSiam, "Thailand Approves Direct Power Purchase Agreements for Renewable Energy" (2025)

### 3.3 Revenue Projection (5 MW Private PPA)

```
Project Capacity:           5 MW (DC)
Capacity Factor:            18-20%
Annual Generation:          ~7,884-8,760 MWh
PPA Rate:                   ฿4.75/kWh (midpoint)

Annual Revenue:
  At 18% CF: 7,884 × ฿4,750 = ฿37.45M/year
  At 20% CF: 8,760 × ฿4,750 = ฿41.61M/year

Comparison to FiT:
  Revenue premium:          ~2.1x higher than ฿2.25 FiT
  20-year Gross Revenue:    ฿749M - ฿832M
```

### 3.4 Private PPA Financial Model

```
Assumptions:
  CAPEX:                    ฿100M (same as FiT project)
  Annual Revenue (Year 1):  ฿39.5M (avg)
  Annual OPEX:              ฿3.5M (slightly higher - corporate servicing)
  Debt/Equity:              60/40 (less leverage due to corporate risk)
  Interest rate:            5.5%
  Loan term:                12 years

Results:
  Pre-tax Equity IRR:       18-24%
  After-tax Equity IRR:     15-20%
  Project IRR (unlevered):  14-18%
  Payback period:           3-5 years
  NPV (at 8% WACC):        ฿180-250M
  DSCR (min):               1.8-2.5x
```

### 3.5 Key Risks in Private PPA
- **Offtaker credit risk:** Corporate bankruptcy or downgrade
- **Contract enforcement:** Thai commercial court jurisdiction
- **Curtailment risk:** If corporate reduces operations
- **No government guarantee:** Unlike FiT/utility PPAs
- **Mitigation:** Credit insurance, parent company guarantees, step-in rights

---

## 4. Self-Consumption Model Economics

### 4.1 Structure
- **No PPA required** — owner generates and consumes own electricity
- **Revenue = avoided electricity cost:** THB 4.00-5.50/kWh (depending on tariff class)
- **Excess generation:** Can sell back to grid at ~THB 2.20/kWh (net metering)
- **Best for:** Industrial/commercial facilities with high daytime consumption
- **Typical size:** 100 kW - 5 MW rooftop or adjacent ground-mount

### 4.2 Economics

```
Example: 1 MW Rooftop Self-Consumption
  CAPEX:                    ฿25-30M
  Annual generation:        ~1,500 MWh
  Self-consumption rate:    70-85%
  Avoided cost:             ฿4.50/kWh
  Grid sales (excess):      ฿2.20/kWh

  Annual savings:
    Self-consumed: 1,200 MWh × ฿4,500 = ฿5.40M
    Grid sales:    300 MWh × ฿2,200  = ฿0.66M
    Total benefit:                      ฿6.06M/year

  Simple payback:           4.1-5.0 years
  IRR:                      18-25%
```

**Source:** Krungsri Research, "Solar Rooftop" (2025); Agora Energiewende, "Unlocking Solar Rooftop in Thailand" (2024)

---

## 5. Key Financial Metrics

### 5.1 LCOE — Levelized Cost of Energy

Thailand solar LCOE has declined significantly and is now competitive with fossil fuels:

| Year | Solar LCOE (THB/kWh) | LNG (THB/kWh) | Coal (THB/kWh) |
|------|---------------------|----------------|-----------------|
| 2020 | 2.50-3.00 | 3.20-3.80 | 2.80-3.20 |
| 2023 | 2.00-2.50 | 3.50-4.50 | 3.00-3.50 |
| 2025 | 1.50-2.00 | 3.80-5.00 | 3.20-3.80 |
| 2030 (proj.) | 1.10-1.50 | 4.00-5.50 | 3.50-4.00 |

**Key insight:** Solar LCOE projected to decline 27% by 2030 from 2024 levels.

**Source:** Energy Tracker Asia, "Solar Energy Thailand" (2025); Ember Energy, "Thailand's Cost-Optimal Pathway" (2025)

### 5.2 LCOE Calculation Methodology

```
LCOE = (Total Lifetime Costs) / (Total Lifetime Energy Production)

Where:
  Total Lifetime Costs = CAPEX + Σ(OPEX_t / (1+r)^t)
  Total Energy = Σ(E_t × (1-d)^t / (1+r)^t)

  r = discount rate (6-8% for Thailand)
  d = annual degradation rate (0.4-0.6%)
  E_t = annual energy production in year t
  t = year (1 to 25)

Thailand-Specific Inputs:
  Solar irradiance: 1,400-1,800 kWh/m²/year
  Capacity factor: 16-22% (varies by region)
  Best regions: Northeast (Isan), Central Plains
  Module efficiency: 20-22% (mono-PERC/TOPCon)
  System losses: 14-18%
```

### 5.3 IRR Ranges by Model

| Model | Equity IRR Range | Project IRR Range | Notes |
|-------|-----------------|-------------------|-------|
| Community Solar (FiT ฿2.25) | 9-14% | 8-10% | Low risk, gov't PPA |
| 5 GW FiT (฿2.1679) | 8-12% | 7-9% | Utility-scale, lower rate |
| Private PPA (฿4.50-5.00) | 15-24% | 14-18% | Higher risk, higher return |
| Self-consumption | 18-25% | 15-22% | No counterparty risk |
| Solar + BESS (hybrid) | 10-15% | 8-12% | Higher CAPEX, firm power |

### 5.4 NPV Calculation Methodology

```
NPV = -CAPEX + Σ(FCF_t / (1+WACC)^t)

Where:
  FCF_t = Revenue_t - OPEX_t - Tax_t - Debt Service_t + Tax Shield_t
  WACC = (E/V × Re) + (D/V × Rd × (1-T))

Typical Thai Solar WACC: 6-8%
  Equity cost (Re): 10-14%
  Debt cost (Rd): 4.5-6.0%
  Tax rate (T): 0% (BOI years) / 20% (standard CIT)
  D/V: 60-75%
  E/V: 25-40%

Reference: IEA reports Thailand solar WACC at 6-8% (2025)
```

**Source:** IEA via PV Magazine India, "Cost of Capital for Solar in Southeast Asia" (2025); GuruFocus, TSE WACC data (2025)

---

## 6. Financing Sources

### 6.1 Thai Commercial Banks

#### Siam Commercial Bank (SCB)
- **Products:** Green loans for solar farms, rooftops, biomass
- **Notable deal:** $32M parallel green loan with IFC to Sermsang Palang Ngan (SPN) for solar farms, rooftops, and biomass in Thailand and ASEAN
- **Consumer product:** "Solar Rooftop" package via SCB EASY app — 0% interest installments for household solar (partnership with Gunkul and Huawei)
- **Typical terms:** 10-15 year tenor, competitive rates for utility-grade projects
- **Source:** IFC Press Release (2024); SCB News (Nov 2024)

#### Bangkok Bank (BBL)
- **Products:** Bualuang Green Home Loans for solar-equipped housing
- **Focus:** Green housing with integrated solar features
- **Solar project finance:** Available for established developers with track record
- **Source:** Bangkok Bank website (2025)

#### Krungsri (Bank of Ayudhya)
- **Parent:** MUFG Group (Japan)
- **Strength:** Strong research division covering renewable energy sector
- **Products:** Green loans and project finance for renewable energy
- **Research:** Publishes detailed "Renewable Energy Outlook" reports covering solar sector
- **Source:** Krungsri Research Intelligence (2025)

#### Kasikorn Bank (KBank)
- **Notable deal:** Joint ฿410M green loan with EXIM Bank to RE Energy for 21.49 MW floating solar plant (2025)
- **Products:** Green project finance, sustainability-linked loans
- **Source:** Kasikorn Bank press release (2025)

#### TMBThanachart Bank (TTB)
- **Notable deal:** ฿1.5B (~$50M) green project finance loan to Constant Energy for C&I solar portfolio expansion — largest such deal in Thailand at the time
- **Focus:** C&I solar portfolio financing
- **Source:** PV-Tech Industry Update (2022)

### 6.2 EXIM Bank Thailand

EXIM Thailand positions itself as a "Green Development Bank" under its Greenovation strategy:

- **Target:** ฿100B in BCG (bio-circular-green) lending by 2027
- **Notable solar deals:**
  - ฿155M loan to Constant Energy for 11.08 MW rooftop solar (2022)
  - ฿2.32B facility to Gunkul Engineering for solar rooftop PV (2024)
  - ฿410M joint loan with KBank for 21.49 MW floating solar (2025)
  - ฿2.2B loan to Thai Solar Energy for biomass plants (2017)
- **Products:**
  - EXIM Green Start: Special interest rates for eco-friendly projects
  - EXIM Green Goal: Targeted sustainability lending
  - Solar Orchestra: Innovation platform for small-scale rooftop solar + carbon credits
- **Goal:** 50% sustainability loans by 2028

**Source:** EXIM Thailand via various press releases (2022-2025); Nation Thailand (2024)

### 6.3 SME Development Bank

- **Focus:** Small and medium enterprise lending
- **Solar relevance:** SME-scale solar installations and energy efficiency
- **Products:** General SME loans applicable to solar investments
- **Limitation:** No dedicated solar product identified in research
- **Note:** Separate institution from EXIM; less prominent in solar project finance

### 6.4 International Development Finance

#### Asian Development Bank (ADB)
- **B.Grimm Green Bond:** THB 5B (~$155M) subscription — first Climate Bond Initiative-certified green bond in Thailand (2018)
  - Refinanced 68 MW operational solar + financed 31 MW under construction = 99 MW across 16 plants
- **Gulf Renewable Energy (GRE):** $350M loan for 194 MW solar + 151 MWh BESS (3 projects)
  - Sole mandated lead arranger and bookrunner
  - Co-lenders: DBS, DEG, DFIC, LEAP 2
  - COD: 2026
- **Energy Absolute Green Bond:** THB 3B investment in THB 10B issuance (2019) — funded 260 MW Hanuman Wind Farm
- **Strategy 2030:** 75% of ADB operations to be climate-focused by 2030

**Source:** ADB Project 52292-001; ADB News (Feb 2026); ADB/B.Grimm press releases (2018)

#### International Finance Corporation (IFC)
- **Sermsang Power (SPN):** Up to $32M (THB 1.2B) green loan for solar farms, rooftops, biomass
  - Parallel loan with SCB
  - SPN owns 52 MW solar PV plant in Lopburi selling to EGAT
- **Role:** Also helps develop green finance frameworks for Thai institutions

**Source:** IFC Press Release (2024)

#### Japan International Cooperation Agency (JICA)
- **Direct solar finance:** No specific solar project finance deals identified in Thailand
- **Indirect support:** Technical cooperation on renewable energy policy and planning
- **Related:** JICA supports broader clean energy transition in ASEAN through ODA and technical assistance
- **Note:** Less active in direct solar project finance compared to ADB/IFC in Thailand

### 6.5 Green Bonds Market in Thailand

| Issuer | Amount | Year | Use of Proceeds | Certification |
|--------|--------|------|-----------------|---------------|
| B.Grimm Power | THB 5B (~$155M) | 2018 | 99 MW solar (16 plants) | CBI-certified, first in Thailand |
| Energy Absolute | THB 10B (~$310M) | 2019 | 260 MW wind farm | Green Bond Principles |
| EGAT | Various | 2023-2025 | Floating solar, grid | Sustainability-linked |
| Thai government | Various | 2020+ | Sovereign green bonds | ICMA aligned |

**Key trends:**
- Thailand green bond market growing rapidly
- Domestic issuance supported by Bank of Thailand and SEC
- Thailand Taxonomy provides classification framework for green assets
- Solar projects are prime candidates for green bond refinancing

**Source:** Climate Finance Thai, "Learning from the Green Bond Experience" (2024); Thai BMA (2025)

---

## 7. Capital Structure & Debt

### 7.1 Typical Debt-to-Equity Ratios

| Project Type | D/E Ratio | Notes |
|-------------|-----------|-------|
| Community Solar (FiT) | 70:30 to 75:25 | Low risk, stable PPA → higher leverage |
| Private PPA | 60:40 to 65:35 | Higher offtaker risk → moderate leverage |
| Self-consumption | 50:50 to 60:40 | No PPA → conservative leverage |
| Utility-scale (EGAT PPA) | 70:30 to 80:20 | Strong offtaker → high leverage |
| Solar + BESS | 65:35 to 70:30 | Technology risk premium |

### 7.2 Industry Benchmarks (Thai Solar Companies)

| Company | Interest-Bearing D/E | Book D/E | Cost of Debt | WACC |
|---------|---------------------|----------|--------------|------|
| TSE (YE2024) | 1.35x | 5.82:1 | 4.57% | 6.62% |
| TSE (YE2023) | 1.68x | Higher | ~4.5% | ~7.0% |
| Super Energy | ~1.5-2.0x | N/A | ~5.0% | ~7.5% |
| SPCG | ~1.2-1.5x | N/A | ~4.5% | ~6.5% |

**Bank covenant typical range:** Interest-bearing D/E ≤ 2.0-2.9x

**Source:** GuruFocus TSE data (2025); TSE Opp Day Presentation YE2024; Super Energy Opp Day (2023)

### 7.3 Interest Rates for Solar Project Finance

| Lender Type | Interest Rate Range | Tenor | Notes |
|-------------|-------------------|-------|-------|
| Thai commercial banks | 4.0-6.0% | 10-15 years | Fixed or floating (MLR-based) |
| EXIM Bank Thailand | 3.5-5.5% | 10-15 years | Concessional for green |
| ADB green loans | 3.0-5.0% | 15-20 years | Lower for development impact |
| IFC green loans | 3.5-5.0% | 12-18 years | USD or THB denominated |
| Debentures/bonds | 4.0-5.5% | 5-10 years | Refinancing tool |
| ICBC Leasing | 2.99% | 7-10 years | Promotional rate |

**Risk premiums:**
- Regulatory/policy risk: +0.5-0.8% on debt cost
- First-time developer: +1.0-2.0% on debt cost
- Island/remote location: +0.5-1.0% on debt cost
- Foreign currency exposure: +0.3-0.5% hedging cost

**Source:** CASE/Agora Energiewende, "Unlocking Solar Rooftop in Thailand" (2025); IEA/PV Magazine (2025)

### 7.4 Debt Structure Composition

Based on TSE's capital structure (representative of mid-size Thai solar developers):

```
Debt Composition (YE2024):
  Debentures:           59% of total debt
  Project finance loans: 20% (non-recourse)
  Corporate loans:       21% (recourse)

Historical (2020):
  Project finance loans: 47%
  Corporate/debentures:  53%
```

**Trend:** Shift from project finance to debentures as portfolios mature and companies gain market credibility.

---

## 8. Tax Incentives & Depreciation

### 8.1 BOI Investment Promotion

#### Solar Power Generation (Activity 7.1)
- **Corporate Income Tax (CIT) exemption:** 8 years (100% exemption)
- **Import duty exemption:** On machinery and equipment
- **Non-tax incentives:**
  - 100% foreign ownership permitted
  - Land ownership rights for promoted projects
  - Permission to bring in foreign workers
- **Minimum investment:** THB 1M (excluding land and working capital)
- **Requirement:** Must use modern technology
- **Application processing:** 40-90 days

#### Solar + BESS Combined (Recent Update)
- **CIT exemption:** Up to 3 years
- **Cap:** THB 12M per MWp of installed capacity
- **Note:** Standalone solar installations may not qualify; BESS addition recommended

**Source:** LexNova Partners, "BOI Incentives for Renewable Energy Thailand" (2025); PVKnowHow (2025)

### 8.2 Tax Depreciation Schedules

```
Standard Depreciation (Revenue Code):
  Solar modules:        5-year straight-line (20%/year)
  Inverters:            5-year straight-line (20%/year)
  Mounting structures:  10-year straight-line (10%/year)
  Buildings/civil:      20-year straight-line (5%/year)
  Electrical equipment: 5-year straight-line (20%/year)

Accelerated Depreciation (with BOI):
  During 8-year BOI exemption period, depreciation 
  has no tax benefit (CIT = 0%)
  Post-BOI period: remaining book value depreciated 
  over remaining useful life

150% Super Deduction (Cabinet Approved):
  - 150% tax deduction for certified 5-star energy-efficient equipment
  - Includes solar-related investments
  - Equipment must be new, unused, located in Thailand
  - Valid through December 31, 2028
  - Cannot combine with other tax schemes

Personal Tax Deduction (Residential):
  - Up to THB 200,000 for solar equipment and installation
  - Claimed in tax year of grid connection completion
  - Limited to one system per individual
```

### 8.3 Tax Planning Strategy for Solar Projects

```
Optimal Tax Strategy (25-year project):

Years 1-8:   BOI CIT exemption (0% tax)
             → Depreciation shield "wasted" during this period
             → Consider front-loading revenue recognition
             → Focus on debt repayment during tax-free period

Years 9-25:  Standard 20% CIT rate applies
             → Limited depreciation remaining
             → Higher effective tax burden
             → Consider refinancing to create interest deductions

Effective Tax Rate Over 25 Years:
  With BOI:    ~12-14% (blended)
  Without BOI: ~18-20% (full CIT on profits)
```

---

## 9. Carbon Credits

### 9.1 Thailand Voluntary Emission Reduction (T-VER) Program

- **Administrator:** Thailand Greenhouse Gas Management Organization (TGO)
- **Standard:** T-VER (Thailand Voluntary Emission Reduction)
- **Solar project eligibility:** Grid-connected solar PV qualifies
- **Credit type:** tCO2eq (tonnes of CO2 equivalent)

### 9.2 Carbon Credit Pricing (2024-2025)

| Credit Type | Price (THB/tCO2eq) | Price (USD/tCO2eq) |
|-------------|-------------------|-------------------|
| Renewable energy (solar) | 45-250 | $1.34-7.45 |
| Average all types (Q1 FY2025) | 174.52 | ~$5.20 |
| Forestry/agriculture | 1,700-2,076 | $50-62 |

**Market data (Q1 FY2025 = Oct-Dec 2024):**
- Total traded: 101,894 tCO2eq
- Total value: THB 17.78M (~$528K USD)
- YoY price increase: 40%

**Source:** Nation Thailand, "Thailand carbon credit market" (2025); Solar Quarter (2025)

### 9.3 Carbon Credit Revenue for Solar

```
5 MW Solar Farm Carbon Credit Revenue:

Emission factor (Thai grid): ~0.50 tCO2/MWh
Annual generation:           8,000 MWh
Annual credits:              ~4,000 tCO2eq

Revenue at THB 150/tCO2eq:  THB 600,000/year (~$17,800)
Revenue at THB 250/tCO2eq:  THB 1,000,000/year (~$29,800)

Note: Carbon credit revenue is supplementary (1-5% of total revenue)
      but can improve project IRR by 0.3-0.8%
```

### 9.4 Future Carbon Market Development

- **Comprehensive VCM:** Thailand plans full voluntary carbon market by 2027
- **Offset limit:** 15% carbon credit offset limit (vs. Singapore's 5%, Vietnam's proposed 20%)
- **Carbon tax:** THB 200/tonne (~$5.95) on petroleum products from March 2025
- **Implication:** Carbon tax creates price floor and demand for credits
- **International markets:** Solar credits also tradeable on VERRA, Gold Standard platforms

**Source:** Solar Quarter (Mar 2025); ICAP Carbon Action (2025)

### 9.5 Community Solar Carbon Credit Note

Under the community solar program, RECs and carbon credits may be owned by the PEA/MEA offtaker, not the developer. This needs clarification in PPA terms. For private PPAs, carbon credits typically belong to the generator unless assigned.

---

## 10. Cash Flow Modeling

### 10.1 Model Structure (DCF Approach)

```
INPUTS:
├── Technical
│   ├── Installed capacity (MWp DC / MWac)
│   ├── Specific yield (kWh/kWp/year): 1,400-1,600 in Thailand
│   ├── Performance ratio: 80-85%
│   ├── Annual degradation: 0.4-0.6%/year
│   └── System availability: 98-99%
│
├── Revenue
│   ├── PPA tariff (THB/kWh)
│   ├── Tariff escalation (if any)
│   ├── Carbon credit revenue
│   └── REC revenue
│
├── CAPEX
│   ├── EPC cost (THB/MW)
│   ├── Development costs
│   ├── Grid connection
│   ├── Land acquisition/lease
│   └── Contingency (5-10%)
│
├── OPEX
│   ├── O&M (fixed + variable)
│   ├── Insurance (0.3-0.5% of CAPEX)
│   ├── Land lease escalation
│   ├── Inverter replacement (Year 12-15)
│   └── Administration
│
├── Financing
│   ├── Debt/equity split
│   ├── Interest rate
│   ├── Loan tenor and amortization
│   ├── DSRA (Debt Service Reserve Account)
│   └── Fees (arrangement, commitment)
│
└── Tax
    ├── BOI exemption period
    ├── CIT rate (20%)
    ├── Depreciation schedule
    └── Withholding taxes
```

### 10.2 Key Cash Flow Waterfall

```
Revenue (Year 1):                    ฿19.0M
  Less: OPEX                        (฿3.0M)
  ─────────────────────────────────────────
EBITDA:                               ฿16.0M

  Less: Depreciation                 (฿8.0M)
  ─────────────────────────────────────────
EBIT:                                  ฿8.0M

  Less: Interest                     (฿3.5M)
  ─────────────────────────────────────────
EBT:                                   ฿4.5M

  Less: Tax (BOI exempt)             (฿0.0M)
  ─────────────────────────────────────────
Net Income:                            ฿4.5M

  Add back: Depreciation              ฿8.0M
  Less: Principal repayment          (฿4.7M)
  ─────────────────────────────────────────
Free Cash Flow to Equity:             ฿7.8M

On equity of ฿30M:
  Cash-on-cash return Year 1:          26.0%
```

### 10.3 25-Year Cash Flow Summary

```
Period          Revenue    OPEX     EBITDA    Debt Svc   FCFE    Cum. FCFE
──────────────────────────────────────────────────────────────────────────
Years 1-5      ฿93.8M    ฿15.5M   ฿78.3M    ฿41.0M    ฿37.3M   ฿37.3M
Years 6-10     ฿91.5M    ฿17.0M   ฿74.5M    ฿41.0M    ฿33.5M   ฿70.8M
Years 11-15    ฿89.2M    ฿20.0M   ฿69.2M    ฿41.0M    ฿28.2M   ฿99.0M
Years 16-20    ฿87.0M    ฿19.0M   ฿68.0M    ฿0.0M     ฿54.4M   ฿153.4M
Years 21-25    ฿84.9M    ฿20.0M   ฿64.9M    ฿0.0M     ฿51.9M   ฿205.3M
──────────────────────────────────────────────────────────────────────────
Total 25-Year  ฿446.4M   ฿91.5M   ฿354.9M   ฿123.0M   ฿205.3M

Note: Assumes FiT ฿2.25/kWh, 5 MW, 70:30 D/E, 15-year loan
      Revenue declines ~0.5%/year (degradation)
      OPEX increases ~2%/year (inflation)
      Tax included post-Year 8 (BOI)
```

---

## 11. Sensitivity Analysis

### 11.1 Key Variables to Test

| Variable | Base Case | Low Case | High Case | IRR Impact |
|----------|-----------|----------|-----------|------------|
| Capacity factor | 19% | 16% | 22% | ±2-3% |
| CAPEX (THB/MW) | 20M | 25M | 17M | ±2-4% |
| PPA tariff | 2.25 | 2.17 | 2.50 | ±1-2% |
| Interest rate | 5.0% | 6.5% | 3.5% | ±1-2% |
| Degradation rate | 0.5% | 0.8% | 0.3% | ±0.5-1% |
| O&M cost | 3.0M | 4.0M | 2.0M | ±0.5-1% |
| D/E ratio | 70:30 | 60:40 | 80:20 | ±1-3% |
| THB/USD FX rate | 35 | 40 | 30 | Varies |

### 11.2 Tornado Diagram (Equity IRR Sensitivity)

```
Most Sensitive → Least Sensitive:

CAPEX per MW:        ████████████████████  ±4.0%
Capacity Factor:     ██████████████████    ±3.5%
D/E Ratio:           ██████████████        ±2.5%
Interest Rate:       ████████████          ±2.0%
PPA Tariff:          ██████████            ±1.8%
Degradation Rate:    ██████                ±1.2%
O&M Cost:            ████                  ±0.8%
Insurance:           ██                    ±0.3%
```

### 11.3 Break-Even Analysis

```
Minimum viable FiT rate at different CAPEX levels:
  CAPEX ฿25M/MW: Break-even FiT = ฿2.05/kWh (viable at ฿2.25)
  CAPEX ฿20M/MW: Break-even FiT = ฿1.65/kWh (comfortable margin)
  CAPEX ฿17M/MW: Break-even FiT = ฿1.40/kWh (strong margin)

Minimum capacity factor for positive NPV:
  At ฿2.25 FiT: ~14% CF (most Thai locations exceed this)
  At ฿2.17 FiT: ~15% CF
  At private PPA ฿4.75: ~8% CF (any location viable)
```

### 11.4 Scenario Analysis

```
Scenario 1: Conservative
  CF: 17%, CAPEX: ฿23M/MW, Rate: 5.5%, D/E: 65:35
  → Equity IRR: 7.5%, NPV: ฿18M, Payback: 10 years

Scenario 2: Base Case
  CF: 19%, CAPEX: ฿20M/MW, Rate: 5.0%, D/E: 70:30
  → Equity IRR: 11.5%, NPV: ฿52M, Payback: 7.5 years

Scenario 3: Optimistic
  CF: 21%, CAPEX: ฿17M/MW, Rate: 4.5%, D/E: 75:25
  → Equity IRR: 16.0%, NPV: ฿95M, Payback: 5.5 years
```

---

## 12. Bankability Requirements

### 12.1 General Lender Requirements

Thai banks and international lenders typically require:

#### Developer Qualifications
- Juristic person registered in Thailand
- Minimum registered capital (varies by project size)
- Track record in solar or energy projects (first-time developers face higher rates)
- Foreign ownership ≤49% (unless BOI promoted)
- Bid bonds and performance guarantees

#### Technical Requirements
- **Solar modules:** Tier 1 (BNEF Bankability list preferred)
  - Acceptable brands: Longi, JA Solar, Trina, Canadian Solar, Jinko, JinkoSolar
  - Minimum: 25-year linear performance warranty
  - Technology: Mono-PERC or TOPCon preferred (2024+)
- **Inverters:** Bankable brands
  - Acceptable: Huawei, Sungrow, SMA, Sineng, GoodWe (utility)
  - Minimum: 10-year warranty (extendable to 15-20)
- **EPC contractor:** Must demonstrate experience, provide performance guarantees
- **Independent Engineer:** Required for projects >10 MW or non-recourse financing

#### Financial Requirements
- **DSCR minimum:** 1.20-1.30x (varies by lender)
- **Debt Service Reserve Account (DSRA):** 6 months debt service
- **Insurance:** All-risk, business interruption, third-party liability
- **Security package:** Asset pledge, share pledge, revenue assignment
- **Equity contribution evidence:** Before first drawdown

#### PPA/Revenue Requirements
- Executed PPA with creditworthy offtaker
- Government PPAs preferred (PEA/MEA/EGAT)
- Private PPAs: parent company guarantee required
- Minimum remaining PPA term: Exceeds loan tenor by 3-5 years

**Source:** ADB project documentation; ERC procurement rules (2025); Baker McKenzie "Thailand Green Finance" (2025)

### 12.2 Due Diligence Checklist

```
Technical Due Diligence:
☐ Solar resource assessment (satellite + ground data)
☐ Energy yield report (P50/P75/P90 production estimates)
☐ Module certification (IEC 61215, IEC 61730)
☐ Inverter certification (IEC 62109)
☐ Grid impact study
☐ Environmental Impact Assessment (EIA) — if required
☐ Geotechnical survey
☐ Flood risk assessment

Financial Due Diligence:
☐ Financial model audit (by independent financial advisor)
☐ Sensitivity analysis results
☐ Tax opinion
☐ Insurance feasibility report
☐ Working capital requirements

Legal Due Diligence:
☐ Land title verification (Chanote/Nor Sor 4)
☐ PPA review and execution
☐ Permits and licenses
☐ Environmental permits
☐ BOI promotion certificate
☐ ERC license (VSPP or SPP)
☐ Construction permits (or exemption confirmation)
```

### 12.3 Thailand-Specific Bankability Notes

1. **Land titles:** Chanote (Nor Sor 4) is the gold standard. Nor Sor 3 Gor is acceptable with caution. Avoid Nor Sor 3 or lower for project finance.

2. **Grid connection:** PEA/MEA grid connection agreement is a critical document. Delays in grid connection are a common project risk.

3. **Flood risk:** Critical in central Thailand and Isan lowlands. Elevated structures or flood-resistant design may be required.

4. **Community consent:** For community solar projects, LAO consent letter is a condition precedent for PPA.

5. **Factory license exemption:** Recent policy exempts ground-mounted solar from factory license requirements, significantly reducing permitting time and cost.

---

## 13. Financial Model Templates

### 13.1 Recommended Tools

| Tool | Cost | Best For |
|------|------|----------|
| NREL System Advisor Model (SAM) | Free | Initial feasibility, US-based but adaptable |
| PVsyst | $600-1,500/year | Detailed yield simulation |
| Excel/Google Sheets | Free | Custom financial modeling |
| Homer Energy | $100-500/year | Hybrid systems (solar + BESS + diesel) |
| RETScreen | Free | Government-funded projects |

### 13.2 Key Model Assumptions for Thailand

```
Location-Specific:
  GHI (Global Horizontal Irradiance):
    Bangkok:          1,650 kWh/m²/year
    Korat/Isan:       1,750 kWh/m²/year
    Chiang Mai:       1,600 kWh/m²/year
    Southern Thailand: 1,550 kWh/m²/year
    Islands:          1,700-1,800 kWh/m²/year

  Specific Yield:
    Ground-mount:     1,400-1,600 kWh/kWp/year
    Rooftop:          1,300-1,500 kWh/kWp/year
    Floating:         1,450-1,650 kWh/kWp/year (cooling benefit)

System Parameters:
  DC/AC ratio:        1.15-1.30 (oversizing common)
  System losses:      14-18% total
    Soiling:          2-4% (tropical climate)
    Temperature:      5-8% (high ambient temp)
    Wiring/mismatch:  2-3%
    Inverter:         2-3%
    Transformer:      1-2%

Financial Parameters:
  Inflation:          2-3% (Bank of Thailand target: 1-3%)
  THB/USD:            33-37 (volatile)
  Corporate tax:      20% (standard)
  Withholding tax:    10% on interest (non-resident)
  VAT:                7% (on equipment purchase)
```

### 13.3 Simplified Financial Model (5 MW FiT)

```
Year    Gen(MWh)  Revenue   OPEX     EBITDA    DebtSvc   Tax    FCFE
────────────────────────────────────────────────────────────────────
  1     8,760     19.71M    3.00M    16.71M    8.20M     0      8.51M
  2     8,716     19.61M    3.06M    16.55M    8.20M     0      8.35M
  3     8,672     19.51M    3.12M    16.39M    8.20M     0      8.19M
  4     8,629     19.42M    3.18M    16.23M    8.20M     0      8.03M
  5     8,586     19.32M    3.25M    16.07M    8.20M     0      7.87M
  ...
  10    8,370     18.83M    3.58M    15.25M    8.20M     0      7.05M
  ...
  15    8,163     18.37M    3.96M    14.41M    8.20M     1.24M  4.97M
  ...
  20    7,961     17.91M    4.37M    13.54M    0         2.71M  10.83M
  ...
  25    7,764     17.47M    4.82M    12.65M    0         2.53M  10.12M

Note: Revenue = Gen × ฿2,250; OPEX +2%/yr; Debt 70% @ 5% 15yr; 
      Tax 0% Yr1-8 (BOI), 20% Yr9+; Degradation 0.5%/yr
```

---

## Key Takeaways for Copenhagen Solar Project

1. **Community Solar FiT (฿2.25/kWh)** provides the lowest risk model with 25-year government PPA, but returns are moderate (9-12% equity IRR). Best for debt-financed conservative approach.

2. **Private PPA (฿4.50-5.00/kWh)** offers ~2x revenue and significantly higher returns (15-20%+ equity IRR), but requires creditworthy corporate offtakers and carries higher risk.

3. **Blended approach** may be optimal: secure FiT PPA for base project, pursue private PPA for expansion or rooftop additions.

4. **Financing is accessible:** Thai commercial banks, EXIM, and international DFIs (ADB, IFC) all actively lending to solar projects. Green bonds provide refinancing path.

5. **BOI 8-year tax holiday** is a game-changer for early returns. Structure projects to maximize revenue during the tax-exempt period.

6. **Carbon credits** provide supplementary revenue (1-5% of total) but are growing. Thailand's planned carbon tax and VCM by 2027 may increase credit values.

7. **CAPEX is declining** — solar LCOE at THB 1.50-2.00/kWh makes both FiT and private PPA models increasingly profitable.

8. **Key risks:** Grid connection delays, regulatory changes, FX exposure (if foreign-funded), community opposition for ground-mount projects.

---

## Sources & References

1. Krungsri Research, "Renewable Energy 2026-2028 Industry Outlook" (2025)
2. Watson Farley & Williams, "Thailand's 5 GW Renewable PPA FIT Scheme 2022-2030" (2023)
3. Hunton Andrews Kurth, "Thailand Launches Community Solar Power Initiative" (Nov 2025)
4. PV Magazine, "Thailand develops solar plan for community power supply" (Nov 2025)
5. Energy Tracker Asia, "Solar Energy Thailand" (2025)
6. Ember Energy, "Thailand's Cost-Optimal Pathway to a Sustainable Economy" (2025)
7. CASE/Agora Energiewende, "Unlocking Solar Rooftop in Thailand" (2024-2025)
8. IFC Press Release, "Green Loan to Boost Renewable Energy in Thailand" (2024)
9. ADB Project 52292-001, B.Grimm Green Bond (2018)
10. ADB News, "ADB-GRE $350M Deal for Thailand Green Energy" (Feb 2026)
11. TSE Opp Day Presentation YE2024 (Mar 2025)
12. Super Energy Corporation Opp Day Presentation (2023-2024)
13. Nation Thailand, "Thailand carbon credit market" (2025)
14. Solar Quarter, "Thailand to Launch Voluntary Carbon Trading in 2027" (Mar 2025)
15. GovSiam, "Thailand Approves Direct PPAs for Renewable Energy" (2025)
16. BOI/LexNova Partners, "BOI Incentives for Renewable Energy Thailand" (2025)
17. Baker McKenzie, "Thailand Green Finance" (2025)
18. GuruFocus, TSE WACC and financial data (2025)
19. IEA via PV Magazine India, "Cost of Capital for Solar in Southeast Asia" (2025)
20. OECD, "Clean Energy Finance and Investment Roadmap of Thailand" (2024)
