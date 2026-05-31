import { useMemo } from 'react'
import { useAppStore } from '../lib/store'
import type { SystemSizeRange } from '../types'

const SYSTEM_SIZE_RANGES: Record<SystemSizeRange, [number, number]> = {
  all: [0, Infinity],
  micro: [0, 5],        // <5 kWp — small homes
  small: [5, 20],       // 5-20 kWp — houses, shops
  medium: [20, 100],    // 20-100 kWp — businesses, hotels
  large: [100, 500],    // 100-500 kWp — large commercial
  utility: [500, Infinity], // 500+ kWp — industrial
}

export { SYSTEM_SIZE_RANGES }

export function useFilteredProperties() {
  const properties = useAppStore((s) => s.properties)
  const colliersProperties = useAppStore((s) => s.colliersProperties)
  const filters = useAppStore((s) => s.filters)

  // Merge colliers into the pool so they survive demo/bustan setProperties calls
  const allProperties = useMemo(
    () => [...properties, ...colliersProperties],
    [properties, colliersProperties],
  )

  return useMemo(() => {
    return allProperties.filter((p) => {
      // Region
      if (p.region !== filters.region) return false

      // Property type
      if (filters.activeTab === 'rooftops' && p.type !== 'roof') return false
      if (filters.activeTab === 'community-solar' && p.type !== 'land') return false

      // Status
      if (filters.status !== 'all' && p.status !== filters.status) return false

      // Grid grade (for community solar)
      if (filters.gridGrade !== 'all' && p.gridProximity?.grade !== filters.gridGrade) return false

      // Priority / Lead quality (for rooftops)
      if (filters.priority !== 'all' && p.priority !== filters.priority) return false

      // System size (kWp range)
      if (filters.systemSize !== 'all') {
        const kwp = p.capacityKwp || 0
        const [min, max] = SYSTEM_SIZE_RANGES[filters.systemSize]
        if (kwp < min || kwp >= max) return false
      }

      // Category
      if (filters.categoryFilter !== 'all') {
        const cat = (p.category || '').toLowerCase()
        if (filters.categoryFilter === 'other') {
          if (['residential', 'commercial', 'hospitality', 'mixed'].includes(cat)) return false
        } else if (cat !== filters.categoryFilter) {
          return false
        }
      }

      // Size
      const size = p.type === 'roof' ? (p.area || 0) : (p.sizeM2 || 0)
      if (size < filters.minSize || size > filters.maxSize) return false

      // Price (for land)
      if (p.type === 'land' && p.price) {
        if (p.price < filters.minPrice || p.price > filters.maxPrice) return false
      }

      // Solar score (for rooftops)
      if (p.type === 'roof' && p.solarScore !== undefined) {
        if (p.solarScore < filters.minSolarScore) return false
      }

      // Search
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase()
        const searchable = [p.title, p.location, p.category, p.ownerName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!searchable.includes(q)) return false
      }

      return true
    })
  }, [allProperties, filters])
}
