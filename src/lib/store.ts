import { create } from 'zustand'
import type { FilterState, Property, Region, ActiveTab, PlatformView, ScanRequest } from '../types'
import type { CrmProject } from '../types/crm'
import type { User } from '@supabase/supabase-js'

type MapStyleId = 'sentinel2024' | 'satellite' | 'mapbox' | 'esri' | 'street'
const MAP_STYLE_KEY = 'bustan:mapStyle'
const MAP_STYLES: MapStyleId[] = ['sentinel2024', 'satellite', 'mapbox', 'esri', 'street']

function readStoredMapStyle(): MapStyleId {
  try {
    const v = localStorage.getItem(MAP_STYLE_KEY) as MapStyleId | null
    if (v && MAP_STYLES.includes(v)) return v
  } catch { /* SSR / private mode */ }
  return 'sentinel2024'
}

function persistMapStyle(style: MapStyleId): void {
  try { localStorage.setItem(MAP_STYLE_KEY, style) } catch { /* ignore */ }
}

interface AppState {
  // Filters
  filters: FilterState
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  setRegion: (region: Region) => void
  setActiveTab: (tab: ActiveTab) => void

  // Selection
  selectedProperty: Property | null
  setSelectedProperty: (property: Property | null) => void

  // Roof draw mode — id of the property whose roof is being drawn (null = off)
  drawRoofFor: string | null
  setDrawRoofFor: (propertyId: string | null) => void

  // Scan-area draw mode — user draws a polygon to define the scan bbox (null = off)
  scanAreaDrawing: boolean
  setScanAreaDrawing: (drawing: boolean) => void

  // Detected-roof review (P3): candidates from the offline detector + the one under review
  roofCandidates: Property[]
  setRoofCandidates: (candidates: Property[]) => void
  removeRoofCandidate: (id: string) => void
  reviewCandidate: Property | null
  setReviewCandidate: (candidate: Property | null) => void

  // On-demand scan requests (P4)
  scanRequests: ScanRequest[]
  setScanRequests: (requests: ScanRequest[]) => void

  // Map
  mapStyle: 'sentinel2024' | 'satellite' | 'mapbox' | 'esri' | 'street'
  setMapStyle: (style: AppState['mapStyle']) => void
  cycleMapStyle: () => void

  // Data
  properties: Property[]
  setProperties: (properties: Property[]) => void
  /** Colliers demo portfolio — kept separate so demo/bustan reloads don't wipe it */
  colliersProperties: Property[]
  setColliersProperties: (properties: Property[]) => void
  gridData: GeoJSON.FeatureCollection | null
  setGridData: (data: GeoJSON.FeatureCollection) => void

  // Stats
  stats: {
    totalProperties: number
    totalRoofs: number
    totalLands: number
    forSale: number
    avgSolarScore: number
    totalMwp: number
  }
  updateStats: () => void

  // Auth
  user: User | null
  setUser: (user: User | null) => void
  showLoginModal: boolean
  setShowLoginModal: (show: boolean) => void

  // Platform view
  platformView: PlatformView
  setPlatformView: (view: PlatformView) => void

  // CRM
  crmProjects: CrmProject[]
  setCrmProjects: (projects: CrmProject[]) => void
  showCrmPanel: boolean
  setShowCrmPanel: (show: boolean) => void
  crmBuildingIds: Record<string, true>
  updateCrmBuildingIds: () => void
  crmLoading: boolean
  setCrmLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  filters: {
    activeTab: 'rooftops',
    region: 'koh_phangan',
    propertyType: 'all',
    status: 'all',
    gridGrade: 'all',
    priority: 'all',
    systemSize: 'all',
    categoryFilter: 'all',
    minSize: 0,
    maxSize: 100000,
    minPrice: 0,
    maxPrice: 200000000,
    minSolarScore: 0,
    showGrid: true,
    showBufferZones: true,
    showRoofDetection: false,
    searchQuery: '',
  },

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  setRegion: (region) => {
    set((state) => ({
      filters: { ...state.filters, region },
      selectedProperty: null,
    }))
    get().updateStats()
  },

  setActiveTab: (tab) => {
    set((state) => ({
      filters: {
        ...state.filters,
        activeTab: tab,
        propertyType: tab === 'rooftops' ? 'roof' : 'land',
      },
      selectedProperty: null,
    }))
    get().updateStats()
  },

  selectedProperty: null,
  setSelectedProperty: (property) => set({ selectedProperty: property }),

  drawRoofFor: null,
  setDrawRoofFor: (propertyId) => set({ drawRoofFor: propertyId }),

  scanAreaDrawing: false,
  setScanAreaDrawing: (drawing) => set({ scanAreaDrawing: drawing }),

  roofCandidates: [],
  setRoofCandidates: (candidates) => set({ roofCandidates: candidates }),
  removeRoofCandidate: (id) =>
    set((state) => ({ roofCandidates: state.roofCandidates.filter((c) => c.id !== id) })),
  reviewCandidate: null,
  setReviewCandidate: (candidate) => set({ reviewCandidate: candidate }),

  scanRequests: [],
  setScanRequests: (requests) => set({ scanRequests: requests }),

  mapStyle: readStoredMapStyle(),
  setMapStyle: (style) => {
    persistMapStyle(style)
    set({ mapStyle: style })
  },
  cycleMapStyle: () =>
    set((state) => {
      const idx = MAP_STYLES.indexOf(state.mapStyle)
      const next = MAP_STYLES[(idx + 1) % MAP_STYLES.length]
      persistMapStyle(next)
      return { mapStyle: next }
    }),

  properties: [],
  setProperties: (properties) => {
    set({ properties })
    get().updateStats()
  },

  colliersProperties: [],
  setColliersProperties: (properties) => {
    set({ colliersProperties: properties })
    get().updateStats()
  },

  gridData: null,
  setGridData: (data) => set({ gridData: data }),

  stats: {
    totalProperties: 0,
    totalRoofs: 0,
    totalLands: 0,
    forSale: 0,
    avgSolarScore: 0,
    totalMwp: 0,
  },

  updateStats: () => {
    const { properties, colliersProperties, filters } = get()
    const allProperties = [...properties, ...colliersProperties]
    // Apply the same region + activeTab filters that useFilteredProperties uses
    const filtered = allProperties.filter((p) => {
      if (p.region !== filters.region) return false
      if (filters.activeTab === 'rooftops' && p.type !== 'roof') return false
      if (filters.activeTab === 'community-solar' && p.type !== 'land') return false
      return true
    })
    const roofs = filtered.filter((p) => p.type === 'roof')
    const lands = filtered.filter((p) => p.type === 'land')
    const forSale = filtered.filter((p) => p.status === 'sale')
    const scores = roofs.filter((p) => p.solarScore).map((p) => p.solarScore!)
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const totalMwp = roofs.reduce((sum, p) => sum + (p.capacityKwp || 0), 0) / 1000

    set({
      stats: {
        totalProperties: filtered.length,
        totalRoofs: roofs.length,
        totalLands: lands.length,
        forSale: forSale.length,
        avgSolarScore: Math.round(avgScore),
        totalMwp: Math.round(totalMwp * 10) / 10,
      },
    })
  },

  // Platform view
  platformView: 'map',
  setPlatformView: (view) => set({ platformView: view }),

  // Auth
  user: null,
  setUser: (user) => set({ user }),
  showLoginModal: false,
  setShowLoginModal: (show) => set({ showLoginModal: show }),

  // CRM
  crmProjects: [],
  setCrmProjects: (projects) => {
    set({ crmProjects: projects })
    get().updateCrmBuildingIds()
  },
  showCrmPanel: false,
  setShowCrmPanel: (show) => set({ showCrmPanel: show }),
  crmBuildingIds: {} as Record<string, true>,
  updateCrmBuildingIds: () => {
    const { crmProjects } = get()
    const ids: Record<string, true> = {}
    for (const p of crmProjects) {
      if (p.building_id) ids[p.building_id] = true
    }
    set({ crmBuildingIds: ids })
  },
  crmLoading: false,
  setCrmLoading: (loading) => set({ crmLoading: loading }),
}))
