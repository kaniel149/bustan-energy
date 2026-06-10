import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react'
import { getSession } from '../../lib/admin-auth'
import { useAdminStore } from '../../lib/admin-store'
import { FormField, Input, Select } from '../../components/admin/FormField'

// ─── Types ───────────────────────────────────────────────────────────────────

type InverterBrand = 'huawei' | 'solaredge' | 'sungrow' | 'growatt' | 'other'
type SystemStatus = 'active' | 'paused' | 'archived'

interface CustomerSystem {
  id: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  site_name: string
  system_kwp: number
  inverter_brand: InverterBrand
  inverter_api_id: string | null
  install_date: string | null
  status: SystemStatus
  notes: string | null
  created_at: string
}

interface SystemReading {
  id: string
  system_id: string
  date: string
  kwh_produced: number
  expected_kwh: number | null
  source: 'api' | 'manual'
}

type Health = 'green' | 'yellow' | 'red'

// ─── Constants (health thresholds mirror api/cron-monitoring-check.ts) ──────

const DEFAULT_PSH = 4 // expected fallback: system_kwp × ~4 peak sun hours (Thailand)
const STALE_DAYS = 3

const BRAND_LABEL: Record<InverterBrand, string> = {
  huawei: 'Huawei',
  solaredge: 'SolarEdge',
  sungrow: 'Sungrow',
  growatt: 'Growatt',
  other: 'אחר',
}

const STATUS_LABEL: Record<SystemStatus, string> = {
  active: 'פעיל',
  paused: 'מושהה',
  archived: 'בארכיון',
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

function expectedFor(system: CustomerSystem, reading: SystemReading | null): number {
  return reading?.expected_kwh ?? system.system_kwp * DEFAULT_PSH
}

function computeHealth(system: CustomerSystem, latest: SystemReading | null): Health {
  if (!latest) return 'red'
  const ageDays = Math.floor((Date.now() - new Date(`${latest.date}T00:00:00Z`).getTime()) / 86400_000)
  if (ageDays >= STALE_DAYS) return 'red'
  const expected = expectedFor(system, latest)
  if (expected <= 0) return 'red'
  const ratio = latest.kwh_produced / expected
  if (ratio >= 0.8) return 'green'
  if (ratio >= 0.5) return 'yellow'
  return 'red'
}

// ─── API helper (admin session Bearer token) ────────────────────────────────

async function apiFetch<T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<T> {
  const session = await getSession()
  const token = session?.access_token
  if (!token) throw new Error('לא מחובר — יש להתחבר מחדש')
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'הבקשה נכשלה')
  return data as T
}

// ─── System form ─────────────────────────────────────────────────────────────

interface SystemFormValues {
  customer_name: string
  customer_phone: string
  customer_email: string
  site_name: string
  system_kwp: string
  inverter_brand: InverterBrand
  inverter_api_id: string
  install_date: string
  status: SystemStatus
  notes: string
}

const EMPTY_FORM: SystemFormValues = {
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  site_name: '',
  system_kwp: '',
  inverter_brand: 'other',
  inverter_api_id: '',
  install_date: '',
  status: 'active',
  notes: '',
}

function toFormValues(s: CustomerSystem): SystemFormValues {
  return {
    customer_name: s.customer_name,
    customer_phone: s.customer_phone ?? '',
    customer_email: s.customer_email ?? '',
    site_name: s.site_name,
    system_kwp: String(s.system_kwp),
    inverter_brand: s.inverter_brand,
    inverter_api_id: s.inverter_api_id ?? '',
    install_date: s.install_date ?? '',
    status: s.status,
    notes: s.notes ?? '',
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const showToast = useAdminStore((s) => s.showToast)

  const [systems, setSystems] = useState<CustomerSystem[]>([])
  const [readings, setReadings] = useState<SystemReading[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // form: null = closed, 'new' = create, otherwise editing that system
  const [formMode, setFormMode] = useState<'new' | CustomerSystem | null>(null)
  const [form, setForm] = useState<SystemFormValues>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // drill-in (chart + manual reading)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ systems: CustomerSystem[]; readings: SystemReading[] }>(
        '/api/admin-monitoring',
      )
      setSystems(data.systems || [])
      setReadings(data.readings || [])
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה בטעינה', 'error')
    }
  }, [showToast])

  useEffect(() => {
    queueMicrotask(() => {
      void load().finally(() => setLoading(false))
    })
  }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const readingsBySystem = useMemo(() => {
    const map = new Map<string, SystemReading[]>()
    for (const r of readings) {
      const list = map.get(r.system_id) ?? []
      list.push(r)
      map.set(r.system_id, list)
    }
    return map // readings arrive sorted by date.asc
  }, [readings])

  const healthBySystem = useMemo(() => {
    const map = new Map<string, Health>()
    for (const s of systems) {
      const list = readingsBySystem.get(s.id) ?? []
      map.set(s.id, computeHealth(s, list.length ? list[list.length - 1] : null))
    }
    return map
  }, [systems, readingsBySystem])

  const stats = useMemo(() => {
    const active = systems.filter((s) => s.status === 'active')
    const count = (h: Health) => active.filter((s) => healthBySystem.get(s.id) === h).length
    return {
      total: systems.length,
      green: count('green'),
      yellow: count('yellow'),
      red: count('red'),
      kwp: systems.reduce((sum, s) => sum + Number(s.system_kwp || 0), 0),
    }
  }, [systems, healthBySystem])

  const selected = systems.find((s) => s.id === selectedId) ?? null

  // ── form handlers ──
  const openForm = (mode: 'new' | CustomerSystem) => {
    setFormMode(mode)
    setForm(mode === 'new' ? EMPTY_FORM : toFormValues(mode))
  }

  const submitForm = async () => {
    const kwp = parseFloat(form.system_kwp)
    if (!form.customer_name.trim() || !form.site_name.trim() || !(kwp > 0)) {
      showToast('שם לקוח, שם אתר וגודל מערכת (kWp) הם שדות חובה', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_email: form.customer_email.trim(),
        site_name: form.site_name.trim(),
        system_kwp: kwp,
        inverter_brand: form.inverter_brand,
        inverter_api_id: form.inverter_api_id.trim(),
        install_date: form.install_date || '',
        status: form.status,
        notes: form.notes.trim(),
      }
      if (formMode === 'new') {
        const data = await apiFetch<{ system: CustomerSystem }>('/api/admin-monitoring', {
          method: 'POST',
          body: JSON.stringify({ resource: 'system', ...payload }),
        })
        setSystems((prev) => [data.system, ...prev])
        showToast('המערכת נוספה בהצלחה', 'success')
      } else if (formMode) {
        const data = await apiFetch<{ system: CustomerSystem }>(
          `/api/admin-monitoring?id=${formMode.id}`,
          { method: 'PATCH', body: JSON.stringify(payload) },
        )
        setSystems((prev) => prev.map((s) => (s.id === formMode.id ? { ...s, ...data.system } : s)))
        showToast('המערכת עודכנה', 'success')
      }
      setFormMode(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שמירה נכשלה', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReadingSaved = (reading: SystemReading) => {
    setReadings((prev) => {
      const next = prev.filter((r) => !(r.system_id === reading.system_id && r.date === reading.date))
      next.push(reading)
      next.sort((a, b) => a.date.localeCompare(b.date))
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#E8A820] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm">טוען מערכות...</span>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="p-3 sm:p-6 max-w-[1200px] mx-auto pb-24 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity size={18} className="text-emerald-300" />
            ניטור מערכות לקוחות
          </h1>
          <p className="text-sm text-white/40 mt-1">
            מעקב ייצור יומי, זיהוי תת־ביצוע והתראות — בסיס לשירות ריטיינר חודשי.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors min-h-[44px]"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            רענון
          </button>
          <button
            onClick={() => openForm('new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8A820] text-[#0D2137] text-sm font-bold hover:brightness-110 transition-all min-h-[44px]"
          >
            <Plus size={15} />
            מערכת חדשה
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="מערכות" value={String(stats.total)} />
        <Stat label='סה"כ kWp' value={stats.kwp.toLocaleString('en-US')} highlight />
        <Stat label="תקינות" value={String(stats.green)} tone="emerald" />
        <Stat label="תת־ביצוע" value={String(stats.yellow)} tone="amber" />
        <Stat label="קריטיות" value={String(stats.red)} tone="red" />
      </div>

      {/* Add / Edit form */}
      {formMode && (
        <div className="bg-white/5 rounded-2xl border border-[#E8A820]/25 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">
              {formMode === 'new' ? 'הוספת מערכת חדשה' : `עריכת מערכת — ${formMode.site_name}`}
            </h2>
            <button
              onClick={() => setFormMode(null)}
              className="text-white/40 hover:text-white transition-colors"
              aria-label="סגור טופס"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="שם לקוח" required>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="שם מלא" />
            </FormField>
            <FormField label="טלפון">
              <Input dir="ltr" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="+66..." />
            </FormField>
            <FormField label="אימייל">
              <Input dir="ltr" type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="customer@email.com" />
            </FormField>
            <FormField label="שם אתר" required>
              <Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} placeholder="Villa Sunrise, Ko Phangan" />
            </FormField>
            <FormField label="גודל מערכת (kWp)" required>
              <Input dir="ltr" type="number" min="0" step="0.1" value={form.system_kwp} onChange={(e) => setForm({ ...form, system_kwp: e.target.value })} placeholder="10.5" />
            </FormField>
            <FormField label="מותג ממיר">
              <Select value={form.inverter_brand} onChange={(e) => setForm({ ...form, inverter_brand: e.target.value as InverterBrand })}>
                {(Object.keys(BRAND_LABEL) as InverterBrand[]).map((b) => (
                  <option key={b} value={b}>{BRAND_LABEL[b]}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="מזהה API של הממיר" hint="Plant/Site ID בפורטל היצרן — לחיבור אוטומטי עתידי">
              <Input dir="ltr" value={form.inverter_api_id} onChange={(e) => setForm({ ...form, inverter_api_id: e.target.value })} placeholder="NE=12345678" />
            </FormField>
            <FormField label="תאריך התקנה">
              <Input dir="ltr" type="date" value={form.install_date} onChange={(e) => setForm({ ...form, install_date: e.target.value })} />
            </FormField>
            <FormField label="סטטוס">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SystemStatus })}>
                {(Object.keys(STATUS_LABEL) as SystemStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="הערות" className="sm:col-span-2 lg:col-span-3">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="הערות פנימיות..."
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8A820]/50 transition-colors"
              />
            </FormField>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={submitForm}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8A820] text-[#0D2137] text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all min-h-[44px]"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {formMode === 'new' ? 'הוסף מערכת' : 'שמור שינויים'}
            </button>
          </div>
        </div>
      )}

      {/* Systems table */}
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden overflow-x-auto">
        {systems.length === 0 ? (
          <div className="p-10 text-center text-white/40 text-sm">
            אין עדיין מערכות במעקב — הוסיפו את המערכת הראשונה כדי להתחיל.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] text-white/40 uppercase bg-white/5">
              <tr>
                <th className="text-center px-3 py-3 font-normal">בריאות</th>
                <th className="text-right px-4 py-3 font-normal">לקוח / אתר</th>
                <th className="text-right px-4 py-3 font-normal">מערכת</th>
                <th className="text-right px-4 py-3 font-normal">קריאה אחרונה</th>
                <th className="text-center px-4 py-3 font-normal">סטטוס</th>
                <th className="text-center px-3 py-3 font-normal">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((system) => {
                const list = readingsBySystem.get(system.id) ?? []
                const latest = list.length ? list[list.length - 1] : null
                const health = healthBySystem.get(system.id) ?? 'red'
                const isSelected = selectedId === system.id
                return (
                  <tr
                    key={system.id}
                    className={`border-t border-white/5 cursor-pointer transition-colors ${isSelected ? 'bg-[#E8A820]/8' : 'hover:bg-white/[0.04]'}`}
                    onClick={() => setSelectedId(isSelected ? null : system.id)}
                  >
                    <td className="px-3 py-3 text-center">
                      <HealthBadge health={health} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{system.customer_name}</div>
                      <div className="text-xs text-white/45 mt-0.5">{system.site_name}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      <span dir="ltr">{system.system_kwp} kWp</span>
                      <span className="text-white/40"> · {BRAND_LABEL[system.inverter_brand]}</span>
                    </td>
                    <td className="px-4 py-3">
                      {latest ? (
                        <div>
                          <span className="text-white font-mono" dir="ltr">{latest.kwh_produced} kWh</span>
                          <span className="text-xs text-white/40"> / צפי <span dir="ltr">{Math.round(expectedFor(system, latest))}</span></span>
                          <div className="text-[11px] text-white/35 mt-0.5" dir="ltr">{latest.date}</div>
                        </div>
                      ) : (
                        <span className="text-white/35 text-xs">אין קריאות (30 יום)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-white/55">{STATUS_LABEL[system.status]}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openForm(system)
                        }}
                        className="p-2 rounded-lg text-white/40 hover:text-[#E8A820] hover:bg-white/5 transition-colors"
                        title="עריכת מערכת"
                        aria-label={`עריכת ${system.site_name}`}
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Drill-in: 30-day chart + manual reading */}
      {selected && (
        <SystemDetail
          system={selected}
          readings={readingsBySystem.get(selected.id) ?? []}
          onReadingSaved={handleReadingSaved}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

// ─── Drill-in panel ──────────────────────────────────────────────────────────

function SystemDetail({
  system,
  readings,
  onReadingSaved,
  onClose,
}: {
  system: CustomerSystem
  readings: SystemReading[]
  onReadingSaved: (reading: SystemReading) => void
  onClose: () => void
}) {
  const showToast = useAdminStore((s) => s.showToast)
  const yesterday = isoDate(new Date(Date.now() - 86400_000))
  const [date, setDate] = useState(yesterday)
  const [kwh, setKwh] = useState('')
  const [expected, setExpected] = useState('')
  const [saving, setSaving] = useState(false)

  const defaultExpected = Math.round(system.system_kwp * DEFAULT_PSH * 10) / 10

  const submitReading = async () => {
    const kwhNum = parseFloat(kwh)
    if (!date || !(kwhNum >= 0)) {
      showToast('תאריך וייצור (kWh) הם שדות חובה', 'error')
      return
    }
    setSaving(true)
    try {
      const expectedNum = expected.trim() === '' ? null : parseFloat(expected)
      const data = await apiFetch<{ reading: SystemReading }>('/api/admin-monitoring', {
        method: 'POST',
        body: JSON.stringify({
          resource: 'reading',
          system_id: system.id,
          date,
          kwh_produced: kwhNum,
          expected_kwh: expectedNum,
        }),
      })
      if (data.reading) onReadingSaved(data.reading)
      setKwh('')
      showToast('הקריאה נשמרה', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שמירת קריאה נכשלה', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-white">
            {system.customer_name} — {system.site_name}
          </h2>
          <p className="text-xs text-white/40 mt-0.5">
            ייצור 30 יום אחרונים · צפי ברירת מחדל <span dir="ltr">{defaultExpected} kWh</span> ליום (kWp×{DEFAULT_PSH})
          </p>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors" aria-label="סגור פירוט">
          <X size={16} />
        </button>
      </div>

      <ProductionChart system={system} readings={readings} />

      {/* Manual reading entry */}
      <div className="mt-5 pt-4 border-t border-white/10">
        <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3">הזנת קריאה ידנית</p>
        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_1fr_auto] gap-3 items-end">
          <FormField label="תאריך" required>
            <Input dir="ltr" type="date" value={date} max={isoDate(new Date())} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="ייצור בפועל (kWh)" required>
            <Input dir="ltr" type="number" min="0" step="0.1" value={kwh} onChange={(e) => setKwh(e.target.value)} placeholder="42.5" />
          </FormField>
          <FormField label="צפי (kWh)" hint={`ריק = ${defaultExpected} אוטומטית`}>
            <Input dir="ltr" type="number" min="0" step="0.1" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder={String(defaultExpected)} />
          </FormField>
          <button
            onClick={submitReading}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8A820] text-[#0D2137] text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all min-h-[44px] mb-[22px] sm:mb-0"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 30-day production chart (plain SVG — no chart lib in repo) ─────────────

function ProductionChart({ system, readings }: { system: CustomerSystem; readings: SystemReading[] }) {
  const [todayMs] = useState(() => Date.now())
  const days = useMemo(() => {
    const byDate = new Map(readings.map((r) => [r.date, r]))
    const out: Array<{ date: string; reading: SystemReading | null }> = []
    for (let i = 29; i >= 0; i--) {
      const d = isoDate(new Date(todayMs - i * 86400_000))
      out.push({ date: d, reading: byDate.get(d) ?? null })
    }
    return out
  }, [readings, todayMs])

  const maxKwh = Math.max(
    system.system_kwp * DEFAULT_PSH,
    ...days.map((d) => d.reading?.kwh_produced ?? 0),
    ...days.map((d) => d.reading?.expected_kwh ?? 0),
  )

  const W = 720
  const H = 150
  const PAD_BOTTOM = 18
  const chartH = H - PAD_BOTTOM
  const slot = W / 30
  const barW = slot * 0.62

  const colorFor = (r: SystemReading): string => {
    const expected = expectedFor(system, r)
    const ratio = expected > 0 ? r.kwh_produced / expected : 0
    if (ratio >= 0.8) return '#34d399'
    if (ratio >= 0.5) return '#fbbf24'
    return '#ef4444'
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[560px] h-auto"
        role="img"
        aria-label={`גרף ייצור 30 יום — ${system.site_name}`}
      >
        {/* baseline */}
        <line x1="0" y1={chartH} x2={W} y2={chartH} stroke="currentColor" strokeOpacity="0.15" />
        {days.map(({ date, reading }, i) => {
          const x = i * slot + (slot - barW) / 2
          const label = date.slice(5) // MM-DD
          const showLabel = i % 5 === 0 || i === 29
          if (!reading) {
            return (
              <g key={date}>
                {/* empty-day marker */}
                <rect x={x} y={chartH - 2} width={barW} height={2} fill="currentColor" fillOpacity="0.12" />
                {showLabel && (
                  <text x={i * slot + slot / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.35">
                    {label}
                  </text>
                )}
              </g>
            )
          }
          const h = maxKwh > 0 ? (reading.kwh_produced / maxKwh) * (chartH - 8) : 0
          const expected = expectedFor(system, reading)
          const expY = chartH - (maxKwh > 0 ? (expected / maxKwh) * (chartH - 8) : 0)
          return (
            <g key={date}>
              <rect
                x={x}
                y={chartH - h}
                width={barW}
                height={Math.max(h, 1.5)}
                rx="2"
                fill={colorFor(reading)}
                fillOpacity="0.85"
              >
                <title>{`${date}: ${reading.kwh_produced} kWh (צפי ${Math.round(expected)})${reading.source === 'api' ? ' · API' : ''}`}</title>
              </rect>
              {/* expected marker */}
              <line
                x1={x - 1.5}
                y1={expY}
                x2={x + barW + 1.5}
                y2={expY}
                stroke="currentColor"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              {showLabel && (
                <text x={i * slot + slot / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.35">
                  {label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-[11px] text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400/85" /> ≥80% מהצפי
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400/85" /> 50–80%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500/85" /> &lt;50%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t border-dashed border-current opacity-60" /> צפי יומי
        </span>
      </div>
    </div>
  )
}

// ─── Small UI atoms (match SuppliersPage conventions) ───────────────────────

function Stat({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: 'emerald' | 'amber' | 'red' }) {
  const color =
    tone === 'emerald' ? 'text-emerald-300'
    : tone === 'amber' ? 'text-amber-300'
    : tone === 'red' ? 'text-red-400'
    : highlight ? 'text-[#E8A820]'
    : 'text-white'
  return (
    <div className={`rounded-xl p-3 border ${highlight ? 'bg-[#E8A820]/5 border-[#E8A820]/20' : 'bg-white/5 border-white/10'}`}>
      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-semibold ${color}`} dir="ltr">{value}</p>
    </div>
  )
}

function HealthBadge({ health }: { health: Health }) {
  if (health === 'green') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 text-[11px]">
        <CheckCircle2 size={11} />
        תקין
      </span>
    )
  }
  if (health === 'yellow') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-300 text-[11px]">
        <AlertTriangle size={11} />
        תת־ביצוע
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-red-500/30 bg-red-500/15 text-red-400 text-[11px]">
      <CircleAlert size={11} />
      קריטי
    </span>
  )
}
