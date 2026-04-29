import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Plus, Loader2, Eye, RefreshCw } from 'lucide-react'
import { getSession } from '../../lib/admin-auth'
import { useAdminStore } from '../../lib/admin-store'

interface ProcurementOrder {
  id: string
  proposal_ref: string | null
  lead_id: string | null
  bom_template: string
  system_kwp: number
  panels: number
  panel_watt: number
  battery_kwh: number
  supplier_name: string | null
  supplier_email: string | null
  estimated_thb: number | null
  quoted_thb: number | null
  actual_thb: number | null
  status: 'draft' | 'sent' | 'quoted' | 'ordered' | 'received' | 'installed' | 'cancelled'
  sent_at: string | null
  ordered_at: string | null
  received_at: string | null
  installed_at: string | null
  created_at: string
  created_by: string | null
  notes: string | null
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  draft:      { label: 'טיוטה',       color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  sent:       { label: 'נשלח לספק',   color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' },
  quoted:     { label: 'התקבל מחיר',  color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  ordered:    { label: 'הוזמן',       color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  received:   { label: 'הגיע למחסן',  color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  installed:  { label: 'הותקן',       color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' },
  cancelled:  { label: 'בוטל',        color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
}

const STATUS_FLOW: Array<ProcurementOrder['status']> = ['draft', 'sent', 'quoted', 'ordered', 'received', 'installed']

const thb = (n: number | null) => (n == null ? '—' : '฿' + n.toLocaleString('en-US'))

export default function ProcurementPage() {
  const navigate = useNavigate()
  const showToast = useAdminStore((s) => s.showToast)
  const [orders, setOrders] = useState<ProcurementOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | ProcurementOrder['status']>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const session = await getSession()
      const token = session?.access_token
      if (!token) throw new Error('לא מחובר')
      const res = await fetch('/api/admin-procurement', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Load failed')
      setOrders(data.orders || [])
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const updateStatus = async (id: string, status: ProcurementOrder['status']) => {
    setUpdatingId(id)
    try {
      const session = await getSession()
      const token = session?.access_token
      if (!token) throw new Error('לא מחובר')

      const res = await fetch(`/api/admin-procurement?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)

      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...data.order } : o)))
      showToast(`סטטוס עודכן: ${STATUS_STYLE[status].label}`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter)

  const totalsByStatus: Record<string, number> = {}
  for (const o of orders) {
    totalsByStatus[o.status] = (totalsByStatus[o.status] || 0) + 1
  }

  return (
    <div dir="rtl" className="p-6 max-w-[1400px] mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8A820]/10 border border-[#E8A820]/20 flex items-center justify-center">
            <Package size={18} className="text-[#E8A820]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">הזמנות רכש</h1>
            <p className="text-sm text-white/40 mt-0.5">
              {orders.length} הזמנות · 🔒 כלי פנימי
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => navigate('/admin/bom')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm hover:opacity-90"
          >
            <Plus size={14} />
            BOM חדש
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label={`הכל (${orders.length})`} />
        {STATUS_FLOW.concat(['cancelled']).map((s) => (
          <FilterChip
            key={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
            label={`${STATUS_STYLE[s].label} (${totalsByStatus[s] || 0})`}
            color={STATUS_STYLE[s].color}
          />
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#E8A820]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-white/40 text-sm">
          {statusFilter === 'all' ? 'אין הזמנות עדיין — צור BOM חדש' : 'אין הזמנות בסטטוס זה'}
        </div>
      ) : (
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 text-[11px] text-white/40 uppercase tracking-wider">
              <tr>
                <th className="text-right px-5 py-3 font-normal">הצעה / לקוח</th>
                <th className="text-right px-3 py-3 font-normal">מערכת</th>
                <th className="text-right px-3 py-3 font-normal">ספק</th>
                <th className="text-right px-3 py-3 font-normal">הערכה</th>
                <th className="text-right px-3 py-3 font-normal">בפועל</th>
                <th className="text-right px-3 py-3 font-normal">סטטוס</th>
                <th className="text-right px-3 py-3 font-normal">נוצר</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const badge = STATUS_STYLE[o.status]
                return (
                  <tr key={o.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <div className="text-sm text-white font-mono">{o.proposal_ref || '—'}</div>
                      <div className="text-xs text-white/40">{o.bom_template.replace(/-/g, ' ')}</div>
                    </td>
                    <td className="px-3 py-3 text-white">
                      <div className="text-sm">{o.system_kwp} kWp</div>
                      <div className="text-xs text-white/40">{o.panels}× {o.panel_watt}W</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-white/70">{o.supplier_name || '—'}</td>
                    <td className="px-3 py-3 text-sm text-white font-mono" dir="ltr">{thb(o.estimated_thb)}</td>
                    <td className="px-3 py-3 text-sm font-mono" dir="ltr">
                      {o.actual_thb ? (
                        <span className={o.actual_thb > (o.estimated_thb || 0) ? 'text-red-400' : 'text-emerald-400'}>
                          {thb(o.actual_thb)}
                        </span>
                      ) : <span className="text-white/40">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value as ProcurementOrder['status'])}
                        disabled={updatingId === o.id}
                        className="text-xs px-2.5 py-1 rounded-full font-medium border cursor-pointer"
                        style={{ color: badge.color, backgroundColor: badge.bg, borderColor: badge.color + '40' }}
                      >
                        {Object.entries(STATUS_STYLE).map(([s, v]) => (
                          <option key={s} value={s} style={{ color: '#000' }}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-xs text-white/50">
                      {new Date(o.created_at).toLocaleDateString('he-IL')}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        {o.proposal_ref && (
                          <button
                            onClick={() => navigate(`/admin/proposals/${o.proposal_ref}`)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                            title="פתח הצעה"
                          >
                            <Eye size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
        active ? 'bg-white/10 text-white border-white/20' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
      }`}
      style={active && color ? { color, borderColor: color + '60' } : undefined}
    >
      {label}
    </button>
  )
}
