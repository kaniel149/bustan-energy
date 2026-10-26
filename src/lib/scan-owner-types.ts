export interface OwnerBusinessMatch {
  id: string
  name: string
  website?: string
  phone?: string
  address?: string
  distanceM?: number
  mapsUrl?: string
  source: 'google_places' | 'candidate' | 'manual'
}
export interface OwnerFinding {
  kind: 'business_owner' | 'founder' | 'manager' | 'operator' | 'company' | 'business_contact'
  name: string
  role: string
  sourceUrl: string
  excerpt: string
  sourceDate?: string
}
export interface OwnerResearchResult {
  version: 1
  status: 'needs_identity' | 'findings' | 'not_found' | 'failed'
  searchedAt: string
  nearby: OwnerBusinessMatch[]
  selectedBusiness?: OwnerBusinessMatch
  findings: OwnerFinding[]
  sources: Array<{ url: string; title: string }>
  issues: string[]
}
export interface OwnerResearchReview {
  legalOwnerName: string
  decisionMakerName: string
  decisionMakerRole: string
  titleReference: string
  sourceUrl: string
  evidenceNote: string
  status: 'unverified' | 'document_verified'
}
export interface OwnerResearchRecord {
  candidate_id: string
  result: OwnerResearchResult | null
  review: OwnerResearchReview | null
  updated_at: string
  reviewed_at: string | null
}
