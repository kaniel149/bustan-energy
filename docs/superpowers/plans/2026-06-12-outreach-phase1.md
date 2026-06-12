# Outreach Layer Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn scanned roof candidates (`bustan.properties`) into personalized outreach emails (Thai/English) with a human approval queue in the admin dashboard.

**Architecture:** New `bustan`-schema tables (migration `bustan-migrations/012`), a Gemini-powered draft generator cron (numbers computed deterministically in code), an admin approval API + "Outreach" screen, and a daily send cron going directly through Resend (NOT via `email_queue` — that pipeline is template-key based and dedupes on `(recipient, step_id)`, which doesn't fit unique per-property bodies).

**Tech Stack:** Vercel Edge functions (`export const config = { runtime: 'edge' }`), Supabase REST via `api/_lib/supa.ts` helpers, Gemini 2.0 Flash (text), Resend, React + react-router admin (`src/pages/admin/`), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-12-marketing-outreach-layer-design.md`
**Spec amendments discovered during planning:**
- `outreach_messages` gains a `recipient` column (email/phone snapshot at generation time).
- Email sends directly via Resend from `cron-send-outreach.ts` instead of inserting into `email_queue` (reason above).
- Migration lives at `supabase/bustan-migrations/012_outreach.sql` (bustan-schema tables live there, not in `supabase/migrations/`).

**Conventions (follow these everywhere):**
- Cron auth: `Bearer CRON_SECRET` header, exactly like `api/cron-enrich-contacts.ts`.
- Admin auth: `verifyAdmin()` pattern copied from `api/admin-stats.ts` (Supabase `/auth/v1/user` + `isAllowedAdmin` from `api/_lib/admin-access.js`).
- DB access from api: `supaGet/supaGetAll/supaPost/supaPatch` from `api/_lib/supa.js` (paths are unprefixed — PostgREST resolves `properties`, `owner_decision` in the bustan schema).
- Imports inside `api/` use `.js` extensions (ESM edge runtime).
- Ignore any file with ` 2` in its name (duplicates, do not edit).

---

### Task 1: Migration — `supabase/bustan-migrations/012_outreach.sql`

**Files:**
- Create: `supabase/bustan-migrations/012_outreach.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- 012_outreach.sql — outreach & content tables (marketing layer Phase 1)
-- Run AFTER 011_existing_solar_check.sql.
-- Spec: docs/superpowers/specs/2026-06-12-marketing-outreach-layer-design.md
-- ============================================================

create table if not exists bustan.outreach_templates (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  segment     jsonb not null default '{}'::jsonb,
  channel     text not null check (channel in ('line','whatsapp','email')),
  language    text not null check (language in ('th','en')),
  prompt      text not null,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

create table if not exists bustan.outreach_messages (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references bustan.properties(id) on delete cascade,
  template_id  uuid references bustan.outreach_templates(id),
  channel      text not null check (channel in ('line','whatsapp','email')),
  language     text not null check (language in ('th','en')),
  recipient    text,            -- email address or phone, snapshotted at generation
  subject      text,            -- email only
  body         text not null,
  facts        jsonb not null default '{}'::jsonb,  -- computed numbers (audit trail)
  status       text not null default 'draft'
               check (status in ('draft','approved','sent','delivered','replied','bounced','skipped')),
  approved_by  text,
  approved_at  timestamptz,
  sent_at      timestamptz,
  replied_at   timestamptz,
  thread_ref   text,            -- Resend id / LINE userId / WhatsApp chat id
  error        text,
  created_at   timestamptz default now()
);

create index if not exists idx_outreach_messages_status
  on bustan.outreach_messages(status);
create index if not exists idx_outreach_messages_property
  on bustan.outreach_messages(property_id);
-- one live conversation per property+channel (skipped/bounced may be retried)
create unique index if not exists idx_outreach_one_per_property_channel
  on bustan.outreach_messages(property_id, channel)
  where status not in ('skipped','bounced');

create table if not exists bustan.content_posts (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null check (platform in ('fb','ig','line_broadcast')),
  language      text not null default 'th',
  format        text not null check (format in ('roof_of_week','area_stats','field_photo','pea_education')),
  body          text not null,
  media_url     text,
  source_facts  jsonb default '{}'::jsonb,
  status        text not null default 'draft'
                check (status in ('draft','approved','published','failed')),
  scheduled_at  timestamptz,
  published_at  timestamptz,
  published_ref text,
  approved_by   text,
  created_at    timestamptz default now()
);

-- ── RLS (pattern from migrations/018: service role all, authenticated read) ──
alter table bustan.outreach_templates enable row level security;
alter table bustan.outreach_messages  enable row level security;
alter table bustan.content_posts      enable row level security;

drop policy if exists "service_role_all_outreach_templates" on bustan.outreach_templates;
create policy "service_role_all_outreach_templates" on bustan.outreach_templates
  for all using (auth.role() = 'service_role');
drop policy if exists "admin_read_outreach_templates" on bustan.outreach_templates;
create policy "admin_read_outreach_templates" on bustan.outreach_templates
  for select using (auth.role() = 'authenticated');

drop policy if exists "service_role_all_outreach_messages" on bustan.outreach_messages;
create policy "service_role_all_outreach_messages" on bustan.outreach_messages
  for all using (auth.role() = 'service_role');
drop policy if exists "admin_read_outreach_messages" on bustan.outreach_messages;
create policy "admin_read_outreach_messages" on bustan.outreach_messages
  for select using (auth.role() = 'authenticated');

drop policy if exists "service_role_all_content_posts" on bustan.content_posts;
create policy "service_role_all_content_posts" on bustan.content_posts
  for all using (auth.role() = 'service_role');
drop policy if exists "admin_read_content_posts" on bustan.content_posts;
create policy "admin_read_content_posts" on bustan.content_posts
  for select using (auth.role() = 'authenticated');

-- ── Seed templates ──
insert into bustan.outreach_templates (key, channel, language, prompt) values
(
  'b2b_email_th', 'email', 'th',
  'You are a polite Thai B2B copywriter for Bustan Energy, a solar EPC company in Thailand.
Write a short first-contact email in THAI to {contact_name} at {company_name} in {district}.
Facts you MUST use verbatim (do not change any number):
- Our satellite scan found their roof has about {roof_sqm} sqm of usable space.
- That fits a ~{kwp} kWp solar system.
- Estimated saving: ฿{monthly_saving_thb} per month on PEA electricity costs.
Structure: greeting with wai (สวัสดีครับ), 2 short paragraphs, one clear CTA offering a free
detailed assessment, sign off as "ทีม Bustan Energy". Max 120 words of Thai.
Include this exact opt-out line at the end: "หากไม่สนใจ ขออภัยในความไม่สะดวก แจ้งเราได้เลยครับ"
Output format EXACTLY:
SUBJECT: <thai subject line, max 8 words>

<email body, plain text>'
),
(
  'b2b_email_en', 'email', 'en',
  'You are a B2B copywriter for Bustan Energy, a solar EPC company in Thailand.
Write a short first-contact email in ENGLISH to {contact_name} at {company_name} in {district}.
Facts you MUST use verbatim (do not change any number):
- Our satellite scan found their roof has about {roof_sqm} sqm of usable space.
- That fits a ~{kwp} kWp solar system.
- Estimated saving: ฿{monthly_saving_thb} per month on PEA electricity costs.
Structure: professional greeting, 2 short paragraphs, one clear CTA offering a free
detailed assessment, sign off as "The Bustan Energy Team". Max 120 words.
Include a final opt-out sentence: "If this isn''t relevant, just reply and we won''t contact you again."
Output format EXACTLY:
SUBJECT: <subject line, max 8 words>

<email body, plain text>'
)
on conflict (key) do nothing;
```

- [ ] **Step 2: Apply to Supabase** — run the file contents in the Supabase SQL editor for project `trvgpgpsqvvdsudpgwpm` (or via Supabase MCP `apply_migration`). Expected: success, no errors.

- [ ] **Step 3: Verify** — run in SQL editor: `select key, channel, language from bustan.outreach_templates;`
Expected: 2 rows (`b2b_email_th`, `b2b_email_en`).

- [ ] **Step 4: Commit**

```bash
git add supabase/bustan-migrations/012_outreach.sql
git commit -m "feat(outreach): migration 012 — outreach_messages, outreach_templates, content_posts"
```

---

### Task 2: Savings calculator — `api/_lib/outreach/assumptions.ts`

**Files:**
- Create: `api/_lib/outreach/assumptions.ts`
- Test: `tests/outreach/assumptions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { calcSolar, formatThb } from '../../api/_lib/outreach/assumptions'

describe('calcSolar', () => {
  it('computes kwp and savings for a 2400 sqm roof', () => {
    // 2400 * 0.85 / 6 = 340 kWp; 340 * 4.2 * 30 * 4.5 = 192,780 → rounds to 193,000
    const f = calcSolar(2400)
    expect(f).not.toBeNull()
    expect(f!.kwp).toBe(340)
    expect(f!.monthlySavingThb).toBe(193000)
    expect(f!.annualSavingThb).toBe(193000 * 12)
  })

  it('returns null for tiny, zero, or missing roofs', () => {
    expect(calcSolar(0)).toBeNull()
    expect(calcSolar(50)).toBeNull() // ~7 kWp < 10 kWp B2B floor
    expect(calcSolar(NaN)).toBeNull()
  })
})

describe('formatThb', () => {
  it('formats with thousands separators and ฿', () => {
    expect(formatThb(193000)).toBe('฿193,000')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/outreach/assumptions.test.ts`
Expected: FAIL — cannot resolve `api/_lib/outreach/assumptions`.

- [ ] **Step 3: Write the implementation**

```ts
// ============================================================
// api/_lib/outreach/assumptions.ts
// Single source of truth for outreach savings math.
// The LLM NEVER computes numbers — these do.
// ============================================================

export const USABLE_ROOF_FACTOR = 0.85   // share of roof usable for panels
export const SQM_PER_KWP = 6             // m² of roof per kWp installed
export const KWH_PER_KWP_PER_DAY = 4.2   // Thailand average yield
export const DAYS_PER_MONTH = 30
export const THB_PER_KWH = 4.5           // PEA business tariff approx
export const MIN_KWP_FOR_OUTREACH = 10   // below this, not worth a B2B email

export interface SolarFacts {
  kwp: number
  monthlySavingThb: number
  annualSavingThb: number
}

export function calcSolar(roofAreaSqm: number): SolarFacts | null {
  if (!roofAreaSqm || !Number.isFinite(roofAreaSqm) || roofAreaSqm <= 0) return null
  const kwp = Math.round((roofAreaSqm * USABLE_ROOF_FACTOR) / SQM_PER_KWP)
  if (kwp < MIN_KWP_FOR_OUTREACH) return null
  const monthlySavingThb =
    Math.round((kwp * KWH_PER_KWP_PER_DAY * DAYS_PER_MONTH * THB_PER_KWH) / 1000) * 1000
  return { kwp, monthlySavingThb, annualSavingThb: monthlySavingThb * 12 }
}

export function formatThb(n: number): string {
  return '฿' + n.toLocaleString('en-US')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/outreach/assumptions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/outreach/assumptions.ts tests/outreach/assumptions.test.ts
git commit -m "feat(outreach): deterministic solar savings calculator"
```

---

### Task 3: Draft validator + prompt builder — `api/_lib/outreach/generate-core.ts`

**Files:**
- Create: `api/_lib/outreach/generate-core.ts`
- Test: `tests/outreach/generate-core.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import {
  pickLanguage, buildPrompt, validateDraft, type OutreachFacts,
} from '../../api/_lib/outreach/generate-core'

const facts: OutreachFacts = {
  kwp: 340, monthlySavingThb: 193000, annualSavingThb: 2316000,
  roofSqm: 2400, district: 'Rayong', companyName: 'สยามพลาสติก จำกัด', contactName: 'คุณสมชาย',
}

describe('pickLanguage', () => {
  it('Thai company name → th', () => expect(pickLanguage('สยามพลาสติก จำกัด')).toBe('th'))
  it('Latin-only company name → en', () => expect(pickLanguage('Mitsui Chemicals (Thailand)')).toBe('en'))
  it('missing name → th', () => expect(pickLanguage(null)).toBe('th'))
})

describe('buildPrompt', () => {
  it('substitutes all placeholders', () => {
    const p = buildPrompt('{company_name}|{contact_name}|{district}|{roof_sqm}|{kwp}|{monthly_saving_thb}', facts)
    expect(p).toBe('สยามพลาสติก จำกัด|คุณสมชาย|Rayong|2400|340|193,000')
  })
})

describe('validateDraft', () => {
  const goodBody = 'สวัสดีครับ ระบบ 340 kWp ประหยัด ฿193,000 ต่อเดือน'
  it('accepts a body containing the exact numbers', () => {
    expect(validateDraft(goodBody, facts, 'email').ok).toBe(true)
  })
  it('rejects when the saving figure is missing or wrong', () => {
    expect(validateDraft('ประหยัด ฿250,000 ต่อเดือน ระบบ 340 kWp', facts, 'email').ok).toBe(false)
  })
  it('rejects when kwp is missing', () => {
    expect(validateDraft('ประหยัด ฿193,000 ต่อเดือน', facts, 'email').ok).toBe(false)
  })
  it('rejects over-length bodies per channel', () => {
    expect(validateDraft(goodBody + 'x'.repeat(300), facts, 'line').ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/outreach/generate-core.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// ============================================================
// api/_lib/outreach/generate-core.ts
// Pure helpers for outreach draft generation: language pick,
// prompt building, and post-generation validation.
// ============================================================
import type { SolarFacts } from './assumptions.js'

export interface OutreachFacts extends SolarFacts {
  roofSqm: number
  district: string | null
  companyName: string | null
  contactName: string | null
}

export const MAX_LEN: Record<'line' | 'whatsapp' | 'email', number> = {
  line: 300,
  whatsapp: 600,
  email: 5000,
}

export function pickLanguage(companyName: string | null | undefined): 'th' | 'en' {
  if (!companyName) return 'th'
  return /[฀-๿]/.test(companyName) ? 'th' : 'en'
}

export function buildPrompt(template: string, facts: OutreachFacts): string {
  return template
    .replaceAll('{company_name}', facts.companyName ?? 'your company')
    .replaceAll('{contact_name}', facts.contactName ?? '')
    .replaceAll('{district}', facts.district ?? 'your area')
    .replaceAll('{roof_sqm}', String(Math.round(facts.roofSqm)))
    .replaceAll('{kwp}', String(facts.kwp))
    .replaceAll('{monthly_saving_thb}', facts.monthlySavingThb.toLocaleString('en-US'))
}

export interface DraftCheck { ok: boolean; reason?: string }

export function validateDraft(
  body: string,
  facts: OutreachFacts,
  channel: 'line' | 'whatsapp' | 'email',
): DraftCheck {
  if (!body.trim()) return { ok: false, reason: 'empty' }
  if (body.length > MAX_LEN[channel]) return { ok: false, reason: `too_long:${body.length}` }
  const thb = facts.monthlySavingThb.toLocaleString('en-US')
  if (!body.includes(thb)) return { ok: false, reason: 'missing_or_wrong_saving_figure' }
  if (!body.includes(String(facts.kwp))) return { ok: false, reason: 'missing_kwp' }
  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/outreach/generate-core.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/outreach/generate-core.ts tests/outreach/generate-core.test.ts
git commit -m "feat(outreach): prompt builder + number-guard validator"
```

---

### Task 4: Gemini text helper — `api/_lib/outreach/gemini-text.ts`

**Files:**
- Create: `api/_lib/outreach/gemini-text.ts`
- Test: `tests/outreach/gemini-text.test.ts`

- [ ] **Step 1: Write the failing test** (parse + subject split are pure; fetch wrapper is not unit-tested)

```ts
import { describe, it, expect } from 'vitest'
import { parseGeminiResponse, splitSubject } from '../../api/_lib/outreach/gemini-text'

describe('parseGeminiResponse', () => {
  it('extracts joined text from candidates', () => {
    const j = { candidates: [{ content: { parts: [{ text: 'Hello ' }, { text: 'world' }] } }] }
    expect(parseGeminiResponse(j)).toBe('Hello world')
  })
  it('returns null on empty/malformed payloads', () => {
    expect(parseGeminiResponse({})).toBeNull()
    expect(parseGeminiResponse({ candidates: [] })).toBeNull()
  })
})

describe('splitSubject', () => {
  it('splits SUBJECT: line from body', () => {
    const r = splitSubject('SUBJECT: ประหยัดค่าไฟ\n\nสวัสดีครับ...')
    expect(r.subject).toBe('ประหยัดค่าไฟ')
    expect(r.body).toBe('สวัสดีครับ...')
  })
  it('falls back to default subject when format missing', () => {
    const r = splitSubject('just a body')
    expect(r.subject).toBe('Solar savings for your roof')
    expect(r.body).toBe('just a body')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/outreach/gemini-text.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 3: Write the implementation**

```ts
// ============================================================
// api/_lib/outreach/gemini-text.ts
// Thin Gemini 2.0 Flash text wrapper with 429 quota signaling
// (mirrors the deferral pattern in find-contact-core.ts).
// ============================================================

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface GeminiTextResult {
  ok: boolean
  text?: string
  quotaExhausted?: boolean
  error?: string
}

export function parseGeminiResponse(json: unknown): string | null {
  const j = json as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim()
  return text || null
}

export interface SubjectBody { subject: string; body: string }

export function splitSubject(text: string): SubjectBody {
  const m = text.match(/^SUBJECT:\s*(.+)\n+([\s\S]+)$/)
  return m
    ? { subject: m[1].trim(), body: m[2].trim() }
    : { subject: 'Solar savings for your roof', body: text.trim() }
}

export async function geminiText(prompt: string): Promise<GeminiTextResult> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { ok: false, error: 'gemini_not_configured' }
  const r = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })
  if (r.status === 429) return { ok: false, quotaExhausted: true }
  if (!r.ok) return { ok: false, error: `gemini_${r.status}` }
  const text = parseGeminiResponse(await r.json())
  return text ? { ok: true, text } : { ok: false, error: 'empty_response' }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/outreach/gemini-text.test.ts` — Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/outreach/gemini-text.ts tests/outreach/gemini-text.test.ts
git commit -m "feat(outreach): gemini text helper with quota deferral"
```

---

### Task 5: Email channel adapter — `api/_lib/channels/email.ts`

**Files:**
- Create: `api/_lib/channels/email.ts`

- [ ] **Step 1: Write the adapter** (same Resend call shape as `api/cron-email-queue.ts:39-50`)

```ts
// ============================================================
// api/_lib/channels/email.ts
// Outreach email sender (direct Resend). Kept separate from the
// drip pipeline (email_queue) which is template-key based.
// ============================================================

export interface SendResult { id?: string; error?: string }

const FROM = process.env.OUTREACH_FROM_EMAIL || 'Bustan Energy <hello@bustan-energy.com>'

export async function sendOutreachEmail(
  to: string,
  subject: string,
  html: string,
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { error: 'resend_not_configured' }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string }
  if (!r.ok) return { error: j?.message || `resend_${r.status}` }
  return { id: j.id }
}

/** Plain text → minimal HTML (preserve line breaks). */
export function textToHtml(text: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<div style="font-family:sans-serif;font-size:15px;line-height:1.7;white-space:pre-wrap">${esc}</div>`
}
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc -p tsconfig.api.json --noEmit` (or the repo's API typecheck script if one exists in package.json). Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add api/_lib/channels/email.ts
git commit -m "feat(outreach): resend email channel adapter"
```

---

### Task 6: Generator cron — `api/cron-generate-outreach.ts`

**Files:**
- Create: `api/cron-generate-outreach.ts`

- [ ] **Step 1: Verify available property columns** (one-time, against prod REST):

```bash
source ~/.zshrc && curl -s "$BUSTAN_DB_URL/rest/v1/properties?select=id,title,roof_area_sqm,area_name&limit=1" \
  -H "apikey: $BUSTAN_DB_SERVICE_ROLE_KEY" -H "Authorization: Bearer $BUSTAN_DB_SERVICE_ROLE_KEY"
```

(If `BUSTAN_DB_URL` is not in zshrc, use the `SUPABASE_URL` value from Vercel envs for project bustan-energy.)
Expected: one JSON row. **If `area_name` errors as unknown column**, drop it from the select in Step 2 and pass `district: null`.

- [ ] **Step 2: Write the cron**

```ts
// ============================================================
// /api/cron-generate-outreach — fills the outreach draft queue.
//
// Daily (0 2 * * *). Selects the biggest-roof properties that
// (a) have a researched contact with an email in owner_decision,
// (b) have no live outreach_messages row for channel=email,
// computes savings deterministically, asks Gemini to phrase,
// validates numbers, inserts status='draft'.
//
// Caps: stops when pending drafts >= DRAFT_CAP or after
// MAX_PER_TICK Gemini calls. Defers on Gemini 429 (no insert).
// Auth: Bearer CRON_SECRET. POST { propertyIds } = manual batch.
// ============================================================
export const config = { runtime: 'edge' }

import { supaGetAll, supaPost } from './_lib/supa.js'
import { calcSolar } from './_lib/outreach/assumptions.js'
import {
  pickLanguage, buildPrompt, validateDraft, type OutreachFacts,
} from './_lib/outreach/generate-core.js'
import { geminiText, splitSubject } from './_lib/outreach/gemini-text.js'

const MAX_PER_TICK = 10
const DRAFT_CAP = 50

interface OwnerRow {
  property_id: string
  data: {
    company?: { name?: string | null; email?: string | null }
    decision_maker?: { name?: string | null; email?: string | null }
  } | null
}
interface PropertyRow {
  id: string
  title: string | null
  roof_area_sqm: number | null
  area_name?: string | null
}
interface TemplateRow { id: string; key: string; language: string; prompt: string }
interface MsgRow { property_id: string }

export default async function handler(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // 0. Capacity check
  const pending = await supaGetAll<MsgRow>(
    `outreach_messages?status=eq.draft&select=property_id`,
  )
  if (pending.length >= DRAFT_CAP) {
    return Response.json({ ok: true, skipped: 'draft_cap_reached', pending: pending.length })
  }

  // 1. Contacts with an email
  const owners = await supaGetAll<OwnerRow>(`owner_decision?select=property_id,data`)
  const withEmail = new Map<string, OwnerRow>()
  for (const o of owners) {
    const email = o.data?.decision_maker?.email || o.data?.company?.email
    if (email) withEmail.set(o.property_id, o)
  }

  // 2. Properties already messaged on email channel (any live status)
  const existing = await supaGetAll<MsgRow>(
    `outreach_messages?channel=eq.email&status=not.in.(skipped,bounced)&select=property_id`,
  )
  const messaged = new Set(existing.map((m) => m.property_id))

  // 3. Candidate properties, biggest roofs first
  const props = await supaGetAll<PropertyRow>(
    `properties?roof_area_sqm=not.is.null&select=id,title,roof_area_sqm,area_name` +
    `&order=roof_area_sqm.desc.nullslast&limit=500`,
  )

  // 4. Manual batch override
  let manualIds: string[] | null = null
  if (req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as { propertyIds?: string[] }
    if (Array.isArray(body.propertyIds)) manualIds = body.propertyIds
  }

  const queue = props.filter((p) =>
    manualIds ? manualIds.includes(p.id) : withEmail.has(p.id) && !messaged.has(p.id),
  )

  const templates = await supaGetAll<TemplateRow>(
    `outreach_templates?channel=eq.email&active=eq.true&select=id,key,language,prompt`,
  )

  let created = 0, deferred = 0, invalid = 0
  const budget = Math.min(MAX_PER_TICK, DRAFT_CAP - pending.length)

  for (const prop of queue) {
    if (created >= budget) break
    const owner = withEmail.get(prop.id)
    if (!owner) continue
    const solar = calcSolar(prop.roof_area_sqm ?? 0)
    if (!solar) continue // too small / no roof data

    const companyName = owner.data?.company?.name ?? null
    const facts: OutreachFacts = {
      ...solar,
      roofSqm: prop.roof_area_sqm!,
      district: prop.area_name ?? null,
      companyName,
      contactName: owner.data?.decision_maker?.name ?? null,
    }
    const language = pickLanguage(companyName)
    const template = templates.find((t) => t.language === language)
    if (!template) continue

    const gen = await geminiText(buildPrompt(template.prompt, facts))
    if (gen.quotaExhausted) { deferred++; break } // try again next tick
    if (!gen.ok || !gen.text) { invalid++; continue }

    const { subject, body } = splitSubject(gen.text)
    const check = validateDraft(body, facts, 'email')
    if (!check.ok) { invalid++; continue } // discarded; regenerated on a future tick

    await supaPost('outreach_messages', {
      property_id: prop.id,
      template_id: template.id,
      channel: 'email',
      language,
      recipient: owner.data?.decision_maker?.email || owner.data?.company?.email,
      subject,
      body,
      facts,
      status: 'draft',
    })
    created++
  }

  return Response.json({ ok: true, created, deferred, invalid, pending: pending.length + created })
}
```

- [ ] **Step 3: Typecheck** — `npx tsc -p tsconfig.api.json --noEmit`. Expected: clean.

- [ ] **Step 4: Smoke test locally against prod data** (after deploy, or via `vercel dev`):

```bash
curl -s -X GET "https://bustan-energy.com/api/cron-generate-outreach" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected JSON: `{ "ok": true, "created": <n>, ... }` — with only ~5 enriched contacts today, expect `created` ≤ 5.

- [ ] **Step 5: Commit**

```bash
git add api/cron-generate-outreach.ts
git commit -m "feat(outreach): draft generator cron (deterministic facts + gemini phrasing)"
```

---

### Task 7: Send cron — `api/cron-send-outreach.ts`

**Files:**
- Create: `api/cron-send-outreach.ts`

- [ ] **Step 1: Write the cron**

```ts
// ============================================================
// /api/cron-send-outreach — sends approved outreach messages.
//
// Daily 03:00 UTC = 10:00 Thailand morning. Email channel only
// (Phase 1). Daily cap protects sender reputation.
//
// SELF-SEND MODE: while OUTREACH_SELF_SEND=1, every email goes
// to OUTREACH_TEST_EMAIL instead of the real recipient (subject
// prefixed [TEST→real@addr]). Flip the env var off to go live.
//
// Status transitions are guarded (PATCH ... &status=eq.approved)
// so a concurrent run can't double-send.
// Auth: Bearer CRON_SECRET.
// ============================================================
export const config = { runtime: 'edge' }

import { supaGetAll, supaPatch } from './_lib/supa.js'
import { sendOutreachEmail, textToHtml } from './_lib/channels/email.js'

const DAILY_CAP = 20

interface OutMsg {
  id: string
  recipient: string | null
  subject: string | null
  body: string
  status: string
}

export default async function handler(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // Daily cap: count emails sent since midnight UTC
  const today = new Date().toISOString().slice(0, 10)
  const sentToday = await supaGetAll<{ id: string }>(
    `outreach_messages?channel=eq.email&status=eq.sent&sent_at=gte.${today}T00:00:00Z&select=id`,
  )
  const budget = DAILY_CAP - sentToday.length
  if (budget <= 0) return Response.json({ ok: true, skipped: 'daily_cap', sentToday: sentToday.length })

  const approved = await supaGetAll<OutMsg>(
    `outreach_messages?channel=eq.email&status=eq.approved` +
    `&select=id,recipient,subject,body,status&order=approved_at.asc&limit=${budget}`,
  )

  const selfSend = process.env.OUTREACH_SELF_SEND === '1'
  const testEmail = process.env.OUTREACH_TEST_EMAIL || ''

  let sent = 0, failed = 0
  for (const msg of approved) {
    if (!msg.recipient) {
      await supaPatch(`outreach_messages?id=eq.${msg.id}&status=eq.approved`, {
        status: 'bounced', error: 'no_recipient',
      })
      failed++
      continue
    }
    const to = selfSend ? testEmail : msg.recipient
    const subject = selfSend
      ? `[TEST→${msg.recipient}] ${msg.subject || ''}`
      : (msg.subject || 'Bustan Energy')
    if (!to) { failed++; continue } // self-send mode without test email configured

    const res = await sendOutreachEmail(to, subject, textToHtml(msg.body))
    if (res.error) {
      await supaPatch(`outreach_messages?id=eq.${msg.id}&status=eq.approved`, {
        status: 'bounced', error: res.error,
      })
      failed++
    } else {
      await supaPatch(`outreach_messages?id=eq.${msg.id}&status=eq.approved`, {
        status: 'sent', sent_at: new Date().toISOString(), thread_ref: res.id ?? null,
      })
      sent++
    }
  }

  return Response.json({ ok: true, sent, failed, selfSend, remainingBudget: budget - sent })
}
```

- [ ] **Step 2: Typecheck** — `npx tsc -p tsconfig.api.json --noEmit`. Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add api/cron-send-outreach.ts
git commit -m "feat(outreach): send cron with daily cap + self-send test mode"
```

---

### Task 8: Admin API — `api/admin-outreach.ts`

**Files:**
- Create: `api/admin-outreach.ts`

- [ ] **Step 1: Write the endpoint** (auth block is the exact `verifyAdmin` pattern from `api/admin-stats.ts:44-54`)

```ts
// ============================================================
// /api/admin-outreach — approval queue API.
// GET  ?status=draft            → list messages (default draft)
// POST { action, id|ids, body } → approve | skip | edit | bulk_approve
// Auth: Supabase session bearer + isAllowedAdmin (admin-stats pattern).
// ============================================================
export const config = { runtime: 'edge' }

import { isAllowedAdmin } from './_lib/admin-access.js'
import { supaGetAll, supaPatch } from './_lib/supa.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${auth.slice(7)}` },
  })
  if (!r.ok) return null
  const user = (await r.json()) as { email?: string }
  const email = user?.email?.toLowerCase()
  return email && isAllowedAdmin(email) ? email : null
}

const VALID_STATUSES = ['draft', 'approved', 'sent', 'replied', 'bounced', 'skipped'] as const

interface ActionBody {
  action: 'approve' | 'skip' | 'edit' | 'bulk_approve'
  id?: string
  ids?: string[]
  body?: string
  subject?: string
}

export default async function handler(req: Request): Promise<Response> {
  const admin = await verifyAdmin(req)
  if (!admin) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') || 'draft'
    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return Response.json({ ok: false, error: 'bad_status' }, { status: 400 })
    }
    const rows = await supaGetAll(
      `outreach_messages?status=eq.${status}` +
      `&select=id,property_id,channel,language,recipient,subject,body,facts,status,created_at,sent_at` +
      `&order=created_at.desc&limit=200`,
    )
    return Response.json({ ok: true, rows })
  }

  if (req.method === 'POST') {
    const b = (await req.json().catch(() => null)) as ActionBody | null
    if (!b?.action) return Response.json({ ok: false, error: 'bad_request' }, { status: 400 })
    const now = new Date().toISOString()

    if (b.action === 'approve' && b.id) {
      await supaPatch(`outreach_messages?id=eq.${b.id}&status=eq.draft`, {
        status: 'approved', approved_by: admin, approved_at: now,
      })
      return Response.json({ ok: true })
    }
    if (b.action === 'bulk_approve' && Array.isArray(b.ids) && b.ids.length) {
      const list = b.ids.map((i) => `"${i}"`).join(',')
      await supaPatch(`outreach_messages?id=in.(${list})&status=eq.draft`, {
        status: 'approved', approved_by: admin, approved_at: now,
      })
      return Response.json({ ok: true, count: b.ids.length })
    }
    if (b.action === 'skip' && b.id) {
      await supaPatch(`outreach_messages?id=eq.${b.id}&status=eq.draft`, { status: 'skipped' })
      return Response.json({ ok: true })
    }
    if (b.action === 'edit' && b.id && typeof b.body === 'string') {
      await supaPatch(`outreach_messages?id=eq.${b.id}&status=eq.draft`, {
        body: b.body, ...(typeof b.subject === 'string' ? { subject: b.subject } : {}),
      })
      return Response.json({ ok: true })
    }
    return Response.json({ ok: false, error: 'bad_action' }, { status: 400 })
  }

  return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 })
}
```

- [ ] **Step 2: Typecheck** — `npx tsc -p tsconfig.api.json --noEmit`. Expected: clean.
(If `isAllowedAdmin`'s signature differs — open `api/_lib/admin-access.ts` and match the call exactly as `admin-stats.ts` does.)

- [ ] **Step 3: Commit**

```bash
git add api/admin-outreach.ts
git commit -m "feat(outreach): admin approval API (approve/skip/edit/bulk)"
```

---

### Task 9: Register crons — `vercel.json`

**Files:**
- Modify: `vercel.json` (crons array currently has 7 entries ending with `/api/cron-enrich-contacts`)

- [ ] **Step 1: Add two cron entries** after the `cron-enrich-contacts` entry:

```json
{ "path": "/api/cron-generate-outreach", "schedule": "0 2 * * *" },
{ "path": "/api/cron-send-outreach",     "schedule": "0 3 * * *" }
```

(02:00 UTC generate → 03:00 UTC send = 10:00 Thailand morning, business hours.)

- [ ] **Step 2: Validate JSON** — Run: `python3 -c "import json;json.load(open('vercel.json'))"`. Expected: silent success.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat(outreach): register generate + send crons"
```

---

### Task 10: Admin UI — service functions + Outreach page

**Files:**
- Modify: `src/lib/admin-service.ts` (append; reuse the same session-token retrieval used by `fetchAdminStats` at line ~155 of that file)
- Create: `src/pages/admin/OutreachPage.tsx`
- Modify: `src/App.tsx` (lazy import + route, next to the other admin pages at lines 33-42)
- Modify: `src/pages/admin/AdminLayout.tsx` (NAV_ITEMS array, lines 11-19)

- [ ] **Step 1: Add service functions to `src/lib/admin-service.ts`** (copy the exact session retrieval lines that `fetchAdminStats` uses in this same file — keep imports identical):

```ts
export interface OutreachMessage {
  id: string
  property_id: string
  channel: string
  language: string
  recipient: string | null
  subject: string | null
  body: string
  facts: {
    roofSqm?: number; kwp?: number; monthlySavingThb?: number
    companyName?: string | null; district?: string | null
  }
  status: string
  created_at: string
  sent_at: string | null
}

export async function fetchOutreachMessages(status: string): Promise<OutreachMessage[]> {
  // ↓ same session retrieval as fetchAdminStats (copy those exact lines)
  const session = await getAdminSession()
  if (!session) return []
  const res = await fetch(`/api/admin-outreach?status=${encodeURIComponent(status)}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (!res.ok) return []
  const j = (await res.json()) as { rows?: OutreachMessage[] }
  return j.rows ?? []
}

export async function outreachAction(
  action: 'approve' | 'skip' | 'edit' | 'bulk_approve',
  payload: { id?: string; ids?: string[]; body?: string; subject?: string },
): Promise<boolean> {
  const session = await getAdminSession()
  if (!session) return false
  const res = await fetch('/api/admin-outreach', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  })
  return res.ok
}
```

**Note:** if `admin-service.ts` has no `getAdminSession` helper, extract the session lines from `fetchAdminStats` into one and reuse it in all three places (DRY).

- [ ] **Step 2: Create `src/pages/admin/OutreachPage.tsx`** (match the visual conventions of `ProposalsListPage.tsx` — table layout, Hebrew labels, same toast component):

```tsx
import { useCallback, useEffect, useState } from 'react'
import {
  fetchOutreachMessages, outreachAction, type OutreachMessage,
} from '../../lib/admin-service'

const TABS = [
  { key: 'draft', label: 'ממתינות לאישור' },
  { key: 'approved', label: 'מאושרות' },
  { key: 'sent', label: 'נשלחו' },
  { key: 'replied', label: 'הגיבו' },
  { key: 'bounced', label: 'נכשלו' },
] as const

export default function OutreachPage() {
  const [tab, setTab] = useState<string>('draft')
  const [rows, setRows] = useState<OutreachMessage[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<OutreachMessage | null>(null)
  const [editBody, setEditBody] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setRows(await fetchOutreachMessages(tab))
    setSelected(new Set())
    setLoading(false)
  }, [tab])

  useEffect(() => { void load() }, [load])

  const act = async (
    action: 'approve' | 'skip' | 'edit' | 'bulk_approve',
    payload: Parameters<typeof outreachAction>[1],
  ) => {
    await outreachAction(action, payload)
    await load()
  }

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  return (
    <div dir="rtl" className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">פניות יזומות</h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm ${tab === t.key ? 'bg-emerald-600 text-white' : 'bg-white/10'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'draft' && selected.size > 0 && (
        <button onClick={() => act('bulk_approve', { ids: [...selected] })}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">
          ✅ אשר {selected.size} הודעות
        </button>
      )}

      {loading ? <p>טוען…</p> : rows.length === 0 ? <p className="opacity-60">אין הודעות בסטטוס זה.</p> : (
        <div className="space-y-3">
          {rows.map((m) => (
            <div key={m.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-center gap-3 text-sm">
                {tab === 'draft' && (
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                )}
                <span className="font-semibold">{m.facts.companyName ?? '—'}</span>
                <span className="opacity-60">{m.facts.district ?? ''}</span>
                <span className="opacity-60">{m.facts.roofSqm ?? '?'} מ״ר</span>
                <span className="text-emerald-400">
                  ฿{(m.facts.monthlySavingThb ?? 0).toLocaleString()}/חודש
                </span>
                <span className="opacity-60">{m.channel} · {m.language}</span>
                <span className="opacity-60 ltr:text-left" dir="ltr">{m.recipient}</span>
              </div>
              {m.subject && <div className="text-sm font-medium" dir="auto">{m.subject}</div>}
              <pre className="text-sm whitespace-pre-wrap font-sans opacity-90" dir="auto">{m.body}</pre>
              {tab === 'draft' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => act('approve', { id: m.id })}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm">✅ אשר</button>
                  <button onClick={() => { setEditing(m); setEditBody(m.body) }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-sm">✏️ ערוך</button>
                  <button onClick={() => act('skip', { id: m.id })}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-sm">⏭️ דלג</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl p-5 w-full max-w-xl space-y-3">
            <h2 className="font-semibold">עריכת הודעה — {editing.facts.companyName}</h2>
            <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
              dir="auto" rows={10}
              className="w-full rounded-lg bg-white/5 border border-white/10 p-3 text-sm" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg bg-white/10 text-sm">ביטול</button>
              <button onClick={async () => { await act('edit', { id: editing.id, body: editBody }); setEditing(null) }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm">שמור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Register route in `src/App.tsx`** — add with the other lazy admin imports (lines 33-42):

```tsx
const OutreachPage = lazy(() => import('./pages/admin/OutreachPage'))
```

and add the route inside the admin layout route block, next to the existing admin routes:

```tsx
<Route path="outreach" element={<OutreachPage />} />
```

(Match the exact nesting style of the `proposals` / `monitoring` routes already in the file.)

- [ ] **Step 4: Add nav item in `src/pages/admin/AdminLayout.tsx`** — in `NAV_ITEMS` (line 11-19), after the `proposals` entry:

```ts
{ to: '/admin/outreach', icon: Send, label: 'פניות יזומות', end: true, internal: true },
```

and add `Send` to the existing `lucide-react` import in that file.

- [ ] **Step 5: Build** — Run: `npm run build`. Expected: build succeeds, no TS errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin-service.ts src/pages/admin/OutreachPage.tsx src/App.tsx src/pages/admin/AdminLayout.tsx
git commit -m "feat(outreach): admin approval screen (פניות יזומות)"
```

---

### Task 11: Env vars + deploy + E2E self-send gate

**Files:** none (ops)

- [ ] **Step 1: Set Vercel env vars** on project `bustan-energy` (Production):
  - `OUTREACH_SELF_SEND` = `1`
  - `OUTREACH_TEST_EMAIL` = `k@kanielt.com`
  - Verify existing: `GEMINI_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 2: Deploy** — `git push` (auto-deploy) and wait for the Vercel deployment to be READY.

- [ ] **Step 3: Generate drafts** —

```bash
curl -s "https://bustan-energy.com/api/cron-generate-outreach" -H "Authorization: Bearer $CRON_SECRET"
```

Expected: `{ "ok": true, "created": >0 }` (≤5 with current enrichment coverage).

- [ ] **Step 4: Approve in UI** — open `https://bustan-energy.com/admin/outreach`, verify drafts render with company/roof/saving facts, approve ONE message.

- [ ] **Step 5: Trigger send** —

```bash
curl -s "https://bustan-energy.com/api/cron-send-outreach" -H "Authorization: Bearer $CRON_SECRET"
```

Expected: `{ "ok": true, "sent": 1, "selfSend": true }` and the email arrives at `k@kanielt.com` with subject prefixed `[TEST→...]`, Thai body, correct ฿ figure.

- [ ] **Step 6: Full test suite** — Run: `npx vitest run`. Expected: all tests pass.

- [ ] **Step 7: Commit any fixes; update CLAUDE.md project status row** for Bustan (1 line: outreach Phase 1 live in self-send mode).

**GO-LIVE (separate, explicit decision by Kaniel):** set `OUTREACH_SELF_SEND=0` only after reviewing real test emails and after the Thai field person validates the Thai copy.

---

## Out of Scope (later phases)

- LINE + WhatsApp adapters, LINE reply webhook (Phase 2)
- Content Studio + FB/IG/LINE publishing (Phase 3)
- A/B templates + analytics (Phase 4)
- **Ops dependency (not code):** DBD_API_KEY + Gemini paid tier to raise enrichment yield — without it outreach volume stays ~5 contacts.
