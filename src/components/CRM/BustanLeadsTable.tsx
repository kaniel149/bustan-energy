import { useMemo, useState } from 'react'
import { Search, Phone, CheckSquare, Square } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { useBustanStore } from '../../lib/bustan-store'
import { useToastStore } from '../../lib/toast-store'
import { can } from '../../lib/bustan-permissions'
import { updateLeadStage, mapLeadToProperty } from '../../lib/bustan-crm-service'
import { CRM_PIPELINE_STAGES } from '../../lib/owner-decision-layer'
import { useTranslation } from '../../i18n/useTranslation'

const PRIORITY_COLOR: Record<string, string> = {
  A: 'text-emerald-400 bg-emerald-400/10',
  B: 'text-yellow-400 bg-yellow-400/10',
  C: 'text-orange-400 bg-orange-400/10',
}
const REACH_COLOR: Record<string, string> = {
  contactable: 'text-emerald-300',
  partial: 'text-yellow-300',
  cold: 'text-white/40',
}
const stageLabel = (k: string) => CRM_PIPELINE_STAGES.find((s) => s.key === k)?.label ?? k

/** Sortable, filterable leads table with bulk stage actions (bustan data). */
export default function BustanLeadsTable() {
  const leadsById = useBustanStore((s) => s.leadsById)
  const role = useBustanStore((s) => s.role)
  const patchCrm = useBustanStore((s) => s.patchCrm)
  const setSelectedProperty = useAppStore((s) => s.setSelectedProperty)
  const showToast = useToastStore((s) => s.showToast)
  const c = useTranslation().t.crm

  const [search, setSearch] = useState('')
  const [fPriority, setFPriority] = useState('all')
  const [fStage, setFStage] = useState('all')
  const [fReach, setFReach] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStage, setBulkStage] = useState('')
  const [busy, setBusy] = useState(false)

  const canEdit = can(role, 'crm.edit')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return Object.values(leadsById)
      .filter((l) => {
        if (fPriority !== 'all' && l.crm.priority !== fPriority) return false
        if (fStage !== 'all' && l.crm.crm_stage !== fStage) return false
        if (fReach !== 'all' && l.crm.reachability !== fReach) return false
        if (q) {
          const hay = `${l.property.name ?? ''} ${l.property.area_name ?? ''}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.crm.lead_score - a.crm.lead_score)
  }, [leadsById, search, fPriority, fStage, fReach])

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.property.id))
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.property.id)))
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const applyBulkStage = async () => {
    if (!bulkStage || selected.size === 0) return
    setBusy(true)
    let ok = 0
    let fail = 0
    for (const id of selected) {
      const res = await updateLeadStage(id, bulkStage)
      if (res.ok) {
        patchCrm(id, { crm_stage: bulkStage as never })
        ok++
      } else fail++
    }
    setBusy(false)
    setSelected(new Set())
    showToast(`${ok} ${c.table.moved} ${stageLabel(bulkStage)}${fail ? `, ${fail} ${c.table.failed}` : ''}`, fail ? 'error' : 'success')
  }

  return (
    <div className="h-full flex flex-col text-white">
      {/* Toolbar */}
      <div className="p-3 border-b border-white/10 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={c.table.search}
            className="w-full bg-[#0D2137] border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-sm"
          />
        </div>
        <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className="bg-[#0D2137] border border-white/10 rounded-lg px-2 py-1.5 text-sm">
          <option value="all">{c.table.allPriorities}</option>
          {['A', 'B', 'C'].map((p) => <option key={p} value={p}>{c.priority} {p}</option>)}
        </select>
        <select value={fStage} onChange={(e) => setFStage(e.target.value)} className="bg-[#0D2137] border border-white/10 rounded-lg px-2 py-1.5 text-sm">
          <option value="all">{c.table.allStages}</option>
          {CRM_PIPELINE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={fReach} onChange={(e) => setFReach(e.target.value)} className="bg-[#0D2137] border border-white/10 rounded-lg px-2 py-1.5 text-sm">
          <option value="all">{c.table.allReach}</option>
          {(['contactable', 'partial', 'cold'] as const).map((r) => <option key={r} value={r}>{c.reach[r]}</option>)}
        </select>
        <span className="text-xs text-white/40">{rows.length} {c.table.leads}</span>
      </div>

      {/* Bulk bar */}
      {canEdit && selected.size > 0 && (
        <div className="px-3 py-2 bg-[#6366f1]/10 border-b border-white/10 flex items-center gap-2 text-sm">
          <span className="text-white/70">{selected.size} {c.table.selected}</span>
          <select value={bulkStage} onChange={(e) => setBulkStage(e.target.value)} className="bg-[#0D2137] border border-white/10 rounded-lg px-2 py-1 text-sm">
            <option value="">{c.table.setStage}</option>
            {CRM_PIPELINE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button onClick={() => void applyBulkStage()} disabled={!bulkStage || busy} className="bg-[#6366f1] hover:bg-[#6366f1]/80 disabled:opacity-40 rounded-lg px-3 py-1 text-white text-xs">
            {c.table.apply}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-white/50 hover:text-white/80 text-xs">{c.table.clear}</button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0A1628] text-white/40 text-[11px] uppercase">
            <tr>
              <th className="w-8 p-2">
                {canEdit && (
                  <button onClick={toggleAll} aria-label="select all">
                    {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                )}
              </th>
              <th className="text-left p-2">{c.table.lead}</th>
              <th className="text-left p-2 hidden sm:table-cell">{c.table.area}</th>
              <th className="text-right p-2">kWp</th>
              <th className="text-left p-2">{c.stage}</th>
              <th className="text-left p-2 hidden sm:table-cell">{c.dash.reachability}</th>
              <th className="text-left p-2">{c.table.phone}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const data = (l.owner?.data ?? {}) as Record<string, unknown>
              const phone = typeof data.decisionMakerPhone === 'string' ? data.decisionMakerPhone : ''
              return (
                <tr key={l.property.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-2 text-center">
                    {canEdit && (
                      <button onClick={() => toggleOne(l.property.id)} aria-label="select">
                        {selected.has(l.property.id) ? <CheckSquare size={14} className="text-[#6366f1]" /> : <Square size={14} className="text-white/40" />}
                      </button>
                    )}
                  </td>
                  <td className="p-2">
                    <button onClick={() => setSelectedProperty(mapLeadToProperty(l))} className="text-left hover:text-[#6366f1]">
                      <span className={`inline-block px-1.5 rounded text-[10px] mr-1.5 ${PRIORITY_COLOR[l.crm.priority] ?? ''}`}>{l.crm.priority}</span>
                      {l.property.name ?? l.property.id}
                    </button>
                  </td>
                  <td className="p-2 text-white/50 hidden sm:table-cell truncate max-w-[160px]">{l.property.area_name}</td>
                  <td className="p-2 text-right text-white/70">{l.crm.estimated_kWp}</td>
                  <td className="p-2 text-white/70">{stageLabel(l.crm.crm_stage)}</td>
                  <td className={`p-2 hidden sm:table-cell ${REACH_COLOR[l.crm.reachability]}`}>{c.reach[l.crm.reachability]}</td>
                  <td className="p-2">
                    {phone ? (
                      <a href={`tel:${phone}`} className="flex items-center gap-1 text-emerald-300 hover:text-emerald-200" onClick={(e) => e.stopPropagation()}>
                        <Phone size={11} /> {phone}
                      </a>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-white/40 text-sm">{c.table.noMatch}</p>}
      </div>
    </div>
  )
}
