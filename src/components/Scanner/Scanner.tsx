import { useState, useMemo } from 'react'
import { Search, Download, Grid3X3, MapPin, Phone, MessageCircle, UserSearch } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { useFilteredProperties } from '../../hooks/useFilteredProperties'
import { exportBuildingsCSV } from '../../lib/csv-export'
import type { Property } from '../../types'

type SortField = 'capacity' | 'area' | 'grade' | 'title'
type SortDir = 'asc' | 'desc'
type TypeFilter = 'all' | 'roof' | 'land'

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: '#00E67622', text: '#00E676', border: '#00E67644' },
  B: { bg: '#FFD60022', text: '#FFD600', border: '#FFD60044' },
  C: { bg: '#FF910022', text: '#FF9100', border: '#FF910044' },
  D: { bg: '#FF3D0022', text: '#FF3D00', border: '#FF3D0044' },
}

const CATEGORY_ICONS: Record<string, string> = {
  hospitality: '🏨', restaurant: '🍽️', retail: '🛒', residential: '🏠',
  education: '🏫', temple: '⛩️', health: '🏥', government: '🏛️',
  industrial: '🏭', office: '🏢', mixed: '🏘️', commercial: '🏢',
}

export function Scanner() {
  const filteredProperties = useFilteredProperties()
  const setSelectedProperty = useAppStore((s) => s.setSelectedProperty)
  const crmBuildingIds = useAppStore((s) => s.crmBuildingIds)

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('capacity')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const sorted = useMemo(() => {
    let items = [...filteredProperties]

    if (search) {
      const q = search.toLowerCase()
      items = items.filter(p =>
        [p.title, p.location, p.category, p.ownerName]
          .filter(Boolean).join(' ').toLowerCase().includes(q)
      )
    }

    if (typeFilter !== 'all') {
      items = items.filter(p => p.type === typeFilter)
    }

    if (gradeFilter !== 'all') {
      items = items.filter(p => p.priority === gradeFilter)
    }

    items.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0
      switch (sortField) {
        case 'area': av = a.area || a.sizeM2 || 0; bv = b.area || b.sizeM2 || 0; break
        case 'capacity': av = a.capacityKwp || 0; bv = b.capacityKwp || 0; break
        case 'grade': av = a.priority || 'D'; bv = b.priority || 'D'; break
        case 'title': av = a.title; bv = b.title; break
      }
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return items
  }, [filteredProperties, search, sortField, sortDir, gradeFilter, typeFilter])

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  return (
    <div className="absolute inset-0 top-[52px] z-10 bg-[#0A1628]/98 backdrop-blur-xl overflow-hidden flex flex-col">
      {/* Scanner toolbar */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buildings..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1">
          {(['all', 'roof', 'land'] as TypeFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                typeFilter === t
                  ? t === 'roof'
                    ? 'bg-[#2ED89A]/15 text-[#2ED89A] border-[#2ED89A]/30'
                    : t === 'land'
                    ? 'bg-[#E8A820]/15 text-[#E8A820] border-[#E8A820]/30'
                    : 'bg-white/15 text-white border-white/20'
                  : 'bg-transparent text-white/40 border-transparent hover:text-white/70'
              }`}
            >
              {t === 'all' ? 'All' : t === 'roof' ? '🏠 Roofs' : '🌾 Land'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {['all', 'A', 'B', 'C', 'D'].map(grade => (
            <button
              key={grade}
              onClick={() => setGradeFilter(grade)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                gradeFilter === grade ? 'scale-105' : 'opacity-60 hover:opacity-100'
              }`}
              style={grade !== 'all' ? {
                backgroundColor: gradeFilter === grade ? GRADE_COLORS[grade].bg : 'transparent',
                color: GRADE_COLORS[grade].text,
                borderColor: gradeFilter === grade ? GRADE_COLORS[grade].border : 'transparent',
              } : {
                backgroundColor: gradeFilter === 'all' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: gradeFilter === 'all' ? '#fff' : 'rgba(255,255,255,0.4)',
                borderColor: 'transparent',
              }}
            >
              {grade === 'all' ? 'All' : grade}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider mr-1">Sort:</span>
          {(['capacity', 'area', 'grade', 'title'] as SortField[]).map(field => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`px-2 py-1.5 rounded text-[10px] font-medium transition-colors ${
                sortField === field ? 'bg-[#E8A820]/20 text-[#E8A820]' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {field === 'capacity' ? 'kWp' : field === 'area' ? 'Area' : field === 'grade' ? 'Grade' : 'Name'}
              {sortField === field && (sortDir === 'asc' ? ' ↑' : ' ↓')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-white/50">{sorted.length} {typeFilter === 'land' ? 'plots' : typeFilter === 'roof' ? 'roofs' : 'properties'}</span>
          <button
            onClick={() => exportBuildingsCSV(sorted)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Download size={12} />
            CSV
          </button>
        </div>
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {sorted.map(property => (
            <BuildingCard
              key={property.id}
              property={property}
              inCrm={!!crmBuildingIds[property.id]}
              onClick={() => setSelectedProperty(property)}
              onFindContact={() => setSelectedProperty(property)}
            />
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <Grid3X3 size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-medium text-white/50">
              {typeFilter === 'land'
                ? 'No land plots yet'
                : typeFilter === 'roof'
                ? 'No rooftops yet'
                : 'No buildings match your filters'}
            </p>
            <p className="text-xs mt-1 text-white/30 text-center max-w-xs">
              {typeFilter === 'land'
                ? 'Switch to Map view, select the Land toggle, and draw a scan area to detect grid-grade land plots.'
                : typeFilter === 'roof'
                ? 'Switch to Map view and draw a scan area to detect rooftops.'
                : 'Try removing some filters or run a scan area on the Map.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const TIER_BADGES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  farm: { bg: '#E8A82020', text: '#E8A820', border: '#E8A82040', label: 'Farm ≤9MW' },
  utility: { bg: '#A855F720', text: '#D8B4FE', border: '#A855F740', label: 'Utility / DC-scale' },
  commercial: { bg: '#3B82F620', text: '#93C5FD', border: '#3B82F640', label: 'Commercial' },
}

function BuildingCard({ property, inCrm, onClick, onFindContact }: { property: Property; inCrm: boolean; onClick: () => void; onFindContact: () => void }) {
  const grade = property.priority || 'B'
  const gradeColor = GRADE_COLORS[grade] || GRADE_COLORS.B
  const isRoof = property.type === 'roof'
  const isLand = property.type === 'land'

  // Area display: for land use sizeRai if available, else sizeM2; for roof use area
  const roofArea = property.area || 0
  const landAreaRai = property.sizeRai
  const landAreaM2 = property.sizeM2 || 0

  // Capacity display: for land show MWp if capacityKwp >= 1000, else kWp
  const capacityKwp = property.capacityKwp || 0
  const isMwp = isLand && capacityKwp >= 1000
  const capacityDisplay = capacityKwp
    ? isMwp
      ? (capacityKwp / 1000).toFixed(1)
      : capacityKwp.toFixed(1)
    : null
  const capacityUnit = isMwp ? 'MWp' : 'kWp'

  const tierBadge = isLand && property.tier ? TIER_BADGES[property.tier] : null

  return (
    <button
      onClick={onClick}
      className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-xl p-3 text-left transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-sm shrink-0">
            {CATEGORY_ICONS[property.category || ''] || (isRoof ? '🏠' : '🌾')}
          </span>
          <h3 className="text-xs font-medium text-white truncate">{property.title}</h3>
        </div>
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ml-2"
          style={{
            backgroundColor: gradeColor.bg,
            color: gradeColor.text,
            border: `1px solid ${gradeColor.border}`,
          }}
        >
          {grade}
        </span>
      </div>

      <p className="text-[10px] text-white/40 truncate mb-2 flex items-center gap-1">
        <MapPin size={9} className="shrink-0" />
        {property.location}
      </p>

      {/* Tier badge for land candidates */}
      {tierBadge && (
        <div
          className="mb-2 px-1.5 py-0.5 rounded text-[9px] font-bold inline-block"
          style={{ backgroundColor: tierBadge.bg, color: tierBadge.text, border: `1px solid ${tierBadge.border}` }}
        >
          {tierBadge.label}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        <div className="bg-white/5 rounded-lg p-1.5 text-center">
          <p className="text-[9px] text-white/40">Area</p>
          {isLand && landAreaRai != null ? (
            <>
              <p className="text-[11px] font-semibold text-white">{landAreaRai.toFixed(1)}</p>
              <p className="text-[8px] text-white/30">rai</p>
            </>
          ) : isLand ? (
            <>
              <p className="text-[11px] font-semibold text-white">{landAreaM2 > 0 ? landAreaM2.toLocaleString() : '—'}</p>
              <p className="text-[8px] text-white/30">m²</p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-white">{roofArea > 0 ? roofArea.toLocaleString() : '—'}</p>
              <p className="text-[8px] text-white/30">sqm</p>
            </>
          )}
        </div>
        <div className="bg-white/5 rounded-lg p-1.5 text-center">
          <p className="text-[9px] text-white/40">Capacity</p>
          <p className="text-[11px] font-semibold text-[#E8A820]">
            {capacityDisplay ?? '—'}
          </p>
          <p className="text-[8px] text-white/30">{capacityDisplay ? capacityUnit : ''}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-1.5 text-center">
          {isLand && landAreaRai != null ? (
            <>
              <p className="text-[9px] text-white/40">Size</p>
              <p className="text-[11px] font-semibold text-white">{landAreaM2 > 0 ? (landAreaM2 / 1600).toFixed(0) : '—'}</p>
              <p className="text-[8px] text-white/30">plots</p>
            </>
          ) : (
            <>
              <p className="text-[9px] text-white/40">Panels</p>
              <p className="text-[11px] font-semibold text-white">
                {property.panelCount || '—'}
              </p>
              <p className="text-[8px] text-white/30">units</p>
            </>
          )}
        </div>
      </div>

      {/* Owner / contact strip */}
      <div className="mt-2 flex items-center gap-1.5">
        {property.ownerName ? (
          <span className="text-[10px] text-white/50 truncate flex-1" title={property.ownerName}>
            {property.ownerName}
          </span>
        ) : (
          <span className="text-[10px] text-white/25 italic flex-1">no contact yet</span>
        )}
        {/* Quick actions — rendered as anchors / buttons so they don't open sidebar */}
        <div className="flex items-center gap-0.5 shrink-0">
          {property.phone && (
            <a
              href={`tel:${property.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-[#2ED89A]/10 border border-[#2ED89A]/20 text-[#2ED89A] hover:bg-[#2ED89A]/25 transition-colors"
              title={`Call ${property.phone}`}
            >
              <Phone size={10} />
            </a>
          )}
          {property.phone && (
            <a
              href={`https://wa.me/${property.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/25 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle size={10} />
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onFindContact() }}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-[#E8A820]/10 border border-[#E8A820]/20 text-[#E8A820] hover:bg-[#E8A820]/25 transition-colors"
            title="Find decision maker"
          >
            <UserSearch size={10} />
          </button>
        </div>
      </div>

      {inCrm && (
        <div className="mt-1.5 px-2 py-0.5 rounded bg-[#6366f1]/15 border border-[#6366f1]/20 text-[#6366f1] text-[9px] font-semibold text-center">
          In Pipeline
        </div>
      )}
    </button>
  )
}
