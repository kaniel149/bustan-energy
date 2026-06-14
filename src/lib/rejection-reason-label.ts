import type { RejectionReason } from './bustan-crm-service'

/** Human-readable label for a RejectionReason (used in toast messages). */
export function rejectionLabel(reason: RejectionReason): string {
  switch (reason) {
    case 'has_pv':     return 'Has existing PV'
    case 'not_a_roof': return 'Not a roof'
    case 'too_small':  return 'Too small'
    case 'other':      return 'Other'
  }
}
