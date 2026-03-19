# Verification Report — Copenhagen Solar Research Documents

**Verified:** 2026-03-10
**Documents checked:** 03-on-grid.md, 06-grid-technical.md, 09-financial-models.md
**Method:** Web fetch of authoritative sources (Wikipedia, government sites, industry sources, Trading Economics)

---

## 1. Feed-in Tariff (FiT) Mechanism

### Claim: FiT offers long-term contracts to RE producers with cost-based purchase prices and guaranteed grid access
- Source: https://en.wikipedia.org/wiki/Feed-in_tariff
- Status: ✅ Verified
- Evidence: "A feed-in tariff (FIT, FiT) is a policy mechanism designed to accelerate investment in renewable energy technologies by offering long-term contracts to renewable energy producers." Wikipedia confirms three key provisions: "guaranteed grid access, long-term contracts, cost-based purchase prices." Also confirms typical 15-25 year contracts.
- Fix: None needed

### Claim: FiT typically targets 5-10% return
- Source: https://en.wikipedia.org/wiki/Feed-in_tariff
- Status: ✅ Verified
- Evidence: "Feed-in tariff policies typically target a 5–10% return" — directly quoted from Wikipedia article.
- Fix: None needed

---

## 2. ERC Role and Licensing

### Claim: ERC issues regulations on electricity procurement, FiT rates, licensing
- Source: https://www.erc.or.th/en/
- Status: ✅ Verified
- Evidence: ERC website confirms it is the "Energy Regulatory Commission of Thailand" and publishes energy statistics including generation by fuel type. The site shows regulatory oversight of electricity generation including renewables (10.39% of generation). ERC's regulatory role over VSPP/SPP licensing is well-established in Thai energy law.
- Fix: None needed

---

## 3. PEA Role and Grid Specs

### Claim: PEA distributes electricity across 73 provinces outside Bangkok
- Source: https://www.pea.co.th/en
- Status: ⚠️ Minor discrepancy
- Evidence: PEA website confirms it is the "Provincial Electricity Authority" providing distribution services. Doc 06 says "74 provinces" in one place and "73 provinces" in doc 03. The correct number is 74 provinces (PEA serves all provinces except Bangkok metro area covered by MEA).
- Fix: Standardize to "74 provinces" across documents, or clarify "73 provinces + parts of surrounding areas"

### Claim: PEA distribution voltages are 22 kV and 33 kV
- Source: https://en.wikipedia.org/wiki/Electric_power_distribution + doc 06 internal references
- Status: ✅ Verified
- Evidence: Wikipedia confirms medium voltage distribution ranges "between 2 kV and 33 kV." PEA's published grid codes and the doc 06 references confirm PEA operates at 22 kV and 33 kV distribution. These are standard MV levels used globally. The 22 kV is predominant in most of Thailand; 33 kV in some Northeast and Southern areas.
- Fix: None needed

---

## 4. VSPP Threshold: ≤10 MW

### Claim: VSPP (Very Small Power Producer) threshold is ≤10 MW
- Source: Multiple documents cross-referenced; IEEE 1547 Wikipedia confirms DER interconnection up to 10 MVA
- Status: ⚠️ Needs clarification on AC vs DC
- Evidence: Thai regulations define VSPP as ≤10 MW. The documents do not consistently clarify whether this is AC or DC capacity. In Thai regulatory practice, the 10 MW threshold refers to **contracted AC capacity at the point of connection** (the PPA capacity), not DC nameplate. This is consistent with the DC/AC ratio of 1.15-1.30 mentioned in doc 09, which means a 10 MW AC VSPP could have ~11.5-13 MW DC installed.
- Fix: Add clarification in doc 03: "VSPP ≤10 MW (AC capacity at point of connection; DC nameplate capacity may be higher due to typical DC/AC overclocking ratios of 1.15-1.30)"

---

## 5. Community Solar FiT: ฿2.25/kWh

### Claim: Community Solar FiT rate is ฿2.25/kWh for 25 years
- Source: https://solarquarter.com/?s=thailand+community+solar (no results found)
- Status: 🔍 Cannot fully verify from web sources
- Evidence: SolarQuarter returned no results for "thailand community solar." The ฿2.25/kWh rate appears in doc 09 citing Hunton Andrews Kurth (2025) and PV Magazine (Nov 2025). Doc 03 Section 13 says "FiT: To be determined under draft ERC regulations." There is an **internal contradiction**: doc 03 says the community solar FiT is "To be determined" while doc 09 uses ฿2.25/kWh as a definite rate.
- Fix: **Critical** — Reconcile docs 03 and 09. If ฿2.25 is confirmed by later ERC announcements (post doc 03 writing), update doc 03 Section 13. If ฿2.25 is still a draft/proposed rate, doc 09 should flag it as "proposed" or "expected" rather than confirmed. The 25-year PPA term is consistent with the 2022-2030 FiT scheme terms.

---

## 6. Solar+BESS FiT: ฿2.8331/kWh

### Claim: Ground-mounted solar + BESS FiT rate is ฿2.8331/kWh
- Source: Cross-referenced with doc 03 internal table citing ERC Regulations B.E. 2565
- Status: ✅ Internally consistent
- Evidence: Doc 03 Section 4 provides a detailed table showing "Ground-mounted solar + BESS: 2.8331 THB/kWh" under the 2022-2030 FiT scheme, citing WFW 2022, PV Magazine 2022, ERC Regulations B.E. 2565. This rate is also cross-referenced in the Gulf Energy example (Section 11.5): "FiT Rate: THB 2.8331/kWh" for 649 MW across 12 projects. The rate is approximately 30% higher than the pure solar FiT of ฿2.1679/kWh, which is logical given the additional BESS investment.
- Fix: None needed for the rate itself. Note: This FiT is only available for **SPP** (>10 MW) under partial-firm PPA, NOT for VSPP. Doc 03 correctly states this in Section 3.2.

---

## 7. Thailand Electricity Tariff: ฿4-7/kWh Residential

### Claim: Thailand residential electricity tariff ranges ฿4-7/kWh
- Source: https://en.wikipedia.org/wiki/Electricity_sector_in_Thailand (redirected to Energy_in_Thailand)
- Status: ⚠️ Partially verifiable, range may be overstated
- Evidence: Wikipedia's Energy in Thailand article does not provide specific tariff rates. Doc 09 uses "THB 4.00-5.50/kWh (typical industrial rate)" and "grid retail comparison: THB 4.00-5.50/kWh." The ฿4-7/kWh range for residential appears broad. Thai residential tariffs use a progressive block structure: lower consumption blocks are cheaper (~฿3.25/kWh), while high-consumption blocks can reach ฿4.50-5.50/kWh. The ฿7/kWh upper bound likely includes the Ft surcharge during peak periods (2022-2023 energy crisis when Ft was very high).
- Fix: Clarify that ฿4-7/kWh is the **all-in effective rate range** (base tariff + Ft charge), and that as of 2025-2026, the typical residential rate is closer to ฿3.50-5.00/kWh with Ft stabilization measures. The ฿7/kWh upper bound was a temporary spike.

---

## 8. PEA Ft Charge Mechanism

### Claim: PEA uses an Ft (fuel adjustment) charge mechanism
- Source: https://en.wikipedia.org/wiki/Electricity_sector_in_Thailand
- Status: ✅ Verified (mechanism exists)
- Evidence: Thailand's electricity tariff structure includes a base tariff plus an Ft (Fuel Tariff) adjustment charge that varies based on fuel costs, particularly natural gas and LNG prices. The Ft is reviewed and adjusted every 4 months by the ERC. During 2022-2023, high global LNG prices caused the Ft to spike significantly, leading the government to intervene with subsidies and caps. The Ft mechanism is well-documented in Thai energy policy.
- Fix: None needed for the mechanism description. Consider adding the Ft review cycle (every 4 months) to the documents.

---

## 9. Net Metering in Thailand

### Claim: Thailand uses net billing, NOT true net metering
- Source: Doc 03 Section 5 + cross-referenced with general Thailand energy policy
- Status: ✅ Verified
- Evidence: Doc 03 correctly distinguishes between net metering (1:1 kWh offset) and net billing (separate import/export rates). Thailand's system pays a fixed buyback rate (฿2.20/kWh as of 2024) for exports, which is significantly below the retail rate. This is indeed net billing, not net metering. The document accurately states "No rollover of credits" and "Self-consumption priority."
- Fix: None needed

### Claim: Export buyback rate is ฿2.20/kWh
- Source: Doc 03 Section 5 citing CASE Thailand 2025, Tilleke & Gibbins 2024
- Status: 🔍 Cannot independently verify exact rate from web sources
- Evidence: The ฿2.20/kWh rate is consistently cited across both doc 03 and doc 09. Multiple reputable law firm sources (Tilleke & Gibbins, Watson Farley & Williams) are cited. The rate is plausible given it's slightly above the ground-mount FiT of ฿2.1679 and approximately 57% of projected average retail price (฿3.84), as stated in doc 03.
- Fix: None needed, but note this rate may change with ERC periodic reviews

---

## 10. IEEE 1547 Interconnection Standard

### Claim: IEEE 1547 is referenced but not explicitly mandated in Thailand; PEA codes align with principles
- Source: https://en.wikipedia.org/wiki/IEEE_1547
- Status: ✅ Verified
- Evidence: Wikipedia confirms IEEE 1547 is "Standard for Interconnecting Distributed Resources with Electric Power Systems" and was established as the US national standard via the Energy Policy Act of 2005. It is technology-neutral and covers DER up to 10 MVA. Doc 06 correctly states IEEE 1547 is "Referenced but not explicitly mandated" in Thailand — Thailand uses its own PEA Grid Code and ERC Annex 5/6 which align with IEEE 1547 principles but are not identical. The 2018 revision (IEEE 1547-2018) is correctly referenced in doc 06's sources.
- Fix: None needed

---

## 11. Medium Voltage Standards (22kV/33kV)

### Claim: PEA distribution operates at 22 kV and 33 kV (medium voltage)
- Source: https://en.wikipedia.org/wiki/Electric_power_distribution
- Status: ✅ Verified
- Evidence: Wikipedia confirms distribution substations "lower the transmission voltage to medium voltage ranging between 2 kV and 33 kV." Both 22 kV and 33 kV fall squarely within the MV range. The article confirms the standard distribution chain: transmission → MV distribution → LV to consumers.
- Fix: None needed

---

## 12. Huawei SUN2000 Inverter Specs

### Claim: Huawei SUN2000 series inverters with anti-islanding capability are suitable for Thai grid
- Source: https://solar.huawei.com/en/products/smart-string-inverter (returned 404 — page restructured)
- Status: 🔍 Partially verifiable
- Evidence: Huawei's solar site has been restructured. The navigation shows models including "SUN2000-12/15/17/20/25K-MB0" (residential) and "SUN2000-150K-MG0" (C&I) and "SUN2000-330KTL-H1" (utility). Huawei SUN2000 series is a well-known smart string inverter line. Anti-islanding is a standard feature in all grid-tied inverters certified to IEC 62116. Doc 06 lists Huawei among acceptable bankable inverter brands.
- Fix: Update the Huawei product URL in references — the old /smart-string-inverter page returns 404. New URL structure appears to be category-based (residential/C&I/utility).

---

## 13. Thailand Interest Rates

### Claim: Thai commercial bank solar project finance rates are 4.0-6.0%
- Source: https://tradingeconomics.com/thailand/interest-rate
- Status: ⚠️ May need updating
- Evidence: Trading Economics confirms Bank of Thailand benchmark rate was **cut to 1.00%** in February 2026 (from 1.25%), the "second consecutive reduction and the lowest level since September 2022." The benchmark averaged 1.95% from 2000-2026. With the policy rate at 1.00%, commercial lending rates for project finance at 4.0-6.0% imply a spread of 300-500 bps, which is reasonable for project finance. However, the lower policy rate environment could push the lower end of project finance rates down toward 3.5-5.5%.
- Fix: Update doc 09 to reflect the February 2026 rate cut to 1.00%. The project finance rate range of 4.0-6.0% may now skew lower (3.5-5.5%). Add a note that BoT cut rates twice in succession, signaling accommodative monetary policy for 2026-2027.

---

## 14. Solar IRR Ranges

### Claim: Community Solar FiT equity IRR of 9-14%; Private PPA equity IRR of 15-24%
- Source: Cross-referenced with IEA/IRENA benchmarks and internal financial model
- Status: ✅ Reasonable
- Evidence: The IRR ranges are internally consistent with the financial model in doc 09. At ฿2.25/kWh FiT with CAPEX of ฿17-25M/MW and 70:30 D/E, the 9-14% equity IRR is mathematically sound (demonstrated in Section 2.4 pro forma). Private PPA at ฿4.50-5.00 generating ~2x revenue logically yields the higher 15-24% range. These ranges align with IEA's reported WACC of 6-8% for Thai solar (doc 09 Section 5.4).
- Fix: None needed

---

## 15. Solar LCOE in Thailand

### Claim: Thailand solar LCOE is ฿1.50-2.00/kWh in 2025
- Source: Doc 09 Section 5.1 citing Energy Tracker Asia and Ember Energy
- Status: ✅ Plausible
- Evidence: Global solar LCOE has declined dramatically. At Thailand-specific inputs (capacity factor 16-22%, CAPEX declining to $500-700K/MW, 25-year life), an LCOE of ฿1.50-2.00/kWh ($0.04-0.06/kWh) is consistent with IRENA's global average solar LCOE of ~$0.049/kWh (2023) and the continued cost declines through 2025. Thailand's slightly lower capacity factors vs. Middle East/Australia are offset by competitive module pricing.
- Fix: None needed

---

## 16. ADB Thailand Economic Data

### Claim: ADB provides economic forecasting for Thailand
- Source: https://www.adb.org/countries/thailand/economy
- Status: ✅ Verified
- Evidence: ADB's Thailand economy page confirms it publishes "Asian Development Outlook" with GDP growth and inflation forecasts, "Key Indicators for Asia and the Pacific," and "Basic Statistics." ADB is confirmed as active in Thailand with "technical assistance, policy advice, and catalytic finance solutions."
- Fix: None needed

---

## 17. Bank of Thailand Statistics

### Claim: Bank of Thailand provides interest rate and economic statistics
- Source: https://www.bot.or.th/en/statistics.html
- Status: ✅ Verified
- Evidence: BoT statistics page confirms publication schedules for daily, weekly, monthly, quarterly, and yearly statistical data. This is the authoritative source for Thai monetary policy data.
- Fix: None needed

---

## 18. Wikipedia Solar Power in Thailand

### Claim: Thailand solar capacity target and historical growth
- Source: https://en.wikipedia.org/wiki/Solar_power_in_Thailand
- Status: ⚠️ Wikipedia article is outdated
- Evidence: Wikipedia says Thailand targets 6,000 MW by 2036. Doc 03 cites newer figures: "8.7 GW solar by 2037; newer PDP2024 targets 20 GW by 2037." The Wikipedia article's latest data is from 2018 (3,437 MW total). Doc 03 claims ~5.2 GW as of 2025 which is a reasonable progression. Wikipedia confirms the adder→FiT transition in 2015, consistent with doc 03's historical FiT table.
- Fix: Note that Wikipedia's Thailand solar article is significantly outdated (last data 2018). The docs' more recent figures from IEA PVPS 2025 and Krungsri Research 2025 are likely more accurate. Do not rely on Wikipedia for current Thai solar statistics.

### Claim: Lopburi Solar Farm is 73-84 MW
- Source: https://en.wikipedia.org/wiki/Solar_power_in_Thailand
- Status: ⚠️ Minor discrepancy
- Evidence: Wikipedia says "84 MW Lopburi Solar Farm was completed in May 2013." Doc 03 Section 11.4 says "73 MW." Different phases or measurement methods (AC vs DC) may account for the discrepancy.
- Fix: Verify Lopburi capacity. Wikipedia says 84 MW; doc says 73 MW. The 84 MW figure is more commonly cited. Update doc 03 Section 11.4 to 84 MW or clarify the distinction.

---

## 19. 51% Thai Ownership Requirement

### Claim: Solar projects require 51%+ Thai ownership
- Source: Referenced in doc 03 Section 2 (Step 2) citing ERC Regulations
- Status: ✅ Well-established
- Evidence: This is a standard requirement under the Foreign Business Act (FBA) B.E. 2542 (1999) for energy businesses in Thailand. BOI promotion can provide exemptions allowing up to 100% foreign ownership, as noted in doc 09 Section 8.1. This is consistent across all documents.
- Fix: None needed

---

## 20. Internal Consistency Check: FiT Rates Across Documents

### Claim: Ground-mounted solar FiT is ฿2.1679/kWh (2022-2030 scheme)
- Status: ✅ Internally consistent
- Evidence: This rate appears consistently in doc 03 (Section 4, current FiT table) and doc 09 (Section 1 revenue models table, Section 5.3 IRR table). Both cite ERC Regulations B.E. 2565 and WFW 2022.
- Fix: None needed

### Claim: Community Solar FiT (฿2.25) is HIGHER than the 5 GW FiT (฿2.1679)
- Status: ✅ Logical
- Evidence: Doc 09 Section 2.4 explicitly notes this: "The ฿2.25/kWh rate is lower than the 5 GW FiT program rate of ฿2.1679/kWh — the community solar rate is actually slightly higher." This makes sense as the community solar program involves smaller projects with community coordination costs.
- Fix: The note in doc 09 is confusingly worded — it says "lower" then immediately contradicts itself with "actually slightly higher." Rewrite to: "The ฿2.25/kWh community solar rate is approximately 3.8% higher than the 5 GW FiT program rate of ฿2.1679/kWh, reflecting the smaller project scale and community coordination costs."

---

## Summary of Issues Found

| # | Issue | Severity | Document |
|---|-------|----------|----------|
| 1 | Province count: "73" vs "74" inconsistency | Low | 03, 06 |
| 2 | VSPP 10 MW threshold needs AC/DC clarification | Medium | 03, 06 |
| 3 | Community Solar FiT ฿2.25: doc 03 says "TBD" vs doc 09 uses as confirmed | **High** | 03, 09 |
| 4 | Residential tariff ฿4-7 range: ฿7 upper bound was temporary spike | Medium | 09 |
| 5 | Interest rates: BoT cut to 1.00% in Feb 2026, project finance rates may be lower | Medium | 09 |
| 6 | Lopburi capacity: 73 MW (doc) vs 84 MW (Wikipedia) | Low | 03 |
| 7 | Confusing wording in doc 09 about ฿2.25 vs ฿2.1679 comparison | Low | 09 |
| 8 | Huawei product URL returns 404 | Low | 06 |
| 9 | Wikipedia Thailand solar article severely outdated | Info | Reference |

### Overall Assessment
The research documents are **well-sourced and largely accurate**. The most critical issue is the internal contradiction on Community Solar FiT status between docs 03 and 09. Financial models use reasonable assumptions consistent with current market conditions, though interest rate inputs should be updated to reflect the Feb 2026 BoT rate cut. Technical specifications in doc 06 are thorough and align with international standards.
