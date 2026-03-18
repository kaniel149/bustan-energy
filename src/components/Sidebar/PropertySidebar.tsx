import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MapPin, Zap, Sun, DollarSign, Ruler, Phone, Globe, ExternalLink, TrendingUp, Leaf, AlertCircle, Loader2, FileDown, Send, Check, MessageCircle, Search, ChevronRight, Layers } from 'lucide-react'
import { ProposalModal } from '../Proposal/ProposalModal'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../lib/store'
import { pushToCrm, isCrmConnected, logProposalSent, getCrmProjects } from '../../lib/crm-service'
import { openProposal } from '../../lib/open-proposal'
import { calculateSolar } from '../../lib/solar-calc'
import { REGIONS } from '../../lib/regions'
import { fetchSolarIrradiance, type NasaPowerData } from '../../lib/nasa-power'
import { calculateFinancials, type FinancialAnalysis } from '../../lib/financial-calc'
import { generateProposal } from '../../lib/generate-proposal'
import { enrichFromPlaces, isEnrichmentAvailable } from '../../lib/enrich-building'
import { openLineChat, buildProposalMessage, isLineConfigured } from '../../lib/line-service'

const GRADE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Excellent — minimal infrastructure' },
  B: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Good — short line extension' },
  C: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Moderate — transformer + extension' },
  D: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Not recommended' },
}

const CATEGORY_ICONS: Record<string, string> = {
  hospitality: '🏨', restaurant: '🍽️', retail: '🛒', residential: '🏠',
  education: '🏫', temple: '⛩️', health: '🏥', government: '🏛️',
  industrial: '🏭', office: '🏢', mixed: '🏘️',
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function PropertySidebar() {
  const property = useAppStore((s) => s.selectedProperty)
  const setSelected = useAppStore((s) => s.setSelectedProperty)
  const region = useAppStore((s) => s.filters.region)
  const regionConfig = REGIONS[region]

  const [nasaData, setNasaData] = useState<NasaPowerData | null>(null)
  const [financial, setFinancial] = useState<FinancialAnalysis | null>(null)
  const [nasaLoading, setNasaLoading] = useState(false)
  const [nasaError, setNasaError] = useState<string | null>(null)
  const [showProposalModal, setShowProposalModal] = useState(false)

  useEffect(() => {
    if (!property) {
      setNasaData(null)
      setFinancial(null)
      setNasaError(null)
      return
    }

    setNasaData(null)
    setFinancial(null)
    setNasaError(null)
    setNasaLoading(true)

    fetchSolarIrradiance(property.lat, property.lng)
      .then((data) => {
        setNasaData(data)

        const isRoof = property.type === 'roof'
        const area = isRoof ? property.area : property.sizeM2
        if (!area) return

        const basicSolar = calculateSolar(area, data.annualGHI, regionConfig.tariffCommercial, isRoof)

        const analysis = calculateFinancials({
          capacityKwp: basicSolar.capacityKwp,
          annualGHI: data.annualGHI,
          tariffRate: regionConfig.tariffCommercial,
        })
        setFinancial(analysis)
      })
      .catch((err) => {
        console.warn('NASA POWER API failed, falling back to region default:', err)
        setNasaError('Using estimated irradiance (NASA API unavailable)')

        // Fallback: use region's default irradiance
        const isRoof = property.type === 'roof'
        const area = isRoof ? property.area : property.sizeM2
        if (!area) return

        const basicSolar = calculateSolar(area, regionConfig.irradiance, regionConfig.tariffCommercial, isRoof)
        const analysis = calculateFinancials({
          capacityKwp: basicSolar.capacityKwp,
          annualGHI: regionConfig.irradiance,
          tariffRate: regionConfig.tariffCommercial,
        })
        setFinancial(analysis)
      })
      .finally(() => setNasaLoading(false))
  }, [property?.id, regionConfig])

  if (!property) return null

  const isRoof = property.type === 'roof'
  const area = isRoof ? property.area : property.sizeM2
  const basicSolar = area
    ? calculateSolar(area, nasaData?.annualGHI ?? regionConfig.irradiance, regionConfig.tariffCommercial, isRoof)
    : null

  return (
    <AnimatePresence>
      <motion.div
        key={property.id}
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute top-0 right-0 bottom-0 w-[380px] z-20 bg-[#0D2137]/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0D2137]/95 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">
                  {isRoof ? (CATEGORY_ICONS[property.category || ''] || '🏠') : '🌾'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isRoof ? 'bg-[#2ED89A]/20 text-[#2ED89A]' : 'bg-[#E8A820]/20 text-[#E8A820]'
                }`}>
                  {isRoof ? 'Roof' : 'Land'}
                </span>
                {property.priority && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    GRADE_COLORS[property.priority]?.bg || ''
                  } ${GRADE_COLORS[property.priority]?.text || ''}`}>
                    Grade {property.priority}
                  </span>
                )}
              </div>
              <h2 className="text-white font-semibold text-sm truncate">{property.title}</h2>
              <p className="text-white/50 text-xs flex items-center gap-1 mt-1">
                <MapPin size={10} />
                {property.location}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2">
            {area && (
              <MetricCard
                icon={<Ruler size={14} />}
                label="Area"
                value={`${area.toLocaleString()} m²`}
                sub={property.sizeRai ? `${property.sizeRai.toFixed(1)} rai` : undefined}
              />
            )}
            {property.price && (
              <MetricCard
                icon={<DollarSign size={14} />}
                label="Price"
                value={`฿${(property.price / 1000000).toFixed(1)}M`}
                sub={property.pricePerRai ? `฿${(property.pricePerRai / 1000).toFixed(0)}K/rai` : undefined}
              />
            )}
            {basicSolar && (
              <>
                <MetricCard
                  icon={<Sun size={14} />}
                  label="Capacity"
                  value={`${basicSolar.capacityKwp.toFixed(1)} kWp`}
                  sub={`${basicSolar.panelCount} panels`}
                  color="#E8A820"
                />
                <MetricCard
                  icon={<Zap size={14} />}
                  label="Annual Yield"
                  value={`${(basicSolar.annualKwh / 1000).toFixed(0)} MWh`}
                  sub={`฿${(basicSolar.annualSavingsTHB / 1000).toFixed(0)}K/yr savings`}
                  color="#2ED89A"
                />
              </>
            )}
          </div>

          {/* NASA POWER Data Badge */}
          {(nasaLoading || nasaData || nasaError) && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] ${
              nasaError
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                : nasaLoading
                ? 'bg-white/5 border border-white/10 text-white/40'
                : 'bg-[#2ED89A]/10 border border-[#2ED89A]/20 text-[#2ED89A]'
            }`}>
              {nasaLoading ? (
                <><Loader2 size={12} className="animate-spin" /> Fetching NASA POWER irradiance data...</>
              ) : nasaError ? (
                <><AlertCircle size={12} /> {nasaError}</>
              ) : nasaData ? (
                <><Sun size={12} /> NASA POWER: {nasaData.annualGHI.toFixed(2)} kWh/m²/day · Best: {nasaData.bestMonth}</>
              ) : null}
            </div>
          )}

          {/* Monthly Production Chart */}
          {financial && !nasaLoading && (
            <div className="rounded-xl border border-white/10 p-3">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sun size={12} className="text-[#E8A820]" />
                Monthly Production (kWh)
              </h3>
              <MonthlyChart data={financial.monthlyKwh} />
            </div>
          )}

          {/* Enhanced Financial Analysis */}
          {financial && !nasaLoading && (
            <div className="rounded-xl border border-white/10 p-3">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp size={12} className="text-[#2ED89A]" />
                Financial Analysis
              </h3>

              {/* Primary metrics grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <FinancialMetric
                  label="Payback Period"
                  value={`${financial.paybackYears.toFixed(1)} yr`}
                  color={financial.paybackYears < 7 ? '#2ED89A' : financial.paybackYears < 10 ? '#E8A820' : '#ff6b6b'}
                />
                <FinancialMetric
                  label="IRR"
                  value={`${(financial.irr * 100).toFixed(1)}%`}
                  color={financial.irr > 0.15 ? '#2ED89A' : financial.irr > 0.10 ? '#E8A820' : '#ff6b6b'}
                />
                <FinancialMetric
                  label="25-yr ROI"
                  value={`${financial.roi25Year.toFixed(0)}%`}
                  color="#E8A820"
                />
                <FinancialMetric
                  label="LCOE"
                  value={`฿${financial.lcoe.toFixed(2)}/kWh`}
                  color="#2ED89A"
                />
              </div>

              {/* Detailed rows */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <FinancialRow label="EPC Cost" value={`฿${(financial.epcCost / 1000000).toFixed(2)}M`} />
                <FinancialRow label="O&M / year" value={`฿${(financial.annualOMCost / 1000).toFixed(0)}K`} />
                <FinancialRow label="Yr 1 Savings" value={`฿${(financial.annualSavingsYear1 / 1000).toFixed(0)}K`} highlight />
                <FinancialRow
                  label="NPV (8% discount)"
                  value={`฿${(financial.npv / 1000000).toFixed(2)}M`}
                  highlight={financial.npv > 0}
                />
                <FinancialRow
                  label="25-yr Savings"
                  value={`฿${(financial.lifetimeSavings / 1000000).toFixed(1)}M`}
                  highlight
                />
                {property.gridProximity && (
                  <FinancialRow
                    label="+ Grid Connection"
                    value={`฿${(property.gridProximity.estimatedConnectionCost / 1000).toFixed(0)}K`}
                  />
                )}
              </div>
            </div>
          )}

          {/* CO2 & Lifetime Stats */}
          {financial && !nasaLoading && (
            <div className="rounded-xl border border-white/10 p-3">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Leaf size={12} className="text-emerald-400" />
                25-Year Impact
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <ImpactStat
                  label="Lifetime kWh"
                  value={`${(financial.lifetimeKwh / 1000).toFixed(0)}K`}
                  sub="MWh"
                />
                <ImpactStat
                  label="CO₂ Avoided"
                  value={`${financial.co2Avoided.toFixed(0)}`}
                  sub="tons"
                  color="#2ED89A"
                />
                <ImpactStat
                  label="Equiv. Cars"
                  value={`${Math.round(financial.co2Avoided / 4.6)}`}
                  sub="off road/yr"
                />
              </div>
            </div>
          )}

          {/* Loading skeleton for financial */}
          {nasaLoading && area && (
            <div className="rounded-xl border border-white/10 p-3 space-y-2">
              <div className="h-3 bg-white/10 rounded animate-pulse w-2/3" />
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {/* Grid Proximity (for land) */}
          {property.gridProximity && (
            <div className="rounded-xl border border-white/10 p-3">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap size={12} className="text-[#E8A820]" />
                Grid Proximity
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-2xl font-bold ${
                  GRADE_COLORS[property.gridProximity.grade]?.text || 'text-white'
                }`}>
                  {property.gridProximity.grade}
                </span>
                <div>
                  <p className="text-white text-xs font-medium">
                    {property.gridProximity.distanceMeters < 1000
                      ? `${property.gridProximity.distanceMeters}m`
                      : `${(property.gridProximity.distanceMeters / 1000).toFixed(1)}km`
                    } to nearest grid
                  </p>
                  <p className="text-white/40 text-[10px]">
                    {GRADE_COLORS[property.gridProximity.grade]?.label}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="text-white/40">Nearest</span>
                  <p className="text-white font-medium truncate">{property.gridProximity.nearestFeatureName}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="text-white/40">Est. Connection</span>
                  <p className="text-white font-medium">
                    ฿{(property.gridProximity.estimatedConnectionCost / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contact + Enrichment */}
          <div className="rounded-xl border border-white/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Contact</h3>
              {isEnrichmentAvailable() && !property.ownerName && (
                <EnrichButton property={property} />
              )}
            </div>
            {property.ownerName ? (
              <>
                <p className="text-white text-xs mb-1">{property.ownerName}</p>
                <div className="flex gap-2 flex-wrap">
                  {property.phone && (
                    <a href={`tel:${property.phone}`} className="flex items-center gap-1 text-[11px] text-[#2ED89A] hover:underline">
                      <Phone size={10} /> {property.phone}
                    </a>
                  )}
                  {property.website && (
                    <a href={property.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-[#00aaff] hover:underline">
                      <Globe size={10} /> Website
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="text-white/30 text-[11px]">
                {isEnrichmentAvailable() ? 'Click Enrich to find owner info' : 'No contact info — set VITE_GOOGLE_PLACES_API_KEY to enable enrichment'}
              </p>
            )}
          </div>

          {/* LINE / WhatsApp Quick Contact */}
          {(property.phone || isLineConfigured()) && financial && (
            <div className="flex gap-2">
              {isLineConfigured() && (
                <button
                  onClick={() => {
                    const msg = buildProposalMessage({
                      clientName: property.ownerName || property.title,
                      capacityKwp: financial.capacityKwp,
                      annualSavings: financial.annualSavingsYear1,
                      paybackYears: financial.paybackYears,
                      proposalRef: `TM-${property.id.slice(0, 6).toUpperCase()}`,
                    })
                    openLineChat(msg)
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#06C755]/20 border border-[#06C755]/30 text-[#06C755] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#06C755]/30 transition-colors"
                >
                  <MessageCircle size={14} />
                  LINE
                </button>
              )}
              {property.phone && (
                <a
                  href={`https://wa.me/${property.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#25D366]/30 transition-colors"
                >
                  <Phone size={14} />
                  WhatsApp
                </a>
              )}
            </div>
          )}

          {/* Generate Proposal */}
          {financial && !nasaLoading && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowProposalModal(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00D68F] to-[#00B377] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Layers size={16} />
                Compare Options (EPC / PPA / Lease)
              </button>
              <button
                onClick={() => {
                  openProposal({
                    property,
                    financial,
                    regionId: region,
                  })
                  // Log to CRM in background
                  logProposalSent(property, 'full_proposal', 'web', {
                    capacityKwp: financial.capacityKwp,
                    annualSavings: financial.annualSavingsYear1,
                    paybackYears: financial.paybackYears,
                    dealValue: financial.epcCost,
                  }).then(() => getCrmProjects().then(p => useAppStore.getState().setCrmProjects(p)))
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Send size={16} />
                Full Sales Proposal
              </button>
              <button
                onClick={() => {
                  generateProposal({
                    property,
                    financial,
                    nasaData: nasaData ?? undefined,
                    regionName: regionConfig.nameEn,
                  })
                  // Log to CRM in background
                  logProposalSent(property, 'pdf_report', 'download', {
                    capacityKwp: financial.capacityKwp,
                    annualSavings: financial.annualSavingsYear1,
                    paybackYears: financial.paybackYears,
                    dealValue: financial.epcCost,
                  }).then(() => getCrmProjects().then(p => useAppStore.getState().setCrmProjects(p)))
                }}
                className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
              >
                <FileDown size={14} />
                Quick Report (PDF)
              </button>
            </div>
          )}

          {/* Proposal Modal */}
          {showProposalModal && financial && (
            <ProposalModal
              property={property}
              financial={financial}
              onClose={() => setShowProposalModal(false)}
            />
          )}

          {/* Push to CRM */}
          {isCrmConnected() && <CrmPushButton property={property} />}

          {/* Listing Link */}
          {property.listingLink && (
            <a
              href={property.listingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#E8A820]/20 text-[#E8A820] text-xs font-semibold hover:bg-[#E8A820]/30 transition-colors"
            >
              <ExternalLink size={12} />
              View Original Listing
            </a>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// --- Sub-components ---

function MonthlyChart({ data }: { data: number[] }) {
  const maxVal = Math.max(...data)
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((val, i) => {
        const heightPct = maxVal > 0 ? (val / maxVal) * 100 : 0
        const isHighest = val === maxVal
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full relative flex items-end" style={{ height: '48px' }}>
              <div
                className={`w-full rounded-t transition-all ${
                  isHighest ? 'bg-[#E8A820]' : 'bg-[#E8A820]/40'
                }`}
                style={{ height: `${heightPct}%` }}
                title={`${MONTH_SHORT[i]}: ${val.toFixed(0)} kWh`}
              />
            </div>
            <span className="text-[8px] text-white/30 leading-none">{MONTH_SHORT[i].substring(0, 1)}</span>
          </div>
        )
      })}
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-white/5 rounded-xl p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-white/40">{icon}</span>
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-white font-semibold text-sm" style={color ? { color } : undefined}>
        {value}
      </p>
      {sub && <p className="text-white/40 text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}

function FinancialMetric({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="bg-white/5 rounded-lg p-2.5">
      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-bold" style={color ? { color } : { color: '#fff' }}>
        {value}
      </p>
    </div>
  )
}

function FinancialRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/50">{label}</span>
      <span className={highlight ? 'text-[#2ED89A] font-semibold' : 'text-white'}>{value}</span>
    </div>
  )
}

function ImpactStat({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-white/5 rounded-lg p-2 text-center">
      <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-bold" style={color ? { color } : { color: '#fff' }}>
        {value}
      </p>
      {sub && <p className="text-[9px] text-white/30">{sub}</p>}
    </div>
  )
}

function EnrichButton({ property }: { property: import('../../types').Property }) {
  const [loading, setLoading] = useState(false)
  const setProperties = useAppStore((s) => s.setProperties)
  const properties = useAppStore((s) => s.properties)

  const handleEnrich = async () => {
    setLoading(true)
    try {
      const result = await enrichFromPlaces(property.lat, property.lng)
      if (result?.name) {
        const updated = properties.map((p) =>
          p.id === property.id
            ? {
                ...p,
                ownerName: result.name || p.ownerName,
                phone: result.phone || p.phone,
                website: result.website || p.website,
                category: result.category || p.category,
              }
            : p
        )
        setProperties(updated)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleEnrich}
      disabled={loading}
      className="flex items-center gap-1 text-[10px] text-[#E8A820] hover:text-[#E8A820]/80 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
      Enrich
    </button>
  )
}

function CrmPushButton({ property }: { property: import('../../types').Property }) {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const setShowLoginModal = useAppStore((s) => s.setShowLoginModal)
  const crmBuildingIds = useAppStore((s) => s.crmBuildingIds)
  const setCrmProjects = useAppStore((s) => s.setCrmProjects)
  const crmProjects = useAppStore((s) => s.crmProjects)

  const [pushing, setPushing] = useState(false)
  const [pushed, setPushed] = useState(false)
  const [pushedProjectId, setPushedProjectId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const alreadyInCrm = !!crmBuildingIds[property.id]

  useEffect(() => {
    setPushed(false)
    setPushedProjectId(null)
    setError('')
  }, [property.id])

  const handlePush = async () => {
    if (!user) {
      setShowLoginModal(true)
      return
    }

    setPushing(true)
    setError('')
    try {
      const project = await pushToCrm(property)
      if (project) {
        setPushed(true)
        setPushedProjectId(project.id)
        setCrmProjects([project, ...crmProjects])
        navigate(`/crm/leads/${project.id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to push to CRM')
    } finally {
      setPushing(false)
    }
  }

  if (alreadyInCrm || pushed) {
    const matchingProject = crmProjects.find((p) => p.building_id === property.id)
    const targetId = pushedProjectId ?? matchingProject?.id
    return (
      <button
        onClick={() => {
          if (targetId) navigate(`/crm/leads/${targetId}`)
          else navigate('/crm/pipeline')
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2ED89A]/15 text-[#2ED89A] text-sm font-medium border border-[#2ED89A]/20 hover:bg-[#2ED89A]/25 transition-colors"
      >
        <Check size={16} />
        In CRM Pipeline
        <ChevronRight size={14} className="ml-1" />
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={handlePush}
        disabled={pushing}
        className="w-full py-2.5 rounded-xl bg-[#6366f1]/20 text-[#6366f1] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#6366f1]/30 border border-[#6366f1]/20 transition-all disabled:opacity-50"
      >
        {pushing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {user ? 'Push to CRM' : 'Sign in to Push to CRM'}
      </button>
      {error && <p className="text-[#E85D3A] text-[10px] mt-1 text-center">{error}</p>}
    </div>
  )
}
