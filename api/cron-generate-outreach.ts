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

import { bGet, bPost } from './_lib/bustan-db.js'
import { calcSolar } from './_lib/outreach/assumptions.js'
import {
  pickLanguage, buildPrompt, validateDraft, type OutreachFacts,
} from './_lib/outreach/generate-core.js'
import { geminiText, splitSubject } from './_lib/outreach/gemini-text.js'

const MAX_PER_TICK = 6  // 6 × ~3s typical Gemini latency keeps us inside the edge time budget
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
  if (!process.env.CRON_SECRET) {
    return Response.json({ ok: false, error: 'server_misconfigured' }, { status: 500 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // 0. Capacity check
  const pending = await bGet<MsgRow>(
    `outreach_messages?status=eq.draft&select=property_id`,
  )
  if (pending.length >= DRAFT_CAP) {
    return Response.json({ ok: true, skipped: 'draft_cap_reached', pending: pending.length })
  }

  // 1. Contacts with an email
  const owners = await bGet<OwnerRow>(`owner_decision?select=property_id,data`)
  const withEmail = new Map<string, OwnerRow>()
  for (const o of owners) {
    const email = o.data?.decision_maker?.email || o.data?.company?.email
    if (email) withEmail.set(o.property_id, o)
  }

  // 2. Properties already messaged on email channel (any live status)
  const existing = await bGet<MsgRow>(
    `outreach_messages?channel=eq.email&status=not.in.(skipped,bounced)&select=property_id`,
  )
  const messaged = new Set(existing.map((m) => m.property_id))

  // 3. Candidate properties, biggest roofs first
  const props = await bGet<PropertyRow>(
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

  const templates = await bGet<TemplateRow>(
    `outreach_templates?channel=eq.email&active=eq.true&select=id,key,language,prompt`,
  )

  let created = 0, deferred = 0, invalid = 0, calls = 0
  const budget = Math.min(MAX_PER_TICK, DRAFT_CAP - pending.length)

  for (const prop of queue) {
    if (created >= budget || calls >= budget) break
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

    calls++
    const gen = await geminiText(buildPrompt(template.prompt, facts))
    if (gen.quotaExhausted) { deferred++; break } // try again next tick
    if (!gen.ok || !gen.text) { invalid++; continue }

    const { subject, body } = splitSubject(gen.text)
    const check = validateDraft(body, facts, 'email')
    if (!check.ok) { invalid++; continue } // discarded; regenerated on a future tick

    if (await bPost('outreach_messages', {
      property_id: prop.id,
      template_id: template.id,
      channel: 'email',
      language,
      recipient: owner.data?.decision_maker?.email || owner.data?.company?.email,
      subject,
      body,
      facts,
      status: 'draft',
    })) created++
  }

  return Response.json({ ok: true, created, deferred, invalid, calls, pending: pending.length + created })
}
