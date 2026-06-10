import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, ChevronLeft, Copy, Check, FileDown, Loader2 } from 'lucide-react'
import { fetchProposals, downloadProposalPDF } from '../../lib/admin-service'
import { useAdminStore } from '../../lib/admin-store'
import { STATUS_BADGE } from '../../types/proposals'
import type { ProposalStatus } from '../../types/proposals'

const STATUS_OPTIONS: { value: ProposalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'draft', label: 'טיוטה' },
  { value: 'sent', label: 'נשלח' },
  { value: 'viewed', label: 'נצפה' },
  { value: 'signed', label: 'חתום' },
  { value: 'rejected', label: 'נדחה' },
]

export default function ProposalsListPage() {
  const navigate = useNavigate()
  const proposals = useAdminStore((s) => s.proposals)
  const setProposals = useAdminStore((s) => s.setProposals)
  const proposalsLoading = useAdminStore((s) => s.proposalsLoading)
  const setProposalsLoading = useAdminStore((s) => s.setProposalsLoading)
  const showToast = useAdminStore((s) => s.showToast)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all')
  const [refreshing, setRefreshing] = useState(false)
  // Track copy state per ref
  const [copiedRef, setCopiedRef] = useState<string | null>(null)
  // Track downloading PDF per ref
  const [downloadingRef, setDownloadingRef] = useState<string | null>(null)

  const handleCopyUrl = async (e: React.MouseEvent, ref: string) => {
    e.stopPropagation()
    const url = `https://bustan-energy.com/p/${ref}`
    await navigator.clipboard.writeText(url)
    setCopiedRef(ref)
    setTimeout(() => setCopiedRef(null), 2000)
  }

  const handleDownloadPDF = async (e: React.MouseEvent, ref: string) => {
    e.stopPropagation()
    if (downloadingRef) return
    setDownloadingRef(ref)
    try {
      await downloadProposalPDF(ref)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה בהורדת PDF'
      showToast(msg, 'error')
    } finally {
      setDownloadingRef(null)
    }
  }

  const loadProposals = async () => {
    const data = await fetchProposals()
    setProposals(data)
  }

  useEffect(() => {
    if (proposals.length === 0) {
      setProposalsLoading(true)
      loadProposals().finally(() => setProposalsLoading(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadProposals()
    setRefreshing(false)
  }

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchRef = p.ref_number.toLowerCase().includes(q)
        const matchName = (p.client_name ?? '').toLowerCase().includes(q)
        if (!matchRef && !matchName) return false
      }
      return true
    })
  }, [proposals, statusFilter, search])

  return (
    <div dir="rtl" className="p-3 sm:p-6 max-w-[1200px] mx-auto pb-24 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            aria-label="חזור"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">כל ההצעות</h1>
            <p className="text-sm text-white/40 mt-0.5">{proposals.length} הצעות סה״כ</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
          aria-label="רענן"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי מספר הצעה או שם..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8A820]/50 transition-colors min-h-[44px]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                statusFilter === value
                  ? 'bg-[#E8A820]/10 border border-[#E8A820]/30 text-[#E8A820]'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {proposalsLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#E8A820] border-t-transparent rounded-full animate-spin" />
            <span className="text-white/40 text-sm">טוען הצעות...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
          <p className="text-white/40 text-sm">
            {proposals.length === 0 ? 'אין הצעות עדיין' : 'לא נמצאו תוצאות'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-white/10">
                  {['מספר', 'לקוח', 'מיקום', 'מחיר', 'צפיות', 'סטטוס', 'תאריך', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] text-white/30 uppercase tracking-wider font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((p) => {
                  const badge = STATUS_BADGE[p.status]
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/admin/proposals/${p.ref_number}`)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-white/50">{p.ref_number}</td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{p.client_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-white/50">{p.location ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-white">
                        {p.total_price_thb ? `฿${p.total_price_thb.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/50">{p.view_count}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ color: badge.color, backgroundColor: badge.bg }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/30">
                        {new Date(p.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={(e) => handleCopyUrl(e, p.ref_number)}
                            title="העתק URL"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
                            aria-label="העתק URL"
                          >
                            {copiedRef === p.ref_number
                              ? <Check size={12} className="text-emerald-400" />
                              : <Copy size={12} />
                            }
                          </button>
                          <button
                            onClick={(e) => handleDownloadPDF(e, p.ref_number)}
                            disabled={downloadingRef === p.ref_number}
                            title="הורד PDF"
                            className="p-1.5 rounded-lg bg-[#E8A820]/10 hover:bg-[#E8A820]/20 border border-[#E8A820]/20 text-[#E8A820] transition-all disabled:opacity-50"
                            aria-label="הורד PDF"
                          >
                            {downloadingRef === p.ref_number
                              ? <Loader2 size={12} className="animate-spin" />
                              : <FileDown size={12} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden space-y-3">
            {filtered.map((p) => {
              const badge = STATUS_BADGE[p.status]
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/admin/proposals/${p.ref_number}`)}
                  className="w-full text-right bg-white/5 rounded-2xl border border-white/10 p-4 hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{p.client_name ?? '—'}</p>
                      <p className="text-xs text-white/30 font-mono mt-0.5">{p.ref_number}</p>
                      <p className="text-xs text-white/40 mt-1">
                        {p.location ?? '—'} · {p.total_price_thb ? `฿${p.total_price_thb.toLocaleString()}` : '—'}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                      style={{ color: badge.color, backgroundColor: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
