# SP3 — Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Opening `/admin` shows the whole business funnel live from both databases (scans → candidates → promoted → with contact → outreach → proposals → viewed → signed) with "needs attention" lists; `/admin/scan` replaces the static KP Solar Pro with a React map that reads `scan_candidates` and writes approvals/rejections; `/admin/knowledge` is a searchable index of every bustan-index doc grouped by layer; a 30-minute cron alerts Kaniel (WhatsApp, else email) about new A-grade candidates, approvals, first proposal views and signatures.

**Architecture:** One edge endpoint `api/admin-funnel.ts` (auth identical to `admin-stats.ts`) counts big tables with PostgREST `Prefer: count=exact` (new `bCount`/`supaCount` helpers) and fetches the small ones (properties 533, owner_decision 533, outreach_messages, proposals ≤500) so a pure, tested `buildFunnel()` in `api/_lib/funnel.ts` does all aggregation. `/admin/scan` is a new page on the existing MapLibre stack (Esri tiles at maxzoom 18, exported from `SolarMap.tsx`) that reads raw `ScanCandidate` rows (new `fetchScanCandidateRows`) and reuses `promoteScanCandidate`, `rejectScanCandidate`, `RejectReasonMenu`; all filters/badges live in a pure `src/lib/scan-review.ts`. Knowledge hub = static JSON manifest + client-side filter. Alerts = edge cron with a pure message builder, watermark row in `bustan.alert_state` (migration 017).

**Tech Stack:** Vercel functions (edge, `Request`/`Response`), Supabase PostgREST via `api/_lib/bustan-db.ts` (bustan schema on `ygoiaabz`) and `api/_lib/supa.ts` (public schema on `trvgpgp`), React 18 + TS + react-router, maplibre-gl (already a dep), vitest (node env, explicit imports), Playwright smoke.

**Live DB facts (2026-09-03, ygoiaabz/bustan):** scan_requests 354 · scan_candidates pending 42,821 / added 250 / rejected 267 · pending A-grade 20,855 (KP bbox: 3,893 candidates, 1,038 pending A) · properties 533 = crm_pipeline 533 · owner_decision with `lastResearchedAt` 522 · with a phone 271 (**all under `operationalContactPhone`; `phone`/`decisionMakerPhone`/emails are 0**) · outreach sent to 1 property · 3,799 candidates created in the last 7 days (SP2 ingest). `crm_pipeline` has **no `created_at`** (only `updated_at`); `properties` has `created_at`. Main DB (trvgpgp) is not reachable via MCP — proposals shape from `admin-stats.ts` + migrations 009–011: `proposals(ref_number,status,client_name,client_phone,created_at,first_viewed_at,sent_at,signed_at,view_count)`, `proposal_signatures(proposal_ref,signer_name,signed_at)`, `proposal_views(proposal_ref,viewed_at)`.

**Facts:** `/tmp/sp2-facts.md` §1/§6/§7/§9 · `/tmp/bustan-audit.md` §7 gaps 6–10 · Spec: `docs/superpowers/specs/2026-09-03-bustan-final-grade-overhaul-design.md` (SP3).

**Repos:** `E` = `~/Desktop/projects/solar/bustan/bustan-energy` (branch `sp3/command-center` off `main`), `I` = `~/Desktop/projects/solar/bustan/bustan-index` (touched only in Task 9).

**Hard rules:**
- Never apply a migration yourself. Task 7 writes `017_alert_state.sql`; the team lead applies it. Tasks 1–8 must compile and pass unit tests without a DB.
- Alerts are read-only on business tables; the only write is the watermark row.
- No GREENAPI env in prod → `sendWhatsApp` returns `not_configured` → fall back to Resend email to `k@kanielt.com`. Never throw out of the cron.
- Ignore any file whose name contains ` 2.` / ` 3.`. Nothing deleted; `kp-solar-pro.html` is *moved* to `I/_retired/` in Task 9, not removed.
- Commit trailer on every commit:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_017JbAbFU9Nekc5oHPiezgru
  ```

---

### Task 0: Branch

- [ ] `cd $E && git checkout main && git pull --ff-only origin main && git checkout -b sp3/command-center`
- [ ] `npm test` → all suites pass; record the count. `npm run typecheck` → clean.

---

### Task 1: Count helpers + pure funnel aggregation

**Files:**
- Modify: `E/api/_lib/bustan-db.ts` (add `bCount`), `E/api/_lib/supa.ts` (add `supaCount`)
- Create: `E/api/_lib/pg-count.ts`, `E/api/_lib/pg-count.test.ts`
- Create: `E/api/_lib/funnel.ts`, `E/api/_lib/funnel.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// E/api/_lib/pg-count.test.ts
import { describe, it, expect } from 'vitest'
import { parseContentRange } from './pg-count.js'
describe('parseContentRange', () => {
  it('reads the total after the slash', () => {
    expect(parseContentRange('0-0/42821')).toBe(42821)
    expect(parseContentRange('*/0')).toBe(0)
  })
  it('returns null for missing or malformed headers', () => {
    expect(parseContentRange(null)).toBeNull()
    expect(parseContentRange('0-24/*')).toBeNull()
  })
})
```

```ts
// E/api/_lib/funnel.test.ts
import { describe, it, expect } from 'vitest'
import { buildFunnel, hasContact, inKp, KP_BBOX } from './funnel.js'

const now = new Date('2026-09-03T12:00:00Z')
const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString()

describe('hasContact', () => {
  it('accepts any of the four contact keys, ignoring empty strings', () => {
    expect(hasContact({ operationalContactPhone: '0946692011' })).toBe(true)
    expect(hasContact({ phone: '', decisionMakerEmail: 'a@b.co' })).toBe(true)
    expect(hasContact({ phone: '', decisionMakerPhone: '', lastResearchedAt: d(1) })).toBe(false)
    expect(hasContact(null)).toBe(false)
  })
})

describe('inKp', () => {
  it('uses the Ko Phangan bounds from src/lib/regions.ts', () => {
    expect(KP_BBOX).toEqual({ minLon: 99.9, minLat: 9.65, maxLon: 100.1, maxLat: 9.82 })
    expect(inKp(9.708598, 99.990975)).toBe(true)
    expect(inKp(13.75, 100.5)).toBe(false)
    expect(inKp(null, null)).toBe(false)
  })
})

describe('buildFunnel', () => {
  const input = {
    now,
    scanRequests: [{ created_at: d(1) }, { created_at: d(30) }],
    candidateCounts: { pending: 100, added: 10, rejected: 5, pendingA: 40, kpAll: 60, kpPendingA: 20, created7d: 30, kpCreated7d: 25 },
    properties: [
      { id: 'p1', name: 'Resort A', lat: 9.7, lon: 99.99, created_at: d(2) },
      { id: 'p2', name: 'Factory B', lat: 13.7, lon: 100.5, created_at: d(20) },
      { id: 'p3', name: 'Villa C', lat: 9.71, lon: 100.0, created_at: d(20) },
    ],
    owners: [
      { property_id: 'p1', data: { operationalContactPhone: '0946692011', lastResearchedAt: d(2) } },
      { property_id: 'p2', data: { lastResearchedAt: d(3) } },
    ],
    outreach: [
      { property_id: 'p1', status: 'sent', sent_at: d(1) },
      { property_id: 'p1', status: 'sent', sent_at: d(1) },
      { property_id: 'p2', status: 'draft', sent_at: null },
    ],
    proposals: [
      { ref_number: 'R1', status: 'viewed', client_name: 'A', created_at: d(3), first_viewed_at: d(2), signed_at: null },
      { ref_number: 'R2', status: 'signed', client_name: 'B', created_at: d(40), first_viewed_at: d(39), signed_at: d(1) },
      { ref_number: 'R3', status: 'sent', client_name: 'C', created_at: d(1), first_viewed_at: null, signed_at: null },
    ],
  }
  it('produces the eight stages with all/kp/rest/d7 counts', () => {
    const f = buildFunnel(input)
    const byKey = Object.fromEntries(f.stages.map((s) => [s.key, s]))
    expect(f.stages.map((s) => s.key)).toEqual(['scans', 'candidates', 'promoted', 'with_contact', 'outreach', 'proposals', 'viewed', 'signed'])
    expect(byKey.scans).toMatchObject({ all: 2, d7: 1, kp: null, rest: null })
    expect(byKey.candidates).toMatchObject({ all: 115, kp: 60, rest: 55, d7: 30, pending: 100, added: 10, rejected: 5, pendingA: 40, kpPendingA: 20 })
    expect(byKey.promoted).toMatchObject({ all: 3, kp: 2, rest: 1, d7: 1 })
    expect(byKey.with_contact).toMatchObject({ all: 1, kp: 1, rest: 0 })
    expect(byKey.outreach).toMatchObject({ all: 1, d7: 1 })          // distinct properties, sent only
    expect(byKey.proposals).toMatchObject({ all: 3, d7: 2, kp: null })
    expect(byKey.viewed).toMatchObject({ all: 2, d7: 1 })             // first_viewed_at not null
    expect(byKey.signed).toMatchObject({ all: 1, d7: 1 })
  })
  it('lists leads without contact and proposals viewed-not-signed', () => {
    const f = buildFunnel(input)
    expect(f.attention.no_contact.map((p) => p.id)).toEqual(['p2', 'p3'])
    expect(f.attention.viewed_unsigned.map((p) => p.ref_number)).toEqual(['R1'])
  })
})
```

- [ ] **Step 2: Run → fails** — `npx vitest run api/_lib/pg-count.test.ts api/_lib/funnel.test.ts` → "Failed to resolve import".

- [ ] **Step 3: Implement**

```ts
// E/api/_lib/pg-count.ts
/** PostgREST `Content-Range: 0-0/42821` → 42821. `*` totals (no exact count) → null. */
export function parseContentRange(header: string | null): number | null {
  if (!header) return null
  const total = header.split('/')[1]
  if (!total || total === '*') return null
  const n = Number(total)
  return Number.isFinite(n) ? n : null
}
```

Append to `E/api/_lib/bustan-db.ts`:
```ts
import { parseContentRange } from './pg-count.js'
/** Exact row count for a filter path without fetching rows (HEAD-style, Range 0-0). */
export async function bCount(path: string): Promise<number> {
  const r = await fetch(`${BUSTAN_URL}/rest/v1/${path}`, {
    headers: { ...bustanHeaders(false), Prefer: 'count=exact', Range: '0-0', 'Range-Unit': 'items' },
  })
  return (r.ok || r.status === 206) ? (parseContentRange(r.headers.get('content-range')) ?? 0) : 0
}
```
Append the same to `E/api/_lib/supa.ts` as `supaCount(path)` using `SUPABASE_URL` + `baseHeaders()` (move the `import` to the top of the file — `verbatimModuleSyntax` is on).

```ts
// E/api/_lib/funnel.ts
// Pure aggregation for /api/admin-funnel. Inputs are already-fetched rows/counts.
export const KP_BBOX = { minLon: 99.9, minLat: 9.65, maxLon: 100.1, maxLat: 9.82 } // = REGIONS['koh-phangan'].bounds
export const CONTACT_KEYS = ['phone', 'decisionMakerPhone', 'operationalContactPhone', 'decisionMakerEmail'] as const
export const KP_FILTER = `lat=gte.${KP_BBOX.minLat}&lat=lte.${KP_BBOX.maxLat}&lon=gte.${KP_BBOX.minLon}&lon=lte.${KP_BBOX.maxLon}`

export function inKp(lat: number | null | undefined, lon: number | null | undefined): boolean {
  return lat != null && lon != null && lat >= KP_BBOX.minLat && lat <= KP_BBOX.maxLat && lon >= KP_BBOX.minLon && lon <= KP_BBOX.maxLon
}
export function hasContact(data: Record<string, unknown> | null | undefined): boolean {
  if (!data) return false
  return CONTACT_KEYS.some((k) => typeof data[k] === 'string' && (data[k] as string).trim() !== '')
}

export interface CandidateCounts { pending: number; added: number; rejected: number; pendingA: number; kpAll: number; kpPendingA: number; created7d: number; kpCreated7d: number }
export interface PropertyRow { id: string; name: string | null; lat: number | null; lon: number | null; created_at: string | null }
export interface OwnerRow { property_id: string; data: Record<string, unknown> | null }
export interface OutreachRow { property_id: string; status: string; sent_at: string | null }
export interface ProposalRow { ref_number: string; status: string; client_name: string | null; created_at: string; first_viewed_at: string | null; signed_at: string | null }
export interface FunnelInput { now: Date; scanRequests: { created_at: string | null }[]; candidateCounts: CandidateCounts; properties: PropertyRow[]; owners: OwnerRow[]; outreach: OutreachRow[]; proposals: ProposalRow[] }
export interface Stage { key: string; label: string; all: number; kp: number | null; rest: number | null; d7: number; [extra: string]: unknown }

const SENT = new Set(['sent', 'delivered', 'replied'])

export function buildFunnel(i: FunnelInput) {
  const since = i.now.getTime() - 7 * 86_400_000
  const recent = (ts: string | null | undefined) => !!ts && new Date(ts).getTime() >= since
  const c = i.candidateCounts
  const candAll = c.pending + c.added + c.rejected
  const ownerById = new Map(i.owners.map((o) => [o.property_id, o]))
  const withContact = i.properties.filter((p) => hasContact(ownerById.get(p.id)?.data))
  const noContact = i.properties.filter((p) => !hasContact(ownerById.get(p.id)?.data))
  const sentRows = i.outreach.filter((o) => SENT.has(o.status))
  const sentProps = new Set(sentRows.map((o) => o.property_id))
  const sentProps7d = new Set(sentRows.filter((o) => recent(o.sent_at)).map((o) => o.property_id))
  const viewed = i.proposals.filter((p) => p.first_viewed_at)
  const signed = i.proposals.filter((p) => p.status === 'signed' || p.signed_at)
  const kpProps = i.properties.filter((p) => inKp(p.lat, p.lon))
  const stages: Stage[] = [
    { key: 'scans', label: 'סריקות', all: i.scanRequests.length, kp: null, rest: null, d7: i.scanRequests.filter((s) => recent(s.created_at)).length },
    { key: 'candidates', label: 'מועמדים', all: candAll, kp: c.kpAll, rest: candAll - c.kpAll, d7: c.created7d, pending: c.pending, added: c.added, rejected: c.rejected, pendingA: c.pendingA, kpPendingA: c.kpPendingA },
    { key: 'promoted', label: 'לידים ב-CRM', all: i.properties.length, kp: kpProps.length, rest: i.properties.length - kpProps.length, d7: i.properties.filter((p) => recent(p.created_at)).length },
    { key: 'with_contact', label: 'עם איש קשר', all: withContact.length, kp: withContact.filter((p) => inKp(p.lat, p.lon)).length, rest: withContact.filter((p) => !inKp(p.lat, p.lon)).length, d7: 0 },
    { key: 'outreach', label: 'פנייה נשלחה', all: sentProps.size, kp: null, rest: null, d7: sentProps7d.size },
    { key: 'proposals', label: 'הצעות', all: i.proposals.length, kp: null, rest: null, d7: i.proposals.filter((p) => recent(p.created_at)).length },
    { key: 'viewed', label: 'נצפו', all: viewed.length, kp: null, rest: null, d7: viewed.filter((p) => recent(p.first_viewed_at)).length },
    { key: 'signed', label: 'נחתמו', all: signed.length, kp: null, rest: null, d7: signed.filter((p) => recent(p.signed_at)).length },
  ]
  return {
    stages,
    attention: {
      no_contact: noContact.slice(0, 10).map((p) => ({ id: p.id, name: p.name, kp: inKp(p.lat, p.lon) })),
      viewed_unsigned: i.proposals.filter((p) => p.status === 'viewed').sort((a, b) => (b.first_viewed_at ?? '').localeCompare(a.first_viewed_at ?? '')).slice(0, 10)
        .map((p) => ({ ref_number: p.ref_number, client_name: p.client_name, first_viewed_at: p.first_viewed_at })),
    },
  }
}
```

- [ ] **Step 4: Run → passes** (`npx vitest run api/_lib/pg-count.test.ts api/_lib/funnel.test.ts` → 6 passed). `npm run typecheck` clean.
- [ ] **Step 5: Commit** — `git add api/_lib && git commit -m "feat(funnel): pure funnel aggregation + PostgREST exact-count helpers"`

---

### Task 2: `api/admin-funnel.ts`

**Files:**
- Create: `E/api/_lib/admin-verify.ts` (extract of `verifyAdmin` from `admin-stats.ts:44-54`; `admin-stats.ts` itself is left untouched)
- Create: `E/api/admin-funnel.ts`

- [ ] **Step 1: Shared verifier**

```ts
// E/api/_lib/admin-verify.ts — Bearer <main-project user JWT> → admin email or null (edge-safe)
import { isAllowedAdmin } from './admin-access.js'
export async function verifyAdminRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${auth.slice(7)}` },
  })
  if (!r.ok) return null
  const email = ((await r.json()) as { email?: string })?.email?.toLowerCase()
  return email && isAllowedAdmin(email) ? email : null
}
```

- [ ] **Step 2: Endpoint**

```ts
// E/api/admin-funnel.ts — GET, admin JWT. Funnel across both DBs (bustan + main). Edge runtime.
export const config = { runtime: 'edge' }
import { verifyAdminRequest } from './_lib/admin-verify.js'
import { bGet, bCount } from './_lib/bustan-db.js'
import { supaGetAll } from './_lib/supa.js'
import { buildFunnel, KP_FILTER } from './_lib/funnel.js'
import type { PropertyRow, OwnerRow, OutreachRow, ProposalRow } from './_lib/funnel.js'

export default async function handler(req: Request): Promise<Response> {
  if (!(await verifyAdminRequest(req))) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  try {
    const now = new Date()
    const since7 = new Date(now.getTime() - 7 * 86_400_000).toISOString()
    const C = 'scan_candidates?select=id'
    const [pending, added, rejected, pendingA, kpAll, kpPendingA, created7d, kpCreated7d,
      scanRequests, properties, owners, outreach, proposals, pendingATop] = await Promise.all([
      bCount(`${C}&status=eq.pending`), bCount(`${C}&status=eq.added`), bCount(`${C}&status=eq.rejected`),
      bCount(`${C}&status=eq.pending&priority=eq.A`), bCount(`${C}&${KP_FILTER}`),
      bCount(`${C}&status=eq.pending&priority=eq.A&${KP_FILTER}`),
      bCount(`${C}&created_at=gte.${since7}`), bCount(`${C}&created_at=gte.${since7}&${KP_FILTER}`),
      bGet<{ created_at: string | null }>('scan_requests?select=created_at&limit=5000'),
      bGet<PropertyRow>('properties?select=id,name,lat,lon,created_at&limit=5000'),
      bGet<OwnerRow>('owner_decision?select=property_id,data&limit=5000'),
      bGet<OutreachRow>('outreach_messages?select=property_id,status,sent_at&limit=5000'),
      supaGetAll<ProposalRow>('proposals?select=ref_number,status,client_name,created_at,first_viewed_at,signed_at&order=created_at.desc&limit=500'),
      bGet('scan_candidates?select=id,name,estimated_kwp,lat,lon,footprint_class,existing_solar,external_id&status=eq.pending&priority=eq.A&existing_solar=not.is.true&order=estimated_kwp.desc.nullslast&limit=10'),
    ])
    const f = buildFunnel({ now, scanRequests, properties, owners, outreach, proposals,
      candidateCounts: { pending, added, rejected, pendingA, kpAll, kpPendingA, created7d, kpCreated7d } })
    return Response.json({ ok: true, generated_at: now.toISOString(), ...f, attention: { ...f.attention, pending_a: pendingATop } })
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 3: Local check** — `npm run typecheck`. With `.env` loaded: `vercel dev` (or `npx vercel dev --listen 3000`) then `curl -s -H "Authorization: Bearer $(node -e "...")"` is impractical — instead verify in Task 3 via the UI on the preview. Expected shape documented above.
- [ ] **Step 4: Commit** — `git add api/_lib/admin-verify.ts api/admin-funnel.ts && git commit -m "feat(api): admin-funnel — cross-DB funnel counts, KP split, 7d deltas, attention lists"`

---

### Task 3: `/admin` home = funnel dashboard

**Files:**
- Create: `E/src/lib/funnel-client.ts`, `E/src/lib/funnel-client.test.ts`
- Create: `E/src/components/admin/FunnelSection.tsx`
- Modify: `E/src/pages/admin/AdminDashboardPage.tsx` (insert `<FunnelSection />` between the header and the stat cards; subtitle `'סקירת הצעות מחיר'` → `'משפך עסקי — סריקות עד חתימה'`; nothing removed)

- [ ] **Step 1: Test the pure width helper**

```ts
// E/src/lib/funnel-client.test.ts
import { describe, it, expect } from 'vitest'
import { funnelWidths } from './funnel-client'
describe('funnelWidths', () => {
  it('scales bars to the largest stage with a 4% floor so zero stages stay visible', () => {
    expect(funnelWidths([{ all: 1000 }, { all: 250 }, { all: 0 }])).toEqual([100, 25, 4])
    expect(funnelWidths([])).toEqual([])
    expect(funnelWidths([{ all: 0 }])).toEqual([4])
  })
})
```

- [ ] **Step 2: Implement client**

```ts
// E/src/lib/funnel-client.ts
import { getSession } from './admin-auth'
export interface FunnelStage { key: string; label: string; all: number; kp: number | null; rest: number | null; d7: number; pending?: number; added?: number; rejected?: number; pendingA?: number; kpPendingA?: number }
export interface PendingA { id: string; name: string | null; estimated_kwp: number | null; lat: number; lon: number; footprint_class: string | null; existing_solar: boolean | null; external_id: string | null }
export interface FunnelResponse { ok: boolean; generated_at: string; stages: FunnelStage[]; attention: {
  pending_a: PendingA[]; no_contact: { id: string; name: string | null; kp: boolean }[]
  viewed_unsigned: { ref_number: string; client_name: string | null; first_viewed_at: string | null }[] } }
export function funnelWidths(stages: { all: number }[]): number[] {
  const max = Math.max(1, ...stages.map((s) => s.all))
  return stages.map((s) => Math.max(4, Math.round((s.all / max) * 100)))
}
export async function fetchAdminFunnel(): Promise<FunnelResponse | null> {
  const session = await getSession(); if (!session?.access_token) return null
  const res = await fetch('/api/admin-funnel', { headers: { Authorization: `Bearer ${session.access_token}` } })
  if (!res.ok) return null
  const json: FunnelResponse = await res.json(); return json.ok ? json : null
}
```

- [ ] **Step 3: `FunnelSection.tsx`** (uses the dashboard's existing card classes `bg-white/5 rounded-2xl border border-white/10`; `.bustan-admin-main` remaps `text-white*` to ink, so keep the same utility names):
- Loads `fetchAdminFunnel()` in `useEffect`; skeleton while loading; on `null` shows "לא ניתן לטעון משפך" with a retry button.
- **Cards row** (`grid grid-cols-2 lg:grid-cols-4`): 8 stages, each `label`, big `all`, small line `KP {kp} · שאר {rest}` when `kp !== null`, and `+{d7} ב-7 ימים` chip (green when > 0).
- **Funnel bar**: one `<div>` per stage, `style={{ width: `${w}%` }}` from `funnelWidths(stages)`, height 28px, background `#24463E` at opacity stepping `1 → 0.35`, label + count inside; `dir="rtl"` inherited. No chart lib.
- **Needs attention** (`grid lg:grid-cols-3`): (a) `pending_a` → rows `name ?? 'Roof ' + id.slice(0,8)` · `{kwp} kWp` · badge from `footprint_class` (`parcel` → "קרקע", `compound` → "מספר מבנים", `unclear` → "לוודא") · button "פתח בסורק" → `navigate('/admin/scan?focus=' + id)`; (b) `no_contact` → name + "ללא איש קשר" · link to `/crm/leads/{id}`; (c) `viewed_unsigned` → `client_name` · `ref_number` · `first_viewed_at` (he-IL date) · link `/admin/proposals/{ref_number}`.

- [ ] **Step 4: Wire into `AdminDashboardPage.tsx`**, `npm run typecheck && npm run lint && npm test` → clean. `npm run dev` → `/admin` (after login) renders the section; unauthenticated `/api/admin-funnel` returns 401 in the network tab.
- [ ] **Step 5: Commit** — `feat(admin): funnel dashboard on /admin — 8 stages, KP split, 7d deltas, needs-attention lists`

---

### Task 4: `/admin/scan` — KP Solar Pro on the React map stack (pure logic)

**Files:**
- Create: `E/src/lib/scan-review.ts`, `E/src/lib/scan-review.test.ts`
- Modify: `E/src/lib/bustan-crm-service.ts` — add `fetchScanCandidateRows`

Reference behaviour to port (`I/kp-solar-pro.html`): `CAT_ICONS` (`:405`), `hasExistingSolar` = confident positive only (`:494`), `footprintBadge` (`:466`), grade/category/size filters (`:1065-1096`), pipeline toggle (`:1108`), notes (`:1196`, `localStorage kpsp_notes`), compare (`:1202`), `flyTo` (`:1142`).

- [ ] **Step 1: Failing tests**

```ts
// E/src/lib/scan-review.test.ts
import { describe, it, expect } from 'vitest'
import { CAT_ICONS, GRADE_COLORS, footprintBadge, hasExistingSolar, applyScanFilters, toFeatureCollection, DEFAULT_FILTERS, whatsappLink, noteKey } from './scan-review'
import type { ScanCandidate } from './bustan-crm-service'

const base = { id: 'u1', status: 'pending', kind: 'roof', name: 'Treechart Hostel', lat: 9.708598, lon: 99.990975, roof_area_sqm: 994, estimated_kwp: 126.56,
  priority: 'A', solar_potential_score: 100, category: 'hospitality', footprint_class: null, roof_pct: null, existing_solar: null, solar_check_confidence: null,
  panel_coverage_pct: null, phone: '0946692011', external_source: 'osm', external_id: '479104039', roof_geom: { type: 'Polygon', coordinates: [[[99.99, 9.70], [99.991, 9.70], [99.991, 9.701], [99.99, 9.70]]] } } as unknown as ScanCandidate
const c = (over: Partial<ScanCandidate>): ScanCandidate => ({ ...base, ...over })

describe('footprintBadge', () => {
  it('mirrors kp-solar-pro: parcel → land, compound → several, unclear → verify', () => {
    expect(footprintBadge(c({ footprint_class: 'parcel' }))).toBe('land, not a roof')
    expect(footprintBadge(c({ footprint_class: 'compound' }))).toBe('several buildings')
    expect(footprintBadge(c({ footprint_class: 'unclear' }))).toBe('verify footprint')
    expect(footprintBadge(c({ footprint_class: 'roof' }))).toBe('')
    expect(footprintBadge(base)).toBe('')
  })
})
describe('hasExistingSolar', () => {
  it('is true only on a confident positive (existing_solar=true and confidence ≥ 0.5)', () => {
    expect(hasExistingSolar(c({ existing_solar: true, solar_check_confidence: 0.9 }))).toBe(true)
    expect(hasExistingSolar(c({ existing_solar: true, solar_check_confidence: 0.3 }))).toBe(false)
    expect(hasExistingSolar(c({ existing_solar: true, solar_check_confidence: null }))).toBe(true)
    expect(hasExistingSolar(base)).toBe(false)
  })
})
describe('applyScanFilters', () => {
  const list = [base, c({ id: 'u2', priority: 'B', estimated_kwp: 40, category: 'retail', name: 'Big C' }),
    c({ id: 'u3', priority: 'A', existing_solar: true, solar_check_confidence: 0.8 }), c({ id: 'u4', status: 'added', name: 'In CRM' })]
  it('defaults: pending only, excludes confident PV, all grades', () => {
    expect(applyScanFilters(list, DEFAULT_FILTERS).map((x) => x.id)).toEqual(['u1', 'u2'])
  })
  it('grade, category, min score/kwp, search and pipeline toggle', () => {
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, grades: ['B'] }).map((x) => x.id)).toEqual(['u2'])
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, category: 'retail' }).map((x) => x.id)).toEqual(['u2'])
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, minKwp: 100 }).map((x) => x.id)).toEqual(['u1'])
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, search: 'big' }).map((x) => x.id)).toEqual(['u2'])
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, includeSolar: true }).map((x) => x.id)).toEqual(['u1', 'u2', 'u3'])
    expect(applyScanFilters(list, { ...DEFAULT_FILTERS, showInCrm: true }).map((x) => x.id)).toEqual(['u1', 'u2', 'u4'])
  })
})
describe('toFeatureCollection', () => {
  it('emits a polygon (or point fallback) per candidate with grade colour + badge props', () => {
    const fc = toFeatureCollection([base, c({ id: 'u5', roof_geom: null })])
    expect(fc.features).toHaveLength(2)
    expect(fc.features[0].geometry.type).toBe('Polygon'); expect(fc.features[1].geometry.type).toBe('Point')
    expect(fc.features[0].properties).toMatchObject({ id: 'u1', grade: 'A', color: GRADE_COLORS.A, kwp: 126.56, badge: '', pv: false, icon: CAT_ICONS.hospitality })
  })
})
describe('helpers', () => {
  it('whatsapp link normalises Thai numbers; note key prefers the uuid', () => {
    expect(whatsappLink(base, 'Hi')).toBe('https://wa.me/66946692011?text=Hi')
    expect(whatsappLink(c({ phone: null }), 'Hi')).toBeNull()
    expect(noteKey(base)).toBe('u1')
  })
})
```

- [ ] **Step 2: Run → fails.** Then implement:

```ts
// E/src/lib/scan-review.ts — pure port of kp-solar-pro.html filters/badges (no DOM, no map)
import type { ScanCandidate } from './bustan-crm-service'
export const CAT_ICONS: Record<string, string> = { hospitality: '🏨', food_beverage: '🍽️', retail: '🛒', residential: '🏠', bungalow: '🛖', healthcare: '🏥', commercial: '🏢', government: '🏛️' }
export const GRADE_COLORS = { A: '#00E676', B: '#FFD600', C: '#FF9100', D: '#FF3D00' } as const  // same as SolarMap cand layer
export type Grade = keyof typeof GRADE_COLORS
export interface ScanFilters { grades: Grade[]; category: string | 'all'; minKwp: number; minScore: number; search: string; includeSolar: boolean; showInCrm: boolean }
export const DEFAULT_FILTERS: ScanFilters = { grades: ['A', 'B', 'C', 'D'], category: 'all', minKwp: 0, minScore: 0, search: '', includeSolar: false, showInCrm: false }

export function footprintBadge(c: ScanCandidate): '' | 'land, not a roof' | 'several buildings' | 'verify footprint' {
  switch (c.footprint_class) { case 'parcel': return 'land, not a roof'; case 'compound': return 'several buildings'; case 'unclear': return 'verify footprint'; default: return '' }
}
export function hasExistingSolar(c: ScanCandidate): boolean {
  return c.existing_solar === true && (c.solar_check_confidence == null || Number(c.solar_check_confidence) >= 0.5)
}
export function applyScanFilters(list: ScanCandidate[], f: ScanFilters): ScanCandidate[] {
  const q = f.search.trim().toLowerCase()
  return list.filter((c) => {
    if (c.status === 'rejected') return false
    if (c.status === 'added' && !f.showInCrm) return false
    if (!f.includeSolar && hasExistingSolar(c)) return false
    if (!f.grades.includes((c.priority ?? 'D') as Grade)) return false
    if (f.category !== 'all' && (c.category ?? c.property_type) !== f.category) return false
    if (Number(c.estimated_kwp ?? 0) < f.minKwp) return false
    if (Number(c.solar_potential_score ?? 0) < f.minScore) return false
    if (q && !`${c.name ?? ''} ${c.area_name ?? ''} ${c.external_id ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })
}
export function toFeatureCollection(list: ScanCandidate[]): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: list.map((c) => {
    const grade = (c.priority ?? 'D') as Grade
    const props = { id: c.id, grade, color: GRADE_COLORS[grade] ?? GRADE_COLORS.D, kwp: Number(c.estimated_kwp ?? 0), name: c.name ?? '',
      badge: footprintBadge(c), pv: hasExistingSolar(c), icon: CAT_ICONS[c.category ?? ''] ?? '🏢', inCrm: c.status === 'added' }
    const geometry: GeoJSON.Geometry = c.roof_geom?.coordinates?.[0]?.length >= 4 ? c.roof_geom : { type: 'Point', coordinates: [Number(c.lon), Number(c.lat)] }
    return { type: 'Feature', geometry, properties: props }
  }) }
}
export function whatsappLink(c: ScanCandidate, text: string): string | null {
  if (!c.phone) return null
  let d = c.phone.replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = `66${d.slice(1)}`
  return d.length >= 9 && d.length <= 15 ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : null
}
export const NOTES_KEY = 'bustan_scan_notes'
export function noteKey(c: ScanCandidate): string { return c.id }
export function loadNotes(storage: Pick<Storage, 'getItem'> = localStorage): Record<string, string> {
  try { return JSON.parse(storage.getItem(NOTES_KEY) || '{}') } catch { return {} }
}
export function saveNote(id: string, text: string, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): Record<string, string> {
  const n = loadNotes(storage); if (text.trim()) n[id] = text; else delete n[id]
  storage.setItem(NOTES_KEY, JSON.stringify(n)); return n
}
```

In `bustan-crm-service.ts` next to `fetchScanCandidates`:
```ts
/** Raw rows for /admin/scan (keeps 015 columns: footprint_class, category, phone, external_id …). */
export async function fetchScanCandidateRows(bounds: [[number, number], [number, number]], statuses: Array<ScanCandidate['status']> = ['pending', 'added']): Promise<ScanCandidate[]> {
  if (!bustanSupabase) return []
  const [[minLng, minLat], [maxLng, maxLat]] = bounds
  const { data, error } = await bustanSupabase.from('scan_candidates').select('*').in('status', statuses).eq('kind', 'roof')
    .gte('lat', minLat).lte('lat', maxLat).gte('lon', minLng).lte('lon', maxLng)
    .order('estimated_kwp', { ascending: false, nullsFirst: false }).limit(5000)
  if (error) throw error
  return (data ?? []) as ScanCandidate[]
}
```

- [ ] **Step 3: Run → passes** (`npx vitest run src/lib/scan-review.test.ts` → 7 passed). Commit — `feat(scan): pure scan-review filters/badges (KP Solar Pro port) + raw candidate fetch`

---

### Task 5: `/admin/scan` page + routes + sidebar

**Files:**
- Modify: `E/src/components/Map/SolarMap.tsx` — `export` the existing `TILE_SOURCES`, `TILE_MAXZOOM`, `TILE_ATTRIBUTION` consts (no other change)
- Create: `E/src/pages/admin/ScanCommandPage.tsx`, `E/src/components/admin/scan/ScanFilterBar.tsx`, `E/src/components/admin/scan/CandidateCard.tsx`, `E/src/components/admin/scan/CompareDrawer.tsx`
- Modify: `E/src/App.tsx` (both route blocks: add `<Route path="scan" element={<ScanCommandPage />} />` + lazy import), `E/src/pages/admin/AdminLayout.tsx` (`NAV_ITEMS`: `{ to: '/admin/scan', icon: ScanSearch, label: 'סורק גגות', end: true }` after דשבורד — `ScanSearch` from lucide-react)

- [ ] **Step 1: Page skeleton + auth to bustan**
  - `AdminLayout` guarantees a main-project admin session, but the RPCs (`promote_scan_candidate`, `reject_scan_candidate`) need a **bustan** session with role admin/sales/engineer. On mount: `bustanSupabase?.auth.getSession()`; if no session render a compact inline form (email + password) calling `signInBustan(email, password)` from `src/lib/bustan-supabase.ts` (`Promise<boolean>`), then `fetchCurrentRole()` from `bustan-permissions.ts`; gate approve/reject with `can(role, 'crm.edit')` exactly as `CandidateReviewPanel.tsx:361`.
  - Layout: `h-full flex` — left `w-[380px]` panel (filter bar + scrollable list of `CandidateCard`), right `flex-1` map. Mobile: list under map (`flex-col`).
- [ ] **Step 2: Map** — `new maplibregl.Map({ container, style: { version: 8, sources: { sat: { type: 'raster', tiles: TILE_SOURCES.esri, tileSize: 256, maxzoom: TILE_MAXZOOM.esri, attribution: TILE_ATTRIBUTION } }, layers: [{ id: 'sat', type: 'raster', source: 'sat' }] }, center: [100.0, 9.735], zoom: 12 })`. Source `cands` = `toFeatureCollection(filtered)`; layers: `cand-fill` (`fill-color: ['get','color']`, opacity 0.35, filter Polygon), `cand-line` (same colour, width 1.5), `cand-pt` (circle for Points, `circle-color: ['get','color']`, radius 6), `cand-pv` (circle stroke `#ff4444` where `['get','pv']`). Click → `setSelected(id)`; hover cursor pointer. `map.on('moveend')` → debounce 400 ms → `fetchScanCandidateRows(map.getBounds() as bounds)` only when zoom ≥ 11 (else show "התקרב כדי לטעון מועמדים"). Initial load: KP bounds `REGIONS['koh-phangan'].bounds`.
  - `?focus=<id>` (from the dashboard): after first load `fetchScanCandidateById(id)` → `map.flyTo({ center: [lon, lat], zoom: 17 })` + select.
- [ ] **Step 3: `ScanFilterBar`** — grade pills A–D (multi-toggle, coloured by `GRADE_COLORS`), category `<select>` from `Object.keys(CAT_ICONS)` + 'all', `minKwp` number input, `minScore` range 0–100, search box (Enter → `flyTo` first match), toggles "כולל PV קיים" (`includeSolar`) and "הצג גם ב-CRM" (`showInCrm`), counter `{filtered.length} / {rows.length}` and `PV excluded: {n}`.
- [ ] **Step 4: `CandidateCard`** — icon + name (`'Roof ' + id.slice(0,8)` fallback) · grade chip · `kwp` kWp · `roof_area_sqm` m² · score · badges: `footprintBadge` (amber), `hasExistingSolar` → "☀️ PV {panel_coverage_pct}%" (red), `status==='added'` → "In CRM". Actions row: **Approve** → `promoteScanCandidate(id)`; on `ok:false` show toast `Already in CRM (property ${property_id.slice(0,8)}…)` via `useAdminStore().showToast`; on ok mark row `status='added'` locally. **Reject** → toggles `<RejectReasonMenu compact onPick onCancel />` → `rejectScanCandidate(id, reason)` → remove row locally. **Create proposal** → `navigate('/admin/proposals/new?candidate_id=' + id)`. **WhatsApp** (only when `whatsappLink` ≠ null) → `<a target=_blank>` with text `Hello, this is Bustan Energy. Your roof could host ~${kwp} kWp of solar — may we send a free proposal?`. **Compare** checkbox (max 3, disabled beyond). **Note** textarea (`loadNotes/saveNote`, debounce 300 ms). **Fly to** → `map.flyTo({center, zoom: 18})`.
- [ ] **Step 5: `CompareDrawer`** — bottom sheet listing the ≤3 compared candidates side by side: name, grade, kWp, m², score, footprint, PV, phone; "Clear".
- [ ] **Step 6: Routes + nav** as listed in Files. `npm run typecheck && npm run lint && npm test` → clean. `npm run dev` → `/admin/scan`: KP loads ~3.9k rows (filtered default ≈ pending, non-PV), pills filter instantly, click polygon selects card, approve on one test candidate in dev DB shows toast and the row turns "In CRM".
- [ ] **Step 7: Commit** — `feat(admin): /admin/scan — KP Solar Pro on the React map stack (grade/score/category filters, footprint+PV badges, approve/reject, proposal CTA, compare, notes, fly-to)`

---

### Task 6: `/admin/knowledge` hub

**Files:**
- Create: `E/src/data/knowledge-manifest.json`, `E/src/lib/knowledge.ts`, `E/src/lib/knowledge.test.ts`, `E/src/pages/admin/KnowledgePage.tsx`
- Modify: `E/src/App.tsx` (both blocks: `<Route path="knowledge" element={<KnowledgePage />} />`), `E/src/pages/admin/AdminLayout.tsx` (`{ to: '/admin/knowledge', icon: BookOpen, label: 'מאגר ידע', end: true }` after סורק גגות)

- [ ] **Step 1: Manifest** (`IDX` = `https://index.bustan-energy.com`, `GH` = `https://github.com/kaniel149/bustan-index/blob/main` for raw `.md`). Schema per row: `{ "title", "url", "layer": "internal"|"team"|"client", "group", "lang": "he"|"en" }`. Content (one row each):

| layer | group | title → url |
|---|---|---|
| internal | plans | Value chain (VALUE_CHAIN.md) → `GH/VALUE_CHAIN.md` en · Scan process (SCAN_PROCESS.md) → `GH/SCAN_PROCESS.md` en · Scan report Aug-2026 → `GH/SCAN_REPORT.md` en · Drone scan plan → `GH/DRONE_SCAN_PLAN.md` en · Drone orthomosaic handoff → `GH/DRONE_ORTHOMOSAIC_HANDOFF.md` en · EV charging research → `GH/ev-charging-research.md` en · Platform plan → `GH/platform/PLATFORM_PLAN.md` en · KP Solar Pro improvement design (2026-03-29) → `GH/docs/plans/2026-03-29-kp-solar-pro-improvement-design.md` en · Data cleanup / island scan (2026-03-29) → `GH/docs/plans/2026-03-29-data-cleanup-island-scan.md` en · Solar intelligence platform design (2026-03-13) → `GH/docs/plans/2026-03-13-solar-intelligence-platform-design.md` en · Proposal v2 design + plan (2026-03-13) → two rows |
| internal | research | Thailand solar research 01–12 → `GH/research/01-market-overview.md` … `12-koh-phangan.md` (12 rows, en; titles from file names: Market overview, Regulations, On-grid, Micro-grid island, Permitting, Grid technical, Costs & pricing, BESS storage, Financial models, Case studies, Key players, Koh Phangan) · Verification 2026-03 → `GH/research/VERIFICATION_2026_03.md` |
| internal | strategy | אסטרטגיה עסקית → `IDX/strategy.html` he · תוכנית עסקית שנה 1 → `IDX/business-plan.html` he · פיננסים — תכנון מקיף → `IDX/pnl-plan.html` he · מימון → `IDX/financing.html` he · Financial dashboard → `IDX/financial-dashboard.html` en · Competitor research (internal) → `https://bustan-energy.com/bustan-competitor-research-full-internal-2026-05-31.html` en |
| internal | tools | Roof scanner (v1) → `IDX/roof-scanner.html` en · Solar atlas → `IDX/solar-atlas.html` en · Solar farm scout → `IDX/solar-farm-scout.html` en · Power grid map → `IDX/power-grid-map.html` en · Bill scanner → `IDX/bill-scanner.html` en · Planning tracker → `IDX/planning-tracker.html` he · GIS mapper → `IDX/gis-mapper/` en · Drone ops → `IDX/drone-ops.html` he · Drone mission plan → `IDX/drone-mission-plan.html` en |
| team | ops | תהליך הקמה → `IDX/installation.html` · רכש והנדסה → `IDX/procurement-engineering.html` · ניטור ותחזוקה → `IDX/monitoring-maintenance.html` · רישוי ורגולציה → `IDX/licensing.html` · מדריך סריקת גגות ברחפן → `IDX/drone-guide.html` · רשימת ציוד → `IDX/equipment-list.html` · Solar farm guide → `IDX/solar-farm-guide.html` en · Thailand solar farm masterclass → `IDX/thailand-solar-farm-masterclass.html` en (all he unless noted) |
| team | sales | שיווק ומכירות → `IDX/sales-marketing.html` · אווטרי לקוחות → `IDX/customer-avatars.html` · CRM value chain (15 slides) → `IDX/crm-value-chain.html` · CRM Step 1–10 → `IDX/crm-step1-lead-capture.html` … `crm-step10-om.html` (10 rows, titles as in `assets.html`) · Social media plan → `GH/marketing/social-media-plan.md` en · Posting guide → `GH/marketing/POSTING-GUIDE.md` en |
| team | pea | PEA application package → `IDX/pea-docs/pea-application-package.html` en · PEA summary Beamtech 32.5 kWp → `IDX/pea-docs/pea-summary-beamtech.html` en · SLD Beamtech → `IDX/pea-docs/sld-beamtech.html` en · Layout Beamtech → `IDX/pea-docs/layout-beamtech.html` en · SLD concrete factory → `IDX/pea-docs/sld-concrete-factory.html` en |
| team | academy | Academy hub → `IDX/academy/index.html` en · Syllabus → `GH/academy/SYLLABUS.md` en · Video library → `GH/academy/VIDEO_LIBRARY.md` en · Electrician training research → `GH/academy/research/electrician-training-research.md` en |
| team | brand | Brand kit → `IDX/brand-kit.html` he · Print templates → `IDX/brand-kit/print-templates.html` he · Ads pro (8 HTML ads) → `IDX/ads-pro/index.html` en |
| client | presentations | Company presentation 2026 → `IDX/presentations/bustan-energy-company-2026.html` en · EV charging Koh Phangan (EN) → `IDX/presentations/ev-charging-koh-phangan.html` en · EV charging (HE) → `IDX/presentations/ev-charging-koh-phangan-he.html` he · Community solar research → `IDX/presentations/community-solar-research.html` he · Financing deck → `https://bustan-energy.com/bustan-financing-deck.html` he |
| client | legal | EPC contract → `IDX/epc-contract.html` he · PPA contract → `IDX/ppa-contract.html` he · משפטי, חוזים והסכמים → `IDX/legal-contracts.html` he · NDA template → `IDX/legal/nda-bustan-energy-template.html` en |
| client | public | Landing page → `IDX/index.html` en · Proposal builder (legacy) → `IDX/proposal.html` en · Marketing site → `https://bustan-energy.com` en · Client proposal portal example → `https://bustan-energy.com/p/` en |

~85 rows total. Keep the JSON sorted by layer → group → title.

- [ ] **Step 2: Test + pure helpers**

```ts
// E/src/lib/knowledge.test.ts
import { describe, it, expect } from 'vitest'
import manifest from '../data/knowledge-manifest.json'
import { filterKnowledge, groupByLayer, LAYERS } from './knowledge'
describe('knowledge manifest', () => {
  it('every row is complete and unique', () => {
    const urls = new Set<string>()
    for (const r of manifest) {
      expect(r.title.length).toBeGreaterThan(2); expect(r.url).toMatch(/^https:\/\//)
      expect(LAYERS).toContain(r.layer); expect(['he', 'en']).toContain(r.lang); expect(r.group.length).toBeGreaterThan(1)
      expect(urls.has(r.url)).toBe(false); urls.add(r.url)
    }
    expect(manifest.length).toBeGreaterThan(60)
  })
  it('filters by text (title/group) and by layer, case-insensitive', () => {
    expect(filterKnowledge(manifest, 'pea', 'all').every((r) => /pea/i.test(r.title + r.group))).toBe(true)
    expect(filterKnowledge(manifest, '', 'client').every((r) => r.layer === 'client')).toBe(true)
    const g = groupByLayer(filterKnowledge(manifest, '', 'all'))
    expect(Object.keys(g)).toEqual(['internal', 'team', 'client'])
  })
})
```

```ts
// E/src/lib/knowledge.ts
export const LAYERS = ['internal', 'team', 'client'] as const
export type Layer = (typeof LAYERS)[number]
export interface KnowledgeRow { title: string; url: string; layer: Layer | string; group: string; lang: 'he' | 'en' | string }
export const LAYER_LABELS: Record<Layer, string> = { internal: 'פנימי — קניאל/ארז', team: 'צוות — SOPs והדרכה', client: 'לקוח — מצגות וחוזים' }
export function filterKnowledge(rows: KnowledgeRow[], q: string, layer: Layer | 'all'): KnowledgeRow[] {
  const s = q.trim().toLowerCase()
  return rows.filter((r) => (layer === 'all' || r.layer === layer) && (!s || `${r.title} ${r.group} ${r.url}`.toLowerCase().includes(s)))
}
export function groupByLayer(rows: KnowledgeRow[]): Record<Layer, Record<string, KnowledgeRow[]>> {
  const out = { internal: {}, team: {}, client: {} } as Record<Layer, Record<string, KnowledgeRow[]>>
  for (const r of rows) { const l = (LAYERS.includes(r.layer as Layer) ? r.layer : 'internal') as Layer; (out[l][r.group] ??= []).push(r) }
  return out
}
```

- [ ] **Step 3: `KnowledgePage.tsx`** — search input (autofocus), layer tabs (all/internal/team/client with counts), then for each layer a section header (`LAYER_LABELS`) and per group a card grid: title, `lang` chip, group chip, external-link icon; `<a target="_blank" rel="noopener">`. Empty state "אין תוצאות". Routes + nav item per Files.
- [ ] **Step 4: `npm run typecheck && npm run lint && npm test` → clean.** Commit — `feat(admin): /admin/knowledge — searchable index of bustan-index docs by layer (manifest-driven)`

---

### Task 7: Alerts — migration 017, message builder, cron

**Files:**
- Create: `E/supabase/bustan-migrations/017_alert_state.sql`
- Create: `E/api/_lib/alerts-core.ts`, `E/api/_lib/alerts-core.test.ts`, `E/api/_lib/resend.ts`
- Create: `E/api/cron-alerts.ts`; Modify: `E/vercel.json` (`crons` += `{ "path": "/api/cron-alerts", "schedule": "*/30 * * * *" }`)

- [ ] **Step 1: Migration**

```sql
-- 017_alert_state.sql — schema bustan on ygoiaabzkuvdsyyduvhv
-- Watermark for api/cron-alerts (service-role only; no client policies on purpose).
create table if not exists bustan.alert_state (
  key         text primary key,
  last_run_at timestamptz not null default now(),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table bustan.alert_state enable row level security;
```
Balanced-`$$` check is trivial here; `grep -c "create table" supabase/bustan-migrations/017_alert_state.sql` → 1.

- [ ] **Step 2: Failing tests**

```ts
// E/api/_lib/alerts-core.test.ts
import { describe, it, expect } from 'vitest'
import { buildAlertText, pickChannel, isFirstRun } from './alerts-core.js'
const since = '2026-09-03T09:00:00Z'
describe('buildAlertText', () => {
  it('returns null when nothing happened', () => {
    expect(buildAlertText({ since, approved: [], newA: [], newACount: 0, firstViews: [], signatures: [] })).toBeNull()
  })
  it('lists approvals, top new A-grade with count, first views and signatures', () => {
    const t = buildAlertText({ since,
      approved: [{ id: 'p1', name: 'Resort A', created_at: since }],
      newA: [{ id: 'c1', name: 'Treechart Hostel', estimated_kwp: 126.56, lat: 9.7086, lon: 99.991 }], newACount: 14,
      firstViews: [{ ref_number: 'BE-2026-0007', client_name: 'Koh Ma Resort', first_viewed_at: since }],
      signatures: [{ proposal_ref: 'BE-2026-0003', signer_name: 'Somchai', signed_at: since }] })!
    expect(t).toContain('Bustan alerts')
    expect(t).toContain('✅ Approved to CRM (1): Resort A')
    expect(t).toContain('⭐ New A-grade candidates: 14 (top: Treechart Hostel 127 kWp)')
    expect(t).toContain('👀 First view: BE-2026-0007 — Koh Ma Resort')
    expect(t).toContain('✍️ Signed: BE-2026-0003 — Somchai')
    expect(t).toContain('https://bustan-energy.com/admin/scan?focus=c1')
    expect(t.length).toBeLessThan(1500)
  })
})
describe('pickChannel / isFirstRun', () => {
  it('prefers WhatsApp when GreenAPI is configured, else email', () => {
    expect(pickChannel({ GREENAPI_INSTANCE_ID: '7107', GREENAPI_TOKEN: 't' })).toBe('whatsapp')
    expect(pickChannel({ RESEND_API_KEY: 'r' })).toBe('email')
    expect(pickChannel({})).toBe('none')
  })
  it('first run (no watermark) only sets the watermark', () => { expect(isFirstRun(null)).toBe(true); expect(isFirstRun({ last_run_at: since })).toBe(false) })
})
```

- [ ] **Step 3: Implement**

```ts
// E/api/_lib/alerts-core.ts — pure: what to say, where to send
export interface AlertInput { since: string
  approved: { id: string; name: string | null; created_at: string | null }[]
  newA: { id: string; name: string | null; estimated_kwp: number | null; lat: number; lon: number }[]; newACount: number
  firstViews: { ref_number: string; client_name: string | null; first_viewed_at: string | null }[]
  signatures: { proposal_ref: string; signer_name: string | null; signed_at: string | null }[] }
export const ALERT_WHATSAPP = '972502213948'
export const ALERT_EMAIL = 'k@kanielt.com'
export function pickChannel(env: Record<string, string | undefined> = process.env): 'whatsapp' | 'email' | 'none' {
  if (env.GREENAPI_INSTANCE_ID && env.GREENAPI_TOKEN) return 'whatsapp'
  return env.RESEND_API_KEY ? 'email' : 'none'
}
export function isFirstRun(state: { last_run_at: string } | null): boolean { return !state }
export function buildAlertText(i: AlertInput): string | null {
  const lines: string[] = []
  if (i.approved.length) lines.push(`✅ Approved to CRM (${i.approved.length}): ${i.approved.slice(0, 5).map((p) => p.name || p.id.slice(0, 8)).join(', ')}`)
  if (i.newACount) { const top = i.newA[0]; lines.push(`⭐ New A-grade candidates: ${i.newACount}${top ? ` (top: ${top.name || top.id.slice(0, 8)} ${Math.round(Number(top.estimated_kwp ?? 0))} kWp)` : ''}`)
    if (top) lines.push(`https://bustan-energy.com/admin/scan?focus=${top.id}`) }
  for (const v of i.firstViews) lines.push(`👀 First view: ${v.ref_number} — ${v.client_name ?? '—'}`)
  for (const s of i.signatures) lines.push(`✍️ Signed: ${s.proposal_ref} — ${s.signer_name ?? '—'}`)
  if (!lines.length) return null
  return [`Bustan alerts (since ${i.since.slice(0, 16).replace('T', ' ')} UTC)`, ...lines, 'https://bustan-energy.com/admin'].join('\n')
}
```

```ts
// E/api/_lib/resend.ts — minimal Resend sender (mirror of proposal-view.ts sendEmail; never throws)
export async function sendResendEmail(to: string[], subject: string, html: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY; if (!key) return { ok: false, error: 'not_configured' }
  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM || 'Bustan Energy <contracts@bustan-energy.com>', to, subject, html }) })
    const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string }
    return r.ok ? { ok: true, id: j.id } : { ok: false, error: j.message || `resend_${r.status}` }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) } }
}
```

```ts
// E/api/cron-alerts.ts — every 30 min. Auth: Bearer CRON_SECRET (same as cron-monitoring-check.ts). Edge.
export const config = { runtime: 'edge' }
import { bGet, bPost, bPatch } from './_lib/bustan-db.js'
import { supaGetAll } from './_lib/supa.js'
import { sendWhatsApp } from './_lib/whatsapp.js'
import { sendResendEmail } from './_lib/resend.js'
import { buildAlertText, pickChannel, isFirstRun, ALERT_WHATSAPP, ALERT_EMAIL } from './_lib/alerts-core.js'
import { escapeHtml } from './_lib/html.js'
const CRON_SECRET = process.env.CRON_SECRET
const KEY = 'cron-alerts'

export default async function handler(req: Request): Promise<Response> {
  if (!CRON_SECRET) return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  if (req.headers.get('authorization')?.replace('Bearer ', '') !== CRON_SECRET) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const now = new Date().toISOString()
  const [state] = await bGet<{ key: string; last_run_at: string }>(`alert_state?key=eq.${KEY}&select=key,last_run_at`)
  if (isFirstRun(state ?? null)) {
    await bPost('alert_state', { key: KEY, last_run_at: now })
    return Response.json({ ok: true, first_run: true, sent: false })
  }
  const since = state.last_run_at
  const [approved, newA, firstViews, signatures] = await Promise.all([
    bGet<{ id: string; name: string | null; created_at: string | null }>(`properties?select=id,name,created_at&created_at=gt.${since}&order=created_at.desc&limit=20`),
    bGet<{ id: string; name: string | null; estimated_kwp: number | null; lat: number; lon: number }>(`scan_candidates?select=id,name,estimated_kwp,lat,lon&status=eq.pending&priority=eq.A&existing_solar=not.is.true&created_at=gt.${since}&order=estimated_kwp.desc.nullslast&limit=200`),
    supaGetAll<{ ref_number: string; client_name: string | null; first_viewed_at: string | null }>(`proposals?select=ref_number,client_name,first_viewed_at&first_viewed_at=gt.${since}&order=first_viewed_at.desc&limit=20`),
    supaGetAll<{ proposal_ref: string; signer_name: string | null; signed_at: string | null }>(`proposal_signatures?select=proposal_ref,signer_name,signed_at&signed_at=gt.${since}&order=signed_at.desc&limit=20`),
  ])
  const text = buildAlertText({ since, approved, newA: newA.slice(0, 3), newACount: newA.length, firstViews, signatures })
  let sent: { channel: string; ok: boolean; error?: string } = { channel: 'none', ok: false }
  if (text) {
    const ch = pickChannel()
    if (ch === 'whatsapp') { const r = await sendWhatsApp(ALERT_WHATSAPP, text); sent = { channel: 'whatsapp', ok: r.ok, error: r.error }
      if (!r.ok) { const e = await sendResendEmail([ALERT_EMAIL], 'Bustan alerts', `<pre>${escapeHtml(text)}</pre>`); sent = { channel: 'email(fallback)', ok: e.ok, error: e.error } } }
    else if (ch === 'email') { const e = await sendResendEmail([ALERT_EMAIL], 'Bustan alerts', `<pre>${escapeHtml(text)}</pre>`); sent = { channel: 'email', ok: e.ok, error: e.error } }
  }
  // Advance the watermark only when there was nothing to say or the send succeeded — a failed send retries next tick.
  if (!text || sent.ok) await bPatch(`alert_state?key=eq.${KEY}`, { last_run_at: now, updated_at: now, data: { last_text: text, last_sent: sent } })
  return Response.json({ ok: true, since, counts: { approved: approved.length, newA: newA.length, firstViews: firstViews.length, signatures: signatures.length }, sent, text })
}
```
Check `escapeHtml` exists in `api/_lib/html.ts` (it is imported by `proposal-view.ts:11`).

- [ ] **Step 4: Run → passes** (`npx vitest run api/_lib/alerts-core.test.ts` → 4 passed). `npm run typecheck` clean. Add the cron entry to `vercel.json`.
- [ ] **Step 5: Commit** — `git add supabase/bustan-migrations/017_alert_state.sql api/_lib/alerts-core.ts api/_lib/alerts-core.test.ts api/_lib/resend.ts api/cron-alerts.ts vercel.json && git commit -m "feat(alerts): 30-min cron — approvals, new A-grade, first views, signatures → WhatsApp else email; watermark in bustan.alert_state (017)"`

---

### Task 8: Smoke tests, verification, push

**Files:**
- Modify: `E/tests/e2e/smoke.spec.ts` (append)

- [ ] **Step 1: Playwright smoke (unauthenticated routes only — the approve flow needs a magic-link login and is verified by hand in Step 3)**

```ts
test('new admin routes exist and are auth-gated', async ({ page }) => {
  for (const path of ['/admin', '/admin/scan', '/admin/knowledge']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/admin\/login$/)
  }
})
test('admin-funnel rejects anonymous calls', async ({ request }) => {
  const r = await request.get('/api/admin-funnel')
  expect([401, 404]).toContain(r.status())   // 404 under plain `vite` dev (no api/ runtime); 401 on Vercel preview
})
```

- [ ] **Step 2: Full gate** — `npm run typecheck && npm run lint && npm test && npm run build` → all green; `npx playwright test` → green. Record test count vs Task 0.
- [ ] **Step 3: Push + preview** — `git push -u origin sp3/command-center`; open PR to `main` (merge is the lead's). On the Vercel preview, logged in as `k@kanielt.com`:
  1. `/admin` → funnel cards show `scans 354`, `candidates ≈43.3k (KP 3.9k)`, `promoted 533`, `with_contact 271`, `outreach 1`; attention lists populated; Network: `admin-funnel` 200 < 3 s.
  2. `/admin/scan` → bustan sign-in prompt (if needed) → KP loads; grade pills, search "Treechart" + Enter flies to the hostel; footprint badge shows on an adjudicated parcel; approve one D-grade test candidate → toast + "In CRM"; reject one with `not_a_roof` → disappears; "Create proposal" opens `/admin/proposals/new?candidate_id=…` prefilled (SP2 path).
  3. `/admin/knowledge` → search "PEA" → 5 rows; every link opens (spot-check 5 across layers).
- [ ] **Step 4 (lead):** apply `017_alert_state.sql` on `ygoiaabz` via Supabase MCP `apply_migration`; add `/api/cron-alerts` schedule (already in `vercel.json`); trigger twice on the preview: `curl -H "Authorization: Bearer $CRON_SECRET" https://<preview>/api/cron-alerts` → 1st `{first_run:true}`, 2nd `{sent:{channel:'email',ok:true}}` or `text:null` — and an email lands at `k@kanielt.com` (prod has no GREENAPI env, so email is the expected channel).
- [ ] **Step 5: Report (≤25 lines):** commits, test counts before/after, funnel numbers seen, verification results, anything pending.

---

### Task 9 (last, after prod verification): retire the static KP Solar Pro

**Files (repo `I`):**
- Move: `I/kp-solar-pro.html` → `I/_retired/kp-solar-pro-v2-2026-09.html` (`git mv`; append a line to the SP1 retire log if one exists under `I/_retired/`)
- Create: `I/kp-solar-pro.html` (redirect stub)
- Modify: `I/assets.html` — the "KP Solar Pro v2 — Unified ⭐" card's href → `https://bustan-energy.com/admin/scan`, title suffix "(עבר ל-Admin)"

- [ ] **Step 1: Only after Task 8 Step 3 passed on production** (`https://bustan-energy.com/admin/scan` approve flow works).
- [ ] **Step 2: Stub**

```html
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>KP Solar Pro → Bustan Admin</title>
<meta http-equiv="refresh" content="0; url=https://bustan-energy.com/admin/scan">
<link rel="canonical" href="https://bustan-energy.com/admin/scan">
<script>location.replace('https://bustan-energy.com/admin/scan' + location.search)</script>
</head><body style="font-family:system-ui;padding:2rem">KP Solar Pro moved to <a href="https://bustan-energy.com/admin/scan">bustan-energy.com/admin/scan</a>.</body></html>
```

- [ ] **Step 3:** `cd $I && git add -A && git commit -m "chore(kp-solar-pro): redirect to bustan-energy.com/admin/scan; original retired to _retired/" && git push origin main` → GitHub Pages redeploys; `curl -sI https://index.bustan-energy.com/kp-solar-pro.html | head -1` → 200 and the body contains the refresh meta.
- [ ] **Step 4:** WhatsApp summary to 972502213948 (lead).
