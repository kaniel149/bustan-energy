import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { fetchProposal, buildTimeline, downloadProposalPDF, downloadSignedPDF } from '../../lib/admin-service'
import { useAdminStore } from '../../lib/admin-store'
import { STATUS_BADGE } from '../../types/proposals'
import type { Proposal } from '../../types/proposals'

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/40 w-36 shrink-0">{label}</span>
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

export default function ProposalDetailPage() {
  const { ref } = useParams<{ ref: string }>()
  const navigate = useNavigate()

  const showToast = useAdminStore((s) => s.showToast)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [downloadingSignedPDF, setDownloadingSignedPDF] = useState(false)

  useEffect(() => {
    if (!ref) return
    fetchProposal(ref)
      .then(setProposal)
      .finally(() => setLoading(false))
  }, [ref])

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
  const proposalUrl = `https://energy-tm.com/p/${proposal.ref_number}`
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

  return (
    <div dir="rtl" className="p-6 max-w-[1100px] mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/proposals')}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
          aria-label="חזור"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#E8A820]/10 border border-[#E8A820]/30 text-[#E8A820] text-sm hover:bg-[#E8A820]/20 transition-all disabled:opacity-50"
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
            onClick={() => window.open(proposalUrl, '_blank')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:text-white hover:bg-white/10 transition-all"
          >
            <ExternalLink size={15} />
            פתח
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
    </div>
  )
}
