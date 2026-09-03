/**
 * FunnelSection — the business funnel on /admin, live from both databases
 * (bustan scans/CRM + main proposals) via /api/admin-funnel.
 *
 * Cards row (8 stages, KP split + 7-day delta), a proportional funnel bar
 * (no chart lib), and three "needs attention" lists. Card classes match the
 * dashboard's StatCard; `.bustan-admin-main` remaps text-white* to ink.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, ScanSearch, UserX, Eye } from 'lucide-react'
import { fetchAdminFunnel, funnelWidths } from '../../lib/funnel-client'
import type { FunnelResponse, FunnelStage } from '../../lib/funnel-client'

const FOOTPRINT_LABEL: Record<string, string> = {
  parcel: 'קרקע',
  compound: 'מספר מבנים',
  unclear: 'לוודא',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className ?? ''}`} aria-hidden="true" />
}

function StageCard({ s }: { s: FunnelStage }) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 hover:bg-white/[0.07] transition-colors">
      <span className="text-xs text-white/40 uppercase tracking-wider">{s.label}</span>
      <p className="text-2xl font-bold text-white mt-1">{s.all.toLocaleString('he-IL')}</p>
      <div className="flex items-center justify-between mt-2 gap-2 min-h-[20px]">
        {s.kp !== null ? (
          <span className="text-[11px] text-white/50">
            KP {s.kp.toLocaleString('he-IL')} · שאר {(s.rest ?? 0).toLocaleString('he-IL')}
          </span>
        ) : <span />}
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
            s.d7 > 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-white/5 text-white/40'
          }`}
        >
          +{s.d7.toLocaleString('he-IL')} ב-7 ימים
        </span>
      </div>
    </div>
  )
}

function FunnelBar({ stages }: { stages: FunnelStage[] }) {
  const widths = funnelWidths(stages)
  const n = Math.max(1, stages.length - 1)
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-1.5">
      <h2 className="text-sm font-semibold text-white mb-3">משפך</h2>
      {stages.map((s, i) => (
        <div key={s.key} className="flex items-center gap-3">
          <div
            className="h-7 rounded-md flex items-center px-3 text-xs font-medium text-[#FFF4E2] whitespace-nowrap overflow-hidden transition-all duration-700"
            style={{ width: `${widths[i]}%`, backgroundColor: '#24463E', opacity: 1 - (i / n) * 0.65, minWidth: 'fit-content' }}
            title={`${s.label}: ${s.all}`}
          >
            {s.label} · {s.all.toLocaleString('he-IL')}
          </div>
        </div>
      ))}
    </div>
  )
}

function AttentionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <Icon size={14} className="text-[#E8A820]" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-6 text-xs text-white/40 text-center">{text}</p>
}

export default function FunnelSection() {
  const navigate = useNavigate()
  const [data, setData] = useState<FunnelResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    const res = await fetchAdminFunnel().catch(() => null)
    setData(res)
    setFailed(res === null)
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => { void load() })
  }, [load])

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (failed || !data) {
    return (
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 flex items-center justify-between gap-4">
        <p className="text-sm text-white/60">לא ניתן לטעון משפך</p>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-sm transition-all"
        >
          <RefreshCw size={14} /> נסה שוב
        </button>
      </div>
    )
  }

  const { stages, attention } = data

  return (
    <section className="space-y-4" aria-label="משפך עסקי">
      {/* Stage cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((s) => <StageCard key={s.key} s={s} />)}
      </div>

      {/* Funnel bar */}
      <FunnelBar stages={stages} />

      {/* Needs attention */}
      <div className="grid lg:grid-cols-3 gap-4">
        <AttentionCard title="מועמדי A ממתינים" icon={ScanSearch}>
          {attention.pending_a.length === 0 ? <Empty text="אין מועמדי A ממתינים" /> : attention.pending_a.map((c) => {
            const badge = c.footprint_class ? FOOTPRINT_LABEL[c.footprint_class] : undefined
            return (
              <div key={c.id} className="flex items-center gap-2 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{c.name ?? `Roof ${c.id.slice(0, 8)}`}</p>
                  <p className="text-xs text-white/40">
                    {Math.round(Number(c.estimated_kwp ?? 0))} kWp
                    {badge && <span className="ms-2 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">{badge}</span>}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/admin/scan?focus=${c.id}`)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-[#24463E]/10 text-[#24463E] hover:bg-[#24463E]/20 transition-colors shrink-0"
                >
                  פתח בסורק
                </button>
              </div>
            )
          })}
        </AttentionCard>

        <AttentionCard title="לידים ללא איש קשר" icon={UserX}>
          {attention.no_contact.length === 0 ? <Empty text="לכל הלידים יש איש קשר" /> : attention.no_contact.map((p) => (
            <a key={p.id} href={`/crm/leads/${p.id}`} className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{p.name ?? p.id.slice(0, 8)}</p>
                <p className="text-xs text-white/40">ללא איש קשר{p.kp ? ' · KP' : ''}</p>
              </div>
            </a>
          ))}
        </AttentionCard>

        <AttentionCard title="נצפו ולא נחתמו" icon={Eye}>
          {attention.viewed_unsigned.length === 0 ? <Empty text="אין הצעות שנצפו ולא נחתמו" /> : attention.viewed_unsigned.map((p) => (
            <button
              key={p.ref_number}
              onClick={() => navigate(`/admin/proposals/${p.ref_number}`)}
              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-right"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{p.client_name ?? '—'}</p>
                <p className="text-xs text-white/40">
                  <span className="font-mono">{p.ref_number}</span>
                  {p.first_viewed_at && ` · ${new Date(p.first_viewed_at).toLocaleDateString('he-IL')}`}
                </p>
              </div>
            </button>
          ))}
        </AttentionCard>
      </div>
    </section>
  )
}
