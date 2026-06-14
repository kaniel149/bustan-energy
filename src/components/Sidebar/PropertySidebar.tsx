import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MapPin, Zap, Sun, DollarSign, Ruler, Phone, Globe, ExternalLink, TrendingUp, Leaf, AlertCircle, Loader2, FileDown, FileText, Send, Check, MessageCircle, Search, ChevronRight, Layers, PenLine, Lock, UserSearch, Mail, Linkedin } from 'lucide-react'
import { useBustanStore } from '../../lib/bustan-store'
import { can } from '../../lib/bustan-permissions'
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
import { useTranslation } from '../../i18n/useTranslation'
import { useToastStore } from '../../lib/toast-store'
import { bustanSupabase } from '../../lib/bustan-supabase'
import { CandidateSidebarSection } from './CandidateSidebarSection'

interface FindContactResult {
  company: { name?: string; registrationNo?: string; address?: string; phone?: string; website?: string } | null
  decision_maker: { name?: string; role?: string; phone?: string; email?: string; linkedin?: string } | null
  confidence: number
  sources: string[]
  stages: Array<{ stage: string; status: 'ok' | 'fail' | 'skip'; detail?: string }>
}

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
  const setDrawRoofFor = useAppStore((s) => s.setDrawRoofFor)
  const region = useAppStore((s) => s.filters.region)
  const regionConfig = REGIONS[region]
  const role = useBustanStore((s) => s.role)
  const canEditRoof = can(role, 'survey.edit') || can(role, 'crm.edit')
  const canQuote = can(role, 'crm.quote')
  const canFindContact = can(role, 'crm.edit')
  const { t } = useTranslation()
  const tm = t.crm.map

  // Detect if the selected property is a pending scan candidate
  const roofCandidates = useAppStore((s) => s.roofCandidates)
  const isCandidate = !!property && roofCandidates.some((c) => c.id === property.id)

  const [nasaData, setNasaData] = useState<NasaPowerData | null>(null)
  const [financial, setFinancial] = useState<FinancialAnalysis | null>(null)
  const [nasaLoading, setNasaLoading] = useState(false)
  const [nasaError, setNasaError] = useState<string | null>(null)
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [contactLoading, setContactLoading] = useState(false)
  const [contactResult, setContactResult] = useState<FindContactResult | null>(null)
  const showToast = useToastStore((s) => s.showToast)

  useEffect(() => {
    let cancelled = false

    if (!property) {
      queueMicrotask(() => {
        if (cancelled) return
        setNasaData(null)
        setFinancial(null)
        setNasaError(null)
        setNasaLoading(false)
        setPdfError(null)
        setContactResult(null)
      })
      return
    }

    queueMicrotask(() => {
      if (cancelled) return
      setNasaData(null)
      setFinancial(null)
      setNasaError(null)
      setNasaLoading(true)
      setPdfError(null)
      setContactResult(null)
    })

    fetchSolarIrradiance(property.lat, property.lng)
      .then((data) => {
        if (cancelled) return
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
        if (cancelled) return
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
      .finally(() => {
        if (!cancelled) setNasaLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [property, regionConfig])

  const handleFindContact = async () => {
    if (!property) return
    setContactLoading(true)
    setContactResult(null)
    try {
      const sessionData = await bustanSupabase?.auth.getSession()
      const token = sessionData?.data?.session?.access_token
      if (!token) {
        showToast('Not authenticated — sign in to use this feature', 'error')
        setContactLoading(false)
        return
      }
      const body: Record<string, unknown> = {
        lat: property.lat,
        lng: property.lng,
      }
      if (property.id) body.propertyId = property.id
      if (property.title) body.name = property.title
      if (property.website) body.website = property.website

      const res = await fetch('/api/admin-find-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        showToast(err.error || `Find contact failed (${res.status})`, 'error')
        setContactLoading(false)
        return
      }
      const data = await res.json() as FindContactResult & { ok?: boolean; error?: string }
      if (!data.ok && data.error) {
        showToast(data.error, 'error')
        setContactLoading(false)
        return
      }
      setContactResult(data)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Find contact failed', 'error')
    } finally {
      setContactLoading(false)
    }
  }

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
        className="absolute top-0 right-0 bottom-0 w-full sm:w-[380px] z-20 bg-[#0D2137]/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto"
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

        {/* Pending-candidate section — rendered instead of the CRM/proposal content
            when the selected property is still in the review queue. This keeps the
            sidebar useful for triage without showing meaningless proposal/CRM UI
            for an unapproved candidate. */}
        {isCandidate && (
          <CandidateSidebarSection candidate={property} />
        )}

        <div className="p-4 space-y-4" style={isCandidate ? { display: 'none' } : undefined}>
          {/* Existing PV banner — shown when solar panels detected on this roof */}
          {property.existingSolar === true && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400">
              <span className="text-base shrink-0">☀️</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">Existing PV detected on this roof</p>
                {property.roofAnalysisConfidence != null && (
                  <p className="text-[10px] text-amber-400/70 mt-0.5">
                    Confidence: {Math.round(property.roofAnalysisConfidence * 100)}%
                  </p>
                )}
              </div>
            </div>
          )}

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

          {/* Draw / edit roof footprint — engineer/sales/admin only */}
          {isRoof && canEditRoof && (
            <button
              onClick={() => setDrawRoofFor(property.id)}
              className="w-full py-2.5 rounded-xl bg-[#00E676]/15 border border-[#00E676]/30 text-[#00E676] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#00E676]/25 transition-colors"
            >
              <PenLine size={14} />
              {property.roofGeom ? tm.editRoofFootprint : tm.drawRoofFootprint}
            </button>
          )}

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
              <div className="flex items-center gap-2">
                {isEnrichmentAvailable() && !property.ownerName && (
                  <EnrichButton property={property} />
                )}
              </div>
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
                {'Click Enrich to find owner info'}
              </p>
            )}
          </div>

          {/* Find Decision Maker — admin/sales only */}
          {canFindContact && (
            <div className="rounded-xl border border-white/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                  <UserSearch size={12} className="text-[#E8A820]" />
                  Decision Maker
                </h3>
                <div className="flex items-center gap-2">
                  {/* Create Proposal — prefills /admin/proposals/new with this property's data */}
                  <button
                    onClick={() => {
                      const params = new URLSearchParams({
                        property_id: property.id,
                        client_name: property.ownerName || '',
                        location: `${regionConfig.nameEn}`,
                        system_size_kwp: String(
                          property.capacityKwp || (financial ? financial.capacityKwp : '') || ''
                        ),
                        panel_count: String(
                          property.panelCount || (financial ? financial.panelCount : '') || ''
                        ),
                        ...(financial
                          ? {
                              total_price_thb: String(financial.epcCost || ''),
                              annual_savings_thb: String(financial.annualSavingsYear1 || ''),
                              payback_years: String(financial.paybackYears || ''),
                            }
                          : {}),
                      })
                      window.open(`/admin/proposals/new?${params.toString()}`, '_blank')
                    }}
                    className="flex items-center gap-1 text-[10px] text-[#2ED89A] hover:text-[#2ED89A]/80 transition-colors"
                  >
                    <Send size={10} />
                    Create proposal
                  </button>
                  <button
                    onClick={handleFindContact}
                    disabled={contactLoading}
                    className="flex items-center gap-1 text-[10px] text-[#E8A820] hover:text-[#E8A820]/80 transition-colors disabled:opacity-50"
                  >
                    {contactLoading ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
                    {contactLoading ? 'Searching…' : 'Find'}
                  </button>
                </div>
              </div>

              {contactResult && (
                <div className="space-y-2">
                  {/* Confidence */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${contactResult.confidence}%`,
                          backgroundColor: contactResult.confidence >= 70 ? '#2ED89A' : contactResult.confidence >= 40 ? '#E8A820' : '#E85D3A',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-white/50 shrink-0">{contactResult.confidence}% confident</span>
                  </div>

                  {/* Company */}
                  {contactResult.company?.name && (
                    <div className="bg-white/5 rounded-lg p-2 space-y-1">
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Company</p>
                      <p className="text-xs text-white font-medium">{contactResult.company.name}</p>
                      {contactResult.company.registrationNo && (
                        <p className="text-[10px] text-white/40">Reg: {contactResult.company.registrationNo}</p>
                      )}
                      {contactResult.company.address && (
                        <p className="text-[10px] text-white/40 leading-relaxed">{contactResult.company.address}</p>
                      )}
                      {contactResult.company.phone && (
                        <a href={`tel:${contactResult.company.phone}`} className="flex items-center gap-1 text-[10px] text-[#2ED89A] hover:underline">
                          <Phone size={9} /> {contactResult.company.phone}
                        </a>
                      )}
                      {contactResult.company.website && (
                        <a href={contactResult.company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-[#00aaff] hover:underline">
                          <Globe size={9} /> {contactResult.company.website}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Decision maker */}
                  {contactResult.decision_maker?.name && (
                    <div className="bg-white/5 rounded-lg p-2 space-y-1">
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Decision Maker</p>
                      <p className="text-xs text-white font-medium">{contactResult.decision_maker.name}</p>
                      {contactResult.decision_maker.role && (
                        <p className="text-[10px] text-white/50">{contactResult.decision_maker.role}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {contactResult.decision_maker.phone && (
                          <a href={`tel:${contactResult.decision_maker.phone}`} className="flex items-center gap-1 text-[10px] text-[#2ED89A] hover:underline">
                            <Phone size={9} /> {contactResult.decision_maker.phone}
                          </a>
                        )}
                        {contactResult.decision_maker.email && (
                          <a href={`mailto:${contactResult.decision_maker.email}`} className="flex items-center gap-1 text-[10px] text-[#00aaff] hover:underline">
                            <Mail size={9} /> {contactResult.decision_maker.email}
                          </a>
                        )}
                        {contactResult.decision_maker.linkedin && (
                          <a href={contactResult.decision_maker.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-[#60A5FA] hover:underline">
                            <Linkedin size={9} /> LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sources */}
                  {contactResult.sources?.length > 0 && (
                    <p className="text-[9px] text-white/30">
                      Sources: {contactResult.sources.join(', ')}
                    </p>
                  )}

                  {/* Failed stages (collapsed info) */}
                  {contactResult.stages?.some((s) => s.status === 'fail') && (
                    <details className="group">
                      <summary className="text-[9px] text-white/30 cursor-pointer hover:text-white/50 transition-colors list-none flex items-center gap-1">
                        <span>▸</span> Search details
                      </summary>
                      <div className="mt-1 space-y-0.5">
                        {contactResult.stages.map((s, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[9px]">
                            <span className={s.status === 'ok' ? 'text-[#2ED89A]' : s.status === 'fail' ? 'text-red-400' : 'text-white/30'}>
                              {s.status === 'ok' ? '✓' : s.status === 'fail' ? '✗' : '–'}
                            </span>
                            <span className="text-white/40">{s.stage}</span>
                            {s.detail && <span className="text-white/25 truncate">{s.detail}</span>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* No results */}
                  {!contactResult.company?.name && !contactResult.decision_maker?.name && (
                    <p className="text-[11px] text-white/30 text-center py-1">No contact information found</p>
                  )}
                </div>
              )}
            </div>
          )}

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
                      proposalRef: `BU-${property.id.slice(0, 6).toUpperCase()}`,
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

          {/* Generate Proposal — gated to crm.quote permission (sales + admin) */}
          {financial && !nasaLoading && (
            <div className="flex flex-col gap-2">
              {canQuote ? (
                <>
                  {/* PRIMARY: DB-backed tracked proposal — view tracking, signature, email drip */}
                  <button
                    onClick={() => {
                      // property_id is the canonical path — the page will fetch the full
                      // Property (including roofGeom) and hydrate all fields from it.
                      // Fallback scalar params are included so the page can degrade gracefully
                      // if the Bustan fetch fails (e.g. auth not configured).
                      // panel_count drives system_size_kwp in NewProposalPage via calcDerived
                      // (FIX 2: setting system_size_kwp directly was silently dropped because
                      //  calcDerived recomputes it from panel_count × panel_watt).
                      const params = new URLSearchParams({
                        property_id: property.id,
                        client_name: property.ownerName || '',
                        location: `${regionConfig.nameEn}`,
                        system_size_kwp: String(financial.capacityKwp || ''),
                        // Prefer the drawn-roof fitted count (geometry-aware, 580W) over the
                        // legacy 550W area heuristic so the scalar fallback matches the map.
                        panel_count: String(property.panelCount || financial.panelCount || ''),
                        total_price_thb: String(financial.epcCost || ''),
                        annual_savings_thb: String(financial.annualSavingsYear1 || ''),
                        payback_years: String(financial.paybackYears || ''),
                      })
                      window.open(`/admin/proposals/new?${params.toString()}`, '_blank')
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#D4930A] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Send size={16} />
                    {tm.createProposal}
                  </button>
                  <button
                    onClick={() => setShowProposalModal(true)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00D68F] to-[#00B377] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Layers size={16} />
                    {tm.compareOptions}
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
                    className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                  >
                    <FileText size={14} />
                    {tm.quickPreviewUntracked}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await generateProposal({
                          property,
                          financial,
                          nasaData: nasaData ?? undefined,
                          regionName: regionConfig.nameEn,
                        })
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : 'PDF generation failed'
                        setPdfError(msg)
                        console.error('[PropertySidebar] generateProposal failed', e)
                        return
                      }
                      setPdfError(null)
                      // Log to CRM only after successful generation
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
                    {tm.quickReportPdf}
                  </button>
                  {pdfError && (
                    <p className="text-[#E85D3A] text-[10px] text-center px-1">{pdfError}</p>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/30 text-xs">
                  <Lock size={13} />
                  {tm.unauthorizedProposal}
                </div>
              )}
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to push to CRM')
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
