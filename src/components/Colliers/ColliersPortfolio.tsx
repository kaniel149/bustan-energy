/**
 * ColliersPortfolio.tsx
 *
 * Reusable portfolio UI for the Colliers Thailand Solar demo.
 * Used by:
 *   - CollierPortfolioPage.tsx  (standalone /colliers route — full page)
 *   - PlatformPage.tsx          (in-platform panel, platformView === 'colliers')
 *
 * Self-contained + scrollable so it works in both contexts.
 */

import { useState } from 'react'
import { ExternalLink, AlertTriangle, Building2, MapPin, Zap, ChevronUp, ChevronDown, X, List, Map } from 'lucide-react'
import {
  COLLIERS_DISCLAIMER,
  COLLIERS_MISSING_FIELDS,
} from '../../lib/colliers'
import type { CollierListing } from '../../lib/colliers'
import { useColliersPortfolio } from '../../hooks/useColliersPortfolio'
import type { SortKey } from '../../hooks/useColliersPortfolio'
import { ColliersMap } from './ColliersMap'

// ---------------------------------------------------------------------------
// Tier colour system
// A #2ED89A (green), B #E8A820 (amber), C #E87D20 (orange), D #E85D3A (red)
// ---------------------------------------------------------------------------

const TIER_CONFIG: Record<
  'A' | 'B' | 'C' | 'D',
  { color: string; bg: string; border: string; label: string }
> = {
  A: { color: '#2ED89A', bg: '#2ED89A18', border: '#2ED89A44', label: 'A — High' },
  B: { color: '#E8A820', bg: '#E8A82018', border: '#E8A82044', label: 'B — Medium-High' },
  C: { color: '#E87D20', bg: '#E87D2018', border: '#E87D2044', label: 'C — Medium' },
  D: { color: '#E85D3A', bg: '#E85D3A18', border: '#E85D3A44', label: 'D — Low' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtThb(n: number | null): string {
  if (n === null) return '—'
  return '฿' + n.toLocaleString('en-US')
}

function fmtSqm(n: number | null): string {
  if (n === null) return '—'
  return n.toLocaleString('en-US') + ' m²'
}

function fmtKwp(n: number): string {
  return n > 0 ? n.toLocaleString('en-US') + ' kWp*' : '—'
}

function topEntries(map: Record<string, number>, n: number): [string, number][] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}

// ---------------------------------------------------------------------------
// Loading / error states
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#E8A820] border-t-transparent rounded-full animate-spin" />
        <span className="text-white/40 text-sm">Loading portfolio data...</span>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px] p-6">
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-md text-center">
        <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-red-300 font-medium mb-1">Failed to load listings</p>
        <p className="text-red-400/70 text-sm">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DisclaimerBanner() {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 bg-[#E8A820]/10 border border-[#E8A820]/40 rounded-xl px-4 py-3"
    >
      <AlertTriangle size={16} className="text-[#E8A820] shrink-0 mt-0.5" />
      <p className="text-[#E8A820]/90 text-xs leading-relaxed">{COLLIERS_DISCLAIMER}</p>
    </div>
  )
}

function TierBadge({ tier }: { tier: 'A' | 'B' | 'C' | 'D' }) {
  const cfg = TIER_CONFIG[tier]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {tier}
    </span>
  )
}

function MissingChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-white/5 border border-white/10 text-white/35">
      {label}
    </span>
  )
}

function StatCard({
  label,
  value,
  sub,
  color = '#E8A820',
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 hover:bg-white/[0.07] transition-colors">
      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString('en-US') : value}
      </p>
      {sub && <p className="text-[10px] text-white/30 mt-1">{sub}</p>}
    </div>
  )
}

function TierStatCard({ tier, count }: { tier: 'A' | 'B' | 'C' | 'D'; count: number }) {
  const cfg = TIER_CONFIG[tier]
  return (
    <div
      className="rounded-2xl border p-4 hover:opacity-90 transition-opacity"
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black"
          style={{ color: cfg.color, backgroundColor: `${cfg.color}22` }}
        >
          {tier}
        </span>
        <p className="text-[10px] text-white/50 uppercase tracking-wider">{cfg.label}</p>
      </div>
      <p className="text-2xl font-bold" style={{ color: cfg.color }}>
        {count}
      </p>
      <p className="text-[10px] text-white/30 mt-0.5">listings</p>
    </div>
  )
}

function FilterChip({
  label,
  active,
  color,
  onClick,
}: {
  label: string
  active: boolean
  color?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
        active
          ? ''
          : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70'
      }`}
      style={
        active
          ? {
              backgroundColor: color ? `${color}18` : 'rgba(46,216,154,0.1)',
              color: color ?? '#2ED89A',
              borderColor: color ? `${color}44` : '#2ED89A44',
            }
          : undefined
      }
    >
      {label}
    </button>
  )
}

function ListingRow({ listing }: { listing: CollierListing }) {
  const tierCfg = TIER_CONFIG[listing.tier]
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
      <td className="px-3 py-3 text-white/30 text-[11px] font-mono w-10">{listing.index}</td>
      <td className="px-3 py-3 max-w-[220px]">
        <p className="text-sm text-white/85 font-medium truncate" title={listing.name}>
          {listing.name || '—'}
        </p>
        <p className="text-[10px] text-white/40 mt-0.5">{listing.assetType || '—'}</p>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wide ${
            listing.listing === 'rent'
              ? 'bg-[#00aaff]/15 text-[#00aaff]'
              : listing.listing === 'sale'
              ? 'bg-[#2ED89A]/15 text-[#2ED89A]'
              : 'bg-white/5 text-white/30'
          }`}
        >
          {listing.listing}
        </span>
      </td>
      <td className="px-3 py-3 text-[11px] text-white/60 whitespace-nowrap">
        {listing.province || '—'}
      </td>
      <td className="px-3 py-3 text-[11px] text-white/60 whitespace-nowrap text-right">
        {fmtSqm(listing.areaSqm)}
      </td>
      <td className="px-3 py-3 text-[11px] text-white/60 whitespace-nowrap text-right">
        {fmtThb(listing.priceThb)}
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <span className="text-[12px] font-semibold" style={{ color: tierCfg.color }}>
          {fmtKwp(listing.estKwp)}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <TierBadge tier={listing.tier} />
      </td>
      <td className="px-3 py-3 max-w-[180px]">
        <div className="flex flex-wrap gap-1">
          {listing.missing.slice(0, 3).map((m) => (
            <MissingChip key={m} label={m} />
          ))}
          {listing.missing.length > 3 && (
            <MissingChip label={`+${listing.missing.length - 3} more`} />
          )}
        </div>
      </td>
      <td className="px-3 py-3 w-10">
        {listing.url ? (
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/30 hover:text-[#E8A820] transition-colors"
            aria-label={`Open listing on DotProperty: ${listing.name}`}
          >
            <ExternalLink size={12} />
          </a>
        ) : (
          <span className="text-white/10">—</span>
        )}
      </td>
    </tr>
  )
}

function Top15Card({ listing, rank }: { listing: CollierListing; rank: number }) {
  const tierCfg = TIER_CONFIG[listing.tier]
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/[0.07] transition-colors flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-black text-white/20 w-5 shrink-0">#{rank}</span>
          <p className="text-sm font-semibold text-white/90 truncate" title={listing.name}>
            {listing.name || '—'}
          </p>
        </div>
        <TierBadge tier={listing.tier} />
      </div>
      <div className="flex items-center gap-2 text-[10px] text-white/45">
        <MapPin size={10} />
        <span>{[listing.district, listing.province].filter(Boolean).join(', ') || '—'}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-white/40">
        <Building2 size={10} />
        <span>{listing.assetType || '—'}</span>
        <span className="mx-1 text-white/20">·</span>
        <span>{fmtSqm(listing.areaSqm)}</span>
      </div>
      <div
        className="rounded-lg px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: tierCfg.bg, border: `1px solid ${tierCfg.border}` }}
      >
        <Zap size={12} style={{ color: tierCfg.color }} />
        <span className="text-sm font-bold" style={{ color: tierCfg.color }}>
          {fmtKwp(listing.estKwp)}
        </span>
        <span className="text-[9px] text-white/30">preliminary / demo estimate</span>
      </div>
      {listing.priceThb !== null && (
        <p className="text-[10px] text-white/40">{fmtThb(listing.priceThb)}</p>
      )}
      {listing.url && (
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-[#E8A820]/60 hover:text-[#E8A820] transition-colors mt-auto"
          aria-label={`Open listing on DotProperty: ${listing.name}`}
        >
          <ExternalLink size={10} />
          DotProperty listing
        </a>
      )}
    </div>
  )
}

function SortTh({
  label,
  sortKey,
  current,
  asc,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  asc: boolean
  onSort: (k: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = current === sortKey
  return (
    <th
      className={`px-3 py-2.5 text-[10px] text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/70 transition-colors select-none ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (asc ? 'ascending' : 'descending') : 'none'}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          asc ? <ChevronUp size={10} /> : <ChevronDown size={10} />
        ) : (
          <span className="w-[10px]" />
        )}
      </span>
    </th>
  )
}

// ---------------------------------------------------------------------------
// View toggle + main component
// ---------------------------------------------------------------------------

type ViewMode = 'list' | 'map'

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode
  onChange: (v: ViewMode) => void
}) {
  return (
    <div
      role="group"
      aria-label="Toggle view"
      className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5 gap-0.5"
    >
      {(['list', 'map'] as const).map((v) => {
        const active = view === v
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              active
                ? 'bg-[#E8A820]/20 text-[#E8A820] border border-[#E8A820]/40'
                : 'text-white/40 hover:text-white/70 border border-transparent'
            }`}
          >
            {v === 'list' ? <List size={12} /> : <Map size={12} />}
            {v === 'list' ? 'List' : 'Map'}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function ColliersPortfolio() {
  const [view, setView] = useState<ViewMode>('list')

  const {
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
  } = useColliersPortfolio()

  if (status === 'loading') return <LoadingState />
  if (status === 'error') return <ErrorState message={errorMsg} />
  if (!summary) return null

  const topAssetTypes = topEntries(summary.byAssetType, 4)
  const topProvinces = topEntries(summary.byProvince, 4)

  return (
    <div className="text-white px-4 sm:px-6 py-6 space-y-8">

      {/* DISCLAIMER */}
      <DisclaimerBanner />

      {/* SUMMARY CARDS */}
      <section aria-label="Portfolio summary">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
          Portfolio Overview
        </h2>

        {/* Row 1 — totals */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <StatCard label="Total Listings" value={summary.total} color="#E8A820" />
          {topAssetTypes.map(([type, count]) => (
            <StatCard key={type} label={type} value={count} sub="listings" color="#00aaff" />
          ))}
          {topProvinces.slice(0, 1).map(([prov, count]) => (
            <StatCard key={prov} label={prov} value={count} sub="listings" color="#2ED89A" />
          ))}
        </div>

        {/* Row 2 — tier distribution */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['A', 'B', 'C', 'D'] as const).map((tier) => (
            <TierStatCard key={tier} tier={tier} count={summary.byTier[tier]} />
          ))}
        </div>

        {/* Missing data fields notice */}
        <div className="mt-4 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
            Fields missing from all listings (required for formal sizing)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COLLIERS_MISSING_FIELDS.map((f) => (
              <span
                key={f}
                className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-white/40"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* TOP 15 SOLAR CANDIDATES */}
      <section aria-label="Top 15 solar candidates">
        <div className="flex items-center gap-3 mb-4">
          <Zap size={14} className="text-[#E8A820]" />
          <h2 className="text-sm font-semibold text-white">
            Top 15 Solar Candidates
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8A820]/15 text-[#E8A820] border border-[#E8A820]/30">
            by est. kWp — preliminary / demo estimates
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {summary.top15.map((l, i) => (
            <Top15Card key={l.id} listing={l} rank={i + 1} />
          ))}
        </div>
      </section>

      {/* FILTERS */}
      <section aria-label="Listing filters">
        <div className="bg-[#0D2137]/80 backdrop-blur-xl rounded-xl border border-white/10 px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-white/40 uppercase tracking-wider shrink-0">
              Filter
            </span>

            {/* Asset type chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-white/30 mr-1">Type:</span>
              {assetTypes.slice(0, 7).map((t) => (
                <FilterChip
                  key={t}
                  label={t === 'all' ? 'All types' : t}
                  active={filters.assetType === t}
                  color="#00aaff"
                  onClick={() => setFilters((f) => ({ ...f, assetType: t }))}
                />
              ))}
            </div>

            <div className="w-px h-4 bg-white/10 hidden sm:block" />

            {/* Tier chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-white/30 mr-1">Tier:</span>
              {(['all', 'A', 'B', 'C', 'D'] as const).map((tier) => (
                <FilterChip
                  key={tier}
                  label={tier === 'all' ? 'All tiers' : tier}
                  active={filters.tier === tier}
                  color={tier !== 'all' ? TIER_CONFIG[tier].color : undefined}
                  onClick={() => setFilters((f) => ({ ...f, tier }))}
                />
              ))}
            </div>

            <div className="w-px h-4 bg-white/10 hidden sm:block" />

            {/* Province select */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30">Province:</span>
              <select
                value={filters.province}
                onChange={(e) => setFilters((f) => ({ ...f, province: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/70 px-2 py-1.5 outline-none focus:border-[#E8A820]/50 transition-colors"
                aria-label="Filter by province"
              >
                {provinces.map((p) => (
                  <option key={p} value={p} className="bg-[#0D2137]">
                    {p === 'all' ? 'All provinces' : p}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] text-[#E85D3A]/80 hover:text-[#E85D3A] transition-colors ml-auto"
                aria-label="Clear all filters"
              >
                <X size={11} />
                Clear
              </button>
            )}

            <span className="text-[10px] text-white/30 ml-auto">
              {filtered.length} / {summary.total}
            </span>
          </div>
        </div>
      </section>

      {/* VIEW TOGGLE + LISTINGS */}
      <section aria-label="All listings">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            All Listings
          </h2>
          <ViewToggle view={view} onChange={setView} />
        </div>

        {view === 'map' ? (
          <ColliersMap listings={filtered} totalCount={summary.total} />
        ) : (
          <div className="bg-[#0D2137]/60 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="px-3 py-2.5 text-left text-[10px] text-white/40 uppercase tracking-wider w-10">
                      #
                    </th>
                    <SortTh label="Name / Type" sortKey="index" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                    <th className="px-3 py-2.5 text-left text-[10px] text-white/40 uppercase tracking-wider">
                      Listing
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] text-white/40 uppercase tracking-wider">
                      Province
                    </th>
                    <SortTh label="Area" sortKey="areaSqm" current={sortKey} asc={sortAsc} onSort={toggleSort} align="right" />
                    <SortTh label="Price ฿" sortKey="priceThb" current={sortKey} asc={sortAsc} onSort={toggleSort} align="right" />
                    <SortTh label="Est. kWp*" sortKey="estKwp" current={sortKey} asc={sortAsc} onSort={toggleSort} align="right" />
                    <th className="px-3 py-2.5 text-center text-[10px] text-white/40 uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] text-white/40 uppercase tracking-wider">
                      Missing data
                    </th>
                    <th className="px-3 py-2.5 w-10" aria-label="Source link" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <ListingRow key={l.id} listing={l} />
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-white/30 text-sm">
                        No listings match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer note */}
            <div className="px-4 py-2.5 border-t border-white/5 flex items-center gap-2">
              <span className="text-[10px] text-white/25">
                * Solar estimates are preliminary and for demonstration only. Source:{' '}
                <span className="text-white/35">public DotProperty agency pages attributed to Colliers Thailand.</span>
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Footer note */}
      <p className="text-[10px] text-white/20 text-center pb-4">
        TM Energy &middot; Sales Demo &middot; Not for distribution &middot; Solar figures are estimates only
      </p>
    </div>
  )
}
