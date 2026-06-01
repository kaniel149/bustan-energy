/**
 * useColliersPortfolio.ts
 *
 * Data-fetching + filter/sort logic for CollierPortfolioPage.
 * Keeps the page component focused on rendering only.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  parseColliersMarkdown,
  summarizeColliers,
  attachGeocodes,
} from '../lib/colliers'
import type { CollierListing, ColliersSummary } from '../lib/colliers'
import { useColliersGeocodes } from './useColliersGeocodes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortKey = 'index' | 'estKwp' | 'areaSqm' | 'priceThb'

export interface PortfolioFilters {
  assetType: string
  province: string
  tier: 'all' | 'A' | 'B' | 'C' | 'D'
}

const DEFAULT_FILTERS: PortfolioFilters = {
  assetType: 'all',
  province: 'all',
  tier: 'all',
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useColliersPortfolio() {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [listings, setListings] = useState<CollierListing[]>([])
  const [summary, setSummary] = useState<ColliersSummary | null>(null)
  const [filters, setFilters] = useState<PortfolioFilters>(DEFAULT_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>('estKwp')
  const [sortAsc, setSortAsc] = useState(false)

  // Shared geocode maps — fetches both precise (URL-keyed) and district (text-keyed)
  const { precise, district, loading: geoLoading } = useColliersGeocodes()

  // Fetch + parse markdown; apply geocodes once both are ready
  useEffect(() => {
    if (geoLoading) return
    let cancelled = false

    fetch('/data/colliers-listings.md')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((md) => {
        if (cancelled) return
        const parsed = parseColliersMarkdown(md)
        const rows = attachGeocodes(parsed, precise, district)
        setListings(rows)
        setSummary(summarizeColliers(rows))
        setStatus('loaded')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setErrorMsg(e instanceof Error ? e.message : String(e))
        setStatus('error')
      })
    return () => { cancelled = true }
  }, [geoLoading, precise, district])

  // Unique filter option lists
  const assetTypes = useMemo(() => {
    const types = new Set(listings.map((l) => l.assetType).filter(Boolean))
    return ['all', ...Array.from(types).sort()]
  }, [listings])

  const provinces = useMemo(() => {
    const provs = new Set(listings.map((l) => l.province).filter(Boolean))
    return ['all', ...Array.from(provs).sort()]
  }, [listings])

  // Filtered + sorted listings
  const filtered = useMemo(() => {
    let rows = listings
    if (filters.assetType !== 'all') rows = rows.filter((l) => l.assetType === filters.assetType)
    if (filters.province !== 'all') rows = rows.filter((l) => l.province === filters.province)
    if (filters.tier !== 'all') rows = rows.filter((l) => l.tier === filters.tier)

    return [...rows].sort((a, b) => {
      let av: number
      let bv: number
      if (sortKey === 'index') { av = a.index; bv = b.index }
      else if (sortKey === 'estKwp') { av = a.estKwp; bv = b.estKwp }
      else if (sortKey === 'areaSqm') { av = a.areaSqm ?? 0; bv = b.areaSqm ?? 0 }
      else { av = a.priceThb ?? 0; bv = b.priceThb ?? 0 }
      return sortAsc ? av - bv : bv - av
    })
  }, [listings, filters, sortKey, sortAsc])

  const hasActiveFilters =
    filters.assetType !== 'all' || filters.province !== 'all' || filters.tier !== 'all'

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  return {
    status,
    errorMsg,
    summary,
    assetTypes,
    provinces,
    filtered,
    filters,
    setFilters,
    sortKey,
    sortAsc,
    hasActiveFilters,
    toggleSort,
    clearFilters,
  }
}
