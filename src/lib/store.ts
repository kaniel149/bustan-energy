import { create } from 'zustand'
import type { FilterState, Property, Region, ActiveTab, PlatformView } from '../types'
import type { CrmProject } from '../types/crm'
import type { User } from '@supabase/supabase-js'

interface AppState {
  // Filters
  filters: FilterState
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  setRegion: (region: Region) => void
  setActiveTab: (tab: ActiveTab) => void

  // Selection
  selectedProperty: Property | null
  setSelectedProperty: (property: Property | null) => void

  // Map
  mapStyle: 'sentinel2024' | 'satellite' | 'mapbox' | 'esri' | 'street'
  setMapStyle: (style: AppState['mapStyle']) => void
  cycleMapStyle: () => void

  // Data
  properties: Property[]
  setProperties: (properties: Property[]) => void
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
    searchQuery: '',
  },

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  setRegion: (region) =>
    set((state) => ({
      filters: { ...state.filters, region },
      selectedProperty: null,
    })),

  setActiveTab: (tab) =>
    set((state) => ({
      filters: {
        ...state.filters,
        activeTab: tab,
        propertyType: tab === 'rooftops' ? 'roof' : 'land',
      },
      selectedProperty: null,
    })),

  selectedProperty: null,
  setSelectedProperty: (property) => set({ selectedProperty: property }),

  mapStyle: 'sentinel2024',
  setMapStyle: (style) => set({ mapStyle: style }),
  cycleMapStyle: () =>
    set((state) => {
      const order: AppState['mapStyle'][] = ['sentinel2024', 'mapbox', 'satellite', 'esri', 'street']
      const idx = order.indexOf(state.mapStyle)
      return { mapStyle: order[(idx + 1) % order.length] }
    }),

  properties: [],
  setProperties: (properties) => {
    set({ properties })
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
    const { properties, filters } = get()
    const filtered = properties.filter((p) => p.region === filters.region)
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
