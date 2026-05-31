import type { RegionConfig } from '../types'

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
}
