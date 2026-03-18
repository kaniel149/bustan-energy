export type Region = 'koh_phangan' | 'koh_samui' | 'surat_thani'

export type PropertyType = 'roof' | 'land'
export type PropertyStatus = 'sale' | 'rent' | 'private'
export type GridGrade = 'A' | 'B' | 'C' | 'D'
export type RoofPriority = 'A' | 'B' | 'C' | 'D'

export interface SolarCalc {
  usableArea: number
  panelCount: number
  capacityKwp: number
  annualKwh: number
  annualSavingsTHB: number
  epcCost: number
  paybackYears: number
}

export interface GridProximity {
  grade: GridGrade
  distanceMeters: number
  nearestFeatureType: string
  nearestFeatureName: string
  estimatedConnectionCost: number
}

export interface Property {
  id: string
  type: PropertyType
  status: PropertyStatus
  region: Region
  title: string
  location: string
  lat: number
  lng: number
  // Roof-specific
  area?: number
  usableArea?: number
  capacityKwp?: number
  panelCount?: number
  annualKwh?: number
  annualSavings?: number
  epcCost?: number
  solarScore?: number
  priority?: RoofPriority
  category?: string
  // Land-specific
  sizeM2?: number
  sizeRai?: number
  price?: number
  pricePerRai?: number
  listingLink?: string
  // Contact
  ownerName?: string
  phone?: string
  website?: string
  email?: string
  // Grid proximity (calculated)
  gridProximity?: GridProximity
  // Solar calc (calculated)
  solarCalc?: SolarCalc
}

export interface GridFeature {
  id: string
  powerType: string
  name?: string
  voltage?: string
  region: Region
  source: string
}

export type MapLayer = 'satellite' | 'street'
export type ActiveTab = 'rooftops' | 'community-solar'
export type PlatformView = 'map' | 'scanner' | 'pipeline' | 'dashboard'

export type SystemSizeRange = 'all' | 'micro' | 'small' | 'medium' | 'large' | 'utility'
export type CategoryFilter = 'all' | 'residential' | 'commercial' | 'hospitality' | 'mixed' | 'other'

export interface FilterState {
  activeTab: ActiveTab
  region: Region
  propertyType: PropertyType | 'all'
  status: PropertyStatus | 'all'
  gridGrade: GridGrade | 'all'
  priority: RoofPriority | 'all'
  systemSize: SystemSizeRange
  categoryFilter: CategoryFilter
  minSize: number
  maxSize: number
  minPrice: number
  maxPrice: number
  minSolarScore: number
  showGrid: boolean
  showBufferZones: boolean
  searchQuery: string
}

export interface RegionConfig {
  id: Region
  name: string
  nameEn: string
  center: [number, number]
  zoom: number
  bounds: [[number, number], [number, number]]
  irradiance: number // kWh/m2/day
  tariffResidential: number // THB/kWh
  tariffCommercial: number // THB/kWh
  tariffIndustrial: number // THB/kWh
}
