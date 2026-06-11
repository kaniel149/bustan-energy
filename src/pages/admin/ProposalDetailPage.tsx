import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Copy,
  ExternalLink,
  FileDown,
  Check,
  Eye,
  Clock,
  Loader2,
  Package,
  FileCheck,
  AlertTriangle,
  Download,
  PenLine,
  Send,
} from 'lucide-react'
import { fetchProposal, buildTimeline, downloadProposalPDF, downloadSignedPDF } from '../../lib/admin-service'
import { useAdminStore } from '../../lib/admin-store'
import { STATUS_BADGE } from '../../types/proposals'
import type { Proposal } from '../../types/proposals'
import { getSession } from '../../lib/admin-auth'
import { PEA_BRANCHES, PEA_STATUS_LABELS, PEA_STATUS_COLORS } from '../../lib/pea-branches'
import PEASignaturePad from '../../components/admin/PEASignaturePad'
import { supabase } from '../../lib/supabase'

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/40 w-28 sm:w-36 shrink-0">{label}</span>
      <span className="text-sm text-white break-all">{String(value)}</span>
    </div>
  )
}

function CopyInlineButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
      aria-label="העתק"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  )
}

// ── PEA status types ────────────────────────────────────────
const PEA_STATUSES = [
  'not_started', 'package_ready', 'submitted', 'under_review',
  'approved', 'objected', 'resubmit_needed', 'meter_installed', 'commercial_operation',
] as const
type PEAStatus = typeof PEA_STATUSES[number]

interface PEAState {
  project_id: string | null
  pea_branch: string
  pea_authority: 'PEA' | 'MEA'
  pea_status: PEAStatus
  pea_reference_number: string
  pea_application_date: string
  pea_meter_inspection_date: string
  pea_approval_date: string
  pea_rejection_reason: string
  // docs from pea_documents table
  documents: { id: string; document_type: string; file_url: string | null; signed_by_owner: boolean; signed_by_engineer: boolean }[]
}

const PEA_DEFAULT: PEAState = {
  project_id: null,
  pea_branch: 'surat_thani',
  pea_authority: 'PEA',
  pea_status: 'not_started',
  pea_reference_number: '',
  pea_application_date: '',
  pea_meter_inspection_date: '',
  pea_approval_date: '',
  pea_rejection_reason: '',
  documents: [],
}

export default function ProposalDetailPage() {
  const { ref } = useParams<{ ref: string }>()
  const navigate = useNavigate()

  const showToast = useAdminStore((s) => s.showToast)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [downloadingSignedPDF, setDownloadingSignedPDF] = useState(false)
  const [markingSent, setMarkingSent] = useState(false)

  // PEA section state
  const [pea, setPea] = useState<PEAState>(PEA_DEFAULT)
  const [peaSaving, setPeaSaving] = useState(false)
  const [peaPackageLoading, setPeaPackageLoading] = useState(false)
  const [showSignPad, setShowSignPad] = useState<{ documentId: string; role: 'owner' | 'engineer' } | null>(null)

  const loadPeaData = useCallback(async (proposalRef: string) => {
    if (!supabase) return
    // Try to find a project linked to this proposal
    const { data: projects } = await supabase
      .from('projects')
      .select('id,pea_branch,pea_authority,pea_status,pea_reference_number,pea_application_date,pea_meter_inspection_date,pea_approval_date,pea_rejection_reason')
      .eq('proposal_ref', proposalRef)
      .limit(1)

    const proj = projects?.[0] ?? null

    // Also load pea_documents
    let docs: PEAState['documents'] = []
    const docQuery = supabase
      .from('pea_documents')
      .select('id,document_type,file_url,signed_by_owner,signed_by_engineer')
      .order('created_at', { ascending: false })
    const { data: docRows } = proj?.id
      ? await docQuery.eq('project_id', proj.id)
      : await docQuery.eq('proposal_ref', proposalRef)
    docs = (docRows ?? []) as PEAState['documents']

    setPea({
      project_id: proj?.id ?? null,
      pea_branch: proj?.pea_branch ?? 'surat_thani',
      pea_authority: proj?.pea_authority ?? 'PEA',
      pea_status: proj?.pea_status ?? 'not_started',
      pea_reference_number: proj?.pea_reference_number ?? '',
      pea_application_date: proj?.pea_application_date ? proj.pea_application_date.slice(0, 10) : '',
      pea_meter_inspection_date: proj?.pea_meter_inspection_date ? proj.pea_meter_inspection_date.slice(0, 10) : '',
      pea_approval_date: proj?.pea_approval_date ? proj.pea_approval_date.slice(0, 10) : '',
      pea_rejection_reason: proj?.pea_rejection_reason ?? '',
      documents: docs,
    })
  }, [])

  useEffect(() => {
    if (!ref) return
    fetchProposal(ref)
      .then((p) => {
        setProposal(p)
        if (p) loadPeaData(p.ref_number)
      })
      .finally(() => setLoading(false))
  }, [ref, loadPeaData])

  if (loading) {
    return (
      <div dir="rtl" className="p-6 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#E8A820] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm">טוען הצעה...</span>
        </div>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div dir="rtl" className="p-6 text-center py-20">
        <p className="text-white/40 text-sm">הצעה לא נמצאה</p>
        <button
          onClick={() => navigate('/admin/proposals')}
          className="mt-4 text-[#E8A820] text-sm hover:underline"
        >
          חזור לרשימה
        </button>
      </div>
    )
  }

  const badge = STATUS_BADGE[proposal.status]
  const proposalUrl = `https://bustan-energy.com/p/${proposal.ref_number}`
  const timeline = buildTimeline(proposal)

  const handleDownloadPDF = async () => {
    if (!ref || downloadingPDF) return
    setDownloadingPDF(true)
    try {
      await downloadProposalPDF(ref)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה בהורדת PDF'
      showToast(msg, 'error')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const handleDownloadSignedPDF = async () => {
    if (!ref || downloadingSignedPDF) return
    setDownloadingSignedPDF(true)
    try {
      await downloadSignedPDF(ref)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה בהורדת PDF חתום'
      showToast(msg, 'error')
    } finally {
      setDownloadingSignedPDF(false)
    }
  }

  // Mark a draft proposal as sent — starts the not_viewed drip clock truthfully
  // (proposals are created as 'draft'; the admin copies the link manually, then
  // clicks this when the client actually received it).
  const handleMarkSent = async () => {
    if (!ref || markingSent) return
    setMarkingSent(true)
    try {
      const session = await getSession()
      if (!session) throw new Error('לא מחובר')
      const res = await fetch('/api/admin-create-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'mark_sent', ref }),
      })
      if (!res.ok) throw new Error('הסימון נכשל')
      const p = await fetchProposal(ref)
      if (p) setProposal(p)
      showToast('ההצעה סומנה כנשלחה — תזכורות הופעלו', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה בסימון', 'error')
    } finally {
      setMarkingSent(false)
    }
  }

  // ── PEA handlers ───────────────────────────────────────────
  const handlePeaSave = async () => {
    if (!pea.project_id || !supabase) {
      showToast('No project linked — create a project first', 'error')
      return
    }
    setPeaSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          pea_branch: pea.pea_branch,
          pea_authority: pea.pea_authority,
          pea_status: pea.pea_status,
          pea_reference_number: pea.pea_reference_number || null,
          pea_application_date: pea.pea_application_date || null,
          pea_meter_inspection_date: pea.pea_meter_inspection_date || null,
          pea_approval_date: pea.pea_approval_date || null,
          pea_rejection_reason: pea.pea_rejection_reason || null,
        })
        .eq('id', pea.project_id)
      if (error) throw new Error(error.message)
      showToast('PEA status saved', 'success')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error')
    } finally {
      setPeaSaving(false)
    }
  }

  const handlePeaPackage = async () => {
    if (!proposal) return
    setPeaPackageLoading(true)
    try {
      const session = await getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const res = await fetch('/api/admin-pea-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          project_id: pea.project_id || undefined,
          proposal_ref: proposal.ref_number,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Package generation failed')

      const readinessWarnings = data.readiness?.items?.filter((item: { severity: string }) => item.severity !== 'ok').length || 0
      showToast(
        readinessWarnings > 0
          ? `Package ready: ${data.document_count} documents · ${readinessWarnings} readiness warnings`
          : `Package ready: ${data.document_count} documents`,
        readinessWarnings > 0 ? 'info' : 'success',
      )
      // Update local status
      setPea((prev) => ({ ...prev, pea_status: 'package_ready' }))
      // Refresh PEA data to show new documents
      await loadPeaData(proposal.ref_number)

      // Open first document URL in new tab
      const firstDoc = data.documents?.find((d: { url?: string }) => d.url)
      if (firstDoc?.url) window.open(firstDoc.url, '_blank')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Package generation failed', 'error')
    } finally {
      setPeaPackageLoading(false)
    }
  }

  return (
    <div dir="rtl" className="p-3 sm:p-6 max-w-[1100px] mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/proposals')}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="חזור"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">{proposal.client_name ?? '—'}</h1>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.label}
              </span>
            </div>
            <p className="text-sm text-white/40 mt-0.5 font-mono">{proposal.ref_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:mr-auto sm:ml-0">
          {proposal.status === 'draft' && (
            <button
              onClick={handleMarkSent}
              disabled={markingSent}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#2ED89A]/15 border border-[#2ED89A]/40 text-[#2ED89A] text-sm font-medium hover:bg-[#2ED89A]/25 transition-all disabled:opacity-50 min-h-[40px]"
              title="סמן שהלינק נשלח ללקוח — מפעיל תזכורות אוטומטיות"
            >
              {markingSent ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              סמן כנשלחה
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#E8A820]/10 border border-[#E8A820]/30 text-[#E8A820] text-sm hover:bg-[#E8A820]/20 transition-all disabled:opacity-50 min-h-[40px]"
            aria-label="הורד PDF"
          >
            {downloadingPDF
              ? <Loader2 size={15} className="animate-spin" />
              : <FileDown size={15} />
            }
            PDF
          </button>
          {proposal.signed_at !== null && (proposal.signature_data !== null || true) && (
            <button
              onClick={handleDownloadSignedPDF}
              disabled={downloadingSignedPDF}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-all disabled:opacity-50"
              aria-label="הורד PDF חתום"
            >
              {downloadingSignedPDF
                ? <Loader2 size={15} className="animate-spin" />
                : <FileDown size={15} />
              }
              PDF חתום
            </button>
          )}

          <button
            onClick={() => navigate(`/admin/proposals/${proposal.ref_number}/edit`)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#E8A820]/10 border border-[#E8A820]/30 text-[#E8A820] text-sm hover:bg-[#E8A820]/20 transition-all"
            aria-label="ערוך הצעה"
            title="ערוך ופרסם מחדש את ההצעה"
          >
            <PenLine size={15} />
            ערוך
          </button>

          {/* Internal PEA drawings — always visible */}
          <button
            onClick={() => {
              const params = new URLSearchParams({
                ref: proposal.ref_number,
                client_name: proposal.client_name ?? '',
                client_site: proposal.location ?? 'Koh Phangan, Surat Thani 84280',
                kwp: String(proposal.system_size_kwp ?? 87),
                panels: String(proposal.panel_count ?? 157),
                watt: String(proposal.panel_watt ?? 555),
                panel_model: proposal.panel_model ?? 'JA Solar JAM72S30-555/MR',
                inverter_model: proposal.inverter_model ?? 'Huawei SUN2000-100KTL-M1',
                inverter_kw: '100',
                battery_kwh: String(proposal.battery_kwh ?? 0),
                strings: String(Math.ceil((proposal.panel_count ?? 157) / 13)),
                ac_run_m: '15',
                ac_current_a: String(Math.round((proposal.system_size_kwp ?? 87) * 1000 / (1.732 * 400 * 0.95))),
              })
              navigate(`/admin/pea?${params}`)
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-500/20 transition-all"
            aria-label="תכניות PEA"
            title="הפק תכניות להעברה למהנדס + PEA"
          >
            <FileCheck size={15} />
            תכניות PEA
          </button>

          {/* Internal BOM / Supplier order — shown for any proposal, highlighted after signature */}
          <button
            onClick={() => {
              const params = new URLSearchParams({
                panels: String(proposal.panel_count ?? 0),
                watt: String(proposal.panel_watt ?? 555),
                template: 'grid-tied-commercial-metal-roof',
                ref: proposal.ref_number,
                client_name: proposal.client_name ?? '',
                client_site: proposal.location ?? 'Koh Phangan, Surat Thani 84280',
              })
              navigate(`/admin/bom?${params}`)
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
              proposal.status === 'signed'
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 animate-pulse'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
            }`}
            aria-label="הכן הזמנה לספק"
            title={proposal.status === 'signed' ? 'הצעה חתומה — מומלץ להוציא הזמנה' : 'כלי פנימי — הכן BOM + בקשה לספק'}
          >
            <Package size={15} />
            {proposal.status === 'signed' ? '🛒 הכן הזמנה לספק' : 'BOM'}
          </button>
          <button
            onClick={() => window.open(proposalUrl, '_blank')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:text-white hover:bg-white/10 transition-all"
          >
            <ExternalLink size={15} />
            פתח
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* URL + Password */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3">פרטי גישה</p>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-white/50 font-mono flex-1 truncate" dir="ltr">
                {proposalUrl}
              </span>
              <CopyInlineButton text={proposalUrl} />
              <button
                onClick={() => window.open(proposalUrl, '_blank')}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
                aria-label="פתח"
              >
                <ExternalLink size={13} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/40 uppercase tracking-wider">סיסמה:</span>
              <span className="font-mono text-white/60 text-sm tracking-widest">••••••</span>
              <span className="text-xs text-white/30">(מוסתרת)</span>
            </div>
          </div>

          {/* Proposal details */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3">פרטי הצעה</p>
            <InfoRow label="לקוח" value={proposal.client_name} />
            <InfoRow label="טלפון" value={proposal.client_phone} />
            <InfoRow label="אימייל" value={proposal.client_email} />
            <InfoRow label="מיקום" value={proposal.location} />
            <InfoRow label="גודל מערכת" value={proposal.system_size_kwp ? `${proposal.system_size_kwp} kWp` : null} />
            <InfoRow label="מספר פאנלים" value={proposal.panel_count} />
            <InfoRow label="דגם פאנל" value={proposal.panel_model} />
            <InfoRow label="אינוורטר" value={proposal.inverter_model} />
            <InfoRow label="סוללה" value={proposal.battery_model} />
            <InfoRow label="ייצור שנתי" value={proposal.annual_production_kwh ? `${proposal.annual_production_kwh?.toLocaleString()} kWh` : null} />
            <InfoRow label="חיסכון חודשי" value={proposal.monthly_savings_thb ? `฿${proposal.monthly_savings_thb?.toLocaleString()}` : null} />
            <InfoRow label="חיסכון שנתי" value={proposal.annual_savings_thb ? `฿${proposal.annual_savings_thb?.toLocaleString()}` : null} />
            <InfoRow label="מחיר כולל" value={proposal.total_price_thb ? `฿${proposal.total_price_thb?.toLocaleString()}` : null} />
            <InfoRow label="החזר השקעה" value={proposal.payback_years ? `${proposal.payback_years} שנים` : null} />
            <InfoRow label="שפה" value={proposal.language} />
          </div>

          {/* Preview toggle */}
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Eye size={15} className="text-white/40" />
                <span className="text-sm font-medium text-white">תצוגה מקדימה</span>
              </div>
              <span className="text-xs text-white/30">{showPreview ? 'סגור' : 'הצג'}</span>
            </button>
            {showPreview && (
              <div className="border-t border-white/10">
                <iframe
                  src={proposalUrl}
                  className="w-full h-[500px]"
                  title="תצוגת הצעה"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            )}
          </div>

          {/* ── PEA Submission Panel ────────────────────────── */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-5" dir="ltr">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-wider">PEA Submission</p>
                <p className="text-xs text-white/25 mt-0.5">Provincial Electricity Authority · Grid Connection</p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{
                  color: PEA_STATUS_COLORS[pea.pea_status] || '#6b7280',
                  background: `${PEA_STATUS_COLORS[pea.pea_status] || '#6b7280'}20`,
                }}
              >
                {PEA_STATUS_LABELS[pea.pea_status] || pea.pea_status}
              </span>
            </div>

            {!pea.project_id && (
              <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-amber-400 text-xs">
                <AlertTriangle size={13} />
                No project linked to this proposal. PEA fields are read-only until a project is created.
              </div>
            )}

            <div className="mb-4 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200/80 text-xs leading-relaxed">
              Package generation creates preliminary drawings and an application letter for engineer/PEA review. Do not submit before owner documents, recent PEA bill, equipment certificates, and licensed PE stamp are attached.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Branch selector */}
              <div>
                <label className="block text-xs text-white/40 mb-1">PEA / MEA Branch</label>
                <select
                  value={pea.pea_branch}
                  onChange={(e) => setPea((p) => ({ ...p, pea_branch: e.target.value }))}
                  disabled={!pea.project_id}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A820]/50 disabled:opacity-40 min-h-[44px]"
                >
                  {PEA_BRANCHES.map((b) => (
                    <option key={b.id} value={b.id} style={{ background: '#0f1923' }}>
                      {b.authority} — {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status dropdown */}
              <div>
                <label className="block text-xs text-white/40 mb-1">Application Status</label>
                <select
                  value={pea.pea_status}
                  onChange={(e) => setPea((p) => ({ ...p, pea_status: e.target.value as PEAStatus }))}
                  disabled={!pea.project_id}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A820]/50 disabled:opacity-40 min-h-[44px]"
                >
                  {PEA_STATUSES.map((s) => (
                    <option key={s} value={s} style={{ background: '#0f1923' }}>
                      {PEA_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              {/* PEA Reference Number */}
              <div>
                <label className="block text-xs text-white/40 mb-1">PEA Reference No.</label>
                <input
                  type="text"
                  value={pea.pea_reference_number}
                  onChange={(e) => setPea((p) => ({ ...p, pea_reference_number: e.target.value }))}
                  disabled={!pea.project_id}
                  placeholder="e.g. PEA-ST-2026-1234"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E8A820]/50 disabled:opacity-40 min-h-[44px]"
                />
              </div>

              {/* Application Date */}
              <div>
                <label className="block text-xs text-white/40 mb-1">Application Date</label>
                <input
                  type="date"
                  value={pea.pea_application_date}
                  onChange={(e) => setPea((p) => ({ ...p, pea_application_date: e.target.value }))}
                  disabled={!pea.project_id}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A820]/50 disabled:opacity-40 min-h-[44px]"
                />
              </div>

              {/* Meter Inspection Date */}
              <div>
                <label className="block text-xs text-white/40 mb-1">Meter Inspection Date</label>
                <input
                  type="date"
                  value={pea.pea_meter_inspection_date}
                  onChange={(e) => setPea((p) => ({ ...p, pea_meter_inspection_date: e.target.value }))}
                  disabled={!pea.project_id}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A820]/50 disabled:opacity-40 min-h-[44px]"
                />
              </div>

              {/* Approval Date */}
              <div>
                <label className="block text-xs text-white/40 mb-1">Approval Date</label>
                <input
                  type="date"
                  value={pea.pea_approval_date}
                  onChange={(e) => setPea((p) => ({ ...p, pea_approval_date: e.target.value }))}
                  disabled={!pea.project_id}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A820]/50 disabled:opacity-40 min-h-[44px]"
                />
              </div>
            </div>

            {/* Rejection reason — only shown when status is objected */}
            {(pea.pea_status === 'objected' || pea.pea_status === 'resubmit_needed') && (
              <div className="mt-3">
                <label className="block text-xs text-white/40 mb-1">Rejection / Objection Reason</label>
                <textarea
                  value={pea.pea_rejection_reason}
                  onChange={(e) => setPea((p) => ({ ...p, pea_rejection_reason: e.target.value }))}
                  disabled={!pea.project_id}
                  rows={3}
                  placeholder="Describe the PEA objection or required changes..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 disabled:opacity-40 resize-none"
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              {/* Save status */}
              <button
                onClick={handlePeaSave}
                disabled={peaSaving || !pea.project_id}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#E8A820]/10 border border-[#E8A820]/30 text-[#E8A820] text-sm hover:bg-[#E8A820]/20 transition-all disabled:opacity-50 min-h-[44px]"
              >
                {peaSaving
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Check size={14} />}
                Save Status
              </button>

              {/* Download Package */}
              <button
                onClick={handlePeaPackage}
                disabled={peaPackageLoading}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-500/20 transition-all disabled:opacity-50 min-h-[44px]"
              >
                {peaPackageLoading
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Download size={14} />}
                Generate Package
              </button>

              {/* Sign as Owner */}
              {pea.documents.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      const doc = pea.documents.find((d) => d.document_type === 'application_letter') || pea.documents[0]
                      if (doc) setShowSignPad({ documentId: doc.id, role: 'owner' })
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/20 transition-all min-h-[44px]"
                  >
                    <PenLine size={14} />
                    Sign as Owner
                  </button>
                  <button
                    onClick={() => {
                      const doc = pea.documents.find((d) => d.document_type === 'application_letter') || pea.documents[0]
                      if (doc) setShowSignPad({ documentId: doc.id, role: 'engineer' })
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm hover:bg-purple-500/20 transition-all min-h-[44px]"
                  >
                    <PenLine size={14} />
                    Sign as Engineer
                  </button>
                </>
              )}
            </div>

            {/* Document list */}
            {pea.documents.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Generated Documents</p>
                <div className="space-y-1.5">
                  {pea.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <span className="text-xs text-white/60 capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        {doc.signed_by_owner && (
                          <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">Owner signed</span>
                        )}
                        {doc.signed_by_engineer && (
                          <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">PE signed</span>
                        )}
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PEA Timeline */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-3">PEA Timeline</p>
              <ol className="relative border-l border-white/10 pl-4 space-y-3">
                {[
                  { label: 'Package Ready', date: pea.pea_status !== 'not_started' ? 'done' : null },
                  { label: 'Submitted to PEA', date: pea.pea_application_date || null },
                  { label: 'Under Review', date: pea.pea_status === 'under_review' || pea.pea_status === 'approved' || pea.pea_status === 'objected' ? 'done' : null },
                  { label: 'Approved', date: pea.pea_approval_date || null },
                  { label: 'Meter Installed', date: pea.pea_meter_inspection_date || null },
                  { label: 'Commercial Operation', date: pea.pea_status === 'commercial_operation' ? 'done' : null },
                ].map((e, i) => {
                  const done = !!e.date
                  return (
                    <li key={String(i)} className="relative">
                      <span
                        className={`absolute -left-[18px] top-0.5 w-3 h-3 rounded-full border-2 ${
                          done ? 'bg-[#E8A820] border-[#E8A820]' : 'bg-transparent border-white/20'
                        }`}
                      />
                      <p className={`text-xs ${done ? 'text-white' : 'text-white/30'}`}>{e.label}</p>
                      {e.date && e.date !== 'done' && (
                        <p className="text-[10px] text-white/30">{new Date(e.date).toLocaleDateString('en-GB')}</p>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-4">סטטיסטיקות</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Eye size={14} />
                  צפיות
                </div>
                <span className="text-sm font-semibold text-white">{proposal.view_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Clock size={14} />
                  נוצר
                </div>
                <span className="text-xs text-white/50">
                  {new Date(proposal.created_at).toLocaleDateString('he-IL')}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-4">ציר זמן</p>
            <ol className="relative border-r border-white/10 pr-4 space-y-4 mr-2">
              {timeline.map((event, i) => (
                <li key={String(i)} className="relative">
                  <span
                    className={`absolute -right-[18px] top-0.5 w-3 h-3 rounded-full border-2 ${
                      event.done
                        ? 'bg-[#E8A820] border-[#E8A820]'
                        : 'bg-transparent border-white/20'
                    }`}
                  />
                  <p className={`text-sm ${event.done ? 'text-white' : 'text-white/30'}`}>
                    {event.label}
                  </p>
                  {event.time && (
                    <p className="text-xs text-white/30 mt-0.5">
                      {new Date(event.time).toLocaleDateString('he-IL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Roof images — cast metadata unknown values to string before use */}
          {(() => {
            const origUrl = typeof proposal.metadata?.roof_original_url === 'string'
              ? proposal.metadata.roof_original_url
              : null
            const panelsUrl = typeof proposal.metadata?.roof_panels_url === 'string'
              ? proposal.metadata.roof_panels_url
              : null
            if (!origUrl && !panelsUrl) return null
            return (
              <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3">תמונות גג</p>
                <div className="space-y-2">
                  {origUrl && (
                    <img
                      src={origUrl}
                      alt="גג מקורי"
                      className="w-full rounded-xl object-cover h-28"
                    />
                  )}
                  {panelsUrl && (
                    <img
                      src={panelsUrl}
                      alt="גג עם פאנלים"
                      className="w-full rounded-xl object-cover h-28"
                    />
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* PEA Signature Pad Modal */}
      {showSignPad && (
        <PEASignaturePad
          documentId={showSignPad.documentId}
          signerRole={showSignPad.role}
          onClose={() => setShowSignPad(null)}
          onSigned={(sigId) => {
            showToast(`Signature saved (${sigId.slice(0, 8)}...)`, 'success')
            setShowSignPad(null)
            if (proposal) loadPeaData(proposal.ref_number)
          }}
        />
      )}
    </div>
  )
}
