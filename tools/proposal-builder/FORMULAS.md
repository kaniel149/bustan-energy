# TM Energy -- Solar Engineering Formulas

Version: 1.1 | Last updated: 2026-04-23

This document specifies every formula used in the TM Energy proposal system.
All values here are authoritative -- update this file when changing any constant.

---

## 1. Performance Ratio (PR)

**Location: Ko Phangan, Thailand (tropical + coastal)**

| Parameter | Value | Source |
|-----------|-------|--------|
| Base PR | 0.77 | IEC 61724-1:2017, tropical climate class |
| Soiling factor | 0.97 | IEA PVPS T13-10:2018, coastal salt-spray + monsoon dust |
| **Effective PR** | **0.7469** | = 0.77 * 0.97 |

Why 0.77 (not 0.80):
- 0.80 is standard temperate climate (Central Europe, California)
- Tropical irradiance increases temperature, reducing panel efficiency ~1.5-2%
- Skoplaki & Palyvos (2009) measured 0.76-0.78 for Thai coastal conditions
- PEA monitoring data from southern Thailand clusters at 0.75-0.79

Why soiling factor 0.97 (3% loss):
- Ko Phangan has salt-spray from Gulf of Thailand + monsoon dust deposits
- Cleaning frequency assumed 2x/year (standard EPC contract)
- IEA PVPS T13-10:2018 Table 4: 2-4% for tropical coastal sites

**Override:** Set `performance_ratio` and/or `soiling_factor` in client JSON.
**For battery systems:** Same PR applies (inverter efficiency already in PR).

---

## 2. Degradation Model

**Formula (IEC 61215 / Jordan & Kurtz 2013, NREL):**

```
year 1:  factor = 0.98          (2% LID -- Light Induced Degradation)
year 2:  factor = 0.98
year N:  factor = 0.98 * (1 - 0.005)^(N-2)   for N >= 2
```

| Parameter | Value | Source |
|-----------|-------|--------|
| Year-1 LID | -2% | IEC 61215, mono-PERC/TOPCon typical |
| Annual rate (yr 2+) | -0.5%/yr | Jordan & Kurtz 2013, NREL technical report NREL/JA-5200-51664 |

**Previous (wrong):** `factor = (1 - 0.005)^(year-1)` -- assumed 0% in year 1.

**Energy in year N:**
```
yearlyKwh(N) = kwp * psh * 365 * effectivePR * degradationFactor(N)
```

---

## 3. Net Billing / Tariff Model

**Thailand PEA (Provincial Electricity Authority) -- B.E. 2566 (2023)**

```
effectiveRate = selfConsumptionPct * retailRate + (1 - selfConsumptionPct) * exportRate
```

| Parameter | Default | Override key |
|-----------|---------|--------------|
| Retail rate | 4.4 THB/kWh | `tariff_thb_per_kwh` |
| Export rate (PEA SPP/VSPP) | 3.1 THB/kWh | `tariff_export_thb` |
| Self-consumption, grid-tied | 60% | `self_consumption_pct` |
| Self-consumption, with battery | 85% | `self_consumption_pct` |
| **Blended rate, grid-tied** | **3.88 THB/kWh** | = 0.60*4.4 + 0.40*3.1 |
| **Blended rate, with battery** | **4.21 THB/kWh** | = 0.85*4.4 + 0.15*3.1 |

**Previous (wrong):** Used retail rate (4.4) for 100% of production -- ignored export penalty.
This overstated savings by ~3-5% for grid-tied systems.

**Source:** PEA tariff schedule + current TM Energy export-rate assumption. Treat the export rate as a proposal assumption until the specific PEA approval/export arrangement is confirmed.

---

## 4. Payback Period

**Discounted Payback Period (DPP)**

```
Find smallest year T such that:
  sum_{t=0}^{T} cashflow(t) / (1 + r)^t >= 0

Then interpolate:
  payback = (T-1) + |cumNPV(T-1)| / discountedCF(T)
```

| Parameter | Value |
|-----------|-------|
| Discount rate | 8% |
| Source | WACC estimate for Thai solar projects, TM Energy internal |

**Previous (wrong):** `paybackYears = epcCost / (annualSavingsYear1 - annualOMCost)` -- simple (undiscounted) payback. Understated payback by 1-2 years for typical projects.

**Example (AMIR-001, 12.76 kWp, 450,000 THB):**
- Simple payback: 450,000 / (79,900 - 4,500) = 5.96 yr
- Discounted payback @ 8%: ~7.1 yr

---

## 5. CO2 Emission Factor

| Value | Source |
|-------|--------|
| **0.477 kg CO2/kWh** | EGAT (Electricity Generating Authority of Thailand), 2023 grid emission factor report |

**Previous:** 0.5 kg CO2/kWh (outdated, pre-2023 estimate).

**Usage:**
```
co2TonsAvoided = (lifetimeKwh * 0.477) / 1000
```

---

## 6. PSH Values -- Ko Phangan

**Source:** NASA POWER Climatology 1984-2005, location 8.1 N / 100.1 E

| Month | PSH (h/day) | % of peak |
|-------|-------------|-----------|
| January | 5.7 | 90% |
| February | 6.1 | 97% |
| March | 6.3 | 100% |
| April | 6.0 | 95% |
| May | 4.8 | 76% |
| June | 4.4 | 70% |
| July | 4.2 | 67% |
| August | 4.0 | 63% |
| September | 4.2 | 67% |
| October | 3.8 | 60% |
| November | 4.8 | 76% |
| December | 5.4 | 86% |
| **Annual average** | **5.0** | |

**Override:** Set `psh_avg` in client JSON for non-default location.
**Full config:** `tools/proposal-builder/bom-templates.json` -> `locations.koh_phangan`

---

## 7. Inverter DC/AC Ratio Validation

**Standard:** IEC 62548:2016 + NREL best practice

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Undersized | DC/AC < 1.05 | Warning: clipping at low irradiance |
| Optimal | 1.05 - 1.35 | No warning |
| Oversized | DC/AC > 1.35 | Warning: >5% annual clipping loss |

```
DC/AC ratio = system_kwp / inverter_ac_kw
```

Implemented in `bom-calc.mjs` `validateDcAcRatio()`.

---

## 8. 25-Year Cashflow Model

```
t=0:  cashflow = -epcCost
t=N:  cashflow = yearlyKwh(N) * blendedRate * (1+tariffEscalation)^(N-1) - annualOMCost
```

| Parameter | Value |
|-----------|-------|
| O&M cost | 1% of EPC/year |
| Tariff escalation | 3%/year |
| System life | 25 years |

---

## Override Reference

Any of these fields in the client JSON will override calculated defaults:

| JSON field | Overrides |
|------------|-----------|
| `psh_avg` | Annual PSH from NASA |
| `performance_ratio` | Base PR (0.77) |
| `soiling_factor` | Soiling multiplier (0.97) |
| `tariff_thb_per_kwh` | Retail rate (4.4 THB/kWh) |
| `tariff_export_thb` | Export rate (3.1 THB/kWh) |
| `self_consumption_pct` | Self-consumption fraction |
| `discount_rate` | Discount rate (8%) |
| `tariff_escalation` | Tariff escalation (3%/yr) |
| `location_id` | Full location config key |
| `payback_years_no_tax` | Override displayed payback |
| `annual_kwh` | Override displayed production |

Set `location_id` to any key in `bom-templates.json` -> `locations` for full per-location config.

---

## Calculated Fields Are Authoritative

`generate.mjs` calculates financial metrics automatically and uses them for rendering and Supabase storage.
Manual financial fields are allowed only when `manual_financial_override: true` is set in the client JSON and the reason is documented in `metadata.manual_override_reason`.

Before sending a proposal:
1. Run `node generate.mjs --data clients/X.json --skip-pdf --skip-supa`
2. Check the printed `-- CALCULATED FINANCIALS (v1.1) --` section
3. If a manual override is required, set `manual_financial_override: true` and document the commercial reason

---

*References:*
- IEC 61724-1:2017 Photovoltaic system performance
- IEC 61215:2016 Terrestrial PV modules -- design qualification and type approval
- IEC 62548:2016 PV arrays -- design requirements
- Jordan & Kurtz (2013) NREL/JA-5200-51664 Photovoltaic Degradation Rates
- Skoplaki & Palyvos (2009) Energy 34(1) Performance ratio for PV systems in warm climates
- IEA PVPS T13-10:2018 Assessment of Performance Loss Rate
- EGAT (2023) Grid Emission Factor Thailand
- PEA Feed-in Tariff Royal Gazette Vol. 140 Part 55g (2023)
- NASA POWER climatology archive https://power.larc.nasa.gov/
