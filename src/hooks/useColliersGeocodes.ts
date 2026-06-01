/**
 * useColliersGeocodes.ts
 *
 * Shared hook that fetches BOTH Colliers geocode data files in parallel:
 *   - /data/colliers-coords.json  — precise per-listing coords (URL → {lat,lng})
 *   - /data/colliers-geocodes.json — district centroid coords (locationRaw text → {lat,lng})
 *
 * Returns { precise, district, loading } for use in PlatformPage and
 * useColliersPortfolio. Both maps default to {} on fetch failure (graceful).
 */

import { useEffect, useState } from 'react'

export interface ColliersGeoMaps {
  precise: Record<string, { lat: number; lng: number }>
  district: Record<string, { lat: number; lng: number }>
  loading: boolean
}

const EMPTY_MAP: Record<string, { lat: number; lng: number }> = {}

export function useColliersGeocodes(): ColliersGeoMaps {
  const [precise, setPrecise] = useState<Record<string, { lat: number; lng: number }>>(EMPTY_MAP)
  const [district, setDistrict] = useState<Record<string, { lat: number; lng: number }>>(EMPTY_MAP)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchJson = (url: string): Promise<Record<string, { lat: number; lng: number }>> =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : EMPTY_MAP))
        .catch(() => EMPTY_MAP)

    Promise.all([
      fetchJson('/data/colliers-coords.json'),
      fetchJson('/data/colliers-geocodes.json'),
    ]).then(([preciseData, districtData]) => {
      if (cancelled) return
      setPrecise(preciseData)
      setDistrict(districtData)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { precise, district, loading }
}
