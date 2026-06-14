import type { RegionConfig, Region } from '../types'

/**
 * Find the region whose bounds contain a point ([lng, lat]). Used to auto-land
 * the user on a region that actually has scanned candidates. Skips the wide
 * 'colliers' catch-all so a real geographic region wins when both match.
 */
export function regionContaining(lng: number, lat: number): Region | null {
  for (const r of Object.values(REGIONS)) {
    if (r.id === 'colliers') continue
    const [[minLng, minLat], [maxLng, maxLat]] = r.bounds
    if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) return r.id
  }
  return null
}

export const REGIONS: Record<string, RegionConfig> = {
  koh_phangan: {
    id: 'koh_phangan',
    name: 'เกาะพะงัน',
    nameEn: 'Ko Phangan',
    center: [99.98, 9.72],
    zoom: 12,
    bounds: [[99.9, 9.65], [100.1, 9.82]],
    irradiance: 5.1,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  koh_samui: {
    id: 'koh_samui',
    name: 'เกาะสมุย',
    nameEn: 'Koh Samui',
    center: [100.0, 9.53],
    zoom: 12,
    bounds: [[99.9, 9.4], [100.15, 9.6]],
    irradiance: 5.0,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  surat_thani: {
    id: 'surat_thani',
    name: 'สุราษฎร์ธานี',
    nameEn: 'Surat Thani',
    center: [99.3, 9.0],
    zoom: 9,
    bounds: [[98.8, 8.4], [99.9, 9.5]],
    irradiance: 4.9,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  colliers: {
    id: 'colliers',
    name: 'คอลลิเออร์ส',
    nameEn: 'Colliers',
    // Bangkok centroid — fits Colliers Thailand demo portfolio
    center: [100.52, 13.74],
    zoom: 10,
    // Wide bounds covering Bangkok + Pattaya + Rayong so fit-to-bounds works
    bounds: [[97.0, 5.5], [106.0, 20.5]],
    irradiance: 5.0,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  // ── Scanned regions (jump-to camera targets) ──────────────────────────────
  bangkok: {
    id: 'bangkok',
    name: 'กรุงเทพมหานคร',
    nameEn: 'Bangkok',
    center: [100.55, 13.74],
    zoom: 11,
    bounds: [[100.30, 13.50], [100.95, 13.96]],
    irradiance: 5.1,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  chonburi_eec: {
    id: 'chonburi_eec',
    name: 'ชลบุรี / EEC',
    nameEn: 'Chonburi / EEC',
    center: [101.04, 13.36],   // AMATA City / EEC core
    zoom: 11,
    bounds: [[100.85, 13.00], [101.25, 13.56]],
    irradiance: 5.2,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  rayong: {
    id: 'rayong',
    name: 'ระยอง',
    nameEn: 'Rayong',
    center: [101.16, 12.75],
    zoom: 11,
    bounds: [[100.90, 12.50], [101.40, 13.02]],
    irradiance: 5.2,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  pathum_thani: {
    id: 'pathum_thani',
    name: 'ปทุมธานี',
    nameEn: 'Pathum Thani',
    center: [100.69, 14.05],   // Navanakorn Industrial Estate
    zoom: 11,
    bounds: [[100.50, 13.90], [100.86, 14.21]],
    irradiance: 5.1,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  samut_prakan: {
    id: 'samut_prakan',
    name: 'สมุทรปราการ',
    nameEn: 'Samut Prakan',
    center: [100.70, 13.55],   // Bang Phli / Bang Pu estates
    zoom: 11,
    bounds: [[100.55, 13.45], [100.85, 13.66]],
    irradiance: 5.1,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  samut_sakhon: {
    id: 'samut_sakhon',
    name: 'สมุทรสาคร',
    nameEn: 'Samut Sakhon',
    center: [100.30, 13.55],   // Mahachai industrial
    zoom: 11,
    bounds: [[100.15, 13.45], [100.45, 13.68]],
    irradiance: 5.1,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  ayutthaya: {
    id: 'ayutthaya',
    name: 'พระนครศรีอยุธยา',
    nameEn: 'Ayutthaya',
    center: [100.63, 14.32],   // Rojana / Hi-Tech industrial estates
    zoom: 11,
    bounds: [[100.45, 14.18], [100.82, 14.46]],
    irradiance: 5.1,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  chachoengsao: {
    id: 'chachoengsao',
    name: 'ฉะเชิงเทรา',
    nameEn: 'Chachoengsao',
    center: [101.10, 13.70],   // Gateway City + EEC data centers
    zoom: 10,
    bounds: [[100.95, 13.45], [101.40, 13.95]],
    irradiance: 5.2,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  prachinburi: {
    id: 'prachinburi',
    name: 'ปราจีนบุรี',
    nameEn: 'Prachinburi',
    center: [101.50, 14.00],   // 304 Industrial Park
    zoom: 10,
    bounds: [[101.20, 13.80], [101.78, 14.22]],
    irradiance: 5.2,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  phuket: {
    id: 'phuket',
    name: 'ภูเก็ต',
    nameEn: 'Phuket',
    center: [98.36, 7.89],     // resorts + hotels (commercial PPA)
    zoom: 11,
    bounds: [[98.27, 7.78], [98.45, 8.02]],
    irradiance: 5.0,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  chiang_mai: {
    id: 'chiang_mai',
    name: 'เชียงใหม่',
    nameEn: 'Chiang Mai',
    center: [99.00, 18.79],
    zoom: 11,
    bounds: [[98.80, 18.60], [99.20, 19.10]],
    irradiance: 5.0,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  khon_kaen: {
    id: 'khon_kaen',
    name: 'ขอนแก่น',
    nameEn: 'Khon Kaen',
    center: [102.85, 16.43],
    zoom: 11,
    bounds: [[102.60, 16.20], [103.20, 16.70]],
    irradiance: 5.1,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
  nakhon_ratchasima: {
    id: 'nakhon_ratchasima',
    name: 'นครราชสีมา',
    nameEn: 'Nakhon Ratchasima',
    center: [102.10, 14.97],
    zoom: 11,
    bounds: [[101.80, 14.80], [102.40, 15.30]],
    irradiance: 5.2,
    tariffResidential: 4.15,
    tariffCommercial: 4.50,
    tariffIndustrial: 4.10,
  },
}
