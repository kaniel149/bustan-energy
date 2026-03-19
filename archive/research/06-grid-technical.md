# Grid Connection Technical Requirements for Solar Farms in Thailand

## Comprehensive Technical Guide for PEA/EGAT Interconnection

**Document Reference:** Copenhagen Solar Research Series — Document 06
**Last Updated:** March 2026
**Scope:** Technical requirements for connecting solar PV farms (1–90 MW) to Thailand's transmission and distribution grids

---

## Table of Contents

1. [Overview of Thailand's Grid Infrastructure](#1-overview-of-thailands-grid-infrastructure)
2. [Regulatory Framework for Grid Connection](#2-regulatory-framework-for-grid-connection)
3. [Voltage Levels and Interconnection Points](#3-voltage-levels-and-interconnection-points)
4. [Step-Up Transformer Requirements](#4-step-up-transformer-requirements)
5. [Protection Relay Systems](#5-protection-relay-systems)
6. [Anti-Islanding Requirements](#6-anti-islanding-requirements)
7. [SCADA and Communication Systems](#7-scada-and-communication-systems)
8. [Metering Requirements](#8-metering-requirements)
9. [Power Quality Standards](#9-power-quality-standards)
10. [Lightning and Surge Protection](#10-lightning-and-surge-protection)
11. [Cable Sizing and Selection](#11-cable-sizing-and-selection)
12. [Switchgear Requirements](#12-switchgear-requirements)
13. [Grounding and Earthing Systems](#13-grounding-and-earthing-systems)
14. [Testing and Commissioning](#14-testing-and-commissioning)
15. [Ongoing Compliance and Monitoring](#15-ongoing-compliance-and-monitoring)
16. [Sources and References](#16-sources-and-references)

---

## 1. Overview of Thailand's Grid Infrastructure

### 1.1 Grid Structure

Thailand's power grid is managed by three principal entities:

- **EGAT (Electricity Generating Authority of Thailand):** Owns and operates the high-voltage transmission system (500 kV, 230 kV, 115 kV, and 69 kV lines). EGAT is responsible for bulk power generation and transmission across the country.
- **MEA (Metropolitan Electricity Authority):** Distributes electricity within Bangkok, Nonthaburi, and Samut Prakan — the greater Bangkok metropolitan area. MEA operates at 24 kV and 12 kV distribution levels.
- **PEA (Provincial Electricity Authority):** Distributes electricity across all 74 provinces outside the MEA service area. PEA operates distribution networks at 33 kV and 22 kV, and serves over 19 million customers.

### 1.2 Grid Characteristics

| Parameter | Value |
|-----------|-------|
| System frequency | 50 Hz |
| Transmission voltages | 500 kV, 230 kV, 115 kV, 69 kV |
| Distribution voltages (PEA) | 33 kV, 22 kV |
| Distribution voltages (MEA) | 24 kV, 12 kV |
| Low voltage | 400/230 V (three-phase/single-phase) |
| System type | Three-phase, three-wire (MV), four-wire (LV) |
| Neutral grounding | Solidly grounded (transmission), resistance grounded (distribution) |

### 1.3 Grid Capacity Constraints

Thailand's distribution grid was originally designed for radial power flow (substation to load). Solar farm interconnection introduces bidirectional power flow, which creates technical challenges:

- **Voltage rise** at the point of common coupling (PCC)
- **Reverse power flow** through distribution transformers not designed for it
- **Protection coordination** issues with existing relay settings
- **Fault level increases** at the interconnection point
- **Thermal loading** of existing conductors and transformers

PEA has published hosting capacity maps for certain feeders, but project developers should commission their own grid impact studies as part of the interconnection application.

---

## 2. Regulatory Framework for Grid Connection

### 2.1 Applicable Regulations

Grid connection for solar farms in Thailand is governed by several overlapping regulatory frameworks:

1. **ERC Regulations:** The Energy Regulatory Commission (ERC) issues licenses and sets technical standards for power producers.
2. **PEA Technical Standards:** PEA's "Technical Requirements for Connecting Distributed Generation to PEA Distribution System" is the primary technical document.
3. **EGAT Grid Code:** For SPP (Small Power Producer) projects connecting at 69 kV or above, EGAT's Grid Code applies.
4. **Thai Industrial Standards (TIS/มอก.):** Equipment must comply with relevant Thai Industrial Standards.
5. **IEC Standards:** International Electrotechnical Commission standards are widely referenced, particularly IEC 61727, IEC 62116, IEC 61000 series.

### 2.2 Producer Categories

| Category | Capacity | Grid Connection | Regulatory Body |
|----------|----------|-----------------|-----------------|
| VSPP (Very Small Power Producer) | ≤ 10 MW | PEA/MEA distribution (22/33 kV) | ERC + PEA/MEA |
| SPP (Small Power Producer) | 10–90 MW | EGAT transmission (69/115 kV) | ERC + EGAT |
| IPP (Independent Power Producer) | > 90 MW | EGAT transmission (115/230 kV) | ERC + EGAT |

### 2.3 Application Process

The grid connection application process involves:

1. **Pre-application inquiry** — Developer submits preliminary project details to PEA/EGAT
2. **Grid impact study** — PEA/EGAT conducts (or requires developer to commission) a grid impact assessment
3. **Technical review** — Detailed review of single-line diagram, protection scheme, equipment specifications
4. **Connection agreement** — Execution of Power Purchase Agreement (PPA) and Grid Connection Agreement
5. **Construction and inspection** — PEA/EGAT inspects the completed installation
6. **Testing and commissioning** — Formal testing program including protection relay tests, power quality measurements
7. **Commercial Operation Date (COD)** — Final approval and energization

Typical timeline: 12–24 months from application to COD for VSPP projects; 18–36 months for SPP projects.

---

## 3. Voltage Levels and Interconnection Points

### 3.1 VSPP Interconnection (≤ 10 MW)

VSPP projects typically connect to PEA's 22 kV or 33 kV distribution network. The choice depends on:

- **Geographic location:** Northern Thailand predominantly uses 22 kV; some areas in the South and Northeast use 33 kV
- **Available capacity:** PEA assesses the thermal capacity and voltage regulation capability of the local feeder
- **Distance to substation:** Longer feeder distances increase voltage regulation challenges

**Connection configuration for VSPP:**

```
Solar Array → Inverters (400/690V AC) → LV Switchgear → Step-up Transformer 
→ MV Switchgear (22/33 kV) → PCC → PEA Distribution Feeder
```

### 3.2 SPP Interconnection (10–90 MW)

SPP projects connect to EGAT's transmission network, typically at:

- **69 kV** — Most common for 10–30 MW projects
- **115 kV** — For larger projects (30–90 MW) or where 69 kV capacity is limited

**Connection configuration for SPP:**

```
Solar Array → Inverters → MV Collection System (22/33 kV) → 
Main Step-up Transformer (22-33/69-115 kV) → HV Switchyard → 
Transmission Line → EGAT Substation
```

### 3.3 Point of Common Coupling (PCC) Requirements

The PCC is the defined boundary between the solar farm and the utility network. Key requirements:

- **Voltage regulation:** ±5% of nominal voltage at PCC under all operating conditions
- **Frequency range:** 49.5–50.5 Hz for continuous operation
- **Power factor:** Adjustable between 0.85 lagging and 0.85 leading at PCC
- **Fault contribution:** Solar farm must not increase fault level at PCC beyond the rated capacity of existing equipment
- **Harmonic limits:** Must comply with IEEE 519 / IEC 61000-3-6 at PCC

---

## 4. Step-Up Transformer Requirements

### 4.1 Inverter Step-Up Transformers (ISTs)

Each inverter station requires a step-up transformer to convert from inverter output voltage to the MV collection system voltage.

**Typical specifications:**

| Parameter | Specification |
|-----------|---------------|
| Rating | 1,000–3,150 kVA (matched to inverter capacity) |
| Primary voltage | 400 V or 690 V (inverter output) |
| Secondary voltage | 22 kV or 33 kV |
| Vector group | Dyn11 (preferred) or Dyn1 |
| Impedance | 5.5–6.5% |
| Cooling | ONAN (Oil Natural Air Natural) |
| Insulation class | Class A (oil-immersed) |
| Temperature rise | 65°C (winding), 55°C (oil) |
| Losses | To IEC 60076-1 standards |
| BIL (Basic Insulation Level) | 125 kV (22 kV class), 170 kV (33 kV class) |

### 4.2 Main Power Transformer (MPT)

For SPP projects, a main power transformer steps up from the MV collection voltage to transmission voltage.

**Typical specifications:**

| Parameter | Specification |
|-----------|---------------|
| Rating | 20–100 MVA (matched to plant capacity + 10–15% margin) |
| Primary voltage | 22 kV or 33 kV |
| Secondary voltage | 69 kV or 115 kV |
| Vector group | YNd11 |
| Impedance | 8–12% |
| Cooling | ONAN/ONAF (dual rating) |
| On-Load Tap Changer (OLTC) | ±10% in 17 steps (required for voltage regulation) |
| Neutral grounding | Per EGAT Grid Code requirements |
| Oil preservation | Conservator type with silica gel breather |

### 4.3 Transformer Protection

Each transformer must be equipped with:

- **Buchholz relay** — Detects internal faults (gas accumulation, oil surge)
- **Pressure relief device** — Prevents tank rupture from internal arc
- **Winding temperature indicator (WTI)** — With alarm and trip contacts
- **Oil temperature indicator (OTI)** — With alarm and trip contacts
- **Oil level indicator** — With low-level alarm
- **Sudden pressure relay** — For rapid pressure rise detection
- **Overcurrent and earth fault relays** — On both HV and LV sides
- **Differential relay** — For transformers ≥ 5 MVA (REF 615 or equivalent)
- **Restricted earth fault (REF)** relay — Additional ground fault sensitivity

### 4.4 Thai Standards for Transformers

Transformers must comply with:

- **TIS 384** — Power transformers: General requirements
- **IEC 60076** — Power transformers (all parts)
- **IEC 60296** — Fluids for electrotechnical applications (transformer oil)
- **PEA specification** — PEA-specific requirements for connection transformers

---

## 5. Protection Relay Systems

### 5.1 General Philosophy

The protection system for a solar farm must:

1. **Detect all types of faults** (three-phase, phase-to-phase, single phase-to-ground, double phase-to-ground)
2. **Isolate faulted equipment rapidly** to minimize damage and safety risks
3. **Coordinate with utility protection** — Solar farm relays must not operate for faults outside their zone
4. **Prevent islanding** — Solar farm must disconnect within 2 seconds of loss of utility supply
5. **Allow for auto-reclosing** — Solar farm must remain disconnected during utility auto-reclose dead time

### 5.2 Required Protection Functions

**At the Point of Common Coupling (PCC):**

| Function (ANSI Code) | Description | Setting Basis |
|----------------------|-------------|---------------|
| 27 (Undervoltage) | Trip on low voltage | < 80% of nominal, 0.5–2.0 s |
| 59 (Overvoltage) | Trip on high voltage | > 110% of nominal, 0.5–2.0 s |
| 81O (Overfrequency) | Trip on high frequency | > 50.5 Hz, 0.1–0.5 s |
| 81U (Underfrequency) | Trip on low frequency | < 49.5 Hz, 0.1–0.5 s |
| 25 (Synchrocheck) | Synchronism verification | Before closing PCC breaker |
| 32 (Directional Power) | Reverse power detection | Anti-export if required |
| 50/51 (Overcurrent) | Phase overcurrent | Coordinated with upstream utility relays |
| 50N/51N (Earth Fault) | Ground fault overcurrent | Sensitive earth fault detection |
| 67/67N (Directional OC) | Directional overcurrent | Discriminate fault direction |
| 59N (Neutral Overvoltage) | Zero-sequence voltage | Ground fault detection (ungrounded systems) |

**At each inverter step-up transformer:**

| Function | Description |
|----------|-------------|
| 50/51 | Phase overcurrent (LV and MV sides) |
| 50N/51N | Earth fault overcurrent |
| 87T | Transformer differential (for units ≥ 5 MVA) |
| 49 | Thermal overload |
| 63 | Buchholz (gas/oil surge) |

### 5.3 PEA-Specific Protection Requirements

PEA mandates the following for VSPP connections:

1. **Dedicated protection relay panel** at the PCC — Cannot share with other functions
2. **Redundant protection** for projects > 5 MW — Main and backup protection required
3. **Communication-based tripping** — PEA may require a transfer trip channel from the utility substation to the solar farm PCC breaker
4. **Protection relay type** — Must be microprocessor-based (numerical) relays from approved manufacturers (ABB, Siemens, SEL, GE/Alstom, Schneider Electric)
5. **Relay settings** — Must be approved by PEA before energization; settings are locked and sealed
6. **Event recording** — All protection relays must have disturbance recording capability with GPS time synchronization
7. **Testing access** — PEA must have access to test protection relays during annual inspections

### 5.4 Recommended Relay Models

Commonly used protection relays in Thai solar farms:

- **ABB REF 615 / REF 620** — Feeder protection
- **ABB RET 615 / RET 620** — Transformer protection
- **ABB REG 670** — Generator/DG protection
- **Siemens SIPROTEC 7SJ85 / 7UT87** — Feeder and transformer protection
- **SEL-700G / SEL-751** — Generator and feeder protection
- **Schneider Electric MiCOM P14x / P54x** — Feeder and transformer protection

---

## 6. Anti-Islanding Requirements

### 6.1 Definition and Risk

Islanding occurs when the solar farm continues to energize a section of the utility network after the utility has disconnected. This creates serious safety hazards:

- **Electrical shock** to utility workers who assume the line is de-energized
- **Equipment damage** from out-of-phase reclosing
- **Power quality degradation** in the islanded section (voltage and frequency instability)
- **Fire risk** from uncontrolled fault current in the islanded section

### 6.2 Thai Regulatory Requirements

PEA and EGAT require:

- **Detection time:** Solar farm must detect loss of utility within **0.5 seconds**
- **Disconnection time:** Solar farm must be fully disconnected within **2.0 seconds** of islanding detection
- **Non-Detection Zone (NDZ):** Must be minimized — PEA requires demonstration that NDZ is ≤ 5% of rated power
- **Reconnection delay:** Solar farm must wait a minimum of **5 minutes** (300 seconds) after utility restoration before reconnecting

### 6.3 Anti-Islanding Methods

**Passive methods (always required):**

1. **Under/Over Voltage (27/59)** — Detects voltage excursions outside ±10% of nominal
2. **Under/Over Frequency (81U/81O)** — Detects frequency excursions outside 49.5–50.5 Hz
3. **Rate of Change of Frequency (ROCOF / 81R)** — Detects rapid frequency changes (> 0.5 Hz/s typical setting)
4. **Vector Shift (VS)** — Detects sudden phase angle changes (> 6° typical setting)

**Active methods (built into inverters):**

1. **Frequency shift (AFD/AFDPF)** — Inverter injects small frequency perturbation; islanding causes frequency to drift
2. **Impedance measurement** — Inverter measures grid impedance; significant change indicates islanding
3. **Reactive power perturbation** — Inverter injects reactive power pulse; voltage response indicates grid presence

### 6.4 IEC 62116 Compliance

All grid-tied inverters used in Thailand must demonstrate anti-islanding compliance per IEC 62116:

- **Test conditions:** Load matched to within ±5% of inverter output (worst case for passive detection)
- **Quality factor (Qf):** ≥ 1.0 for RLC load
- **Maximum clearing time:** 2.0 seconds under all tested conditions
- **Test lab:** Must be accredited (e.g., TÜV, UL, CSA, or NREL)

### 6.5 Transfer Trip (Direct Transfer Trip)

For larger installations (> 5 MW) or where passive/active methods have insufficient reliability, PEA may require:

- **Direct Transfer Trip (DTT):** A dedicated communication channel from the utility substation breaker to the solar farm PCC breaker
- **Communication medium:** Fiber optic (preferred), or dedicated telephone line
- **Trip time:** < 100 ms from utility breaker opening to solar farm breaker trip
- **Redundancy:** Dual communication channels for projects > 10 MW

---

## 7. SCADA and Communication Systems

### 7.1 PEA SCADA Requirements

PEA requires solar farms to interface with the PEA SCADA system for real-time monitoring and control:

**Required data points (minimum):**

| Category | Data Points |
|----------|-------------|
| Power | Active power (MW), Reactive power (Mvar), Power factor |
| Voltage | Phase voltages (Va, Vb, Vc), Line voltages |
| Current | Phase currents (Ia, Ib, Ic) |
| Frequency | System frequency (Hz) |
| Energy | Cumulative kWh (import and export) |
| Status | Breaker positions (PCC, main transformer, feeders) |
| Alarms | Protection relay trips, transformer alarms, inverter faults |
| Environmental | Irradiance (W/m²), Module temperature (°C), Ambient temperature |

### 7.2 Communication Protocol

- **Primary protocol:** IEC 60870-5-104 (TCP/IP based) — This is PEA's standard protocol for SCADA communication
- **Alternative:** IEC 60870-5-101 (serial) — For legacy systems
- **Modern systems:** IEC 61850 (GOOSE and MMS) — Increasingly required for new substations
- **Data refresh rate:** ≤ 5 seconds for analog values; event-driven for status changes

### 7.3 Communication Infrastructure

**Required communication links:**

1. **Primary link:** Dedicated fiber optic cable from solar farm to PEA substation
2. **Backup link:** Cellular (4G/5G) or VSAT satellite — Required for redundancy
3. **Bandwidth:** Minimum 2 Mbps dedicated for SCADA
4. **Latency:** < 500 ms round-trip for SCADA polling
5. **Availability:** ≥ 99.5% uptime for primary link

### 7.4 Remote Terminal Unit (RTU)

The solar farm must install an RTU or substation gateway that:

- Collects data from all protection relays, meters, and inverters
- Converts to IEC 60870-5-104 protocol
- Communicates with PEA SCADA master station
- Provides local HMI (Human-Machine Interface) for on-site operations
- Stores event logs with GPS time synchronization (minimum 30 days)

**Common RTU/gateway suppliers used in Thailand:**

- ABB RTU560 / RTU500 series
- Siemens SICAM A8000
- Schneider Electric Easergy T300
- GE D400 Substation Gateway
- Survalent (for smaller installations)

### 7.5 Internal SCADA (Plant Controller)

Beyond PEA SCADA requirements, solar farms require an internal plant SCADA/controller:

- **Plant controller:** Manages active/reactive power dispatch, curtailment, power factor control
- **Inverter communication:** Modbus TCP/IP or SunSpec protocol to all inverters
- **Weather station integration:** Pyranometers, anemometers, temperature sensors
- **Tracker control:** For single-axis or dual-axis tracking systems
- **Historian:** Minimum 1-year data storage at 1-minute resolution
- **Remote access:** Secure VPN for remote monitoring and diagnostics

---

## 8. Metering Requirements

### 8.1 Revenue Metering

PEA requires revenue-grade metering at the PCC for billing purposes:

**Specifications:**

| Parameter | Requirement |
|-----------|-------------|
| Accuracy class | Class 0.2S (current transformers), Class 0.2 (voltage transformers) |
| Meter type | Electronic (digital) revenue meter |
| Functions | Bi-directional (import + export), four-quadrant |
| Demand recording | 15-minute demand intervals |
| Communication | RS-485 or Ethernet with DLMS/COSEM protocol |
| Time synchronization | GPS-synchronized clock |
| Sealing | PEA seals applied; tamper-evident design |

### 8.2 Metering Current Transformers (CTs)

| Parameter | Requirement |
|-----------|-------------|
| Accuracy class | 0.2S or better |
| Burden | Matched to meter input impedance |
| Rated primary current | Selected based on plant capacity |
| Saturation factor | ≥ 20 (for revenue metering) |
| Standard | IEC 61869-2 |

### 8.3 Metering Voltage Transformers (VTs)

| Parameter | Requirement |
|-----------|-------------|
| Accuracy class | 0.2 or better |
| Burden | Matched to meter and relay loads |
| Type | Inductive (preferred for revenue metering) |
| Standard | IEC 61869-3 |

### 8.4 Check Metering

In addition to PEA revenue meters, the developer should install:

- **Check meter** at PCC — To verify PEA revenue meter readings
- **Inverter-level meters** — For internal performance monitoring
- **Auxiliary supply meter** — To measure station service consumption
- **Net generation meter** — Gross generation minus auxiliary consumption

### 8.5 Meter Data Management

- **Data collection:** Automatic meter reading (AMR) every 15 minutes
- **Data storage:** Minimum 2 years of billing-quality data
- **Data format:** PEA-specified format for settlement
- **Meter testing:** Annual calibration required; PEA may conduct random tests

---

## 9. Power Quality Standards

### 9.1 Harmonic Distortion Limits

Solar farms must comply with harmonic limits at the PCC per IEEE 519-2014 and IEC 61000-3-6:

**Current harmonic limits (IEEE 519 Table 2, for ISC/IL > 1000):**

| Harmonic Order | Individual Harmonic (% of IL) | TDD (%) |
|---------------|-------------------------------|---------|
| h < 11 | 12.0% | — |
| 11 ≤ h < 17 | 5.5% | — |
| 17 ≤ h < 23 | 5.0% | — |
| 23 ≤ h < 35 | 2.0% | — |
| 35 ≤ h | 1.0% | — |
| Total (TDD) | — | 12.0% |

**Voltage harmonic limits:**

| Voltage Level | Individual Harmonic (%) | THDv (%) |
|---------------|------------------------|----------|
| ≤ 69 kV | 3.0% | 5.0% |
| 69–161 kV | 1.5% | 2.5% |
| > 161 kV | 1.0% | 1.5% |

### 9.2 Voltage Fluctuation and Flicker

| Parameter | Limit |
|-----------|-------|
| Short-term flicker (Pst) | ≤ 1.0 (10-minute intervals) |
| Long-term flicker (Plt) | ≤ 0.65 (2-hour intervals) |
| Rapid voltage changes | ≤ 3% of nominal per event |
| Voltage step changes | ≤ 3% at connection/disconnection |

### 9.3 Power Factor Requirements

PEA requires solar farms to maintain power factor at the PCC:

- **Normal operating range:** 0.90 lagging to 0.90 leading
- **Adjustable range:** Must be capable of 0.85 lagging to 0.85 leading
- **Control mode:** Power factor, reactive power (Mvar), or voltage control — as specified by PEA
- **Response time:** Must reach target power factor within 5 seconds of setpoint change
- **During low irradiance:** Power factor requirements are relaxed below 10% of rated output

### 9.4 Voltage Regulation

Solar farms must not cause voltage at the PCC to deviate beyond:

- **Steady-state:** ±5% of nominal voltage (e.g., 22 kV ± 1.1 kV)
- **Transient (switching):** ≤ 3% step change
- **Ramp rate:** ≤ 10% of rated power per minute (to limit voltage ramp during cloud transients)

### 9.5 DC Injection

- **Limit:** < 0.5% of rated current at PCC
- **Measurement:** Continuous monitoring required
- **Inverter requirement:** Isolation transformer or equivalent galvanic isolation recommended; if transformerless, additional DC monitoring required

### 9.6 Power Quality Monitoring

PEA may require continuous power quality monitoring at the PCC:

- **PQ analyzer:** Class A per IEC 61000-4-30
- **Parameters monitored:** Voltage, current, power, harmonics (up to 50th order), flicker, unbalance, frequency
- **Recording:** Continuous, with 10-minute aggregation periods
- **Data retention:** Minimum 1 year
- **Reporting:** Monthly power quality reports to PEA upon request

---

## 10. Lightning and Surge Protection

### 10.1 Lightning Risk in Thailand

Thailand has one of the highest lightning densities in the world:

- **Average thunder days:** 100–180 days per year (depending on region)
- **Lightning flash density:** 5–20 flashes/km²/year
- **Peak lightning season:** May–October (monsoon season)
- **Ground flash density in Central/Northeast Thailand:** 8–15 flashes/km²/year

Solar farms present large, exposed targets with extensive metallic infrastructure, making lightning protection critical.

### 10.2 External Lightning Protection

**Lightning protection system (LPS) per IEC 62305:**

- **Risk assessment:** Must be conducted per IEC 62305-2 to determine protection level
- **Protection level:** Level III or Level IV typically sufficient for solar farms (rolling sphere radius 45–60 m)
- **Air termination:** Lightning rods on tallest structures (inverter stations, substations, weather stations)
- **Down conductors:** Minimum two per structure, routed to minimize coupling with signal cables
- **Earth termination:** Ring earth electrode around each protected structure

### 10.3 Surge Protection Devices (SPDs)

**DC side (PV array):**

| Location | SPD Type | Rating |
|----------|----------|--------|
| PV combiner boxes | Type 2 | Uc ≥ 1.2 × Voc_max, In ≥ 20 kA |
| Inverter DC input | Type 2 (or integrated) | Uc ≥ 1.2 × Voc_max, In ≥ 20 kA |
| String-level (if applicable) | Type 2 | Per string Voc |

**AC side:**

| Location | SPD Type | Rating |
|----------|----------|--------|
| Inverter AC output | Type 2 | Uc ≥ 1.1 × Un, In ≥ 20 kA |
| LV switchgear | Type 1+2 (combined) | Iimp ≥ 12.5 kA (10/350), In ≥ 40 kA (8/20) |
| MV switchgear | Metal-oxide surge arresters | Per system voltage class |

**MV surge arresters:**

| Parameter | 22 kV System | 33 kV System |
|-----------|-------------|-------------|
| Rated voltage (Ur) | 24 kV | 36 kV |
| MCOV | 19.5 kV | 29.0 kV |
| Nominal discharge current | 10 kA | 10 kA |
| Class | Station class or intermediate | Station class or intermediate |
| Location | Transformer HV terminals, cable terminations, PCC | Same |

### 10.4 Signal and Communication Protection

- **SCADA communication lines:** SPDs on all external communication cables
- **Fiber optic preferred:** Inherently immune to lightning-induced surges
- **Analog signals:** SPDs on all current loop (4–20 mA) and voltage signals entering buildings
- **Ethernet/LAN:** SPDs on copper Ethernet cables entering from field

### 10.5 Grounding for Lightning Protection

- **Grounding resistance:** ≤ 10 Ω for the overall solar farm grounding system; ≤ 1 Ω for main substation
- **Mesh grounding:** Substation ground grid per IEEE 80 (max step and touch voltage calculations required)
- **PV array grounding:** Module frames bonded to mounting structure; mounting structure connected to ground grid via equipment grounding conductors
- **Equipotential bonding:** All metallic structures within the solar farm must be bonded to the main grounding system

---

## 11. Cable Sizing and Selection

### 11.1 DC Cables (PV String to Combiner/Inverter)

**Design criteria:**

- **Voltage rating:** 1,500 V DC (for 1,500 V systems) or 1,000 V DC (for 1,000 V systems)
- **Current rating:** ≥ 1.25 × Isc of PV string (safety factor per IEC 62548)
- **Voltage drop:** ≤ 2% from farthest string to inverter input
- **Insulation:** XLPE or EPR, UV-resistant, halogen-free preferred
- **Conductor:** Tinned copper or aluminum
- **Standard:** TIS 11-2553, IEC 62930 (PV cables), EN 50618
- **Typical sizes:** 4 mm², 6 mm², 10 mm² for string cables; 35–240 mm² for DC main cables

**Cable type:** Solar-specific PV cable (H1Z2Z2-K or equivalent) rated for outdoor use, UV exposure, and temperature range -40°C to +90°C

### 11.2 AC Cables (Inverter to Transformer / MV Collection)

**Low voltage AC cables (inverter output):**

| Parameter | Specification |
|-----------|---------------|
| Voltage rating | 0.6/1 kV |
| Conductor | Copper or aluminum |
| Insulation | XLPE |
| Typical sizes | 95–300 mm² per phase |
| Derating factors | Apply ambient temperature, grouping, burial depth corrections per IEC 60364-5-52 |

**Medium voltage AC cables (22 kV or 33 kV collection system):**

| Parameter | 22 kV System | 33 kV System |
|-----------|-------------|-------------|
| Voltage rating | 12/20 kV | 18/30 kV |
| Conductor | Copper or aluminum | Copper or aluminum |
| Insulation | XLPE | XLPE |
| Screen | Copper wire screen with semi-conductive layers | Same |
| Typical sizes | 95–400 mm² | 95–400 mm² |
| Installation | Direct buried (with sand bedding) or in cable trays | Same |
| Standard | IEC 60502-2, TIS 2143 | IEC 60502-2, TIS 2143 |

### 11.3 Cable Sizing Methodology

1. **Current capacity:** Calculate maximum continuous current; apply derating factors (ambient temperature, soil thermal resistivity, grouping factor, depth of burial)
2. **Voltage drop:** Verify ≤ 2% for DC circuits, ≤ 3% for LV AC circuits, ≤ 1% for MV circuits
3. **Short-circuit withstand:** Cable must withstand maximum fault current for protection clearing time (typically 0.5–1.0 s)
4. **Earth fault loop impedance:** Verify protective device will operate within required time
5. **Economic optimization:** Balance cable cost against energy losses over project lifetime (25 years)

### 11.4 Cable Installation

- **Direct burial:** Minimum 800 mm depth for MV cables, 600 mm for LV cables
- **Sand bedding:** 100 mm below and above cable, for thermal conductivity and mechanical protection
- **Warning tape:** Installed 300 mm above buried cables
- **Cable separation:** Minimum 200 mm between parallel MV cables, 100 mm between LV cables
- **Crossing other utilities:** Minimum 300 mm vertical separation, with concrete protection slab
- **Pulling force limits:** Per manufacturer specifications; use cable pulling lubricant

---

## 12. Switchgear Requirements

### 12.1 Medium Voltage Switchgear (22/33 kV)

**At the PCC:**

- **Type:** Metal-clad, SF6 or vacuum circuit breaker
- **Rated voltage:** 24 kV (for 22 kV system) or 36 kV (for 33 kV system)
- **Rated current:** 630 A or 1,250 A (depending on plant capacity)
- **Fault rating:** 25 kA / 1 second minimum (verify against actual system fault level)
- **BIL:** 125 kV (24 kV class) or 170 kV (36 kV class)
- **Operations:** Motor-operated with manual emergency close/open
- **Control voltage:** 110 V DC from station battery
- **Standard:** IEC 62271-200

**MV collection feeder switchgear:**

- **Type:** Ring Main Unit (RMU) with load-break switches and circuit breaker
- **Typical configuration:** 2 load-break switches + 1 circuit breaker (2LS + 1CB)
- **Gas insulation:** SF6 or clean-air insulated (SF6-free options increasingly available)
- **Manufacturers commonly used:** ABB, Siemens, Schneider Electric, Eaton, LS Electric

### 12.2 High Voltage Switchgear (69/115 kV) — SPP Projects

- **Type:** Outdoor AIS (Air Insulated Switchgear) or compact GIS (Gas Insulated Switchgear)
- **Circuit breaker type:** SF6 puffer-type or dead-tank
- **Disconnect switches:** Motorized, with visible break
- **Earth switches:** Fast-acting earthing switches on line side
- **Current transformers:** Outdoor type, accuracy class 0.2S for metering, 5P20 for protection
- **Voltage transformers:** Capacitor voltage transformers (CVTs) or inductive VTs
- **Standards:** IEC 62271-100 (circuit breakers), IEC 62271-102 (disconnectors)

### 12.3 Low Voltage Switchgear

**Inverter output panel:**

- **Type:** Draw-out or fixed type, air-insulated
- **Rated voltage:** 690 V or 400 V
- **Rated current:** Matched to inverter output
- **Protection:** MCCB (Molded Case Circuit Breaker) with adjustable trip
- **Auxiliary:** Station service transformer supply, UPS, DC distribution
- **Standard:** IEC 61439-1, IEC 61439-2

### 12.4 DC Switchgear (PV Array)

- **DC disconnect switches** at combiner boxes and inverter inputs
- **Rated voltage:** ≥ 1,500 V DC (for 1,500 V systems)
- **Rated current:** ≥ 1.25 × Isc of connected strings
- **Arc flash rating:** Must be rated for DC interruption (not AC switches)
- **Fuses:** gPV fuse links per IEC 60269-6 at each string (combiner box level)
- **Standard:** IEC 60947-3 (DC-rated switches)

---

## 13. Grounding and Earthing Systems

### 13.1 Substation Grounding

**Design per IEEE 80 and IEC 62305:**

- **Ground grid:** Copper conductors (minimum 70 mm²) laid in a mesh pattern
- **Grid spacing:** Typically 3–6 m in main substation area
- **Depth of burial:** 500–600 mm
- **Ground rods:** Copper-clad steel, 3 m length, at grid perimeters and equipment connections
- **Maximum touch voltage:** < 50 V (for body weight 50 kg, 0.5 s fault clearing time)
- **Maximum step voltage:** < 50 V (same conditions)
- **Ground resistance:** ≤ 1 Ω for main substation; ≤ 5 Ω for inverter stations
- **Soil resistivity survey:** Required before design; measurements per Wenner four-point method

### 13.2 PV Array Grounding

- **Module frames:** Bonded to mounting structure using approved grounding clips or lug connections
- **Mounting structures:** Connected to equipment grounding conductors (bare copper or copper-clad steel)
- **Ground electrodes:** Driven rods at regular intervals along array rows
- **Interconnection:** All array grounding connected to main substation ground grid
- **Continuity:** Maximum 0.5 Ω resistance between any module frame and main ground bus

### 13.3 Neutral Grounding

| System | Neutral Treatment |
|--------|------------------|
| LV (400 V) inverter output | Solidly grounded (TN-S system) |
| MV (22/33 kV) collection | Resistance grounded (NGR) or ungrounded — per PEA standard |
| HV (69/115 kV) transmission | Solidly grounded per EGAT requirement |

**Neutral Grounding Resistor (NGR) for MV system:**

- Limits single-line-to-ground fault current to 10–25 A
- Rating: Continuous or 10-second rated (per application)
- Monitoring: NGR monitoring relay to detect open/short circuit of resistor

---

## 14. Testing and Commissioning

### 14.1 Pre-Commissioning Tests

**Transformer tests:**

| Test | Standard |
|------|----------|
| Transformer ratio test | IEC 60076-1 |
| Winding resistance | IEC 60076-1 |
| Insulation resistance (Megger) | IEC 60076-3 |
| Tan delta / power factor | IEC 60076-3 |
| Oil dielectric strength (BDV) | IEC 60156 |
| Dissolved Gas Analysis (DGA) | IEC 60567 |
| Buchholz relay function test | — |
| OLTC operation test | IEC 60214 |

**Cable tests:**

| Test | Standard |
|------|----------|
| Insulation resistance | IEC 60502-2 |
| DC hi-pot test (after installation) | Per manufacturer |
| VLF (Very Low Frequency) test for MV cables | IEC 60502-2, IEEE 400.2 |
| Cable shield continuity | — |
| Phase identification | — |

**Switchgear tests:**

| Test | Standard |
|------|----------|
| Circuit breaker timing | IEC 62271-100 |
| Contact resistance (micro-ohm) | IEC 62271-100 |
| Insulation resistance | — |
| SF6 gas pressure check | IEC 62271-303 |
| Mechanism operation (local and remote) | — |
| Interlock function test | — |

### 14.2 Protection Relay Testing

All protection relays must be tested using secondary injection equipment:

1. **Pick-up value test** — Verify each element picks up within ±5% of setting
2. **Timing test** — Verify operating time at 2×, 5×, 10× pickup for time-delayed elements
3. **Trip circuit test** — Verify relay output trips the correct breaker
4. **Intertrip test** — Verify transfer trip communication and operation
5. **Anti-islanding test** — Simulate loss-of-mains and verify trip time ≤ 2 seconds
6. **Synchrocheck test** — Verify ANSI 25 prevents closing out of synchronism
7. **Directional element test** — Verify correct polarization and directionality
8. **Harmonic measurement test** — Inject known harmonic currents and verify measurement accuracy

### 14.3 SCADA Commissioning

1. **Point-to-point verification** — Every data point from field device to SCADA display
2. **Alarm verification** — All alarms generate correct messages and priorities
3. **Control verification** — All remote control commands execute correctly (breaker open/close, setpoint changes)
4. **Communication redundancy test** — Failover from primary to backup communication link
5. **Data logging verification** — Confirm historical data is recorded correctly
6. **Protocol compliance test** — IEC 60870-5-104 interoperability test with PEA SCADA master

### 14.4 Grid Connection Tests (PEA/EGAT Witnessed)

PEA or EGAT will witness the following tests before granting COD:

1. **Energization test** — Step-by-step energization of transformer (tap by tap) and switchgear
2. **Synchronization test** — First parallel with grid under controlled conditions
3. **Active power ramp test** — Ramp from 0 to rated power, verify voltage and frequency stability
4. **Reactive power capability test** — Demonstrate full reactive power range at PCC
5. **Power factor control test** — Verify automatic power factor control response
6. **Anti-islanding test** — Utility opens breaker; verify solar farm disconnects within 2 seconds
7. **Fault ride-through test** — May be required for larger installations
8. **Power quality measurement** — 7-day continuous power quality recording at PCC
9. **Protection coordination verification** — Review of relay settings and coordination study

### 14.5 Documentation Required for COD

- Single-line diagram (as-built)
- Protection coordination study report
- Protection relay settings (approved by PEA/EGAT)
- Power quality measurement report (7-day test results)
- Grounding system test report (ground resistance, touch/step voltage)
- Equipment test certificates (transformers, switchgear, cables, inverters)
- SCADA point list and communication test report
- Operations and Maintenance manual
- Emergency procedures and contact list

---

## 15. Ongoing Compliance and Monitoring

### 15.1 Annual Requirements

- **Protection relay testing:** Annual secondary injection test of all protection relays
- **Transformer oil analysis:** Annual DGA and oil quality testing
- **Grounding system test:** Annual ground resistance measurement
- **Meter calibration:** Annual verification of revenue meters
- **Power quality review:** Annual power quality report submission to PEA
- **SCADA availability report:** Monthly SCADA uptime statistics

### 15.2 PEA Inspection Rights

PEA retains the right to:

- Inspect the solar farm at any time with reasonable notice
- Test protection relay settings
- Verify metering accuracy
- Require modification of protection settings if grid conditions change
- Require curtailment or disconnection for grid stability
- Access SCADA data and event logs

### 15.3 Performance Standards

| Parameter | Standard | Consequence of Non-Compliance |
|-----------|----------|------------------------------|
| Power factor | 0.90 lag to 0.90 lead | Reactive power charges; possible disconnection |
| Harmonics (THD) | Per IEEE 519 limits | Written notice; must remediate within 30 days |
| Anti-islanding | Trip ≤ 2 seconds | Immediate disconnection until remediated |
| SCADA availability | ≥ 99.5% uptime | Warning; possible PPA penalty |
| Protection relay availability | 100% | Immediate disconnection if protection is bypassed |

### 15.4 Grid Code Amendments

Developers should monitor for changes to:

- PEA Technical Standards (updated periodically)
- EGAT Grid Code (major revision expected with increasing renewable penetration)
- ERC regulations (FiT rates, licensing requirements)
- IEC standards (particularly IEC 62786 for DG connection)

Thailand is expected to introduce more stringent fault ride-through requirements and active power curtailment capabilities as renewable penetration increases, aligning with international best practices.

---

## 16. Sources and References

### 16.1 Thai Regulatory Sources

1. **Provincial Electricity Authority (PEA).** "Technical Requirements for Connecting Distributed Generation to PEA Distribution System." PEA, Bangkok. [www.pea.co.th](https://www.pea.co.th)
2. **Electricity Generating Authority of Thailand (EGAT).** "Thailand Grid Code." EGAT, Nonthaburi. [www.egat.co.th](https://www.egat.co.th)
3. **Energy Regulatory Commission (ERC).** "Regulations on Power Purchase from Very Small Power Producers (VSPP)." ERC, Bangkok. [www.erc.or.th](https://www.erc.or.th)
4. **Thai Industrial Standards Institute (TISI).** Various TIS standards for electrical equipment. [www.tisi.go.th](https://www.tisi.go.th)
5. **Department of Alternative Energy Development and Efficiency (DEDE).** "Alternative Energy Development Plan (AEDP) 2018–2037." Ministry of Energy, Bangkok. [www.dede.go.th](https://www.dede.go.th)

### 16.2 International Standards

6. **IEC 61727:2004.** "Photovoltaic (PV) systems — Characteristics of the utility interface."
7. **IEC 62116:2014.** "Utility-interconnected photovoltaic inverters — Test procedure of islanding prevention measures."
8. **IEC 62305:2010.** "Protection against lightning" (Parts 1–4).
9. **IEC 60076:2011.** "Power transformers" (all parts).
10. **IEC 62271-200:2011.** "AC metal-enclosed switchgear and controlgear for rated voltages above 1 kV."
11. **IEC 60870-5-104:2006.** "Telecontrol equipment and systems — Part 5-104: Transmission protocols."
12. **IEC 61000-3-6:2008.** "Electromagnetic compatibility (EMC) — Limits — Assessment of emission limits for the connection of distorting installations."
13. **IEC 60502-2:2014.** "Power cables with extruded insulation — Part 2: Cables for rated voltages from 6 kV to 30 kV."
14. **IEC 62548:2016.** "Photovoltaic (PV) arrays — Design requirements."
15. **IEEE 519-2014.** "IEEE Recommended Practice and Requirements for Harmonic Control in Electric Power Systems."
16. **IEEE 80-2013.** "IEEE Guide for Safety in AC Substation Grounding."
17. **IEEE 1547-2018.** "IEEE Standard for Interconnection and Interoperability of Distributed Energy Resources with Associated Electric Power Systems Interfaces."

### 16.3 Industry References

18. **IEA-PVPS.** "National Survey Report of PV Applications in Thailand 2018." IEA PVPS Task 1. [iea-pvps.org](https://iea-pvps.org)
19. **IRENA.** "Renewables Readiness Assessment: The Kingdom of Thailand." IRENA, Abu Dhabi, 2017. [www.irena.org](https://www.irena.org)
20. **Asian Development Bank.** "Extended Annual Review Report: Loan Solar Power Project (Thailand)." ADB, Manila, 2014.
21. **Norton Rose Fulbright.** "Solar Power in Thailand: New Power Purchase Scheme Creates Investment Opportunities." 2015. [www.nortonrosefulbright.com](https://www.nortonrosefulbright.com)
22. **Reuters.** "Thailand Ignites Solar Power Investment in Southeast Asia." Khettiya Jittapong, 2015.
23. **SolarGIS.** "Global Horizontal Irradiation Map: Thailand." [solargis.info](https://solargis.info)

### 16.4 Equipment Manufacturer References

24. **ABB.** "REF 615 / REF 620 Feeder Protection Relay — Technical Manual."
25. **Siemens.** "SIPROTEC 5 — 7SJ85 Feeder Protection Relay — Manual."
26. **Schneider Electric.** "Easergy T300 RTU — Technical Datasheet."
27. **SEL (Schweitzer Engineering Laboratories).** "SEL-700G Generator Protection Relay — Instruction Manual."
28. **Huawei / Sungrow / SMA.** Inverter datasheets for grid code compliance settings.

---

## Appendix A: Single-Line Diagram — Typical 10 MW VSPP Solar Farm

```
                        PEA 22 kV Feeder
                              │
                    ┌─────────┴─────────┐
                    │   PCC Metering     │
                    │   (CT/VT/Meter)    │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │  PCC Circuit       │
                    │  Breaker (24 kV)   │
                    │  + Protection      │
                    │  Relay Panel       │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │   22 kV Busbar     │
                    └──┬──┬──┬──┬──┬──┬──┘
                       │  │  │  │  │  │
                    ┌──┘  │  │  │  │  └──┐
              ┌─────┴──┐  │  │  │  │  ┌──┴─────┐
              │ RMU #1 │  ...        │ RMU #5  │
              └───┬────┘             └───┬─────┘
                  │                      │
           ┌──────┴──────┐        ┌──────┴──────┐
           │  Step-up    │        │  Step-up    │
           │  Transformer│        │  Transformer│
           │  2 MVA      │        │  2 MVA      │
           │  0.4/22 kV  │        │  0.4/22 kV  │
           └──────┬──────┘        └──────┬──────┘
                  │                      │
           ┌──────┴──────┐        ┌──────┴──────┐
           │  Inverter   │        │  Inverter   │
           │  2 MW       │        │  2 MW       │
           │  (Central)  │        │  (Central)  │
           └──────┬──────┘        └──────┬──────┘
                  │                      │
           ┌──────┴──────┐        ┌──────┴──────┐
           │  DC Combiner│        │  DC Combiner│
           │  Boxes      │        │  Boxes      │
           └──────┬──────┘        └──────┬──────┘
                  │                      │
           ┌──────┴──────┐        ┌──────┴──────┐
           │  PV Strings │        │  PV Strings │
           │  (Module    │        │  (Module    │
           │   Arrays)   │        │   Arrays)   │
           └─────────────┘        └─────────────┘
```

---

## Appendix B: Protection Coordination Time-Current Curves (Typical)

```
Current (A) →
    │
    │    PEA Feeder    Solar Farm     Inverter
    │    Relay (51)    PCC Relay      Transformer
    │                  (51)           Fuse
    │
10s ├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
    │        \
    │         \            \
 1s ├─ ─ ─ ─ ─\─ ─ ─ ─ ─ ─\─ ─ ─ ─ ─
    │           \            \        │
    │            \            \       │
0.1s├─ ─ ─ ─ ─ ─\─ ─ ─ ─ ─ ─\─ ─ ─ ┤
    │              \            \     │
    │               \            \    │
    └────────────────┴────────────┴───┘
    
    Coordination margin ≥ 0.3 seconds between curves
    PCC relay must be faster than PEA feeder relay
    Inverter transformer protection must be fastest
```

---

## Appendix C: Key Acronyms

| Acronym | Definition |
|---------|-----------|
| AIS | Air Insulated Switchgear |
| BIL | Basic Insulation Level |
| BDV | Breakdown Voltage |
| COD | Commercial Operation Date |
| CT | Current Transformer |
| DGA | Dissolved Gas Analysis |
| DTT | Direct Transfer Trip |
| EGAT | Electricity Generating Authority of Thailand |
| ERC | Energy Regulatory Commission |
| GIS | Gas Insulated Switchgear |
| HMI | Human Machine Interface |
| IPP | Independent Power Producer |
| IST | Inverter Step-up Transformer |
| LPS | Lightning Protection System |
| MCOV | Maximum Continuous Operating Voltage |
| MEA | Metropolitan Electricity Authority |
| MPT | Main Power Transformer |
| MV | Medium Voltage |
| NDZ | Non-Detection Zone |
| NGR | Neutral Grounding Resistor |
| OLTC | On-Load Tap Changer |
| PCC | Point of Common Coupling |
| PEA | Provincial Electricity Authority |
| PPA | Power Purchase Agreement |
| PQ | Power Quality |
| ROCOF | Rate of Change of Frequency |
| RMU | Ring Main Unit |
| RTU | Remote Terminal Unit |
| SCADA | Supervisory Control and Data Acquisition |
| SPD | Surge Protection Device |
| SPP | Small Power Producer |
| THD | Total Harmonic Distortion |
| TDD | Total Demand Distortion |
| VT | Voltage Transformer |
| VSPP | Very Small Power Producer |
| XLPE | Cross-Linked Polyethylene |

---

*Document prepared for Copenhagen Solar research series. Technical requirements are based on published PEA/EGAT standards, IEC/IEEE international standards, and industry practice for solar farm development in Thailand as of 2025–2026. Developers should verify all requirements directly with PEA/EGAT for their specific project location and capacity, as standards are periodically updated.*
