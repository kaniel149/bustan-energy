export type Region =
  | 'koh_phangan'
  | 'koh_samui'
  | 'surat_thani'
  | 'colliers'
  | 'bangkok'
  | 'chonburi_eec'
  | 'rayong'
  | 'pathum_thani'
  | 'samut_prakan'
  | 'samut_sakhon'
  | 'ayutthaya'
  | 'chachoengsao'
  | 'prachinburi'
  | 'phuket'
  | 'chiang_mai'
  | 'khon_kaen'
  | 'nakhon_ratchasima'

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

export interface OwnerDecisionLayer {
  legalOwnerName?: string
  tenantName?: string
  occupierName?: string
  decisionMakerName?: string
  decisionMakerRole?: string
  decisionMakerPhone?: string
  decisionMakerEmail?: string
  decisionMakerLinkedIn?: string
  companyWebsite?: string
  ownerConfidence?: string
  decisionMakerConfidence?: string
  sourceName?: string
  sourceUrl?: string
  lastResearchedAt?: string
  researchStatus?: string
  operationalContactName?: string
  operationalContactRole?: string
  operationalContactPhone?: string
  operationalContactEmail?: string
  existingSolarInstallerName?: string
  existingSolarDeveloperName?: string
  existingSolarSourceName?: string
  existingSolarSourceUrl?: string
}

export interface LeadResearchMetadata {
  source?: string
  sourceId?: string
  latitude?: number
  longitude?: number
  publicTags?: Record<string, string>
  scrapeGraphAI?: Record<string, string>
  roofAreaNote?: string
  salesReason?: string
  outreachAngle?: string
  recommendedNextStep?: string
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
  roofGeom?: GeoJSON.Polygon | GeoJSON.MultiPolygon
  capacityKwp?: number
  panelCount?: number
  // Roof-analysis metadata (populated once bustan 005_roof_meta migration runs)
  roofOrientation?: string
  roofTiltDeg?: number
  roofShading?: string
  roofUsableAreaSqm?: number
  roofAnalysisConfidence?: number
  /** Existing PV detected on the roof (Gemini has_existing_solar). Deprioritizes EPC leads. */
  existingSolar?: boolean
  /** ISO timestamp when the existing-PV check was last run (null = not checked yet). */
  solarCheckedAt?: string
  annualKwh?: number
  annualSavings?: number
  epcCost?: number
  solarScore?: number
  priority?: RoofPriority
  category?: string
  // Land-specific
  sizeM2?: number
  sizeRai?: number
  /** Scan-candidate land tier: 'commercial' | 'farm' | 'utility' (from scan_candidates.tier) */
  tier?: 'commercial' | 'farm' | 'utility'
  price?: number
  pricePerRai?: number
  listingLink?: string
  // Contact
  ownerName?: string
  phone?: string
  website?: string
  email?: string
  ownerDecision?: OwnerDecisionLayer
  leadResearch?: LeadResearchMetadata
  ownerResearchStatus?: string
  sourceUrl?: string
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
export type PlatformView = 'map' | 'scanner' | 'outreach' | 'pipeline' | 'dashboard' | 'colliers'

export type SystemSizeRange = 'all' | 'micro' | 'small' | 'medium' | 'large' | 'utility'
export type CategoryFilter = 'all' | 'residential' | 'commercial' | 'hospitality' | 'mixed' | 'other'

export type ScanStatus = 'queued' | 'running' | 'done' | 'failed'

export interface ScanRequest {
  id: string
  area_geojson: GeoJSON.Polygon
  bbox: number[] | null
  filters: Record<string, unknown>
  status: ScanStatus
  /** 'roof' (default) or 'land'. Added in migration 010_land_scan. */
  scan_type?: 'roof' | 'land'
  counts: Record<string, number>
  error: string | null
  created_at: string
}

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
  showRoofDetection: boolean
  showDataCenters: boolean
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
