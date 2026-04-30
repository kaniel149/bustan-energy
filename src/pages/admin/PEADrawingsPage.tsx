import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, FileDown, Printer, Loader2, FileCheck, Eye, AlertTriangle } from 'lucide-react'
import { getSession } from '../../lib/admin-auth'
import { useAdminStore } from '../../lib/admin-store'

interface Drawing {
  title: string
  filename: string
  html: string
}

interface PEAResponse {
  ok: boolean
  ref: string
  generated_at: string
  drawings: Record<string, Drawing>
  readiness?: {
    status: 'ok' | 'warning' | 'blocker'
    items: Array<{ id: string; severity: 'ok' | 'warning' | 'blocker'; title: string; detail: string; source?: string }>
    required_documents: Array<{ id: string; title: string; detail: string }>
  }
  error?: string
}

const TAB_ORDER: Array<{ key: string; label: string; icon: string }> = [
  { key: 'sld', label: 'SLD (חד-קווית)', icon: '⚡' },
  { key: 'electrical', label: 'תוכנית חשמל', icon: '🔌' },
  { key: 'layout', label: 'תוכנית העמדה', icon: '📐' },
  { key: 'specs', label: 'מפרט ציוד', icon: '📋' },
]

export default function PEADrawingsPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const showToast = useAdminStore((s) => s.showToast)

  const ref = params.get('ref') || ''
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PEAResponse | null>(null)
  const [activeTab, setActiveTab] = useState('sld')

  const generate = async () => {
    setLoading(true)
    try {
      const session = await getSession()
      const token = session?.access_token
      if (!token) throw new Error('לא מחובר')

      const body = {
        ref,
        client_name: params.get('client_name') || '',
        client_site: params.get('client_site') || 'Koh Phangan, Surat Thani 84280',
        system_size_kwp: parseFloat(params.get('kwp') || '87'),
        panels: parseInt(params.get('panels') || '157', 10),
        panel_watt: parseInt(params.get('watt') || '555', 10),
        panel_model: params.get('panel_model') || 'JA Solar JAM72S30-555/MR',
        inverter_model: params.get('inverter_model') || 'Huawei SUN2000-100KTL-M1',
        inverter_kw: parseInt(params.get('inverter_kw') || '100', 10),
        battery_kwh: parseInt(params.get('battery_kwh') || '0', 10),
        battery_model: params.get('battery_model') || '',
        strings: parseInt(params.get('strings') || '13', 10),
        ac_cable_run_m: parseInt(params.get('ac_run_m') || '15', 10),
        ac_current_a: parseInt(params.get('ac_current_a') || '132', 10),
        roof_image_url: params.get('roof_image_url') || '',
      }

      const res = await fetch('/api/admin-pea-drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json() as PEAResponse
      if (!data.ok) throw new Error(data.error || 'Generation failed')
      setResult(data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ref) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  const openInNewWindow = (html: string) => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const printAsPDF = (html: string) => {
    const withPrint = html.replace(
      '</body>',
      `<script>window.onload=function(){setTimeout(function(){window.print()},600)}</script></body>`
    )
    const blob = new Blob([withPrint], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const downloadAll = () => {
    if (!result) return
    for (const key of Object.keys(result.drawings)) {
      const d = result.drawings[key]
      const blob = new Blob([d.html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = d.filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    }
  }

  const printAll = () => {
    if (!result) return
    // Sequentially open each drawing in a new tab + trigger print
    Object.values(result.drawings).forEach((d, i) => {
      setTimeout(() => printAsPDF(d.html), i * 400)
    })
  }

  const active = result?.drawings[activeTab]

  return (
    <div dir="rtl" className="p-3 sm:p-6 max-w-[1400px] mx-auto pb-24 sm:pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileCheck size={18} className="text-emerald-400" />
              תכניות PEA — {ref}
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              🔒 כלי פנימי · תכניות חתימה למהנדס · {params.get('client_name') || ''}
            </p>
          </div>
        </div>

        {result && (
          <div className="flex gap-2">
            <button
              onClick={printAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm hover:bg-emerald-500/20"
            >
              <Printer size={14} />
              הדפס הכל כ-PDF
            </button>
            <button
              onClick={downloadAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm hover:text-white hover:bg-white/10"
            >
              <FileDown size={14} />
              הורד הכל (HTML)
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-[#E8A820]" />
            <p className="text-white/50 text-sm">מייצר 4 תכניות...</p>
          </div>
        </div>
      )}

      {result && (
        <>
          {/* Tabs */}
          {result.readiness && (
            <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-200">PEA readiness check</p>
                  <p className="text-xs text-amber-100/70 mt-0.5">
                    המסמכים הם package למהנדס/PEA review. נדרש אישור מהנדס וחתימות לפני הגשה.
                  </p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {result.readiness.items.filter((item) => item.severity !== 'ok').map((item) => (
                      <div key={item.id} className="rounded-xl bg-black/15 border border-white/10 px-3 py-2">
                        <p className="text-xs font-semibold text-white">{item.title}</p>
                        <p className="text-[11px] text-white/45 mt-1">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4 flex-wrap">
            {TAB_ORDER.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === t.key
                    ? 'bg-[#E8A820] text-[#0D2137]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Active drawing preview */}
          {active && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">{active.title}</h2>
                  <p className="text-xs text-white/40 font-mono">{active.filename}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openInNewWindow(active.html)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs hover:text-white"
                  >
                    <Eye size={13} />
                    הצג
                  </button>
                  <button
                    onClick={() => printAsPDF(active.html)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8A820]/10 border border-[#E8A820]/30 text-[#E8A820] text-xs"
                  >
                    <Printer size={13} />
                    הדפס / PDF
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([active.html], { type: 'text/html' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = active.filename
                      a.click()
                      setTimeout(() => URL.revokeObjectURL(url), 60_000)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs hover:text-white"
                  >
                    <FileDown size={13} />
                  </button>
                </div>
              </div>

              <iframe
                srcDoc={active.html}
                title={active.title}
                className="w-full h-[60vh] sm:h-[85vh] rounded-2xl border border-white/10 bg-white"
              />
            </>
          )}

          <div className="mt-6 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
            <p className="text-xs text-blue-200/80 leading-relaxed">
              <strong className="text-blue-300">💡 שימוש:</strong> לחץ "הדפס / PDF" בכל תוכנית →
              הדפדפן יפתח חלון הדפסה → בחר "Save as PDF". אחר כך העבר למהנדס לחתימה וחותמת ל-PEA.
              "הדפס הכל" ייצר את כל ה-4 PDFs ברצף.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
