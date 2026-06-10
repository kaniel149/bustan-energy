// ── Drip enrollment helper ──────────────────────────────────
// Enrolls a new lead into the active email sequence for a given
// trigger by inserting one email_queue row per sequence step.
// Best-effort: never throws, so lead intake is never blocked.
// Sends are processed by /api/cron-email-queue.

import { supaGetAll, supaPost } from './supa.js'

interface DripStepRow {
  id: string
  delay_days: number
}

interface DripSequenceRow {
  id: string
  email_sequence_steps: DripStepRow[] | null
}

export interface EnrollParams {
  email: string
  name?: string | null
  projectId?: string | null
  trigger?: string
}

const DAY_MS = 86_400_000

/** Returns the number of queued emails (0 if no active sequence / already enrolled / error). */
export async function enrollInDrip(params: EnrollParams): Promise<number> {
  try {
    const trigger = params.trigger || 'lead_created'
    const sequences = await supaGetAll<DripSequenceRow>(
      // FK hint (!sequence_id) disambiguates: email_queue also links both tables
      `email_sequences?trigger_event=eq.${encodeURIComponent(trigger)}&active=eq.true` +
        `&select=id,email_sequence_steps!sequence_id(id,delay_days)&limit=1`,
    )
    const sequence = sequences[0]
    const steps = sequence?.email_sequence_steps
    if (!sequence || !steps?.length) return 0

    const now = Date.now()
    const rows = steps.map((step) => ({
      project_id: params.projectId ?? null,
      sequence_id: sequence.id,
      step_id: step.id,
      recipient: params.email,
      recipient_name: params.name ?? null,
      send_at: new Date(now + step.delay_days * DAY_MS).toISOString(),
      status: 'pending',
    }))

    // Unique index (recipient, step_id) rejects duplicate enrollments;
    // supaPost returns null on conflict, which we treat as "already enrolled".
    const inserted = await supaPost('email_queue', rows)
    return inserted?.length ?? 0
  } catch (e) {
    console.error('drip enrollment failed:', e)
    return 0
  }
}
