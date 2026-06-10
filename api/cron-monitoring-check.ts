// ============================================================
// /api/cron-monitoring-check
// Daily health check for monitored customer systems.
//   1. (Future) auto-fetch yesterday's reading from inverter APIs
//   2. Scan recent readings, compute health per system
//   3. Email the owner a summary of underperforming systems (Resend)
// Triggered by Vercel cron daily at 01:00 UTC (08:00 Bangkok),
// so yesterday's full production day is already complete.
// ============================================================
export const config = { runtime: 'edge' }

import { escapeHtml } from './_lib/html.js'
import { supaGetAll, supaUpsert } from './_lib/supa.js'

const RESEND_KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM || 'Bustan Energy <contracts@bustan.energy>'
const ALERT_TO = process.env.MONITORING_ALERT_EMAIL || 'erez@bustan-energy.com'

// CRON_SECRET must be set — no fallback to prevent unauthenticated execution
const CRON_SECRET = process.env.CRON_SECRET

// Default expected production when a reading has no expected_kwh:
// system_kwp × ~4 peak sun hours (Thailand average)
const DEFAULT_PSH = 4

// No reading for this many days (or more) → red
const STALE_DAYS = 3

interface SystemRow {
  id: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  site_name: string
  system_kwp: number
  inverter_brand: 'huawei' | 'solaredge' | 'sungrow' | 'growatt' | 'other'
  inverter_api_id: string | null
  status: string
}

interface ReadingRow {
  system_id: string
  date: string
  kwh_produced: number
  expected_kwh: number | null
  source: string
}

type Health = 'green' | 'yellow' | 'red'

interface SystemHealth {
  system: SystemRow
  health: Health
  reason: 'no_readings' | 'stale' | 'underperforming' | 'ok'
  latest: ReadingRow | null
  ratio: number | null
}

// ── Inverter API auto-fetch (stub — out of scope for MVP) ───
// Returns yesterday's production for a system, or null if unsupported.
// TODO(huawei): FusionSolar NetEco API — POST /thirdData/login (userName + systemCode),
//               then /thirdData/getKpiStationDay with stationCodes=system.inverter_api_id.
// TODO(solaredge): Monitoring API — GET https://monitoringapi.solaredge.com/site/{inverter_api_id}/energy
//               ?timeUnit=DAY&api_key=... (per-site or account API key).
// TODO(sungrow): iSolarCloud OpenAPI — /openapi/login then /openapi/getPowerStationDetail
//               with ps_id=system.inverter_api_id (requires appkey + x-access-key).
// TODO(growatt): openapi.growatt.com — /v1/plant/energy with plant_id=system.inverter_api_id.
async function fetchReading(system: SystemRow): Promise<{ date: string; kwh_produced: number } | null> {
  if (!system.inverter_api_id) return null
  switch (system.inverter_brand) {
    case 'huawei':
    case 'solaredge':
    case 'sungrow':
    case 'growatt':
    case 'other':
    default:
      return null // not implemented yet — manual readings only
  }
}

function computeHealth(system: SystemRow, readings: ReadingRow[], now: Date): SystemHealth {
  const latest = readings.length ? readings[readings.length - 1] : null
  if (!latest) return { system, health: 'red', reason: 'no_readings', latest: null, ratio: null }

  const ageDays = Math.floor((now.getTime() - new Date(`${latest.date}T00:00:00Z`).getTime()) / 86400_000)
  if (ageDays >= STALE_DAYS) return { system, health: 'red', reason: 'stale', latest, ratio: null }

  const expected = latest.expected_kwh ?? system.system_kwp * DEFAULT_PSH
  const ratio = expected > 0 ? latest.kwh_produced / expected : null
  if (ratio == null || ratio < 0.5) return { system, health: 'red', reason: 'underperforming', latest, ratio }
  if (ratio < 0.8) return { system, health: 'yellow', reason: 'underperforming', latest, ratio }
  return { system, health: 'green', reason: 'ok', latest, ratio }
}

function describeIssue(h: SystemHealth): string {
  if (h.reason === 'no_readings') return 'No readings recorded yet'
  if (h.reason === 'stale') return `No reading since ${h.latest?.date ?? '—'} (3+ days)`
  const pct = h.ratio != null ? Math.round(h.ratio * 100) : 0
  return `Producing ${pct}% of expected (${h.latest?.kwh_produced ?? '—'} kWh on ${h.latest?.date ?? '—'})`
}

function buildAlertEmail(flagged: SystemHealth[]): { subject: string; html: string } {
  const reds = flagged.filter((f) => f.health === 'red').length
  const yellows = flagged.length - reds

  const rows = flagged
    .map((f) => {
      const color = f.health === 'red' ? '#dc2626' : '#d97706'
      return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:8px;"></span>
        <b>${escapeHtml(f.system.customer_name)}</b> — ${escapeHtml(f.system.site_name)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;white-space:nowrap;">${escapeHtml(f.system.system_kwp)} kWp · ${escapeHtml(f.system.inverter_brand)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">${escapeHtml(describeIssue(f))}</td>
    </tr>`
    })
    .join('')

  return {
    subject: `⚠️ Monitoring: ${reds} critical / ${yellows} warning system${flagged.length === 1 ? '' : 's'}`,
    html: `
<div style="font-family:system-ui;max-width:640px;">
  <div style="background:linear-gradient(135deg,#0D2137,#132D4A);padding:28px;border-radius:16px 16px 0 0;color:white;">
    <div style="color:#E8A820;font-weight:800;letter-spacing:2px;font-size:12px;margin-bottom:6px;">BUSTAN ENERGY · MONITORING</div>
    <h1 style="margin:0;font-size:22px;">${flagged.length} system${flagged.length === 1 ? '' : 's'} need attention</h1>
  </div>
  <div style="background:white;padding:28px;border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <th style="text-align:left;padding:8px 12px;color:#666;font-size:12px;">SYSTEM</th>
        <th style="text-align:left;padding:8px 12px;color:#666;font-size:12px;">SIZE</th>
        <th style="text-align:left;padding:8px 12px;color:#666;font-size:12px;">ISSUE</th>
      </tr>
      ${rows}
    </table>
    <p style="margin:24px 0 0;">
      <a href="https://bustan-energy.com/admin/monitoring" style="background:#E8A820;color:#0D2137;padding:12px 24px;border-radius:100px;text-decoration:none;font-weight:800;">Open Monitoring Dashboard →</a>
    </p>
  </div>
</div>`,
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ id?: string; error?: unknown }> {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  }).then((r) => r.json()).catch((e) => ({ error: String(e) }))
}

export default async function handler(req: Request): Promise<Response> {
  // Require CRON_SECRET env var — fail hard if not configured
  if (!CRON_SECRET) {
    console.error('CRON_SECRET env var not set')
    return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  }

  // Auth via cron secret
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== CRON_SECRET) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Active systems only — paused/archived are skipped
  const systems = await supaGetAll<SystemRow>('customer_systems?status=eq.active&select=*')
  if (!systems.length) {
    return Response.json({ ok: true, scanned: 0, flagged: 0, message: 'no active systems' })
  }

  // 1. Try auto-fetching fresh readings from inverter APIs (stub — no-op for now)
  let apiFetched = 0
  for (const system of systems) {
    const reading = await fetchReading(system)
    if (reading) {
      await supaUpsert(
        'system_readings',
        { system_id: system.id, date: reading.date, kwh_produced: reading.kwh_produced, source: 'api' },
        'system_id,date',
      )
      apiFetched++
    }
  }

  // 2. Compute health from readings in the last 7 days
  const since = new Date(now.getTime() - 7 * 86400_000).toISOString().slice(0, 10)
  const readings = await supaGetAll<ReadingRow>(
    `system_readings?date=gte.${since}&select=system_id,date,kwh_produced,expected_kwh,source&order=date.asc&limit=10000`,
  )
  const bySystem = new Map<string, ReadingRow[]>()
  for (const r of readings) {
    const list = bySystem.get(r.system_id) ?? []
    list.push(r)
    bySystem.set(r.system_id, list)
  }

  const healths = systems.map((s) => computeHealth(s, bySystem.get(s.id) ?? [], now))
  const flagged = healths.filter((h) => h.health !== 'green')

  // 3. Email alert (env-gated: skipped when RESEND_API_KEY is missing)
  let emailResult: string = 'skipped_no_flagged'
  if (flagged.length) {
    if (!RESEND_KEY) {
      emailResult = 'skipped_no_resend_key'
    } else {
      const { subject, html } = buildAlertEmail(flagged)
      const res = await sendEmail(ALERT_TO, subject, html)
      emailResult = res?.id ? `sent:${res.id}` : `failed:${JSON.stringify(res?.error ?? 'unknown')}`
    }
  }

  return Response.json({
    ok: true,
    scanned: systems.length,
    api_fetched: apiFetched,
    flagged: flagged.length,
    email: emailResult,
    systems: healths.map((h) => ({
      id: h.system.id,
      site: h.system.site_name,
      health: h.health,
      reason: h.reason,
      ratio: h.ratio != null ? Math.round(h.ratio * 100) / 100 : null,
      last_reading: h.latest?.date ?? null,
    })),
  })
}
