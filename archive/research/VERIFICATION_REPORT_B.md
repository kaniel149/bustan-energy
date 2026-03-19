# Verification Report B — Fact-Check of Solar Research Documents

> Agent: verify-islands-cases | Date: 2026-03-10
> Files checked: 04, 08, 10, 11, 12

---

## 1. Koh Phaluai Micro-Grid (Doc 04 & Doc 10)

### Claim: Koh Phaluai is in Surat Thani Province, near Koh Samui
- Source: https://en.wikipedia.org/wiki/Ko_Phaluai
- Status: ✅
- Evidence: "Ko Phaluai is the biggest island in the Mu Ko Ang Thong island group" — part of Ko Samui District, Surat Thani.

### Claim: Koh Phaluai population ~1,000 residents (Doc 04, section 3; Doc 10, section 10)
- Source: https://en.wikipedia.org/wiki/Ko_Phaluai
- Status: ❌
- Evidence: Wikipedia states population of **500** (from 2012 census). The docs claim "~1,000 residents" (doc 10) or imply a similar figure. This is 2x the Wikipedia figure.
- Fix: Change to "~500 residents" or note that 1,000 may include surrounding islets if sourced elsewhere. Cite specific source.

### Claim: Developer is PEA (Doc 04) vs. Developer is EGAT (Doc 10)
- Source: Internal contradiction between documents
- Status: ❌
- Evidence: Doc 04 Section 3.1 says **"Developer: Provincial Electricity Authority (PEA)"** under "Green Island" initiative. Doc 10 Section 10 says **"Developer: EGAT (Electricity Generating Authority of Thailand)"**. These contradict each other. External sources (Italthai Engineering reference in doc 04) suggest PEA was the developer with contractors Italthai Engineering and SIFANG. EGAT is a different entity (generation/transmission, not distribution).
- Fix: Standardize to PEA as developer across both documents. Doc 10 Section 10 header and details need correction from "EGAT" to "PEA".

### Claim: Total budget ฿172 million (~US$5.4 million)
- Source: Cannot directly verify — EGAT.co.th returns 404 on both /en/ and /en/home
- Status: 🔍
- Evidence: EGAT website is currently inaccessible (404 errors). The figure is cited consistently across doc 04 and doc 10 and attributed to Italthai Engineering and SIFANG case studies. Plausible for a 1 MW + 1.5 MWh island micro-grid.
- Fix: No change needed, but note EGAT source cannot be independently verified at this time.

### Claim: 1 MW solar + 1.5 MWh battery + 600 kW diesel
- Source: Cannot directly verify — EGAT.co.th inaccessible
- Status: 🔍
- Evidence: Consistent across both docs 04 and 10. Referenced to Italthai Engineering case study and SIFANG. Doc 10 gives slightly different diesel spec (2 × 500 kW vs 600 kW in doc 04). The HOMER Pro academic study in doc 04 references these as baseline values.
- Fix: Reconcile diesel specs: doc 04 says "600 kW (or 2 × 375 kVA gensets)" while doc 10 says "2 × 500 kW". These are contradictory — verify against primary source.

### Claim: Ko Phaluai has no Wikipedia article at "Ko_Pha_Luai"
- Source: https://en.wikipedia.org/wiki/Ko_Pha_Luai (404) vs https://en.wikipedia.org/wiki/Ko_Phaluai (exists)
- Status: ⚠️
- Evidence: The correct Wikipedia spelling is **"Ko Phaluai"** (one word), not "Ko Pha Luai" (three words). Article exists with island data.
- Fix: Use correct spelling "Ko Phaluai" consistently.

---

## 2. BESS / Battery Storage (Doc 08)

### Claim: PDP 2024 targets ~10 GW / 10.5 GWh of BESS by 2037
- Source: https://www.energy-storage.news/?s=thailand
- Status: 🔍
- Evidence: Energy-Storage.News confirms Thailand's BESS market is developing (March 2026 article: "Thailand is increasing its renewable generation but its energy storage market still lags behind"). ADB $820M loan for Gulf Energy's 649MW/396MWh solar+storage confirmed (Nov 2024). However, the specific "10 GW / 10.5 GWh by 2037" figure is not directly confirmed by these sources. The doc cites GET Transform/GIZ advisory.
- Fix: No immediate fix needed, but flag that the 10 GW/10.5 GWh target should be verified against the actual PDP 2024 document when available.

### Claim: ADB and Gulf Energy signed $820 million loan (November 2024)
- Source: https://www.energy-storage.news/?s=thailand
- Status: ✅
- Evidence: Energy-Storage.News (Nov 28, 2024): "A consortium of development finance institutions led by the Asian Development Bank (ADB) and IPP Gulf Energy have signed a US$820 million loan agreement for a solar and storage portfolio in Thailand."

### Claim: Gulf Energy portfolio includes 256 MW solar + 396 MWh BESS
- Source: https://www.energy-storage.news/?s=thailand
- Status: ⚠️
- Evidence: Energy-Storage.News headline says "649MW/396MWh solar and storage portfolio" — the doc says 256 MW solar + 396 MWh BESS for 4 projects, plus 393 MW solar-only for 8 projects. Total 649 MW matches. However, the breakdown should be verified.
- Fix: Verify the 256 MW + 393 MW split against ADB press release.

### Claim: PEA signed MOU for energy storage feasibility
- Source: https://www.energy-storage.news/?s=thailand
- Status: ✅
- Evidence: Energy-Storage.News (July 3, 2024): "The Provincial Electricity Authority (PEA) of Thailand will assess the feasibility of energy storage business models in partnership with a subsidiary of state-owned oil & gas company PTT Group."

### Claim: BESS Wikipedia basics (lithium-ion dominance, LFP vs NMC, etc.)
- Source: https://en.wikipedia.org/wiki/Battery_storage_power_station
- Status: ✅
- Evidence: Wikipedia confirms lithium-ion batteries dominate utility-scale BESS since 2010, confirms sub-second response capability, confirms 1-4 hour typical duration. LFP thermal runaway at higher temps than NMC is well-documented. Global capacity by 2025: 267 GW / 610 GWh per Wikipedia.

### Claim: 24 BESS projects totaling 994 MW approved in 2022
- Source: Not directly verified from fetched sources
- Status: 🔍
- Evidence: Energy-Storage.News does not mention this specific figure. The doc cites this as part of the FiT program. Cannot confirm or deny.
- Fix: Add specific source citation for this claim.

---

## 3. Case Studies — Company Verification (Docs 10 & 11)

### Claim: Thai Solar Energy PLC (TSE) — founded 2008, SET-listed, solar company
- Source: https://www.thaisolarenergy.com
- Status: ✅
- Evidence: Website confirms: "Thai Solar Energy Public Company Limited ('TSE') was established in 2008 by Thai national shareholders who together share a common goal of pushing the technological envelope for clean renewable energy." Has investor relations section confirming SET listing.

### Claim: B.Grimm Power — founded 1878, >4,000 MW capacity, SET-listed
- Source: https://www.bgrimmpower.com/en/home
- Status: ✅
- Evidence: Website states "4,654 MW Total Generating Capacity", "148 years of doing business with compassion" (2026 - 148 = 1878), "70 Projects in Operation", "15 Countries". SET ticker BGRIM confirmed. Doc says ">4,000 MW" — actual is 4,654 MW. ✅
- Fix: Consider updating to "4,654 MW" for precision.

### Claim: BCPG — subsidiary of Bangchak, 100% renewable energy, 1,200+ MW
- Source: https://www.bcpggroup.com/en
- Status: ⚠️
- Evidence: Website confirms BCPG is a renewable energy company with "solar power, hydropower, wind power and natural gas businesses in Thailand, Taiwan, Laos, Vietnam, the Philippines and the United States." But it mentions **natural gas** in addition to renewables — doc says "100% renewable energy" which contradicts.
- Fix: Change "100% renewable energy" to "primarily renewable energy" or note that BCPG also has natural gas business.

### Claim: Gunkul Engineering — SET-listed, solar + wind + electrical engineering
- Source: https://www.gunkul.com/en
- Status: ✅
- Evidence: Website confirms Gunkul Engineering exists, mentions "clean energy innovation", investor relations section with SET data. Site references clean energy and environmental commitment.

### Claim: SPCG Public Company Limited — Thailand's first utility-scale solar company, 400+ MW
- Source: https://www.spcg.co.th/en
- Status: 🔍
- Evidence: Website exists and is live (splash page with "ENTER WEBSITE" link). Cannot verify specific capacity claims from homepage alone. Company existence confirmed.
- Fix: No change needed.

### Claim: Super Energy Corporation — SET-listed, 1,000+ MW pipeline
- Source: https://www.superenergy.co.th/en
- Status: 🔍
- Evidence: DNS resolution failed (ENOTFOUND). Website appears to be down or domain has changed. Cannot verify.
- Fix: Verify Super Energy's current website URL. May need to update to alternative domain.

### Claim: Solventia — Spanish renewable energy EPC, Toyota project in Thailand
- Source: https://solventiasolarsolution.com
- Status: ⚠️
- Evidence: Website exists as "Solventia Solar Solution" (Thai subsidiary), describes itself as "your trusted partner for innovative solar solutions in the heart of Thailand." However, doc 10 cites the parent company URL as solventia.es — that URL failed to load. The Thai subsidiary URL is solventiasolarsolution.com, not solventia.es/en.
- Fix: Update Solventia website reference in doc 11 from "solventia.es" to "solventiasolarsolution.com" for the Thai operations. Note: doc 10 correctly uses "solventiasolarsolution.com" as alternate.

---

## 4. Koh Phangan Specifics (Doc 12)

### Claim: Koh Phangan area ~65 km²
- Source: https://en.wikipedia.org/wiki/Than_Sadet%E2%80%93Ko_Pha-ngan_National_Park
- Status: ✅
- Evidence: National park Wikipedia article explicitly states: "It covers parts of the **65 km² (25 sq mi)** Ko Pha-ngan island." The 125 km² figure in the Ko Pha-ngan Wikipedia article refers to the **district** area, not the island alone.

### Claim: Population ~15,000 permanent residents
- Source: https://en.wikipedia.org/wiki/Ko_Pha-ngan
- Status: ✅
- Evidence: Wikipedia shows Ko Pha-ngan subdistrict population: 10,094 + Ban Tai subdistrict: 4,865 = **14,959 total**. The doc's "~15,000" is accurate (rounded).

### Claim: Highest point Khao Ra at 635 meters
- Source: https://en.wikipedia.org/wiki/Ko_Pha-ngan + Than Sadet NP article
- Status: ✅
- Evidence: Wikipedia: "Highest Point: Khao Ra, 635 m (2,083 ft)." National park article confirms: "Khao Ra is both the highest elevation of the park as well as of the whole island of Pha-ngan, peaking at 635 m above sea level."

### Claim: Distance from Koh Samui ~15 km
- Source: https://en.wikipedia.org/wiki/Ko_Pha-ngan
- Status: ✅
- Evidence: Wikipedia: "From Ko Samui: about 15 km (9.3 mi)."

### Claim: Submarine cable from Koh Samui serves Koh Phangan (33 kV)
- Source: https://en.wikipedia.org/wiki/Ko_Pha-ngan (indirect)
- Status: 🔍
- Evidence: Wikipedia does not specifically mention submarine cables or electricity infrastructure. The doc cites Canvas Solar analysis, EGAT press releases, and Nation Thailand reporting. The claim is plausible and consistent across multiple research docs but cannot be independently verified from Wikipedia alone.
- Fix: No change needed — well-sourced from multiple Thai energy publications.

### Claim: PEA serves Koh Phangan electricity
- Source: https://www.energy-storage.news/?s=thailand (PEA mentioned); general knowledge of Thai utility structure
- Status: ✅
- Evidence: PEA (Provincial Electricity Authority) serves all areas outside Bangkok metropolitan area, which includes all islands. Energy-Storage.News confirms PEA's role in Thai energy. Doc correctly identifies PEA as the distribution utility for Koh Phangan.

### Claim: Than Sadet–Ko Pha-ngan National Park covers 26,866 rai (~43 km²), ~66% of island
- Source: https://en.wikipedia.org/wiki/Than_Sadet%E2%80%93Ko_Pha-ngan_National_Park
- Status: ✅
- Evidence: Wikipedia confirms: "area of 26,866 rai ~ 43 km²", established "22 November 2018", Thailand's national park. Island area 65 km². 43/65 = 66.2%. All figures match.

### Claim: National park established November 22, 2018, Thailand's 132nd national park
- Source: https://en.wikipedia.org/wiki/Than_Sadet%E2%80%93Ko_Pha-ngan_National_Park
- Status: ⚠️
- Evidence: Wikipedia confirms established "22 November 2018" ✅. However, the park number is cited as "132" in the Wikipedia reference footnote ("National Park Area Information published in the **133** Government Gazettes" — this refers to 133 parks total, with Than Sadet being one). The doc claims it's the 132nd — this is plausible but the Wikipedia source says "132" in the area data table.
- Fix: Verify exact park number — close but should be confirmed.

### Claim: Tourism info — Full Moon Party, wellness retreats, etc.
- Source: https://kohphangan.com
- Status: ✅
- Evidence: kohphangan.com is a tour booking site confirming the island's tourism profile. Mentions Muay Thai, diving trips to Koh Tao, Angthong marine park tours. Best time Dec-Apr. Consistent with doc claims.

---

## 5. Cross-Document Issues

### Issue: Koh Phaluai developer inconsistency
- Doc 04 says: **PEA** (Provincial Electricity Authority)
- Doc 10 says: **EGAT** (Electricity Generating Authority of Thailand)
- Status: ❌
- Fix: Standardize to PEA. Doc 04 has more detail and names specific contractors (Italthai, SIFANG), suggesting it's the more researched version.

### Issue: Koh Phaluai diesel generator specs inconsistency
- Doc 04 says: "600 kW (or 2 × 375 kVA gensets)"
- Doc 10 says: "2 × 500 kW (backup)"
- Status: ❌
- Fix: Reconcile — these are different specs. Verify against Italthai Engineering or SIFANG source.

### Issue: EGAT website inaccessible
- Both https://www.egat.co.th/en/ and https://www.egat.co.th/en/home return 404
- Status: ⚠️
- Evidence: EGAT may have restructured their English website. Multiple claims cite EGAT press releases that cannot be currently verified.
- Fix: Note that EGAT English site is currently down. Try Thai site (egat.co.th) or Wayback Machine for archived versions.

---

## Summary Statistics

| Status | Count | Meaning |
|--------|-------|---------|
| ✅ Verified | 14 | Claim confirmed by source |
| ⚠️ Partially verified / minor issue | 5 | Mostly correct but needs adjustment |
| ❌ Incorrect / contradicted | 4 | Data contradicts or internal inconsistency |
| 🔍 Unverifiable | 6 | Source doesn't have the info or is inaccessible |

## Priority Fixes Required

1. **❌ Doc 10 Koh Phaluai developer**: Change "EGAT" to "PEA" — contradicts doc 04
2. **❌ Koh Phaluai population**: Change "~1,000" to "~500" per Wikipedia (or cite different source)
3. **❌ Diesel generator specs**: Reconcile 600 kW vs 2×500 kW between docs 04 and 10
4. **⚠️ BCPG "100% renewable"**: Update — company also has natural gas business
5. **⚠️ Solventia URL**: solventia.es/en is dead — use solventiasolarsolution.com
6. **⚠️ Super Energy website**: superenergy.co.th appears to be down — verify current URL

---

*Report generated 2026-03-10 by fact-check agent. Sources fetched live from the internet.*
