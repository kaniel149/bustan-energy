import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Lock, Loader2, Phone, FileText, ClipboardCheck, Activity, Search, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { useBustanStore } from '../../lib/bustan-store'
import { useToastStore } from '../../lib/toast-store'
import { can } from '../../lib/bustan-permissions'
import {
  updateLeadStage,
  assignLead,
  updateLeadPipeline,
  updateOwnerDecision,
  fetchSurvey,
  upsertSurvey,
  fetchOmSite,
  upsertOmSite,
  type SiteSurvey,
  type OmSite,
  type WriteResult,
} from '../../lib/bustan-crm-service'
import { buildOwnerResearchLinks } from '../../lib/owner-resolution'
import { autoBuildSystem } from '../../lib/bom'
import { CRM_PIPELINE_STAGES } from '../../lib/owner-decision-layer'
import { useTranslation } from '../../i18n/useTranslation'

const thb = (n: number) => `฿${Math.round(n).toLocaleString('en-US')}`
const inputCls =
  'w-full bg-[#0D2137] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white disabled:opacity-50'

const emptySurvey = (id: string): SiteSurvey => ({
  property_id: id,
  roof_photos: false,
  pea_bill: false,
  battery_space: false,
  shading: '',
  access: '',
  main_board: '',
  notes: '',
  recommendation: '',
})

const emptyOm = (id: string): OmSite => ({
  property_id: id,
  commissioned_at: null,
  monitoring_status: '',
  last_reading_kwh: null,
  performance_ratio: null,
  next_maintenance: null,
  notes: '',
})

/**
 * Full work panel for the selected Bustan lead: CRM fields, auto-BOM quote,
 * site survey, and (when won) O&M. Each section is role-gated; writes surface
 * toasts and never swallow errors.
 */
export function BustanLeadEditor() {
  const selected = useAppStore((s) => s.selectedProperty)
  const lead = useBustanStore((s) => (selected ? s.leadsById[selected.id] : undefined))
  const role = useBustanStore((s) => s.role)
  const patchCrm = useBustanStore((s) => s.patchCrm)
  const showToast = useToastStore((s) => s.showToast)
  const c = useTranslation().t.crm
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'crm' | 'quote' | 'survey' | 'om'>('crm')

  // --- Owner-research accelerator state ------------------------------------
  /** Whether the research panel is expanded. */
  const [ownerPanelOpen, setOwnerPanelOpen] = useState(false)
  /** Resolved address returned from /api/resolve-owner. */
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  /** Loading state for the Nominatim reverse-geocode call. */
  const [geocoding, setGeocoding] = useState(false)
  // -------------------------------------------------------------------------

  const propertyId = selected?.id ?? ''
  const [survey, setSurvey] = useState<SiteSurvey>(emptySurvey(propertyId))
  const [om, setOm] = useState<OmSite>(emptyOm(propertyId))

  useEffect(() => {
    if (!propertyId) return
    let cancelled = false
    setSurvey(emptySurvey(propertyId))
    setOm(emptyOm(propertyId))
    void fetchSurvey(propertyId).then((s) => !cancelled && s && setSurvey(s))
    void fetchOmSite(propertyId).then((o) => !cancelled && o && setOm(o))
    return () => {
      cancelled = true
    }
  }, [propertyId])

  // Reset owner research panel when a different lead is selected.
  useEffect(() => {
    setOwnerPanelOpen(false)
    setResolvedAddress(null)
    setGeocoding(false)
  }, [propertyId])

  const quote = useMemo(() => autoBuildSystem(lead?.crm.estimated_kWp ?? 0), [lead?.crm.estimated_kWp])

  if (!selected || !lead) return null

  const { crm } = lead
  const data = (lead.owner?.data ?? {}) as Record<string, unknown>
  const phone = typeof data.decisionMakerPhone === 'string' ? data.decisionMakerPhone : ''
  const canCrm = can(role, 'crm.edit')
  const canQuote = can(role, 'crm.quote')
  const canSurvey = can(role, 'survey.edit')
  const canOm = can(role, 'om.edit')
  const isWon = crm.crm_stage === 'won'

  // Coordinates for reverse-geocode + deep-links.
  const lat = lead.property.lat ?? undefined
  const lng = lead.property.lon ?? undefined
  const ownerName = data.legalOwnerName as string | undefined

  /**
   * Build deep-links (pure, no network) and POST to /api/resolve-owner for a
   * real address. Stamps research_status = 'needs_research' on the owner row to
   * signal to other reps that someone has opened the research panel for this lead.
   * Uses the editor's existing runWrite mechanism so saves/errors surface as toasts.
   */
  const handleOpenResearch = async () => {
    setOwnerPanelOpen(true)

    // Stamp research_status to 'needs_research' via the existing write path so
    // the activity-log trigger fires and other reps see this lead is being worked.
    // Only stamp if status is currently 'pending' or 'unknown' (don't downgrade).
    const currentStatus = lead.owner?.research_status ?? ''
    if (currentStatus === 'pending' || currentStatus === '' || currentStatus === 'unknown') {
      void runWrite(
        () => updateOwnerDecision(selected.id, { research_status: 'needs_research' }),
        canCrm,
        () => {},
        'Research status → needs_research',
      )
    }

    // Reverse-geocode the rooftop — single on-demand call per panel open.
    if (lat != null && lng != null && resolvedAddress === null && !geocoding) {
      setGeocoding(true)
      try {
        const res = await fetch('/api/resolve-owner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        })
        const json = (await res.json()) as { address?: string; error?: string }
        if (json.address) {
          setResolvedAddress(json.address)
        } else {
          setResolvedAddress(json.error ?? 'No address found')
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Network error'
        setResolvedAddress(`Geocode failed: ${message}`)
      } finally {
        setGeocoding(false)
      }
    }
  }

  /** Stamp sourceUrl on the owner row when rep clicks a registry deep-link. */
  const handleLinkClick = (url: string) => {
    if (!canCrm) return
    void updateOwnerDecision(selected.id, { source_url: url })
  }

  // Build registry deep-links (pure — no network, runs synchronously).
  const researchLinks = buildOwnerResearchLinks({
    lat,
    lng,
    name: ownerName || (lead.property.name ?? undefined),
    address: resolvedAddress ?? undefined,
    region: 'koh_phangan',
    propertyType: lead.property.property_type ?? undefined,
  })

  const runWrite = async (
    fn: () => Promise<WriteResult>,
    allowed: boolean,
    onOk: () => void,
    successMsg: string,
  ) => {
    if (!allowed) {
      showToast(c.roleCannot, 'info')
      return
    }
    setSaving(true)
    const res = await fn()
    setSaving(false)
    if (res.ok) {
      onOk()
      showToast(successMsg, 'success')
    } else {
      showToast(res.error || c.saveFailed, 'error')
    }
  }

  const tabs: { key: typeof tab; label: string; icon: ReactNode; show: boolean }[] = [
    { key: 'crm', label: c.tabs.crm, icon: <ClipboardCheck size={12} />, show: true },
    { key: 'quote', label: c.tabs.quote, icon: <FileText size={12} />, show: canQuote },
    { key: 'survey', label: c.tabs.survey, icon: <ClipboardCheck size={12} />, show: true },
    { key: 'om', label: c.tabs.om, icon: <Activity size={12} />, show: isWon },
  ]

  return (
    <div className="fixed inset-x-2 bottom-2 top-auto sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-4 sm:right-4 z-30 w-auto sm:w-[320px] max-h-[70vh] sm:max-h-[85vh] overflow-y-auto rounded-2xl bg-[#0A1929]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white truncate">{selected.title}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
          {crm.priority} · {c.reach[crm.reachability]}
        </span>
      </div>
      <div className="text-[11px] text-white/50">
        {c.leadScore} <span className="text-white/80 font-medium">{crm.lead_score}</span> ·{' '}
        {crm.estimated_kWp} kWp · {thb(crm.estimated_annual_thb)}{c.perYear}
      </div>
      {phone && (
        <a href={`tel:${phone}`} className="flex items-center gap-2 text-xs text-emerald-300 hover:text-emerald-200">
          <Phone size={12} /> {phone}
        </a>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-2">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] ${
              tab === t.key ? 'bg-[#6366f1]/20 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'crm' && (
        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-wide text-white/40">{c.stage}</label>
          <select
            value={crm.crm_stage}
            disabled={!canCrm || saving}
            onChange={(e) => {
              const stage = e.target.value
              void runWrite(
                () => updateLeadStage(selected.id, stage),
                canCrm,
                () => patchCrm(selected.id, { crm_stage: stage as typeof crm.crm_stage }),
                `Stage → ${stage}`,
              )
            }}
            className={inputCls}
          >
            {CRM_PIPELINE_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          <label className="block text-[10px] uppercase tracking-wide text-white/40">{c.assignedTo}</label>
          <input
            type="text"
            defaultValue={crm.assigned_to}
            disabled={!canCrm || saving}
            placeholder={c.unassigned}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v === (crm.assigned_to || '')) return
              void runWrite(
                () => assignLead(selected.id, v || null),
                canCrm,
                () => patchCrm(selected.id, { assigned_to: v }),
                v ? `Assigned to ${v}` : 'Unassigned',
              )
            }}
            className={inputCls}
          />

          <label className="block text-[10px] uppercase tracking-wide text-white/40">{c.nextAction}</label>
          <input
            type="text"
            defaultValue={crm.next_action}
            disabled={!canCrm || saving}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v === (crm.next_action || '')) return
              void runWrite(
                () => updateLeadPipeline(selected.id, { next_action: v }),
                canCrm,
                () => patchCrm(selected.id, { next_action: v }),
                'Next action saved',
              )
            }}
            className={inputCls}
          />
          {!canCrm && (
            <p className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Lock size={11} /> {c.readonly} ({role})
            </p>
          )}

          {/* ----------------------------------------------------------------
              Owner-research accelerator
              Automates the free/legal parts of owner resolution:
              reverse-geocode the rooftop address + deep-links to Thai
              registries (DBD juristic persons + Land Dept).
              Owner NAME resolution stays manual by design — PDPA B.E. 2562.
          ---------------------------------------------------------------- */}
          <div className="border-t border-white/10 pt-2 mt-1">
            <button
              onClick={() => {
                if (!ownerPanelOpen) {
                  void handleOpenResearch()
                } else {
                  setOwnerPanelOpen(false)
                }
              }}
              className="flex items-center gap-1.5 w-full text-left text-[11px] text-indigo-300 hover:text-indigo-200 font-medium py-1"
              aria-expanded={ownerPanelOpen}
              aria-controls="owner-research-panel"
            >
              <Search size={11} />
              {ownerPanelOpen ? 'Hide' : 'Resolve owner'} / חקור בעלים
              {ownerPanelOpen ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
            </button>

            {ownerPanelOpen && (
              <div id="owner-research-panel" className="space-y-2 mt-1">
                {/* Resolved address from Nominatim */}
                <div className="rounded-lg bg-white/5 border border-white/10 p-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-white/40">
                    Reverse-geocoded address
                  </p>
                  {geocoding && (
                    <p className="flex items-center gap-1 text-[11px] text-white/50">
                      <Loader2 size={10} className="animate-spin" /> Geocoding…
                    </p>
                  )}
                  {!geocoding && resolvedAddress && (
                    <p
                      className="text-[11px] text-white/80 cursor-pointer select-all"
                      title="Click to select — copy into owner fields"
                    >
                      {resolvedAddress}
                    </p>
                  )}
                  {!geocoding && !resolvedAddress && lat == null && (
                    <p className="text-[11px] text-white/40 italic">No coordinates on this lead</p>
                  )}
                </div>

                {/* Registry deep-links */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-white/40">
                    {researchLinks.registryName}
                  </p>
                  {researchLinks.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick(link.url)}
                      className="flex items-center gap-1.5 text-[11px] text-sky-300 hover:text-sky-200 truncate"
                      title={link.url}
                    >
                      <ExternalLink size={10} className="shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </a>
                  ))}
                </div>

                {/* PDPA/legal note */}
                <p className="text-[10px] text-amber-400/70 leading-relaxed">
                  {researchLinks.note}
                </p>
              </div>
            )}
          </div>
          {/* end owner-research accelerator */}
        </div>
      )}

      {tab === 'quote' && canQuote && (
        <div className="space-y-2 text-xs">
          <p className="text-white/60">
            {quote.kWp} kWp · {quote.panels} {c.quote.panels} · {quote.inverterUnits} {c.quote.inverters}
          </p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
            {quote.lines.map((l) => (
              <div key={l.product.sku} className="flex justify-between gap-2 px-2 py-1">
                <span className="text-white/70 truncate">
                  {l.qty}× {l.product.name}
                </span>
                <span className="text-white/50 shrink-0">{thb(l.product.cost_thb * l.qty)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-white/70">
            <div className="flex justify-between">
              <span>{c.quote.equipment}</span>
              <span>{thb(quote.equipmentCostThb)}</span>
            </div>
            <div className="flex justify-between">
              <span>{c.quote.labor} (฿4,500/kWp)</span>
              <span>{thb(quote.laborCostThb)}</span>
            </div>
            <div className="flex justify-between font-semibold text-white border-t border-white/10 pt-1">
              <span>{c.quote.total}</span>
              <span>{thb(quote.equipmentCostThb + quote.laborCostThb)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'survey' && (
        <div className="space-y-2 text-xs">
          {(['roof_photos', 'pea_bill', 'battery_space'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-white/70">
              <input
                type="checkbox"
                checked={survey[k]}
                disabled={!canSurvey || saving}
                onChange={(e) => setSurvey({ ...survey, [k]: e.target.checked })}
              />
              {k.replace('_', ' ')}
            </label>
          ))}
          {(['shading', 'access', 'main_board', 'notes'] as const).map((k) => (
            <input
              key={k}
              type="text"
              value={survey[k]}
              disabled={!canSurvey || saving}
              placeholder={k.replace('_', ' ')}
              onChange={(e) => setSurvey({ ...survey, [k]: e.target.value })}
              className={inputCls}
            />
          ))}
          <select
            value={survey.recommendation}
            disabled={!canSurvey || saving}
            onChange={(e) => setSurvey({ ...survey, recommendation: e.target.value as SiteSurvey['recommendation'] })}
            className={inputCls}
          >
            <option value="">{c.survey.recommendation}</option>
            <option value="go">{c.survey.go}</option>
            <option value="maybe">{c.survey.maybe}</option>
            <option value="no-go">{c.survey.nogo}</option>
          </select>
          <button
            disabled={!canSurvey || saving}
            onClick={() => void runWrite(() => upsertSurvey(survey), canSurvey, () => {}, c.survey.save)}
            className="w-full bg-[#6366f1] hover:bg-[#6366f1]/80 disabled:opacity-40 rounded-lg py-1.5 text-white text-sm"
          >
            {c.survey.save}
          </button>
          {!canSurvey && (
            <p className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Lock size={11} /> {c.readonly} ({role})
            </p>
          )}
        </div>
      )}

      {tab === 'om' && isWon && (
        <div className="space-y-2 text-xs">
          <select
            value={om.monitoring_status}
            disabled={!canOm || saving}
            onChange={(e) => setOm({ ...om, monitoring_status: e.target.value as OmSite['monitoring_status'] })}
            className={inputCls}
          >
            <option value="">{c.om.status}</option>
            <option value="online">{c.om.online}</option>
            <option value="offline">{c.om.offline}</option>
            <option value="alert">{c.om.alert}</option>
          </select>
          <input
            type="number"
            value={om.last_reading_kwh ?? ''}
            disabled={!canOm || saving}
            placeholder="last reading kWh"
            onChange={(e) => setOm({ ...om, last_reading_kwh: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputCls}
          />
          <input
            type="number"
            step="0.01"
            value={om.performance_ratio ?? ''}
            disabled={!canOm || saving}
            placeholder="performance ratio"
            onChange={(e) => setOm({ ...om, performance_ratio: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputCls}
          />
          <input
            type="text"
            value={om.notes}
            disabled={!canOm || saving}
            placeholder="notes"
            onChange={(e) => setOm({ ...om, notes: e.target.value })}
            className={inputCls}
          />
          <button
            disabled={!canOm || saving}
            onClick={() => void runWrite(() => upsertOmSite(om), canOm, () => {}, c.om.save)}
            className="w-full bg-[#6366f1] hover:bg-[#6366f1]/80 disabled:opacity-40 rounded-lg py-1.5 text-white text-sm"
          >
            {c.om.save}
          </button>
          {!canOm && (
            <p className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Lock size={11} /> {c.readonly} ({role})
            </p>
          )}
        </div>
      )}

      {saving && (
        <p className="flex items-center gap-1.5 text-[11px] text-blue-300">
          <Loader2 size={11} className="animate-spin" /> {c.saving}
        </p>
      )}
    </div>
  )
}
