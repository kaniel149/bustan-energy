# 08 — Battery Energy Storage Systems (BESS) in Thailand

> Research Document for Copenhagen Solar Project
> Last Updated: March 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Policy & Regulatory Framework](#policy--regulatory-framework)
3. [PDP 2024 Targets & Roadmap](#pdp-2024-targets--roadmap)
4. [BESS Sizing for Solar Farms](#bess-sizing-for-solar-farms)
5. [Revenue Streams](#revenue-streams)
6. [Battery Chemistry: LFP vs NMC for Tropical Climates](#battery-chemistry-lfp-vs-nmc-for-tropical-climates)
7. [Thermal Management in Thailand](#thermal-management-in-thailand)
8. [Major Thai BESS Projects](#major-thai-bess-projects)
9. [BESS EPC Companies in Thailand](#bess-epc-companies-in-thailand)
10. [BESS Manufacturing in Thailand](#bess-manufacturing-in-thailand)
11. [Fire Safety & Standards](#fire-safety--standards)
12. [Cost Analysis](#cost-analysis)
13. [Degradation & Lifecycle](#degradation--lifecycle)
14. [Battery Recycling & End-of-Life](#battery-recycling--end-of-life)
15. [Recommendations for Copenhagen Solar](#recommendations-for-copenhagen-solar)
16. [Sources](#sources)

---

## Executive Summary

Thailand is positioning itself as a regional leader in battery energy storage, driven by
ambitious renewable energy targets under the Power Development Plan 2024 (PDP 2024).
The plan targets approximately **10 GW / 10.5 GWh of BESS capacity by 2037**, alongside
36 GW of solar PV, to achieve 51% renewable electricity generation. However, current
deployment lags significantly — as of 2022, only 24 BESS projects totaling 994 MW had
been approved, all co-located with solar operations.

The market is accelerating rapidly. In November 2024, the ADB and Gulf Energy signed an
$820 million loan for 12 renewable projects including solar+BESS installations. Major
players like GPSC, Banpu NEXT, and Gulf Energy are investing heavily in both BESS
deployment and domestic battery manufacturing.

For the Copenhagen Solar project, BESS integration represents both a technical necessity
(for grid compliance and PPA firmness) and a commercial opportunity (through peak shaving,
arbitrage, and ancillary services). LFP chemistry is strongly recommended for Thailand's
tropical climate due to superior thermal stability, longer cycle life, and lower fire risk.

---

## Policy & Regulatory Framework

### National Energy Policy

Thailand's energy storage policy is governed by several overlapping frameworks:

- **Power Development Plan 2024 (PDP 2024)**: Draft released June 2024, covering
  2024-2037. Positions BESS as critical infrastructure for renewable integration.
  Targets 51% renewable electricity (up from 36% in prior plan).

- **Energy Policy and Planning Office (EPPO) Action Plan (2023)**: Launched a dedicated
  BESS promotion plan covering four pillars:
  1. Production and manufacturing
  2. Usage and deployment
  3. Laws, standards, and regulations
  4. Research and development

- **S-Curve Industry Designation**: BESS manufacturing designated as an "S-Curve"
  industry, eligible for enhanced BOI (Board of Investment) incentives and tax benefits.

- **Energy Regulatory Commission (ERC)**: Developing frameworks for direct renewable
  PPAs, including provisions for BESS-backed power delivery (e.g., for data centers).

### Key Regulatory Bodies

| Organization | Role in BESS |
|---|---|
| **EPPO** (Energy Policy and Planning Office) | Policy formulation, PDP development |
| **ERC** (Energy Regulatory Commission) | Licensing, tariff regulation, PPA frameworks |
| **EGAT** (Electricity Generating Authority of Thailand) | Grid operator, BESS procurement, system planning |
| **BOI** (Board of Investment) | Investment incentives, tax holidays |
| **DPIM** (Dept. of Primary Industries & Mines) | Battery recycling, raw material sourcing |

### Feed-in Tariff (FiT) for Solar + BESS

The FiT program launched in 2022 targets procurement of up to **5 GW** from utility-scale
solar + BESS projects. Key features:

- Non-firm PPAs of 20-25 years duration
- FiT rates designed to incentivize storage co-location
- Semi-firm PPA structure for projects with BESS (higher rates for dispatchable power)
- 24 initial BESS projects (994 MW) approved in 2022 alongside solar

### Direct PPA Framework

The ERC has drafted regulations enabling direct renewable PPAs:

- Up to 2 GW allocated for direct PPAs
- Primarily targeting data centers and large industrial consumers
- BESS integration encouraged for reliable power delivery
- Expected to drive additional storage deployment beyond FiT allocations

---

## PDP 2024 Targets & Roadmap

### Headline Numbers

| Metric | Target by 2037 |
|---|---|
| Total BESS capacity | ~10 GW / 10.5 GWh |
| New renewable capacity | ~35,000 MW |
| New solar PV | ~18 GW (including 10 GW new) |
| Renewable share of electricity | 51% |
| Carbon neutrality target | 2050 |
| Net-zero emissions target | 2065 |

### Phased BESS Roadmap

The GET Transform / GIZ advisory recommends a phased approach aligned with PDP 2024:

**Phase 1: Foundation (2024-2027)**
- Pilot projects to build technical capacity
- Establish regulatory frameworks and grid codes
- Develop safety standards and permitting processes
- Target: ~1-2 GW BESS operational

**Phase 2: Scale-Up (2027-2032)**
- Expand VRE integration support
- Deploy centrally dispatched BESS for grid services
- Hybrid solar PV + BESS at scale
- Target: ~4-6 GW BESS operational

**Phase 3: Full Integration (2032-2037)**
- Complete 10 GW deployment
- Advanced grid services (frequency regulation, black start)
- Market-based revenue mechanisms for BESS
- Full renewable-storage optimization

### Expert Critiques

Independent analyses (Ember, International Rivers) note:

- **10 GW may be insufficient**: Experts estimate 3-4x more BESS needed for true
  carbon neutrality and net-zero achievement
- **Heavy gas reliance**: PDP 2024 still plans 6.3 GW of new gas plants (41% mix by
  2037), despite lower LCOE for solar+storage
- **Cost savings potential**: Ember estimates adding solar+battery beyond PDP targets
  could save **$1.8 billion in generation costs** between 2026-2037
- **4 GW by 2030**: Minimum BESS needed by 2030 for system adequacy, according to
  independent modeling

---

## BESS Sizing for Solar Farms

### General Sizing Principles

For a utility-scale solar farm in Thailand, BESS sizing depends on:

1. **PPA requirements** (firm vs. semi-firm vs. non-firm)
2. **Grid connection constraints**
3. **Revenue optimization strategy**
4. **Available land and budget**

### Typical Sizing Ratios

| Configuration | Storage Duration | Ratio (BESS:Solar) | Use Case |
|---|---|---|---|
| Peak shifting only | 2 hours | 0.2-0.3:1 | Basic PPA compliance |
| Semi-firm PPA | 4 hours | 0.4-0.5:1 | Enhanced reliability |
| Firm power delivery | 4-6 hours | 0.6-0.8:1 | Baseload-like output |
| Full arbitrage + grid services | 4+ hours | 0.5-1.0:1 | Maximum revenue |

### Sizing Example: 50 MW Solar Farm

For a hypothetical 50 MW solar farm in Central Thailand:

- **Minimum (semi-firm PPA)**: 25 MW / 100 MWh (4-hour, 0.5:1 ratio)
- **Recommended**: 30 MW / 120 MWh (4-hour, 0.6:1 ratio)
- **Premium (firm power)**: 40 MW / 160 MWh (4-hour, 0.8:1 ratio)

### Thailand-Specific Considerations

- **Solar irradiance pattern**: Peak generation 10:00-14:00; storage enables dispatch
  during evening peak demand (18:00-22:00)
- **Monsoon season**: June-October reduces generation; BESS helps maintain contractual
  delivery obligations
- **Grid curtailment risk**: Growing solar penetration may lead to midday curtailment;
  BESS absorbs excess generation
- **EGAT dispatch requirements**: Semi-firm PPAs require minimum dispatch hours;
  BESS provides operational flexibility

---

## Revenue Streams

### 1. Energy Arbitrage

Buy/store cheap midday solar energy, sell during evening peak:

- **Thai peak tariff differential**: Approximately 1.5-3.0 THB/kWh spread between
  off-peak and peak periods
- **Revenue potential**: 500-1,500 THB/MWh per cycle
- **Cycles**: 250-300 viable cycles per year
- **Constraint**: Requires time-of-use tariff exposure or merchant market access

### 2. Peak Shaving / Demand Charge Reduction

For industrial consumers with BESS behind the meter:

- **Demand charge savings**: Reduce maximum demand by 20-40%
- **Thai industrial tariff structure**: Demand charges of 132-221 THB/kW/month
- **Payback**: 4-7 years depending on load profile
- **Relevance**: Industrial parks, factories, commercial buildings

### 3. PPA Firming / Capacity Value

Enhance PPA value by providing dispatchable renewable energy:

- **Semi-firm premium**: 0.15-0.30 THB/kWh above non-firm solar FiT
- **Firm power premium**: 0.30-0.60 THB/kWh above non-firm rates
- **EGAT procurement**: Priority dispatch for firm renewable power
- **Long-term value**: Increasing as grid renewable penetration grows

### 4. Frequency Regulation (Ancillary Services)

Provide fast-response frequency control to EGAT:

- **Primary frequency response**: Sub-second response capability
- **Secondary frequency regulation**: Automatic generation control (AGC)
- **Revenue**: Market under development in Thailand; ~$5-15/kW-year in
  comparable ASEAN markets
- **Status**: EGAT developing ancillary services framework; expected to
  launch 2026-2028

### 5. Renewable Energy Certificate (REC) Enhancement

- BESS-backed renewable energy may command premium REC pricing
- Growing corporate demand (data centers, manufacturing) for 24/7 clean energy
- I-REC market in Thailand increasingly active

### 6. Grid Services (Future)

Emerging revenue streams as market develops:

- **Voltage support**: Reactive power compensation
- **Black start capability**: Grid restoration after outages
- **Transmission deferral**: Delay costly grid infrastructure upgrades
- **Spinning reserve**: Fast-response backup capacity

### Revenue Stack Example (50 MW / 200 MWh System)

| Revenue Stream | Annual Revenue (THB M) | % of Total |
|---|---|---|
| Energy arbitrage | 35-55 | 30-35% |
| PPA firming premium | 25-40 | 20-25% |
| Peak demand reduction | 15-25 | 12-16% |
| Frequency regulation | 10-20 | 8-13% |
| REC premium | 5-10 | 4-6% |
| Capacity payments | 10-20 | 8-13% |
| **Total** | **100-170** | **100%** |

---

## Battery Chemistry: LFP vs NMC for Tropical Climates

### Overview

For BESS deployment in Thailand's tropical climate (average 25-35°C, peaks above 40°C),
battery chemistry selection is a critical design decision. The two dominant chemistries
are Lithium Iron Phosphate (LFP) and Nickel Manganese Cobalt (NMC).

### Comparative Analysis

| Parameter | LFP (LiFePO₄) | NMC (LiNiMnCoO₂) |
|---|---|---|
| **Energy density** | 90-160 Wh/kg | 150-220 Wh/kg |
| **Cycle life** | 3,000-6,000+ cycles | 1,000-2,000 cycles |
| **Calendar life** | 15-20 years | 10-15 years |
| **Thermal runaway onset** | 270-300°C | 150-210°C |
| **Heat tolerance** | Stable up to 45°C | Degrades faster above 35°C |
| **Optimal operating temp** | 15-35°C | 15-30°C |
| **Safe SOC range** | 10-100% | 20-80% |
| **Cost (2025)** | $70-110/kWh (cell) | $90-140/kWh (cell) |
| **Cobalt content** | None | Contains cobalt |
| **Fire risk** | Low | Moderate-High |
| **Self-discharge** | 1-3% per month | 2-5% per month |
| **Round-trip efficiency** | 92-96% | 93-97% |
| **Footprint (per MWh)** | Larger | Smaller |

### Why LFP is Superior for Thailand

**1. Thermal Stability**
- LFP's iron phosphate cathode resists heat stress and calendar aging
- Maintains capacity above 80% significantly longer in hot conditions
- NMC degrades faster from SEI (Solid Electrolyte Interphase) growth and
  internal resistance rise above 35°C
- Thailand's ambient temperatures routinely exceed NMC's comfort zone

**2. Fire Safety**
- LFP thermal runaway onset at 270-300°C vs. NMC at 150-210°C
- LFP releases less energy during thermal runaway events
- Critical advantage for outdoor installations in Thailand's heat
- Simpler fire suppression systems reduce costs

**3. Cycle Life**
- LFP achieves 3,000-6,000+ full cycles vs. NMC's 1,000-2,000
- In daily cycling applications (solar arbitrage), LFP lasts 10-15+ years
  vs. NMC's 5-8 years before capacity replacement
- Lower total cost of ownership (TCO) despite similar or lower upfront cost

**4. SOC Flexibility**
- LFP can safely operate at 90-100% SOC daily
- NMC should be limited to 20-80% SOC in hot climates
- This means a 100 MWh NMC system only delivers ~60 MWh usable vs.
  ~90 MWh from LFP

**5. Cost Advantage (2025)**
- LFP cell costs have dropped to $70-75/kWh from Chinese manufacturers
- NMC remains $90-140/kWh at cell level
- No cobalt = lower supply chain risk and ethical concerns

### When NMC Might Be Considered

- **Space-constrained urban sites**: Higher energy density in smaller footprint
- **Cold climate applications**: Better low-temperature performance (not relevant for Thailand)
- **Short-duration, high-power applications**: Better C-rate capability

### Recommendation

**LFP is the clear choice for utility-scale BESS in Thailand.** The combination of
superior thermal performance, longer cycle life, lower fire risk, wider SOC operating
range, and decreasing costs make it the dominant chemistry for tropical stationary
storage applications. All major Thai BESS projects are trending toward LFP.

---

## Thermal Management in Thailand

### Climate Challenge

Thailand's tropical climate presents specific challenges for BESS:

| Parameter | Thailand Typical Values |
|---|---|
| Average annual temperature | 26-28°C |
| Hot season peaks (Mar-May) | 38-42°C |
| Humidity | 60-80% (higher in monsoon) |
| Solar radiation on enclosures | Significant radiant heat load |
| Dust / particulate | Moderate to high in agricultural areas |

### Thermal Management Systems (BTMS)

**Liquid Cooling (Recommended for Thailand)**
- Active liquid cooling loops with glycol-water mixture
- Maintains cell temperature at 20-30°C regardless of ambient
- Temperature uniformity within ±2-3°C across battery pack
- Enables higher charge/discharge rates without thermal throttling
- Higher CAPEX but significantly better performance and longevity

**Air Cooling**
- Forced-air with HVAC units in containerized systems
- Adequate for mild climates but struggles above 35°C ambient
- Higher parasitic energy consumption in Thailand's heat
- Temperature spread of ±5-8°C across pack
- Lower CAPEX but reduced battery life and performance

**Hybrid Systems**
- Primary liquid cooling with supplementary air handling
- Optimized for humidity control (critical for electronics)
- Emerging as best practice for tropical deployments

### Design Recommendations for Thailand

1. **Liquid-cooled LFP systems** as baseline specification
2. **Containerized solutions** with insulated enclosures (reflective exterior coating)
3. **Elevated mounting** for natural airflow underneath containers
4. **Shade structures** where feasible to reduce radiant heat load
5. **Dehumidification** integrated into HVAC to protect electronics
6. **Redundant cooling** — N+1 cooling units for reliability
7. **Smart BMS** with temperature-adaptive charging curves:
   - Reduce charge rate above 35°C
   - Pre-conditioning before high-demand periods
   - Temperature-compensated SOC limits
8. **Monsoon protection**: IP65+ rated enclosures, proper drainage, flood elevation

### Parasitic Load Considerations

In Thailand's climate, BESS thermal management parasitic load is significant:

- **Liquid cooling**: 2-4% of BESS energy throughput
- **Air cooling**: 5-8% of BESS energy throughput
- **Impact on round-trip efficiency**: Reduces effective RTE by 2-5%
- **Design mitigation**: Night pre-cooling, thermal mass utilization, smart scheduling

---

## Major Thai BESS Projects

### 1. Gulf Energy — ADB Solar + BESS Portfolio

- **Capacity**: 256 MW solar + 396 MWh BESS (4 projects)
- **Additional**: 393 MW solar-only (8 projects)
- **Financing**: $820 million ADB-led loan (signed November 2024)
  - $260 million from ADB ordinary capital
  - $529 million from AIIB, DEG, KEXIM, Ex-Im Bank of China
  - $31.35 million Clean Technology Fund concessional finance
- **Status**: Under development, expected operational 2026-2027
- **Significance**: Largest single BESS financing in Thailand

### 2. Gulf Energy — ADB Phase 2

- **Capacity**: 126 MW solar + 151 MWh BESS (2 projects in Suphanburi and Phetchaburi)
  plus 68 MW solar-only
- **Financing**: $350 million ADB-led loan (approved February 2026)
- **Jobs**: 1,500+ construction jobs expected
- **Status**: Under development

### 3. Gulf Renewable Energy Total Portfolio

- **Total capacity**: 843 MW across 15 solar/solar-BESS projects
- **Operational**: 649 MW already operational
- **Under development**: 194 MW slated for 2026
- **Total financing**: THB 60 billion (~$1.92 billion) for 27 renewable projects

### 4. GPSC G-Cell / G-Box — Map Ta Phut, Rayong

- **Type**: BESS manufacturing + deployment
- **Technology**: SemiSolid battery (licensed from 24M Technologies, USA)
- **Chemistry**: LFP
- **Current capacity**: 30 MWh/year production
- **Planned expansion**: 1 GWh manufacturing facility
- **Investment**: 1.1 billion THB for initial plant
- **Products**: G-Cell (pouch cells), G-Pack (modules), G-Box (10-1,000 kWh ESS)
- **Deployed**: 150 kWh G-Box with PTT OR (2021), 1.5 MWh ESS with PTT Global Chemical (2020)
- **Significance**: First SemiSolid battery production in Southeast Asia

### 5. EGAT 24 BESS Projects (2022 FiT Round)

- **Total capacity**: 994 MW across 24 projects
- **Type**: All co-located with solar PV installations
- **PPA structure**: Semi-firm, 20-25 year terms
- **Status**: Various stages of development and commissioning
- **Significance**: First large-scale BESS procurement in Thailand

### 6. Wenergy + TCE — Chiang Mai

- **Type**: BESS demonstration project
- **Partners**: Wenergy (international technology), TCE (local EPC)
- **Scope**: Consulting, design, equipment installation, grid connection
- **Focus**: Climate adaptation for Northern Thailand conditions
- **Significance**: Proving ground for BESS in non-central grid areas

### 7. Banpu NEXT / Durapower — Various

- **Manufacturing**: DP NEXT plant in AMATA City Chonburi Industrial Estate
- **Capacity**: 15,000+ battery packs/year, expanding to 1 GWh
- **Chemistries**: NMC and LFP
- **Applications**: ESS, EVs, commercial vehicles
- **BESS equity capacity**: 1,130 MWh (H1/2025, mostly international)
- **Total manufacturing**: 3.2 GWh by Q3/2025

---

## BESS EPC Companies in Thailand

### Tier 1: Major Thai EPC Firms

| Company | Specialization | Notable Projects |
|---|---|---|
| **TCE** | Electrical engineering, BESS consulting/design | Wenergy Chiang Mai BESS |
| **ITL Engineering** | Large-scale BESS solutions, ESS development | Commercial ESS projects |
| **AAE Engineering** | Solar & BESS EPC, utility-scale | Utility-scale solar+BESS |
| **EGAT Smart Energy Solutions** | Design, installation, maintenance | Government/utility BESS |

### Tier 2: International EPC with Thai Operations

| Company | Origin | Focus |
|---|---|---|
| **Sungrow** | China | BESS systems, inverters |
| **BYD** | China | LFP battery systems, containerized BESS |
| **Huawei FusionSolar** | China | Smart string ESS, integrated solutions |
| **Tesla / Megapack** | USA | Utility-scale BESS (limited Thai presence) |
| **Fluence (Siemens/AES)** | USA/Germany | Grid-scale BESS, software |
| **Samsung SDI** | Korea | NMC battery systems |
| **CATL** | China | LFP/NMC cells, system integration |

### Tier 3: Specialist / Emerging

| Company | Focus |
|---|---|
| **Wenergy** | BESS technology, international partnership |
| **Banpu NEXT / Durapower** | Battery manufacturing + ESS deployment |
| **GPSC** | SemiSolid battery manufacturing + ESS |
| **Jabil / Inno** | BESS enclosure manufacturing (new facility) |

### EPC Selection Criteria for Thailand

1. **Local track record** with Thai grid codes and EGAT requirements
2. **Climate experience** — proven deployment in tropical environments
3. **Warranty terms** — minimum 10-year performance warranty
4. **Service network** in Thailand for ongoing O&M
5. **Battery sourcing** — preference for Tier 1 cell manufacturers
6. **BMS sophistication** — temperature-adaptive algorithms essential
7. **Safety certifications** — IEC 62619, UL 9540, NFPA 855 compliance

---

## BESS Manufacturing in Thailand

### Domestic Production

Thailand is developing domestic BESS manufacturing capability:

**GPSC G-Cell Plant (Rayong)**
- Southeast Asia's first SemiSolid battery plant
- 30 MWh/year current, expanding to 1 GWh
- LFP chemistry, licensed from 24M Technologies
- THB 1.1 billion investment

**Banpu NEXT / Durapower (Chonburi)**
- DP NEXT assembly plant in AMATA City
- 15,000+ packs/year, expanding to 1 GWh
- NMC and LFP chemistries
- Semi-automated production line

**Jabil / Inno (Planned)**
- New facility for BESS enclosure production
- Targeting containerized BESS housings
- Supports growing domestic assembly

### BOI Incentives for BESS Manufacturing

- Tax holidays of up to 8 years for advanced battery manufacturing
- Import duty exemptions on machinery and raw materials
- Land ownership rights in designated industrial zones
- S-Curve industry designation provides enhanced benefits
- Additional incentives for R&D investment

---

## Fire Safety & Standards

### Applicable Standards

| Standard | Description | Application |
|---|---|---|
| **IEC 62619** | Safety for secondary lithium cells in industrial applications | Cell/module safety |
| **UL 9540** | Energy storage systems and equipment | System-level safety |
| **UL 9540A** | Test method for evaluating thermal runaway fire propagation | Thermal runaway testing |
| **NFPA 855** | Standard for installation of ESS | Installation requirements |
| **IEC 62933** | Electrical energy storage systems | System design/operation |
| **Thai Building Code** | Local fire and building regulations | Permitting |
| **DIW Factory Standards** | Department of Industrial Works requirements | Industrial permits |

### Fire Risk Factors in Thailand

1. **High ambient temperature**: Increases thermal stress on cells
2. **Humidity**: Can cause corrosion and short circuits if ingress occurs
3. **Solar radiation**: Radiant heat on containers adds thermal load
4. **Lightning**: Thailand has high lightning strike frequency
5. **Flooding**: Monsoon flooding risk in some regions
6. **Wildlife**: Rodent and insect damage to wiring

### Fire Safety Design Requirements

**Prevention**
- LFP chemistry selection (inherently safer)
- Cell-level thermal fuses and current interrupt devices
- Module-level isolation and firewall barriers
- Rack-level gas detection (off-gas monitoring)
- Container-level smoke and heat detection
- BMS with cell-level temperature monitoring
- Proper ventilation design for gas evacuation

**Suppression**
- Clean agent fire suppression (Novec 1230 or similar)
- Water mist systems for container-level protection
- External deluge system for container exterior
- Automatic activation with manual override
- Sufficient agent quantity for re-flash protection

**Containment**
- Fire-rated container walls (minimum 2-hour rating)
- Blast relief panels for pressure events
- Secondary containment for liquid electrolyte
- Minimum spacing between containers (3-6 meters)
- Firebreak zones around BESS installations

**Emergency Response**
- Fire response plan specific to lithium battery fires
- Coordination with local fire department
- Specialized training for on-site personnel
- Emergency shutdown procedures
- Post-incident water management (contaminated runoff)

### Insurance Considerations

- BESS fire history globally has impacted insurance availability
- LFP systems generally receive more favorable insurance terms
- UL 9540A testing results often required by insurers
- Comprehensive fire safety design reduces premiums
- Recommended: Engage insurance broker early in design phase

---

## Cost Analysis

### Global BESS Cost Trends (2024-2025)

Battery storage costs have declined dramatically:

| Component | 2023 | 2024 | 2025 (Est.) |
|---|---|---|---|
| LFP cell (China) | $95-120/kWh | $80-100/kWh | $70-75/kWh |
| LFP cell (non-China) | $110-140/kWh | $95-120/kWh | $85-100/kWh |
| Battery module | $120-160/kWh | $100-130/kWh | $85-110/kWh |
| Full system (turnkey) | $250-400/kWh | $180-300/kWh | $150-250/kWh |
| LCOS (4-hour system) | $100-150/MWh | $80-120/MWh | $65-100/MWh |

### Thailand-Specific Cost Considerations

**CAPEX Components for 100 MWh System in Thailand**

| Component | Cost Range (USD) | % of Total |
|---|---|---|
| Battery cells + modules | $8-11M | 40-50% |
| Power conversion system (PCS) | $2-3.5M | 12-16% |
| Balance of system (BOS) | $1.5-2.5M | 8-12% |
| EPC / construction | $2-3M | 10-14% |
| Grid connection | $1-2M | 5-9% |
| Engineering / design | $0.5-1M | 3-5% |
| Commissioning / testing | $0.3-0.5M | 1.5-2.5% |
| Land and foundations | $0.5-1M | 3-5% |
| Contingency (10%) | $1.5-2.5M | 8-11% |
| **Total** | **$18-27M** | **$180-270/kWh** |

### OPEX Estimates

| Item | Annual Cost |
|---|---|
| O&M (including monitoring) | $3-6/kWh/year |
| Insurance | $1-2/kWh/year |
| Land lease | Project-specific |
| Grid charges | Tariff-dependent |
| Battery augmentation (year 10+) | $20-40/kWh |
| **Total OPEX** | **$5-10/kWh/year** |

### LCOE / LCOS Comparison

For a 4-hour duration BESS in Thailand (2025):

- **Levelized Cost of Storage (LCOS)**: $65-100/MWh
- **Solar + BESS LCOE**: $55-80/MWh (increasingly competitive with gas peakers)
- **Thai gas peaker LCOE**: $80-120/MWh
- **Implication**: Solar + BESS is at or below cost parity with new gas generation

---

## Degradation & Lifecycle

### LFP Degradation Profile

**Capacity Fade**
- Year 1-5: ~1.5-2% annual capacity loss
- Year 5-10: ~1-1.5% annual capacity loss
- Year 10-15: ~0.8-1% annual capacity loss
- End of warranty (typically Year 15): 70-80% remaining capacity
- Total useful life: 15-25 years depending on usage pattern

**Factors Accelerating Degradation in Thailand**
- High ambient temperature (partially mitigated by cooling)
- Deep cycling (daily arbitrage cycles)
- High C-rate charging/discharging
- Extended time at high SOC
- Humidity-induced BMS component aging

**Degradation Mitigation Strategies**
1. Liquid cooling to maintain 20-30°C cell temperature
2. SOC management: Avoid prolonged 100% or 0% states
3. Temperature-compensated charging algorithms
4. Capacity augmentation at year 8-10 (add cells to maintain nameplate)
5. Regular BMS calibration and diagnostics

### Warranty Structures

Typical utility-scale BESS warranties in Thailand:

| Warranty Term | Industry Standard |
|---|---|
| Capacity guarantee | 70-80% at end of warranty |
| Warranty duration | 10-15 years |
| Cycle limit | 3,500-5,000 equivalent full cycles |
| Annual throughput limit | 365 full cycles/year |
| Temperature conditions | Must maintain within spec |
| Response time for defects | 24-72 hours |

### Augmentation Strategy

To maintain nameplate capacity over 20+ year PPA term:

- **Year 0**: Install 100% capacity
- **Year 8-10**: Add 15-25% capacity (augmentation)
- **Year 15-18**: Second augmentation or full replacement
- **Budget**: Include $20-40/kWh augmentation cost in financial model
- **Benefit**: By augmentation time, cell costs will be significantly lower

---

## Battery Recycling & End-of-Life

### Current Status in Thailand

Thailand currently **lacks comprehensive national regulations** specifically mandating
BESS or lithium battery recycling. The regulatory landscape includes:

**Existing Frameworks**
- No dedicated lithium-ion battery recycling legislation
- Hazardous waste regulations apply generally but not specifically to LIBs
- Solar panel waste typically landfilled due to absent recycling processes
- Lead-acid battery recycling is well-established (nearly 100% recyclable)

**Industry Initiatives**
- **Toyota Chachoengsao Plant**: Operates 3R scheme (rebuild, reuse, recycle) for
  spent batteries from multiple brands and EV devices
- **Panasonic / 7-Eleven**: Consumer dry battery collection and recycling via retail
  networks (launched March 2024)
- **DPIM**: Developing EV battery prototypes from recycled domestic materials

**Government Direction**
- BOI EV 3.5 Policy includes incentives for advanced recycling technologies
- Black Mass recovery for lithium, cobalt, and nickel
- Degraded EV batteries (70-80% capacity) repurposed as energy storage before recycling
- Thailand positioning as ASEAN hub for EV battery recycling

### Second-Life Applications

Before recycling, degraded BESS batteries can serve second-life applications:

1. **Behind-the-meter storage** for commercial buildings
2. **Telecom tower backup power**
3. **EV charging station buffer storage**
4. **Off-grid / island microgrid storage**
5. **Agricultural pump power storage**

### Recycling Challenges

- Limited domestic recycling infrastructure for lithium-ion
- Transport regulations for spent batteries unclear
- Economic viability depends on metal prices (lithium, cobalt, nickel)
- LFP recycling is less economically attractive than NMC (no cobalt/nickel)
- Need for policy support, advanced technologies, and viable business models

### Recommendations

1. Include end-of-life management in project CAPEX/OPEX projections
2. Budget $5-15/kWh for decommissioning and recycling costs
3. Structure contracts with battery suppliers to include take-back obligations
4. Monitor regulatory developments — mandatory recycling rules expected 2027-2030
5. Explore second-life revenue opportunities to offset recycling costs

---

## Recommendations for Copenhagen Solar

### Chemistry Selection
- **Use LFP exclusively** — optimal for Thailand's climate, cost-effective,
  safer, and longer-lasting

### Sizing
- **Minimum 4-hour duration** for semi-firm PPA qualification
- **0.5-0.6:1 BESS-to-solar ratio** for optimal revenue/cost balance
- Include 10-15% overbuild to account for degradation in early years

### Thermal Management
- **Liquid-cooled containerized systems** — non-negotiable for Thailand
- Specify maximum cell temperature deviation of ±3°C
- Include dehumidification in container HVAC design
- Plan for 3-5% parasitic load from cooling systems

### EPC Selection
- Prefer EPC firms with Thai grid integration experience
- Require UL 9540A test results for proposed battery systems
- Include 15-year performance warranty with augmentation provisions
- Ensure local O&M capability within 100 km of site

### Financial Planning
- Budget **$180-250/kWh** for turnkey 4-hour BESS (2026 pricing)
- Model **1.5% annual degradation** for conservative financial projections
- Include **augmentation costs** at year 8-10 in CAPEX planning
- Target **$65-90/MWh LCOS** for competitive positioning

### Revenue Strategy
- Primary: PPA firming and energy arbitrage
- Secondary: Frequency regulation (as market develops)
- Tertiary: REC premium and capacity payments
- Optimize dispatch with AI/ML-based battery management software

### Risk Mitigation
- Comprehensive fire safety design per NFPA 855
- Insurance engagement early in project development
- Battery supplier diversification (at least 2 qualified suppliers)
- Contractual take-back obligations for end-of-life management

---

## Sources

1. Asian Insiders — "Thailand Battery Energy Storage Systems Future" (July 2024)
   https://asianinsiders.com/2024/07/16/thailand-battery-energy-storage-systems-future/

2. GET Transform / GIZ — "Driving Thailand's Power System Transformation: Unlocking
   the Potential of BESS" (2024)
   https://www.get-transform.eu/driving-thailands-power-system-transformation-unlocking-the-potential-of-bess/

3. Ember — "Adding Solar and Battery Capacity Beyond Existing Targets Can Help
   Thailand Save $1.8 Billion" (2025)
   https://ember-energy.org/latest-updates/adding-solar-and-battery-capacity-beyond-existing-targets-can-help-thailand-save-1-8-billion/

4. ADB — "ADB, Gulf Sign $820 Million Loan to Scale Up Solar and Battery Storage
   in Thailand" (November 2024)
   https://www.adb.org/news/adb-gulf-sign-820-million-loan-scale-solar-and-battery-storage-thailand

5. ADB — "ADB, GRE Sign $350 Million Deal to Accelerate Thailand Green Energy
   Transition" (February 2026)
   https://www.adb.org/news/adb-gre-sign-350-million-deal-accelerate-thailand-green-energy-transition

6. GPSC — "GPSC Unveiled G-Cell: First Made in Thailand Semi-Solid Battery Cells"
   https://www.gpscgroup.com/en/investor-relations/news/press-release/318/

7. Nation Thailand — "GPSC Opens SemiSolid Battery Plant in Rayong"
   https://www.nationthailand.com/pr-news/business/40003654

8. Banpu NEXT — "DP NEXT Battery Assembly Plant"
   https://www.banpunext.co.th/dpnextbatteryassemblyplant-en/

9. Watson Farley & Williams — "Thailand Powers Up: New Renewable Energy Incentives
   and Opportunities in 2024"
   https://www.wfw.com/articles/thailand-powers-up-new-renewable-energy-incentives-and-opportunities-in-2024/

10. BNEF — "Lithium-Ion Battery Pack Prices Fall to $108/kWh" (2025)
    https://about.bnef.com/insights/clean-transport/lithium-ion-battery-pack-prices-fall-to-108-per-kilowatt-hour/

11. Energy Storage News — "Battery Storage System Prices Continue to Fall Sharply"
    https://www.energy-storage.news/battery-storage-system-prices-continue-to-fall-sharply-bnef-and-ember-reports-find/

12. NREL — "Cost Projections for Utility-Scale Battery Storage" (2025)
    https://docs.nrel.gov/docs/fy25osti/93281.pdf

13. ITL Engineering — "BESS Service"
    https://www.itl-engineering.com/service-bess

14. AAE Engineering Thailand
    https://www.aae-eng.com

15. Wenergy — "Green Energy Storage Project in Thailand with TCE"
    https://www.wenergystorage.com/news/wenergy-launches-green-energy-storage-project-in-thailand/

16. ACCEPT ASEAN — "Battery Recycling: Crucial Component for Energy Storage's
    Circular Economy"
    https://accept.aseanenergy.org/battery-recycling-crucial-component-for-energy-storages-circular-economy/

17. AIIB — "Thailand GULF Renewable Power Project"
    https://www.aiib.org/en/projects/details/2024/approved/Thailand-GULF-Renewable-Power-Project.html

18. Ember — "How Cheap is Battery Storage?" (2025)
    https://ember-energy.org/latest-insights/how-cheap-is-battery-storage/

---

*Document prepared for Copenhagen Solar project planning. Data sourced from publicly
available reports and industry databases. Costs and projections should be validated
with current market quotations during project development.*
