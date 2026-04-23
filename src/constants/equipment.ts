// ============================================================
// Equipment catalog — PV modules + inverters
// Internal-only. Used by admin proposal form + BOM generator.
// Prices in THB (Thailand baseline from Integra quote 2026-04).
// ============================================================

export interface PanelModel {
  id: string
  brand: string
  model: string
  watt: number
  type: string           // 'mono' | 'n-type' | 'bifacial'
  area_m2: number        // dimensions area (for mounting calc)
  price_thb?: number     // unit price (cost to us)
}

export interface InverterModel {
  id: string
  brand: string
  model: string
  kw: number
  type: 'grid-tied' | 'hybrid' | 'off-grid'
  phases: 1 | 3
  mppt_count?: number
  max_dc_kw?: number
  battery_capable?: boolean
  price_thb?: number
}

export interface BatteryModel {
  id: string
  brand: string
  model: string
  kwh: number               // nominal usable capacity
  voltage_class: 'LV' | 'HV'
  chemistry: string         // 'LiFePO4' | 'NMC'
  cycles: number
  dod_pct: number
  stackable?: boolean
  max_stack_kwh?: number
  compatible_inverters?: string[]  // brand names
  price_thb?: number
}

// ── PANELS ───────────────────────────────────────────────

export const PANEL_MODELS: PanelModel[] = [
  // ─── JA Solar (7 models) ───
  { id: 'ja_410', brand: 'JA Solar', model: 'JAM54S30-410/GR 410W Half-cell', watt: 410, type: 'mono', area_m2: 1.94, price_thb: 1280 },
  { id: 'ja_460', brand: 'JA Solar', model: 'JAM60S30-460/MR 460W', watt: 460, type: 'mono', area_m2: 2.08, price_thb: 1380 },
  { id: 'ja_555', brand: 'JA Solar', model: 'JAM72S30-555/MR 555W', watt: 555, type: 'mono', area_m2: 2.42, price_thb: 1665 },
  { id: 'ja_580', brand: 'JA Solar', model: 'JAM72S40-580/MB 580W N-type', watt: 580, type: 'n-type', area_m2: 2.42, price_thb: 1750 },
  { id: 'ja_600_bi', brand: 'JA Solar', model: 'JAM72D40-600/MB 600W Bifacial', watt: 600, type: 'bifacial', area_m2: 2.42, price_thb: 1820 },
  { id: 'ja_620_bi', brand: 'JA Solar', model: 'JAM66D45-620/LB 620W Bifacial', watt: 620, type: 'bifacial', area_m2: 2.53, price_thb: 1920 },
  { id: 'ja_680_bi', brand: 'JA Solar', model: 'JAM78D45-680/LB 680W N-type Bifacial', watt: 680, type: 'bifacial', area_m2: 2.98, price_thb: 2180 },

  // ─── Jinko (7 models) ───
  { id: 'jinko_410', brand: 'Jinko', model: 'Cheetah JKM410M-6RL3 410W', watt: 410, type: 'mono', area_m2: 1.94, price_thb: 1260 },
  { id: 'jinko_440', brand: 'Jinko', model: 'Tiger Neo JKM440N-54HL4R-V 440W', watt: 440, type: 'n-type', area_m2: 2.02, price_thb: 1380 },
  { id: 'jinko_550', brand: 'Jinko', model: 'Tiger Pro 72HC-BDVP 550W', watt: 550, type: 'mono', area_m2: 2.18, price_thb: 1650 },
  { id: 'jinko_580', brand: 'Jinko', model: 'Tiger Neo JKM580N-72HL4R 580W', watt: 580, type: 'n-type', area_m2: 2.28, price_thb: 1720 },
  { id: 'jinko_600', brand: 'Jinko', model: 'Tiger Neo 600W', watt: 600, type: 'n-type', area_m2: 2.38, price_thb: 1790 },
  { id: 'jinko_620', brand: 'Jinko', model: 'Tiger Neo 78HL4-BDV 620W Bifacial', watt: 620, type: 'n-type', area_m2: 2.42, price_thb: 1850 },
  { id: 'jinko_635', brand: 'Jinko', model: 'Tiger Neo JKM635N-72HL4-BDV 635W', watt: 635, type: 'n-type', area_m2: 2.52, price_thb: 1980 },

  // ─── Trina (5 models) ───
  { id: 'trina_405', brand: 'Trina', model: 'Vertex S TSM-405DE09.08 405W', watt: 405, type: 'mono', area_m2: 1.80, price_thb: 1240 },
  { id: 'trina_555_n', brand: 'Trina', model: 'Vertex S+ TSM-555DE19.20 555W N-type', watt: 555, type: 'n-type', area_m2: 2.42, price_thb: 1680 },
  { id: 'trina_555', brand: 'Trina', model: 'Vertex S+ TSM-555NEG19RC.20 555W', watt: 555, type: 'mono', area_m2: 2.42, price_thb: 1640 },
  { id: 'trina_600', brand: 'Trina', model: 'Vertex S+ TSM-600NEG21C 600W', watt: 600, type: 'mono', area_m2: 2.56, price_thb: 1800 },
  { id: 'trina_700', brand: 'Trina', model: 'Vertex N TSM-NEG21C.20 700W', watt: 700, type: 'n-type', area_m2: 3.11, price_thb: 2150 },

  // ─── LONGi (4 models) ─── popular in Thailand
  { id: 'longi_460', brand: 'LONGi', model: 'Hi-MO 6 LR6-66HPH-460M 460W', watt: 460, type: 'mono', area_m2: 2.08, price_thb: 1360 },
  { id: 'longi_555', brand: 'LONGi', model: 'Hi-MO 5m LR5-72HPH-555M 555W', watt: 555, type: 'mono', area_m2: 2.42, price_thb: 1620 },
  { id: 'longi_590', brand: 'LONGi', model: 'Hi-MO 7 LR7-54HGD-590M 590W N-type', watt: 590, type: 'n-type', area_m2: 2.42, price_thb: 1780 },
  { id: 'longi_615', brand: 'LONGi', model: 'Hi-MO 7 LR7-72HGD-615M 615W N-type Bifacial', watt: 615, type: 'bifacial', area_m2: 2.52, price_thb: 1920 },

  // ─── Canadian Solar (3 models) ───
  { id: 'cs_610', brand: 'Canadian Solar', model: 'TOPHiKu7 CS7N-610N 610W N-type TOPCon', watt: 610, type: 'n-type', area_m2: 2.50, price_thb: 1790 },
  { id: 'cs_640', brand: 'Canadian Solar', model: 'BiKu7 CS7N-640MB-AG 640W Bifacial', watt: 640, type: 'bifacial', area_m2: 2.67, price_thb: 1950 },
  { id: 'cs_665', brand: 'Canadian Solar', model: 'HiKu7 CS7N-665MS 665W', watt: 665, type: 'mono', area_m2: 2.67, price_thb: 2020 },

  // ─── Risen (3 models) ─── very common in Thailand
  { id: 'risen_400', brand: 'Risen', model: 'RSM156-7-400W 400W', watt: 400, type: 'mono', area_m2: 1.96, price_thb: 1180 },
  { id: 'risen_555', brand: 'Risen', model: 'RSM144-7-555W 555W', watt: 555, type: 'mono', area_m2: 2.42, price_thb: 1580 },
  { id: 'risen_600', brand: 'Risen', model: 'RSM156N-8-600W 600W N-type', watt: 600, type: 'n-type', area_m2: 2.52, price_thb: 1740 },
]

// ── INVERTERS ────────────────────────────────────────────

export const INVERTER_MODELS: InverterModel[] = [
  // Huawei — Grid-Tied 3-phase
  { id: 'huawei_10k_gt', brand: 'Huawei', model: 'SUN2000-10KTL-M1', kw: 10, type: 'grid-tied', phases: 3, mppt_count: 2, max_dc_kw: 13, price_thb: 46000 },
  { id: 'huawei_15k_gt', brand: 'Huawei', model: 'SUN2000-15KTL-M0', kw: 15, type: 'grid-tied', phases: 3, mppt_count: 2, max_dc_kw: 20, price_thb: 58000 },
  { id: 'huawei_17k_gt', brand: 'Huawei', model: 'SUN2000-17KTL-M0', kw: 17, type: 'grid-tied', phases: 3, mppt_count: 2, max_dc_kw: 22, price_thb: 62000 },
  { id: 'huawei_20k_gt', brand: 'Huawei', model: 'SUN2000-20KTL-M0', kw: 20, type: 'grid-tied', phases: 3, mppt_count: 2, max_dc_kw: 26, price_thb: 68000 },
  { id: 'huawei_30k_gt', brand: 'Huawei', model: 'SUN2000-30KTL-M3', kw: 30, type: 'grid-tied', phases: 3, mppt_count: 3, max_dc_kw: 39, price_thb: 78000 },
  { id: 'huawei_50k_gt', brand: 'Huawei', model: 'SUN2000-50KTL-M0', kw: 50, type: 'grid-tied', phases: 3, mppt_count: 4, max_dc_kw: 65, price_thb: 83200 },
  { id: 'huawei_60k_gt', brand: 'Huawei', model: 'SUN2000-60KTL-M0', kw: 60, type: 'grid-tied', phases: 3, mppt_count: 6, max_dc_kw: 78, price_thb: 98000 },
  { id: 'huawei_75k_gt', brand: 'Huawei', model: 'SUN2000-75KTL-M0', kw: 75, type: 'grid-tied', phases: 3, mppt_count: 8, max_dc_kw: 97, price_thb: 122000 },
  { id: 'huawei_100k_gt', brand: 'Huawei', model: 'SUN2000-100KTL-M1', kw: 100, type: 'grid-tied', phases: 3, mppt_count: 10, max_dc_kw: 130, price_thb: 168000 },
  { id: 'huawei_125k_gt', brand: 'Huawei', model: 'SUN2000-125KTL-M0', kw: 125, type: 'grid-tied', phases: 3, mppt_count: 10, max_dc_kw: 162, price_thb: 198000 },
  { id: 'huawei_185k_gt', brand: 'Huawei', model: 'SUN2000-185KTL-H1', kw: 185, type: 'grid-tied', phases: 3, mppt_count: 12, max_dc_kw: 240, price_thb: 245000 },

  // Huawei — Hybrid 3-phase (residential)
  { id: 'huawei_8k_h', brand: 'Huawei', model: 'SUN2000-8KTL-M2', kw: 8, type: 'hybrid', phases: 3, mppt_count: 2, max_dc_kw: 12, battery_capable: true, price_thb: 78000 },
  { id: 'huawei_10k_h', brand: 'Huawei', model: 'SUN2000-10KTL-M2', kw: 10, type: 'hybrid', phases: 3, mppt_count: 2, max_dc_kw: 15, battery_capable: true, price_thb: 88000 },
  { id: 'huawei_12k_h', brand: 'Huawei', model: 'SUN2000-12KTL-M2', kw: 12, type: 'hybrid', phases: 3, mppt_count: 2, max_dc_kw: 18, battery_capable: true, price_thb: 98000 },
  { id: 'huawei_15k_h', brand: 'Huawei', model: 'SUN2000-15KTL-M2', kw: 15, type: 'hybrid', phases: 3, mppt_count: 3, max_dc_kw: 22, battery_capable: true, price_thb: 112000 },
  { id: 'huawei_17k_h', brand: 'Huawei', model: 'SUN2000-17KTL-M2', kw: 17, type: 'hybrid', phases: 3, mppt_count: 3, max_dc_kw: 25, battery_capable: true, price_thb: 118000 },
  { id: 'huawei_20k_h', brand: 'Huawei', model: 'SUN2000-20KTL-M5', kw: 20, type: 'hybrid', phases: 3, mppt_count: 3, max_dc_kw: 30, battery_capable: true, price_thb: 125000 },

  // Huawei — Hybrid commercial 3-phase
  { id: 'huawei_30k_nh', brand: 'Huawei', model: 'SUN2000-30KTL-NHM0', kw: 30, type: 'hybrid', phases: 3, mppt_count: 4, max_dc_kw: 42, battery_capable: true, price_thb: 148000 },
  { id: 'huawei_50k_nh', brand: 'Huawei', model: 'SUN2000-50KTL-NHM1', kw: 50, type: 'hybrid', phases: 3, mppt_count: 6, max_dc_kw: 68, battery_capable: true, price_thb: 198000 },

  // DAYE (Deye) — Grid-Tied single-phase
  { id: 'daye_3k_gt_1p', brand: 'DAYE', model: 'D-G3-3K', kw: 3, type: 'grid-tied', phases: 1, mppt_count: 2, max_dc_kw: 4, price_thb: 22000 },
  { id: 'daye_5k_gt_1p', brand: 'DAYE', model: 'D-G3-5K', kw: 5, type: 'grid-tied', phases: 1, mppt_count: 2, max_dc_kw: 6.5, price_thb: 28000 },
  { id: 'daye_6k_gt_1p', brand: 'DAYE', model: 'D-G3-6K', kw: 6, type: 'grid-tied', phases: 1, mppt_count: 2, max_dc_kw: 8, price_thb: 32000 },

  // DAYE — Grid-Tied 3-phase
  { id: 'daye_10k_gt', brand: 'DAYE', model: 'D-G3-10K', kw: 10, type: 'grid-tied', phases: 3, mppt_count: 2, max_dc_kw: 13, price_thb: 42000 },
  { id: 'daye_15k_gt', brand: 'DAYE', model: 'D-G3-15K', kw: 15, type: 'grid-tied', phases: 3, mppt_count: 2, max_dc_kw: 20, price_thb: 52000 },
  { id: 'daye_20k_gt', brand: 'DAYE', model: 'D-G3-20K', kw: 20, type: 'grid-tied', phases: 3, mppt_count: 2, max_dc_kw: 26, price_thb: 62000 },
  { id: 'daye_30k_gt', brand: 'DAYE', model: 'D-G3-30K', kw: 30, type: 'grid-tied', phases: 3, mppt_count: 3, max_dc_kw: 39, price_thb: 78000 },
  { id: 'daye_50k_gt', brand: 'DAYE', model: 'D-G3-50K', kw: 50, type: 'grid-tied', phases: 3, mppt_count: 4, max_dc_kw: 65, price_thb: 98000 },

  // DAYE — Hybrid single-phase
  { id: 'daye_5k_h_1p', brand: 'DAYE', model: 'D-H3-5K (SUN-5K-SG03LP1-EU)', kw: 5, type: 'hybrid', phases: 1, mppt_count: 2, max_dc_kw: 6.5, battery_capable: true, price_thb: 52000 },
  { id: 'daye_8k_h_1p', brand: 'DAYE', model: 'D-H3-8K (SUN-8K-SG03LP1-EU)', kw: 8, type: 'hybrid', phases: 1, mppt_count: 2, max_dc_kw: 10.4, battery_capable: true, price_thb: 64000 },

  // DAYE — Hybrid 3-phase
  { id: 'daye_10k_h', brand: 'DAYE', model: 'D-H3-10K (SUN-10K-SG04LP3-EU)', kw: 10, type: 'hybrid', phases: 3, mppt_count: 2, max_dc_kw: 13, battery_capable: true, price_thb: 78000 },
  { id: 'daye_12k_h', brand: 'DAYE', model: 'D-H3-12K', kw: 12, type: 'hybrid', phases: 3, mppt_count: 2, max_dc_kw: 15.6, battery_capable: true, price_thb: 88000 },
  { id: 'daye_15k_h', brand: 'DAYE', model: 'D-H3-15K', kw: 15, type: 'hybrid', phases: 3, mppt_count: 3, max_dc_kw: 19.5, battery_capable: true, price_thb: 102000 },
  { id: 'daye_20k_h', brand: 'DAYE', model: 'D-H3-20K', kw: 20, type: 'hybrid', phases: 3, mppt_count: 3, max_dc_kw: 26, battery_capable: true, price_thb: 118000 },
  { id: 'daye_30k_h', brand: 'DAYE', model: 'D-H3-30K', kw: 30, type: 'hybrid', phases: 3, mppt_count: 3, max_dc_kw: 39, battery_capable: true, price_thb: 145000 },
  { id: 'daye_50k_h', brand: 'DAYE', model: 'D-H3-50K', kw: 50, type: 'hybrid', phases: 3, mppt_count: 4, max_dc_kw: 65, battery_capable: true, price_thb: 198000 },

  // Sungrow — Grid-Tied single-phase
  { id: 'sg_3k_gt_1p', brand: 'Sungrow', model: 'SG3.0RS-S', kw: 3, type: 'grid-tied', phases: 1, mppt_count: 1, max_dc_kw: 4.5, price_thb: 22000 },
  { id: 'sg_5k_gt_1p', brand: 'Sungrow', model: 'SG5.0RS-S', kw: 5, type: 'grid-tied', phases: 1, mppt_count: 2, max_dc_kw: 7.5, price_thb: 28000 },
  { id: 'sg_6k_gt_1p', brand: 'Sungrow', model: 'SG6.0RS-S', kw: 6, type: 'grid-tied', phases: 1, mppt_count: 2, max_dc_kw: 9, price_thb: 32000 },

  // Sungrow — Grid-Tied 3-phase
  { id: 'sg_10k_gt', brand: 'Sungrow', model: 'SG10KTL-M', kw: 10, type: 'grid-tied', phases: 3, mppt_count: 2, max_dc_kw: 13, price_thb: 42000 },
  { id: 'sg_15k_gt', brand: 'Sungrow', model: 'SG15KTL-M', kw: 15, type: 'grid-tied', phases: 3, mppt_count: 2, max_dc_kw: 20, price_thb: 52000 },
  { id: 'sg_20k_gt', brand: 'Sungrow', model: 'SG20KTL-M', kw: 20, type: 'grid-tied', phases: 3, mppt_count: 2, max_dc_kw: 26, price_thb: 62000 },
  { id: 'sg_30k_gt', brand: 'Sungrow', model: 'SG30KTL-M', kw: 30, type: 'grid-tied', phases: 3, mppt_count: 3, max_dc_kw: 39, price_thb: 78000 },
  { id: 'sg_50cx', brand: 'Sungrow', model: 'SG50CX', kw: 50, type: 'grid-tied', phases: 3, mppt_count: 5, max_dc_kw: 65, price_thb: 98000 },
  { id: 'sg_110cx', brand: 'Sungrow', model: 'SG110CX', kw: 110, type: 'grid-tied', phases: 3, mppt_count: 9, max_dc_kw: 140, price_thb: 175000 },
  { id: 'sg_125cx', brand: 'Sungrow', model: 'SG125CX-P2', kw: 125, type: 'grid-tied', phases: 3, mppt_count: 12, max_dc_kw: 165, price_thb: 195000 },

  // Sungrow — Hybrid single-phase
  { id: 'sg_5rt_1p', brand: 'Sungrow', model: 'SH5.0RT', kw: 5, type: 'hybrid', phases: 1, mppt_count: 2, max_dc_kw: 7.5, battery_capable: true, price_thb: 62000 },
  { id: 'sg_6rt_1p', brand: 'Sungrow', model: 'SH6.0RT', kw: 6, type: 'hybrid', phases: 1, mppt_count: 2, max_dc_kw: 9, battery_capable: true, price_thb: 68000 },

  // Sungrow — Hybrid 3-phase
  { id: 'sg_10rt', brand: 'Sungrow', model: 'SH10RT', kw: 10, type: 'hybrid', phases: 3, mppt_count: 2, max_dc_kw: 13, battery_capable: true, price_thb: 85000 },
  { id: 'sg_15rt', brand: 'Sungrow', model: 'SH15T', kw: 15, type: 'hybrid', phases: 3, mppt_count: 3, max_dc_kw: 20, battery_capable: true, price_thb: 105000 },
  { id: 'sg_20rt', brand: 'Sungrow', model: 'SH20T', kw: 20, type: 'hybrid', phases: 3, mppt_count: 3, max_dc_kw: 26, battery_capable: true, price_thb: 122000 },
  { id: 'sg_25rt', brand: 'Sungrow', model: 'SH25T', kw: 25, type: 'hybrid', phases: 3, mppt_count: 3, max_dc_kw: 32, battery_capable: true, price_thb: 138000 },
]

// ── BATTERIES ────────────────────────────────────────────

export const BATTERY_MODELS: BatteryModel[] = [
  // ─── Huawei LUNA2000 series (residential + C&I) ───
  { id: 'huawei_luna_5', brand: 'Huawei', model: 'LUNA2000-5-S0', kwh: 5, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 6000, dod_pct: 100, stackable: true, max_stack_kwh: 30, compatible_inverters: ['Huawei'], price_thb: 72000 },
  { id: 'huawei_luna_7', brand: 'Huawei', model: 'LUNA2000-7-S1', kwh: 7, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 6000, dod_pct: 100, stackable: true, max_stack_kwh: 42, compatible_inverters: ['Huawei'], price_thb: 98000 },
  { id: 'huawei_luna_10', brand: 'Huawei', model: 'LUNA2000-10-S0', kwh: 10, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 6000, dod_pct: 100, stackable: true, max_stack_kwh: 30, compatible_inverters: ['Huawei'], price_thb: 138000 },
  { id: 'huawei_luna_15', brand: 'Huawei', model: 'LUNA2000-15-S0', kwh: 15, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 6000, dod_pct: 100, stackable: true, max_stack_kwh: 30, compatible_inverters: ['Huawei'], price_thb: 198000 },
  { id: 'huawei_luna_200', brand: 'Huawei', model: 'LUNA2000-200KWH (Commercial ESS)', kwh: 200, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 8000, dod_pct: 95, stackable: false, compatible_inverters: ['Huawei'], price_thb: 2450000 },

  // ─── Pylontech (popular mid-range) ───
  { id: 'pylon_us3000c', brand: 'Pylontech', model: 'US3000C 48V 3.5kWh', kwh: 3.5, voltage_class: 'LV', chemistry: 'LiFePO4', cycles: 6000, dod_pct: 95, stackable: true, max_stack_kwh: 56, compatible_inverters: ['DAYE', 'Sungrow', 'Victron'], price_thb: 48000 },
  { id: 'pylon_us5000', brand: 'Pylontech', model: 'US5000 48V 4.8kWh', kwh: 4.8, voltage_class: 'LV', chemistry: 'LiFePO4', cycles: 6000, dod_pct: 95, stackable: true, max_stack_kwh: 77, compatible_inverters: ['DAYE', 'Sungrow', 'Victron'], price_thb: 62000 },
  { id: 'pylon_force_l2', brand: 'Pylontech', model: 'Force L2 48V 3.6kWh', kwh: 3.6, voltage_class: 'LV', chemistry: 'LiFePO4', cycles: 6000, dod_pct: 90, stackable: true, max_stack_kwh: 28.8, compatible_inverters: ['DAYE', 'Sungrow'], price_thb: 52000 },
  { id: 'pylon_force_h2', brand: 'Pylontech', model: 'Force H2 HV 7-22kWh', kwh: 14, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 6000, dod_pct: 90, stackable: true, max_stack_kwh: 22, compatible_inverters: ['Sungrow', 'DAYE'], price_thb: 180000 },

  // ─── BYD Battery-Box ───
  { id: 'byd_lvs_4', brand: 'BYD', model: 'Battery-Box Premium LVS 4.0', kwh: 4, voltage_class: 'LV', chemistry: 'LiFePO4', cycles: 8000, dod_pct: 96, stackable: true, max_stack_kwh: 24, compatible_inverters: ['Sungrow', 'DAYE', 'SMA'], price_thb: 72000 },
  { id: 'byd_lvs_8', brand: 'BYD', model: 'Battery-Box Premium LVS 8.0', kwh: 8, voltage_class: 'LV', chemistry: 'LiFePO4', cycles: 8000, dod_pct: 96, stackable: true, max_stack_kwh: 24, compatible_inverters: ['Sungrow', 'DAYE', 'SMA'], price_thb: 135000 },
  { id: 'byd_hvm_11', brand: 'BYD', model: 'Battery-Box Premium HVM 11.0', kwh: 11, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 8000, dod_pct: 96, stackable: true, max_stack_kwh: 22.1, compatible_inverters: ['Sungrow', 'SMA', 'Fronius'], price_thb: 185000 },
  { id: 'byd_hvm_22', brand: 'BYD', model: 'Battery-Box Premium HVM 22.1', kwh: 22.1, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 8000, dod_pct: 96, stackable: false, compatible_inverters: ['Sungrow', 'SMA', 'Fronius'], price_thb: 365000 },

  // ─── DAYE (Deye) BOS series ───
  { id: 'daye_bos_5.1', brand: 'DAYE', model: 'BOS-A51.2 5.12kWh 51.2V', kwh: 5.12, voltage_class: 'LV', chemistry: 'LiFePO4', cycles: 6000, dod_pct: 90, stackable: true, max_stack_kwh: 30.72, compatible_inverters: ['DAYE', 'Sungrow'], price_thb: 55000 },
  { id: 'daye_bos_gm5', brand: 'DAYE', model: 'BOS-GM5.1 5.12kWh HV', kwh: 5.12, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 6000, dod_pct: 90, stackable: true, max_stack_kwh: 30.72, compatible_inverters: ['DAYE'], price_thb: 58000 },
  { id: 'daye_bos_10', brand: 'DAYE', model: 'SE-G5.1Pro-B 10.24kWh', kwh: 10.24, voltage_class: 'LV', chemistry: 'LiFePO4', cycles: 6000, dod_pct: 95, stackable: true, max_stack_kwh: 40.96, compatible_inverters: ['DAYE'], price_thb: 102000 },

  // ─── Sungrow (SBR + SBH series) ───
  { id: 'sg_sbr_9.6', brand: 'Sungrow', model: 'SBR096 9.6kWh HV', kwh: 9.6, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 8000, dod_pct: 100, stackable: true, max_stack_kwh: 25.6, compatible_inverters: ['Sungrow'], price_thb: 138000 },
  { id: 'sg_sbr_12.8', brand: 'Sungrow', model: 'SBR128 12.8kWh HV', kwh: 12.8, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 8000, dod_pct: 100, stackable: true, max_stack_kwh: 25.6, compatible_inverters: ['Sungrow'], price_thb: 175000 },
  { id: 'sg_sbr_16', brand: 'Sungrow', model: 'SBR160 16kWh HV', kwh: 16, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 8000, dod_pct: 100, stackable: true, max_stack_kwh: 25.6, compatible_inverters: ['Sungrow'], price_thb: 215000 },
  { id: 'sg_sbr_25.6', brand: 'Sungrow', model: 'SBR256 25.6kWh HV', kwh: 25.6, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 8000, dod_pct: 100, stackable: false, compatible_inverters: ['Sungrow'], price_thb: 340000 },
  { id: 'sg_sbh_40', brand: 'Sungrow', model: 'SBH040 40kWh HV (C&I)', kwh: 40, voltage_class: 'HV', chemistry: 'LiFePO4', cycles: 8000, dod_pct: 95, stackable: true, max_stack_kwh: 70, compatible_inverters: ['Sungrow'], price_thb: 520000 },
]

// Helper: group inverters by brand + type for optgroup UI
export function groupInverters(): Record<string, InverterModel[]> {
  const groups: Record<string, InverterModel[]> = {}
  for (const inv of INVERTER_MODELS) {
    const phaseLabel = inv.phases === 1 ? '1φ' : '3φ'
    const typeLabel = inv.type === 'grid-tied' ? 'On-Grid' : inv.type === 'hybrid' ? 'Hybrid' : 'Off-Grid'
    const key = `${inv.brand} — ${typeLabel} (${phaseLabel})`
    groups[key] ??= []
    groups[key].push(inv)
  }
  return groups
}

export function groupPanels(): Record<string, PanelModel[]> {
  const groups: Record<string, PanelModel[]> = {}
  for (const p of PANEL_MODELS) {
    groups[p.brand] ??= []
    groups[p.brand].push(p)
  }
  return groups
}

export function groupBatteries(): Record<string, BatteryModel[]> {
  const groups: Record<string, BatteryModel[]> = {}
  for (const b of BATTERY_MODELS) {
    const key = `${b.brand} (${b.voltage_class})`
    groups[key] ??= []
    groups[key].push(b)
  }
  return groups
}

// Pick battery that matches inverter brand + target kWh
export function pickBattery(targetKwh: number, inverterBrand?: string) {
  const compatible = BATTERY_MODELS.filter((b) =>
    !inverterBrand || (b.compatible_inverters?.includes(inverterBrand) ?? false)
  )
  // Find single module closest to target
  const sorted = [...compatible].sort((a, b) => Math.abs(a.kwh - targetKwh) - Math.abs(b.kwh - targetKwh))
  return sorted[0] ?? null
}

// Helper: auto-pick best inverter for a given kwp + optional type preference
export function pickInverter(kwp: number, opts?: { type?: 'grid-tied' | 'hybrid'; phases?: 1 | 3; brand?: string }) {
  const filtered = INVERTER_MODELS.filter((i) =>
    (!opts?.type || i.type === opts.type) &&
    (!opts?.phases || i.phases === opts.phases) &&
    (!opts?.brand || i.brand === opts.brand)
  )
  // Smallest inverter where max_dc_kw covers kwp × 1.05
  const sorted = [...filtered].sort((a, b) => (a.max_dc_kw ?? a.kw * 1.3) - (b.max_dc_kw ?? b.kw * 1.3))
  for (const inv of sorted) {
    if ((inv.max_dc_kw ?? inv.kw * 1.3) >= kwp * 1.05) return inv
  }
  return sorted[sorted.length - 1] ?? null
}
