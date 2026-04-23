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

// ── PANELS ───────────────────────────────────────────────

export const PANEL_MODELS: PanelModel[] = [
  // JA Solar
  { id: 'ja_555', brand: 'JA Solar', model: 'JAM72S30-555/MR', watt: 555, type: 'mono', area_m2: 2.42, price_thb: 1665 },
  { id: 'ja_580', brand: 'JA Solar', model: 'JAM72S40-580/MB', watt: 580, type: 'n-type', area_m2: 2.42, price_thb: 1750 },
  { id: 'ja_600', brand: 'JA Solar', model: 'JAM72D40-600/MB', watt: 600, type: 'bifacial', area_m2: 2.42, price_thb: 1820 },
  // Jinko
  { id: 'jinko_550', brand: 'Jinko', model: 'Tiger Pro 72HC-BDVP 550W', watt: 550, type: 'mono', area_m2: 2.18, price_thb: 1650 },
  { id: 'jinko_580', brand: 'Jinko', model: 'Tiger Neo N-Type 580W', watt: 580, type: 'n-type', area_m2: 2.28, price_thb: 1720 },
  { id: 'jinko_600', brand: 'Jinko', model: 'Tiger Neo 600W', watt: 600, type: 'n-type', area_m2: 2.38, price_thb: 1790 },
  { id: 'jinko_620', brand: 'Jinko', model: 'Tiger Neo 78HL4-BDV 620W', watt: 620, type: 'n-type', area_m2: 2.42, price_thb: 1850 },
  // Trina
  { id: 'trina_555', brand: 'Trina', model: 'Vertex S+ TSM-555NEG19RC.20 555W', watt: 555, type: 'mono', area_m2: 2.42, price_thb: 1640 },
  { id: 'trina_600', brand: 'Trina', model: 'Vertex S+ TSM-600NEG21C 600W', watt: 600, type: 'mono', area_m2: 2.56, price_thb: 1800 },
  { id: 'trina_700', brand: 'Trina', model: 'Vertex N TSM-NEG21C.20 700W', watt: 700, type: 'n-type', area_m2: 3.11, price_thb: 2150 },
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
