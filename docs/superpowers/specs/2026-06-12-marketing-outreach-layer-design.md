# Marketing & Outreach Layer — Design Spec

**Date:** 2026-06-12
**Project:** Bustan Energy (bustan-energy repo)
**Status:** Approved by Kaniel (brainstorm session 2026-06-12)

## 1. Problem

The Deal Engine has a built bottom-of-funnel (proposals at `/p/{REF}`, signatures, view
tracking, follow-up crons) and a full top-of-funnel (6,970 scanned candidates in
`bustan.properties` with PV detection and `roof_area_sqm`), but **no bridge between
them**: zero automated outreach, no personalization engine turning roof data into
messages, and no social content pipeline.

## 2. Goals

1. **Outreach:** turn scanned candidates into personalized first-touch messages
   (Thai/English) over LINE, WhatsApp, and email — with a human approval queue.
2. **Content:** weekly social content (FB + IG in Thai, LINE OA broadcasts) generated
   from real scan data, through the same approval queue.
3. Reuse existing infra: `email_queue`/`email_sequences` (migration 018), admin
   dashboard, cron framework, Resend, `owner_decision` enrichment.

**Non-goals:** new CRM, new repo, fully-autonomous sending, TikTok/LinkedIn (later).

## 3. Decisions (from brainstorm)

| Decision | Choice |
|---|---|
| Architecture | Extend Deal Engine inside `bustan-energy` (option A) |
| Sending mode | Approval queue — nothing sends without explicit human approval |
| Approvers | Kaniel (strategy) + Thai field person (language/local fit) |
| Channels | LINE OA, WhatsApp business, Resend email (all already exist) |
| Social | FB + IG in Thai, LINE OA broadcasts |
| AI | Gemini Flash for copywriting; all numbers computed deterministically first |

## 4. Architecture

```
bustan.properties + owner_decision
        │
        ▼
MESSAGE GENERATOR (api/admin-generate-outreach.ts + cron)
  deterministic savings calc → Gemini phrasing (th/en)
        │
        ▼
outreach_messages (draft) ──► APPROVAL UI (new "Outreach" admin screen)
        │ approved                      │ also serves content_posts
        ▼
CHANNEL ADAPTERS (api/_lib/channels/)
  line.ts │ whatsapp.ts │ email.ts (inserts into existing email_queue)
        │
        ▼
sent → delivered → replied (LINE webhook) → hot lead in dashboard → existing proposal flow
```

## 5. Data Model — Migration 021

Three new tables, no changes to existing tables (FKs into `bustan.properties`).

### 5.1 `bustan.outreach_messages`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| property_id | uuid fk → bustan.properties | |
| channel | text | `line` / `whatsapp` / `email` |
| language | text | `th` / `en` |
| subject | text nullable | email only |
| body | text | generated message |
| facts | jsonb | computed numbers used (kwp, monthly_saving_thb, roof_sqm) — audit trail |
| status | text | `draft → approved → sent → delivered → replied → bounced → skipped` |
| template_id | uuid fk nullable | |
| approved_by | text nullable | admin email |
| approved_at / sent_at / replied_at | timestamptz | |
| thread_ref | text nullable | LINE userId / WhatsApp chat id / Resend message id |
| error | text nullable | send failure detail |

Indexes: `(status)`, `(property_id)`, unique partial `(property_id, channel) where status not in ('skipped','bounced')` — prevents double-contacting the same property on the same channel.

### 5.2 `bustan.outreach_templates`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| key | text unique | e.g. `factory_large_th_line` |
| segment | jsonb | matching rules: property_type, min/max roof_sqm, district list |
| channel / language | text | |
| prompt | text | Gemini instruction with placeholders `{roof_sqm} {kwp} {monthly_saving_thb} {district} {company_name} {contact_name}` |
| active | boolean | |

### 5.3 `bustan.content_posts`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| platform | text | `fb` / `ig` / `line_broadcast` |
| language | text | default `th` |
| format | text | `roof_of_week` / `area_stats` / `field_photo` / `pea_education` |
| body | text | caption/copy |
| media_url | text nullable | image/video in Supabase storage |
| source_facts | jsonb | the real data behind the post |
| status | text | `draft → approved → published → failed` |
| scheduled_at / published_at | timestamptz | |
| published_ref | text nullable | platform post id |
| approved_by | text nullable | |

RLS: same admin-only policy pattern as `proposals` (migration 014 hardening style).

## 6. Message Generator

**Endpoint:** `api/admin-generate-outreach.ts` (manual batch + single property)
**Cron:** `api/cron-generate-outreach.ts` — fills the draft queue up to a cap
(default 50 drafts pending; configurable), prioritized by `roof_area_sqm DESC`,
only properties with a contact in `owner_decision` and no prior non-skipped message.

**Deterministic calc (in code, NOT by the LLM):**
- `kwp = roof_area_sqm × 0.85 / 6`  (usable-area factor / m² per kWp)
- `monthly_saving_thb = kwp × 4.2 kWh/day × 30 × 4.5 ฿/kWh` (PEA business tariff)
- Constants live in `api/_lib/outreach/assumptions.ts` — single source, easy to tune.

**Gemini call:** template prompt + facts → returns body only. Numbers are injected
verbatim; a post-generation validator rejects any draft whose numbers don't match
`facts` (regex check on the THB figure). Quota: text-only Flash calls, ~50/day —
separate from the vision PV-detection quota; same 429-deferral pattern as
`cron-enrich-contacts`.

**Language rule:** Thai by default; English when `owner_decision` indicates a
foreign company (Japanese/Chinese/Western names in EEC).

**Per-channel length:** LINE ≤ 300 chars, WhatsApp ≤ 600, email full + proposal link.

## 7. Approval UI

New admin screen **"Outreach"** alongside the funnel dashboard (`src/` admin area,
existing magic-link auth — field person gets an allowed admin email).

- Tabs: **Messages** (outreach_messages drafts) / **Content** (content_posts drafts).
- Row: company, district, roof m², ฿ saving, channel chip, message preview.
- Actions: ✅ Approve & send · ✏️ Edit body (saved before send) · ⏭️ Skip ·
  🌐 Switch language (regenerates).
- Bulk approve after sampling (select-all within a filtered segment).
- Daily send cap (default 20/day/channel) enforced at send time — protects sender
  reputation and LINE/WhatsApp accounts.

## 8. Channel Adapters — `api/_lib/channels/`

| Adapter | Mechanism | Notes |
|---|---|---|
| `email.ts` | Insert into existing `email_queue` (migration 018, `cron-email-queue` sends via Resend) | Zero new sending code |
| `line.ts` | LINE Messaging API Push | **Constraint:** push requires the recipient to have added the OA as friend. Mitigations (phase 2): include "Add our LINE" link in email/SMS first touch; field person adds contacts manually; broadcast to existing followers. |
| `whatsapp.ts` | GreenAPI (same provider as Migdal Or) | For contacts with international/WhatsApp-active numbers |

**Send loop:** `api/cron-send-outreach.ts` — picks `approved` rows, respects daily caps,
sets `sent`/`error`. Idempotent (status transition guarded by `update ... where status='approved'`).

**Reply detection:** `api/line-webhook.ts` — LINE OA webhook; on inbound message,
match `thread_ref` → set `replied`, mark property as hot lead (existing activity_log),
notify Kaniel via WhatsApp (972502213948). Email replies: Resend inbound or manual
for v1 (Mailgun MX already receives — manual triage acceptable).

## 9. Content Studio

**Cron:** `api/cron-generate-content.ts` weekly → 5 drafts into `content_posts`.

Four rotating formats, all sourced from real DB data:
1. **Roof of the week** — anonymized satellite crop + wasted ฿/year hook.
2. **Area stats** — e.g. "scanned 1,200 roofs in Chonburi, only 8% have solar"
   (live SQL over `properties`).
3. **Field/project photos** — field person uploads to storage bucket; cron attaches.
4. **PEA education** — net metering, tariffs (source: `pea-docs/`).

**Publishing (on approval):**
- FB + IG via Meta Graph API (APP_ID 775806011928280; until System User Token
  exists, use long-lived token from Graph API Explorer — known workaround).
- LINE broadcast via Messaging API to OA followers.

## 10. Build Phases

| Phase | Scope | Dependency |
|---|---|---|
| **1** | Migration 021 + generator + Outreach screen + **email channel only** | None — email infra live |
| **2** | LINE adapter + webhook replies + WhatsApp adapter | LINE OA channel token from Kaniel |
| **3** | Content Studio + FB/IG/LINE publishing | Meta long-lived token |
| **4** | A/B templates, reply analytics, weekly performance report | Data from 1–3 |

## 11. Open Dependencies / Risks

1. **Contact coverage (critical):** enrichment found ~5 contacts of 6,970. Phase 1
   includes: obtain `DBD_API_KEY` (Thai company registry) + consider Gemini paid
   tier to raise enrichment throughput. Outreach volume is gated by this.
2. **LINE cold-push constraint** — see §8 mitigations.
3. **Meta System User Token** blocked on business verification — workaround in §9.
4. **Thai compliance:** Thailand PDPA applies to B2B marketing. Templates include
   opt-out line; `skipped`/`bounced` properties are never re-queued.

## 12. Error Handling

- Send failures → `status='bounced'`, `error` populated, surfaced in Outreach screen.
- Gemini 429 → defer (existing pattern), draft stays pending.
- Number-mismatch validator failure → draft discarded + logged, regenerated next tick.
- Channel adapter exceptions never crash the cron loop (per-row try/catch, same as
  `cron-followups`).

## 13. Testing

- Unit: savings calc (`assumptions.ts`), template placeholder substitution,
  number-validator, status transitions.
- Integration: generator → draft → approve → email lands in `email_queue` (Vitest,
  existing setup).
- Manual gate per phase: send to Kaniel's own LINE/WhatsApp/email first ("self-send"
  mode flag) before any real recipient.
