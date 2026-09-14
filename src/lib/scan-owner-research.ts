import { bustanSupabase } from './bustan-supabase'

import type { OwnerBusinessMatch, OwnerResearchRecord, OwnerResearchReview } from './scan-owner-types'
export type * from './scan-owner-types'

export async function loadScanOwnerResearch(candidateId: string): Promise<OwnerResearchRecord | null> {
  if (!bustanSupabase) throw new Error('חיבור המאגר אינו זמין')
  const { data, error } = await bustanSupabase.from('scan_owner_research').select('candidate_id,result,review,updated_at,reviewed_at').eq('candidate_id', candidateId).maybeSingle()
  if (error) throw new Error('לא ניתן לטעון את מחקר הבעלים השמור')
  return data as OwnerResearchRecord | null
}
export async function researchScanOwner(input: { candidateId: string; action: 'discover' | 'research'; business?: OwnerBusinessMatch }, signal?: AbortSignal): Promise<OwnerResearchRecord> {
  const token = (await bustanSupabase?.auth.getSession())?.data.session?.access_token
  if (!token) throw new Error('יש להתחבר מחדש כדי לחפש בעלים')
  const response = await fetch('/api/scan-owner-research', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input), signal,
  })
  const body = await response.json() as { record?: OwnerResearchRecord; error?: string }
  if (!response.ok || !body.record) throw new Error(body.error || 'חיפוש הבעלים לא הושלם')
  return body.record
}
export async function saveScanOwnerReview(candidateId: string, review: OwnerResearchReview): Promise<OwnerResearchRecord> {
  if (!bustanSupabase) throw new Error('חיבור המאגר אינו זמין')
  const { data, error } = await bustanSupabase.rpc('save_scan_owner_review', { p_candidate_id: candidateId, p_review: review })
  if (error) throw new Error(error.message || 'לא ניתן לשמור את האימות')
  return data as OwnerResearchRecord
}
