// Pure aggregation for /api/admin-funnel. Inputs are already-fetched rows/counts.
export const KP_BBOX = { minLon: 99.9, minLat: 9.65, maxLon: 100.1, maxLat: 9.82 } // = REGIONS.koh_phangan.bounds
export const CONTACT_KEYS = ['phone', 'decisionMakerPhone', 'operationalContactPhone', 'decisionMakerEmail'] as const
export const KP_FILTER = `lat=gte.${KP_BBOX.minLat}&lat=lte.${KP_BBOX.maxLat}&lon=gte.${KP_BBOX.minLon}&lon=lte.${KP_BBOX.maxLon}`

export function inKp(lat: number | null | undefined, lon: number | null | undefined): boolean {
  return lat != null && lon != null && lat >= KP_BBOX.minLat && lat <= KP_BBOX.maxLat && lon >= KP_BBOX.minLon && lon <= KP_BBOX.maxLon
}

export function hasContact(data: Record<string, unknown> | null | undefined): boolean {
  if (!data) return false
  return CONTACT_KEYS.some((k) => typeof data[k] === 'string' && (data[k] as string).trim() !== '')
}

export interface CandidateCounts {
  pending: number
  added: number
  rejected: number
  pendingA: number
  kpAll: number
  kpPendingA: number
  created7d: number
  kpCreated7d: number
}
export interface PropertyRow { id: string; name: string | null; lat: number | null; lon: number | null; created_at: string | null }
export interface OwnerRow { property_id: string; data: Record<string, unknown> | null }
export interface OutreachRow { property_id: string; status: string; sent_at: string | null }
export interface ProposalRow {
  ref_number: string
  status: string
  client_name: string | null
  created_at: string
  first_viewed_at: string | null
  signed_at: string | null
}
export interface FunnelInput {
  now: Date
  scanRequests: { created_at: string | null }[]
  candidateCounts: CandidateCounts
  properties: PropertyRow[]
  owners: OwnerRow[]
  outreach: OutreachRow[]
  proposals: ProposalRow[]
}
export interface Stage {
  key: string
  label: string
  all: number
  kp: number | null
  rest: number | null
  d7: number
  [extra: string]: unknown
}

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
      viewed_unsigned: i.proposals
        .filter((p) => p.status === 'viewed')
        .sort((a, b) => (b.first_viewed_at ?? '').localeCompare(a.first_viewed_at ?? ''))
        .slice(0, 10)
        .map((p) => ({ ref_number: p.ref_number, client_name: p.client_name, first_viewed_at: p.first_viewed_at })),
    },
  }
}
