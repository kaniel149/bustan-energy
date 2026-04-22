import { useEffect, useState } from 'react'
import { fetchAdminStats } from '../../lib/admin-service'
import type { AdminStats, AdminStatsDayEntry } from '../../lib/admin-service'

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.06] ${className ?? ''}`}
      aria-hidden="true"
    />
  )
}

// ─── Funnel bar ──────────────────────────────────────────────────────────────

function FunnelRow({
  label,
  count,
  total,
  gradient,
}: {
  label: string
  count: number
  total: number
  gradient: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-36 shrink-0 text-white/60 text-right">{label}</span>
      <span className="w-9 shrink-0 text-white font-semibold text-right" aria-label={`${count}`}>
        {count}
      </span>
      <div className="flex-1 h-5 rounded-md bg-white/5 overflow-hidden" role="presentation">
        <div
          className="h-full rounded-md transition-all duration-700"
          style={{ width: `${pct}%`, background: gradient }}
        />
      </div>
      <span className="w-10 shrink-0 text-white/40 text-xs">{pct}%</span>
    </div>
  )
}

// ─── Value card ──────────────────────────────────────────────────────────────

function ValueCard({
  emoji,
  label,
  value,
  accent,
}: {
  emoji: string
  label: string
  value: string
  accent: string
}) {
  return (
    <div
      className="bg-white/5 rounded-2xl border border-white/10 p-4 flex flex-col gap-1"
      style={{ borderColor: `${accent}30` }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span aria-hidden="true">{emoji}</span>
        <span className="text-[11px] text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  )
}

// ─── SVG bar chart (30-day trend) ────────────────────────────────────────────

const CHART_H = 80
const BAR_W = 14
const BAR_GAP = 4

function DailyChart({ data }: { data: AdminStatsDayEntry[] }) {
  if (data.length === 0) return <p className="text-white/30 text-xs py-4">אין נתונים</p>

  const maxVal = Math.max(...data.map((d) => d.created + d.viewed + d.signed), 1)

  return (
    <div className="overflow-x-auto pb-1" role="img" aria-label="Daily proposals chart">
      <svg
        width={data.length * (BAR_W + BAR_GAP)}
        height={CHART_H + 20}
        className="block"
      >
        {data.map((d, i) => {
          const x = i * (BAR_W + BAR_GAP)
          const createdH = (d.created / maxVal) * CHART_H
          const viewedH = (d.viewed / maxVal) * CHART_H
          const signedH = (d.signed / maxVal) * CHART_H

          return (
            <g key={d.day}>
              {/* created (gold) */}
              <rect
                x={x}
                y={CHART_H - createdH}
                width={BAR_W}
                height={createdH}
                fill="#E8A82060"
                rx={2}
              />
              {/* viewed (blue) */}
              <rect
                x={x}
                y={CHART_H - viewedH}
                width={BAR_W}
                height={viewedH}
                fill="#60A5FA60"
                rx={2}
              />
              {/* signed (green) */}
              <rect
                x={x}
                y={CHART_H - signedH}
                width={BAR_W}
                height={signedH}
                fill="#34D39990"
                rx={2}
              />
              {/* day label — show every 5th */}
              {i % 5 === 0 && (
                <text
                  x={x + BAR_W / 2}
                  y={CHART_H + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgba(255,255,255,0.3)"
                >
                  {d.day.slice(5)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#E8A82080' }} />
          נוצר
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#60A5FA80' }} />
          נצפה
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#34D39990' }} />
          חתום
        </span>
      </div>
    </div>
  )
}

// ─── Followups widget ─────────────────────────────────────────────────────────

const FOLLOWUP_LABELS: Record<string, string> = {
  not_viewed_3d: 'לא נצפה 3 ימים',
  expiring_soon: 'פג תוקף בקרוב',
  viewed_not_signed: 'נצפה אך לא חתום',
  reminder_1w: 'תזכורת שבועית',
}

function FollowupsWidget({
  total,
  breakdown,
}: {
  total: number
  breakdown: Record<string, number>
}) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-white/40 uppercase tracking-wider">פולואפים ממתינים</p>
        <span className="text-lg font-bold text-[#FBBF24]">{total}</span>
      </div>
      {total === 0 ? (
        <p className="text-white/30 text-xs">אין פולואפים ממתינים</p>
      ) : (
        <div className="space-y-1.5">
          {Object.entries(breakdown).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between text-sm">
              <span className="text-white/50">
                {FOLLOWUP_LABELS[type] ?? type}
              </span>
              <span className="text-white font-medium">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function AnalyticsSection() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAdminStats()
      .then((data) => {
        if (!data) setError('לא ניתן לטעון נתוני אנליטיקס')
        else setStats(data)
      })
      .catch(() => setError('שגיאה בטעינת נתוני אנליטיקס'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="טוען אנליטיקס">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-red-400 text-sm">
        {error ?? 'שגיאה לא ידועה'}
      </div>
    )
  }

  const { counts, value, timing, daily, pending_followups, pending_followups_breakdown } = stats

  const fmtM = (n: number) =>
    n >= 1_000_000
      ? `฿${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `฿${(n / 1_000).toFixed(0)}K`
      : `฿${n.toLocaleString()}`

  const fmtHours = (h: number) =>
    h === 0
      ? 'N/A'
      : h < 24
      ? `${h.toFixed(1)} שעות`
      : `${(h / 24).toFixed(1)} ימים`

  return (
    <section aria-label="Analytics" className="space-y-5">
      <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">אנליטיקס</h2>

      {/* Funnel */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-3">
        <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">משפך המרה</p>
        <FunnelRow
          label="סה״כ הצעות"
          count={counts.total}
          total={counts.total}
          gradient="linear-gradient(90deg, #E8A820, #E8A820)"
        />
        <FunnelRow
          label="→ נשלח"
          count={counts.sent + counts.viewed + counts.signed}
          total={counts.total}
          gradient="linear-gradient(90deg, #E8A820, #60A5FA)"
        />
        <FunnelRow
          label="→ נצפה"
          count={counts.viewed + counts.signed}
          total={counts.total}
          gradient="linear-gradient(90deg, #E8A820, #FBBF24)"
        />
        <FunnelRow
          label="→ חתום"
          count={counts.signed}
          total={counts.total}
          gradient="linear-gradient(90deg, #E8A820, #34D399)"
        />
      </div>

      {/* Value cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ValueCard emoji="💰" label="הכנסה חתומה" value={fmtM(value.signed_thb)} accent="#34D399" />
        <ValueCard emoji="📊" label="ערך פייפליין" value={fmtM(value.pipeline_thb)} accent="#3B82F6" />
        <ValueCard emoji="🎯" label="עסקה ממוצעת" value={fmtM(value.avg_ticket_thb)} accent="#E8A820" />
        <ValueCard
          emoji="💎"
          label="המרה לחתימה"
          value={`${stats.conversion.signed_pct}%`}
          accent="#A78BFA"
        />
      </div>

      {/* Timing insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
          <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">זמן ממוצע לצפייה</p>
          <p className="text-2xl font-bold text-white">{fmtHours(timing.avg_hours_to_view)}</p>
          <p className="text-xs text-white/30 mt-1">לאחר שליחת ההצעה</p>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
          <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">זמן ממוצע לחתימה</p>
          <p className="text-2xl font-bold text-white">{fmtHours(timing.avg_hours_view_to_sign)}</p>
          <p className="text-xs text-white/30 mt-1">לאחר הצפייה הראשונה</p>
        </div>
      </div>

      {/* Daily trend */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
        <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3">טרנד יומי (30 ימים אחרונים)</p>
        <DailyChart data={daily} />
      </div>

      {/* Pending followups */}
      <FollowupsWidget total={pending_followups} breakdown={pending_followups_breakdown} />
    </section>
  )
}
