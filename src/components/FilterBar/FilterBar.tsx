import { Search, Map, Satellite, Globe, Zap, ZapOff, SlidersHorizontal, X, Circle, Building2, LogIn, LogOut, Grid3X3, Kanban, BarChart3, Download, Home, Building } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { signOutBustan } from '../../lib/bustan-supabase'
import { isCrmConnected } from '../../lib/crm-service'
import { REGIONS } from '../../lib/regions'
import { useFilteredProperties } from '../../hooks/useFilteredProperties'
import { exportLeadsCSV } from '../../lib/csv-export'
import { useTranslation } from '../../i18n/useTranslation'
import { useLanguage } from '../../i18n/useLanguage'
import type { GridGrade, RoofPriority, SystemSizeRange, CategoryFilter, PlatformView } from '../../types'

const PRIORITY_CONFIG: Record<RoofPriority, { label: string; color: string; bg: string }> = {
  A: { label: 'A — Hot Lead', color: '#2ED89A', bg: '#2ED89A22' },
  B: { label: 'B — Warm', color: '#E8A820', bg: '#E8A82022' },
  C: { label: 'C — Potential', color: '#E87D20', bg: '#E87D2022' },
  D: { label: 'D — Low', color: '#E85D3A', bg: '#E85D3A22' },
}

const SIZE_CONFIG: Record<SystemSizeRange, { label: string; desc: string }> = {
  all: { label: 'All', desc: '' },
  micro: { label: '<5', desc: 'kWp' },
  small: { label: '5-20', desc: 'kWp' },
  medium: { label: '20-100', desc: 'kWp' },
  large: { label: '100-500', desc: 'kWp' },
  utility: { label: '500+', desc: 'kWp' },
}

const CATEGORY_CONFIG: Record<CategoryFilter, { label: string; icon: string }> = {
  all: { label: 'All', icon: '' },
  residential: { label: 'Residential', icon: '🏠' },
  commercial: { label: 'Commercial', icon: '🏢' },
  hospitality: { label: 'Hotel/Resort', icon: '🏨' },
  mixed: { label: 'Mixed Use', icon: '🏬' },
  other: { label: 'Other', icon: '📍' },
}

const VIEW_TAB_DEFS: { view: PlatformView; icon: typeof Map; key: 'map' | 'scanner' | 'pipeline' | 'dashboard' | 'colliers' }[] = [
  { view: 'map', icon: Map, key: 'map' },
  { view: 'scanner', icon: Grid3X3, key: 'scanner' },
  { view: 'pipeline', icon: Kanban, key: 'pipeline' },
  { view: 'dashboard', icon: BarChart3, key: 'dashboard' },
  { view: 'colliers', icon: Building, key: 'colliers' },
]

export function FilterBar() {
  const filters = useAppStore((s) => s.filters)
  const setFilter = useAppStore((s) => s.setFilter)
  const setRegion = useAppStore((s) => s.setRegion)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const mapStyle = useAppStore((s) => s.mapStyle)
  const cycleMapStyle = useAppStore((s) => s.cycleMapStyle)
  const stats = useAppStore((s) => s.stats)
  const user = useAppStore((s) => s.user)
  const setShowLoginModal = useAppStore((s) => s.setShowLoginModal)
  const platformView = useAppStore((s) => s.platformView)
  const setPlatformView = useAppStore((s) => s.setPlatformView)
  const crmProjects = useAppStore((s) => s.crmProjects)
  const scanRequests = useAppStore((s) => s.scanRequests)
  const filteredProperties = useFilteredProperties()
  const [showFilters, setShowFilters] = useState(false)
  const { t } = useTranslation()
  const tf = t.crm.filter
  const { switchLangPath } = useLanguage()
  const switchLangLabel = t.crm.switchLang
  const navigate = useNavigate()

  const hasActiveFilters = filters.priority !== 'all' || filters.systemSize !== 'all' || filters.categoryFilter !== 'all'
  const activeScans = scanRequests.filter((s) => s.status === 'queued' || s.status === 'running')
  const filteredCount = filteredProperties.length
  const isMapView = platformView === 'map'
  const isScannerView = platformView === 'scanner'
  const showMapControls = isMapView

  return (
    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
      {/* Top bar
          Layout strategy: flex-wrap so the row can spill to a second line on very narrow screens.
          Each pill group is shrink-0 so it won't collapse internally. The region pill group is the
          exception — it allows overflow-x-auto horizontal scroll so 4 tabs always show fully.
          The search box is the only flex-1/min-w-0 item so it absorbs leftover space gracefully.
          The CRM/auth group is shrink-0 ml-auto so it anchors to the right on all widths.
      */}
      <div className="pointer-events-auto mx-4 mt-4 flex items-center gap-2 flex-wrap">
        {/* Logo & Title */}
        <div className="shrink-0 bg-[#0D2137]/90 backdrop-blur-xl rounded-xl px-4 py-2.5 border border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8A820] to-[#E85D3A] flex items-center justify-center text-sm font-bold">
            ☀
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-white leading-tight">{tf.solarIntelligence}</h1>
            <p className="text-[10px] text-white/50">{tf.bustanPlatform}</p>
          </div>
        </div>

        {/* View Tabs (desktop) */}
        <div className="shrink-0 bg-[#0D2137]/90 backdrop-blur-xl rounded-xl border border-white/10 hidden md:flex overflow-hidden">
          {VIEW_TAB_DEFS.map(({ view, icon: Icon, key }) => (
            <button
              key={view}
              onClick={() => setPlatformView(view)}
              className={`px-3 py-2.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                platformView === view
                  ? 'bg-[#00D68F]/15 text-[#00D68F]'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {tf[key]}
            </button>
          ))}
        </div>

        {/* Data Tabs (Rooftops / Land) — only in map/scanner view */}
        {(isMapView || isScannerView) && (
          <div className="shrink-0 bg-[#0D2137]/90 backdrop-blur-xl rounded-xl border border-white/10 flex overflow-hidden">
            <TabButton
              active={filters.activeTab === 'rooftops'}
              onClick={() => setActiveTab('rooftops')}
              icon="🏠"
              label={tf.rooftops}
            />
            <TabButton
              active={filters.activeTab === 'community-solar'}
              onClick={() => setActiveTab('community-solar')}
              icon="🌾"
              label={tf.land}
            />
          </div>
        )}

        {/* Region selector — scrollable pill group so adding more regions never clips labels */}
        {(isMapView || isScannerView) && (
          <div className="hidden lg:flex shrink-0 bg-[#0D2137]/90 backdrop-blur-xl rounded-xl border border-white/10 overflow-x-auto max-w-[340px] scrollbar-none">
            {Object.values(REGIONS).map((r) => (
              <button
                key={r.id}
                onClick={() => setRegion(r.id)}
                className={`shrink-0 px-2.5 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filters.region === r.id
                    ? 'bg-[#E8A820]/20 text-[#E8A820]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {r.nameEn}
              </button>
            ))}
          </div>
        )}

        {/* Search — absorbs leftover space, constrained so it doesn't crowd neighbours */}
        {(isMapView || isScannerView) && (
          <div className="hidden sm:flex min-w-0 flex-1 basis-32 max-w-[220px] bg-[#0D2137]/90 backdrop-blur-xl rounded-xl border border-white/10 items-center px-3 gap-2">
            <Search size={14} className="shrink-0 text-white/40" />
            <input
              type="text"
              placeholder={tf.searchProperties}
              value={filters.searchQuery}
              onChange={(e) => setFilter('searchQuery', e.target.value)}
              className="bg-transparent text-white text-xs py-2.5 w-full outline-none placeholder:text-white/30 min-w-0"
            />
          </div>
        )}

        {/* Map controls — only in map view */}
        {showMapControls && (
          <div className="shrink-0 bg-[#0D2137]/90 backdrop-blur-xl rounded-xl border border-white/10 flex overflow-hidden">
            <button
              onClick={cycleMapStyle}
              className="px-3 py-2.5 text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
              title={{ sentinel2024: 'Sentinel-2 (2024)', mapbox: 'Mapbox Satellite', satellite: 'Google Satellite', esri: 'ESRI World Imagery', street: 'Street Map' }[mapStyle]}
            >
              {mapStyle === 'street' ? <Map size={14} /> : mapStyle === 'sentinel2024' ? <Globe size={14} /> : <Satellite size={14} />}
              <span className="text-[10px] font-medium uppercase tracking-wider hidden sm:inline">
                {{ sentinel2024: '2024', mapbox: 'Mapbox', satellite: 'Google', esri: 'ESRI', street: 'Street' }[mapStyle]}
              </span>
            </button>
            <button
              onClick={() => setFilter('showGrid', !filters.showGrid)}
              className={`px-3 py-2.5 transition-colors ${
                filters.showGrid ? 'text-[#E8A820]' : 'text-white/40 hover:text-white'
              }`}
              title="Toggle Grid"
            >
              {filters.showGrid ? <Zap size={14} /> : <ZapOff size={14} />}
            </button>
            <button
              onClick={() => setFilter('showBufferZones', !filters.showBufferZones)}
              className={`px-3 py-2.5 transition-colors ${
                filters.showBufferZones ? 'text-[#2ED89A]' : 'text-white/40 hover:text-white'
              }`}
              title="Toggle Buffer Zones"
            >
              <Circle size={14} />
            </button>
            <button
              onClick={() => setFilter('showRoofDetection', !filters.showRoofDetection)}
              className={`px-3 py-2.5 transition-colors ${
                filters.showRoofDetection ? 'text-[#00E676]' : 'text-white/40 hover:text-white'
              }`}
              title="Toggle Roof Detection"
            >
              <Home size={14} />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2.5 transition-colors relative ${
                showFilters || hasActiveFilters ? 'text-[#2ED89A]' : 'text-white/40 hover:text-white'
              }`}
              title="Filters"
            >
              <SlidersHorizontal size={14} />
              {hasActiveFilters && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2ED89A]" />
              )}
            </button>
          </div>
        )}

        {/* Pipeline/Dashboard CSV export */}
        {platformView === 'pipeline' && crmProjects.length > 0 && (
          <button
            onClick={() => exportLeadsCSV(crmProjects)}
            className="shrink-0 bg-[#0D2137]/90 backdrop-blur-xl rounded-xl border border-white/10 px-3 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} />
            {tf.export}
          </button>
        )}

        {/* Scan progress indicator — always visible when scans are active, regardless of view */}
        {activeScans.length > 0 && (
          <div className="shrink-0 bg-[#3B82F6]/15 backdrop-blur-xl rounded-xl border border-[#3B82F6]/30 px-3 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#60A5FA] animate-pulse shrink-0" />
            <span className="text-[11px] font-medium text-[#60A5FA] whitespace-nowrap">
              {activeScans.length} scan{activeScans.length > 1 ? 's' : ''} running
            </span>
          </div>
        )}

        {/* CRM + Auth — always visible, anchored right via ml-auto + shrink-0 */}
        <div className="shrink-0 ml-auto bg-[#0D2137]/90 backdrop-blur-xl rounded-xl border border-white/10 flex overflow-hidden">
          {/* Language toggle — lives here so it never floats over the logo */}
          <button
            onClick={() => navigate(switchLangPath())}
            className="px-3 py-2.5 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-[11px] font-medium border-r border-white/10"
            aria-label="Switch language"
          >
            {switchLangLabel}
          </button>
          {isCrmConnected() && (isMapView || isScannerView) && (
            <Link
              to="/crm"
              className="px-3 py-2.5 transition-colors flex items-center gap-1.5 text-[#6366f1] hover:bg-[#6366f1]/10"
              title="CRM Pipeline"
            >
              <Building2 size={14} />
              <span className="text-[11px] font-semibold hidden sm:inline">CRM</span>
            </Link>
          )}
          {user ? (
            <button
              onClick={async () => {
                await supabase?.auth.signOut()
                await signOutBustan()
              }}
              className="px-3 py-2.5 text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
              title="Sign Out"
            >
              <LogOut size={14} />
              <span className="text-[11px] font-medium truncate max-w-[80px] hidden sm:inline">{user.email?.split('@')[0]}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-2.5 text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
              title={tf.signIn}
            >
              <LogIn size={14} />
              <span className="text-[11px] font-medium hidden sm:inline">{tf.signIn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats bar — only for map view */}
      {isMapView && (
        <div className="pointer-events-auto mx-4 mt-2 bg-[#0D2137]/80 backdrop-blur-xl rounded-xl border border-white/10 px-4 py-2 flex items-center gap-6">
          <Stat label={tf.showing} value={filteredCount} />
          <Stat label={tf.roofs} value={stats.totalRoofs} color="#2ED89A" />
          <Stat label={tf.landPlots} value={stats.totalLands} color="#E8A820" />
          <Stat label={tf.forSale} value={stats.forSale} color="#00aaff" />
          {stats.totalMwp > 0 && (
            <Stat label={tf.totalMwp} value={stats.totalMwp} color="#ff8800" />
          )}

          {/* Quick priority badges for rooftops */}
          {filters.activeTab === 'rooftops' && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[10px] text-white/40 uppercase tracking-wider mr-1">{tf.leadQualityShort}</span>
              {(['all', 'A', 'B', 'C', 'D'] as const).map((grade) => (
                <button
                  key={grade}
                  onClick={() => setFilter('priority', grade as RoofPriority | 'all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    filters.priority === grade
                      ? 'scale-110'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={
                    grade !== 'all'
                      ? {
                          backgroundColor: filters.priority === grade
                            ? PRIORITY_CONFIG[grade].bg
                            : 'transparent',
                          color: PRIORITY_CONFIG[grade].color,
                          border: filters.priority === grade
                            ? `1px solid ${PRIORITY_CONFIG[grade].color}44`
                            : '1px solid transparent',
                        }
                      : {
                          backgroundColor: filters.priority === 'all' ? 'rgba(255,255,255,0.15)' : 'transparent',
                          color: filters.priority === 'all' ? '#fff' : 'rgba(255,255,255,0.4)',
                        }
                  }
                >
                  {grade === 'all' ? 'All' : grade}
                </button>
              ))}
            </div>
          )}

          {/* Grid grade for community solar */}
          {filters.activeTab === 'community-solar' && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{tf.gridGrade}</span>
              {(['all', 'A', 'B', 'C', 'D'] as const).map((grade) => (
                <button
                  key={grade}
                  onClick={() => setFilter('gridGrade', grade as GridGrade | 'all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    filters.gridGrade === grade
                      ? grade === 'all'
                        ? 'bg-white/20 text-white'
                        : 'text-white'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                  style={
                    filters.gridGrade === grade && grade !== 'all'
                      ? {
                          backgroundColor: { A: '#2ED89A33', B: '#E8A82033', C: '#E87D2033', D: '#E85D3A33' }[grade],
                          color: { A: '#2ED89A', B: '#E8A820', C: '#E87D20', D: '#E85D3A' }[grade],
                        }
                      : undefined
                  }
                >
                  {grade === 'all' ? 'All' : grade}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expanded filter panel */}
      {showFilters && isMapView && filters.activeTab === 'rooftops' && (
        <div className="pointer-events-auto mx-4 mt-2 bg-[#0D2137]/90 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">{tf.advancedFilters}</h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setFilter('priority', 'all')
                    setFilter('systemSize', 'all')
                    setFilter('categoryFilter', 'all')
                  }}
                  className="text-[10px] text-[#E85D3A] hover:text-[#E85D3A]/80 transition-colors flex items-center gap-1"
                >
                  <X size={10} /> {tf.clearAll}
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* System Size */}
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-wider mb-2 block">
                {tf.systemSizeKwp}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(SIZE_CONFIG) as [SystemSizeRange, typeof SIZE_CONFIG['all']][]).map(
                  ([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setFilter('systemSize', key)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                        filters.systemSize === key
                          ? 'bg-[#2ED89A]/15 text-[#2ED89A] border-[#2ED89A]/30'
                          : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70'
                      }`}
                    >
                      {config.label}
                      {config.desc && <span className="text-[9px] ml-0.5 opacity-60">{config.desc}</span>}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-wider mb-2 block">
                {tf.buildingType}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(CATEGORY_CONFIG) as [CategoryFilter, typeof CATEGORY_CONFIG['all']][]).map(
                  ([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setFilter('categoryFilter', key)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                        filters.categoryFilter === key
                          ? 'bg-[#E8A820]/15 text-[#E8A820] border-[#E8A820]/30'
                          : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70'
                      }`}
                    >
                      {config.icon && <span className="mr-1">{config.icon}</span>}
                      {config.label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Lead Quality (bigger version with labels) */}
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-wider mb-2 block">
                {tf.leadQuality}
              </label>
              <div className="flex flex-col gap-1">
                {(Object.entries(PRIORITY_CONFIG) as [RoofPriority, typeof PRIORITY_CONFIG['A']][]).map(
                  ([grade, config]) => (
                    <button
                      key={grade}
                      onClick={() =>
                        setFilter('priority', filters.priority === grade ? 'all' : grade)
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border text-left ${
                        filters.priority === grade
                          ? 'border-opacity-40'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                      style={{
                        backgroundColor:
                          filters.priority === grade ? config.bg : undefined,
                        color: config.color,
                        borderColor:
                          filters.priority === grade ? `${config.color}44` : undefined,
                      }}
                    >
                      {config.label}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
        active
          ? 'bg-[#2ED89A]/15 text-[#2ED89A]'
          : 'text-white/50 hover:text-white hover:bg-white/5'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-lg font-bold" style={{ color: color || '#fff' }}>
        {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value.toLocaleString()}
      </span>
      <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
    </div>
  )
}
