import { supabase } from './supabase'
import { getSession } from './admin-auth'
import type { Proposal } from '../types/proposals'

export async function fetchProposals(): Promise<Proposal[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Proposal[]
}

export async function fetchProposal(ref: string): Promise<Proposal | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('ref_number', ref)
    .single()

  if (error) return null
  return data as Proposal
}

export interface ProposalStats {
  total: number
  sent: number
  viewed: number
  signed: number
}

export async function fetchProposalStats(): Promise<ProposalStats> {
  if (!supabase) return { total: 0, sent: 0, viewed: 0, signed: 0 }

  const { data, error } = await supabase
    .from('proposals')
    .select('status')

  if (error || !data) return { total: 0, sent: 0, viewed: 0, signed: 0 }

  const total = data.length
  const sent = data.filter((p) => p.status === 'sent' && !data.some((x) => x === p && x.status === 'viewed')).length
  const viewed = data.filter((p) => p.status === 'viewed').length
  const signed = data.filter((p) => p.status === 'signed').length

  return { total, sent, viewed, signed }
}

export interface TimelineEvent {
  label: string
  time: string | null
  done: boolean
}

export function buildTimeline(proposal: Proposal): TimelineEvent[] {
  return [
    { label: 'נוצר', time: proposal.created_at, done: true },
    { label: 'נשלח', time: proposal.sent_at, done: !!proposal.sent_at },
    { label: 'נצפה', time: proposal.first_viewed_at, done: !!proposal.first_viewed_at },
    { label: 'חתום', time: proposal.signed_at, done: !!proposal.signed_at },
  ]
}

/**
 * Open the proposal HTML (password gate stripped) in a new tab and auto-print.
 * Uses the rendered_html stored in proposal.metadata — no server round-trip needed.
 */
export async function downloadProposalPDF(ref: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not connected')

  const { data, error } = await supabase
    .from('proposals')
    .select('metadata')
    .eq('ref_number', ref)
    .single()

  if (error) throw new Error(error.message)

  // metadata is Record<string, unknown> — narrow the html field safely
  const html = typeof data?.metadata?.rendered_html === 'string'
    ? data.metadata.rendered_html
    : null

  if (!html) throw new Error('No rendered HTML found for this proposal. Re-generate the proposal to enable PDF download.')

  // Strip password gate overlay (multiple patterns to be thorough)
  const cleaned = html
    .replace(/<!-- ═══ PASSWORD GATE ═══[\s\S]*?<!-- ═══ END PASSWORD GATE ═══ -->/g, '')
    .replace(/<style[^>]*id="gate-style"[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<div[^>]+class="[^"]*pg-overlay[^"]*"[\s\S]*?<\/div>\s*<script>[\s\S]*?<\/script>/g, '')

  // Inject auto-print script before closing body tag
  const withPrint = cleaned.includes('</body>')
    ? cleaned.replace('</body>', `<script>window.onload=function(){setTimeout(function(){window.print()},500)};</script></body>`)
    : cleaned + `<script>window.onload=function(){setTimeout(function(){window.print()},500)};</script>`

  const blob = new Blob([withPrint], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  // Revoke after 60s — long enough for print dialog
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// ─── Admin Stats ────────────────────────────────────────────────────────────

export interface AdminStatsCounts {
  total: number
  sent: number
  viewed: number
  signed: number
  rejected: number
}

export interface AdminStatsValue {
  signed_thb: number
  pipeline_thb: number
  avg_ticket_thb: number
}

export interface AdminStatsConversion {
  sent_pct: number
  viewed_pct: number
  signed_pct: number
}

export interface AdminStatsTiming {
  avg_hours_to_view: number
  avg_hours_view_to_sign: number
}

export interface AdminStatsDayEntry {
  day: string
  created: number
  viewed: number
  signed: number
}

export interface AdminStats {
  ok: boolean
  counts: AdminStatsCounts
  value: AdminStatsValue
  conversion: AdminStatsConversion
  timing: AdminStatsTiming
  daily: AdminStatsDayEntry[]
  signatures_count: number
  pending_followups: number
  pending_followups_breakdown: Record<string, number>
}

export async function fetchAdminStats(): Promise<AdminStats | null> {
  const session = await getSession()
  if (!session?.access_token) return null

  const res = await fetch('/api/admin-stats', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (!res.ok) return null
  const json: AdminStats = await res.json()
  return json.ok ? json : null
}

// ─── Proposal Signatures ─────────────────────────────────────────────────────

export interface ProposalSignatureRecord {
  id: string
  proposal_ref: string
  signer_name: string | null
  signer_id: string | null
  signer_email: string | null
  signed_at: string
  signature_base64: string | null
  hash_sha256: string | null
}

export async function fetchProposalSignature(ref: string): Promise<ProposalSignatureRecord | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('proposal_signatures')
    .select('id,proposal_ref,signer_name,signer_id,signer_email,signed_at,signature_base64,hash_sha256')
    .eq('proposal_ref', ref)
    .single()

  if (error) return null
  return data as ProposalSignatureRecord
}

/**
 * Download a signed PDF: fetches rendered_html + signature record, appends
 * certificate section, strips password gate + contract form, opens blob + auto-print.
 */
export async function downloadSignedPDF(ref: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not connected')

  // 1. Fetch proposal metadata + signature record in parallel
  const [proposalResult, sig] = await Promise.all([
    supabase
      .from('proposals')
      .select('metadata')
      .eq('ref_number', ref)
      .single(),
    fetchProposalSignature(ref),
  ])

  if (proposalResult.error) throw new Error(proposalResult.error.message)

  const html = typeof proposalResult.data?.metadata?.rendered_html === 'string'
    ? proposalResult.data.metadata.rendered_html
    : null

  if (!html) throw new Error('No rendered HTML found. Re-generate the proposal to enable PDF download.')
  if (!sig) throw new Error('Signature record not found for this proposal.')

  // 2. Strip password gate overlay + contract form
  const stripped = html
    .replace(/<!-- ═══ PASSWORD GATE ═══[\s\S]*?<!-- ═══ END PASSWORD GATE ═══ -->/g, '')
    .replace(/<style[^>]*id="gate-style"[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<div[^>]+class="[^"]*pg-overlay[^"]*"[\s\S]*?<\/div>\s*<script>[\s\S]*?<\/script>/g, '')
    // Strip contract/signature form sections
    .replace(/<section[^>]*id="contract[^"]*"[\s\S]*?<\/section>/g, '')
    .replace(/<div[^>]*id="signature[^"]*"[\s\S]*?<\/div>/g, '')

  // 3. Format signed_at in Bangkok timezone
  const signedDate = new Date(sig.signed_at)
  const signed_at_formatted = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  }).format(signedDate).replace(',', ' ·') + ' Bangkok time'

  // 4. Build certificate section
  const cert = `
<section style="background: #0D2137; color: white; padding: 80px 0; page-break-before: always;">
  <div class="container" style="max-width: 800px; margin: 0 auto; padding: 0 24px;">
    <div style="background: rgba(26,122,90,.15); border: 2px solid #1A7A5A; border-radius: 20px; padding: 40px; text-align: center;">
      <div style="color: #5EE0A8; font-size: 64px; margin-bottom: 16px;">&#10003;</div>
      <h2 style="color: #5EE0A8; font-size: 32px; margin-bottom: 8px;">&#x05D7;&#x05D5;&#x05D6;&#x05D4; &#x05E0;&#x05D7;&#x05EA;&#x05DD; &#x05D3;&#x05D9;&#x05D2;&#x05D9;&#x05D8;&#x05DC;&#x05D9;&#x05EA;</h2>
      <p style="color: rgba(255,255,255,.7); margin-bottom: 32px;">Contract digitally signed &middot; Legal binding</p>

      <div style="background: rgba(0,0,0,.3); border-radius: 16px; padding: 32px; margin: 24px auto; max-width: 500px;">
        <div style="font-size: 11px; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">CHOI SIGNATURE</div>
        <img src="${sig.signature_base64 ?? ''}" style="max-width: 100%; max-height: 180px; background: white; padding: 16px; border-radius: 12px;" alt="Signature">
      </div>

      <table style="margin: 24px auto; color: rgba(255,255,255,.85); font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 6px 16px; text-align: right; color: rgba(255,255,255,.5);">Signer:</td><td style="padding: 6px 16px; text-align: left;"><b>${_esc(sig.signer_name)}</b></td></tr>
        <tr><td style="padding: 6px 16px; text-align: right; color: rgba(255,255,255,.5);">ID:</td><td style="padding: 6px 16px; text-align: left;">${_esc(sig.signer_id)}</td></tr>
        <tr><td style="padding: 6px 16px; text-align: right; color: rgba(255,255,255,.5);">Email:</td><td style="padding: 6px 16px; text-align: left;">${_esc(sig.signer_email)}</td></tr>
        <tr><td style="padding: 6px 16px; text-align: right; color: rgba(255,255,255,.5);">Signed at:</td><td style="padding: 6px 16px; text-align: left;">${signed_at_formatted}</td></tr>
        <tr><td style="padding: 6px 16px; text-align: right; color: rgba(255,255,255,.5);">Reference:</td><td style="padding: 6px 16px; text-align: left; font-family: monospace;">${_esc(ref)}</td></tr>
        <tr><td style="padding: 6px 16px; text-align: right; color: rgba(255,255,255,.5);">Hash (SHA-256):</td><td style="padding: 6px 16px; text-align: left; font-family: monospace; font-size: 10px; word-break: break-all;">${_esc(sig.hash_sha256)}</td></tr>
      </table>

      <p style="color: rgba(255,255,255,.4); font-size: 11px; margin-top: 24px;">
        This signature is legally binding under Thai Electronic Transactions Act B.E. 2544.<br>
        Document integrity verified by SHA-256 hash.
      </p>
    </div>
  </div>
</section>`

  // 5. Append certificate + auto-print before </body>
  const withCert = stripped.includes('</body>')
    ? stripped.replace('</body>', `${cert}\n<script>window.onload=function(){setTimeout(function(){window.print()},600)};</script></body>`)
    : stripped + cert + `<script>window.onload=function(){setTimeout(function(){window.print()},600)};</script>`

  const blob = new Blob([withCert], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// ─── Outreach Messages ───────────────────────────────────────────────────────

export interface OutreachMessage {
  id: string
  property_id: string
  channel: string
  language: string
  recipient: string | null
  subject: string | null
  body: string
  facts: {
    roofSqm?: number
    kwp?: number
    monthlySavingThb?: number
    companyName?: string | null
    district?: string | null
  }
  status: string
  created_at: string
  sent_at: string | null
}

export async function fetchOutreachMessages(status: string): Promise<OutreachMessage[]> {
  const session = await getSession()
  if (!session?.access_token) return []

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
  const session = await getSession()
  if (!session?.access_token) return false

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

/** HTML-escape a value for safe embedding in signed certificate */
function _esc(v: string | null | undefined): string {
  if (v == null) return '—'
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Generate a next sequential ref like BU-2026-0042 */
export async function generateRef(): Promise<string> {
  if (!supabase) return `BU-${new Date().getFullYear()}-0001`

  const year = new Date().getFullYear()
  const { data } = await supabase
    .from('proposals')
    .select('ref_number')
    .like('ref_number', `BU-${year}-%`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return `BU-${year}-0001`

  const last = data[0].ref_number as string
  const parts = last.split('-')
  const num = parseInt(parts[2] ?? '0', 10)
  const next = (num + 1).toString().padStart(4, '0')
  return `BU-${year}-${next}`
}
