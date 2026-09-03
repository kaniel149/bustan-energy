# supabase/unapplied/

SQL parked here during SP1 (2026-09-03). Not part of any migration tree — needs a DB check before apply.

- `leads-migration.sql`: objects leads, idx_leads_status, idx_leads_created_at, idx_leads_source — origin bustan-index/supabase, needs DB check before apply (table `leads` exists in 8 tracked migrations; the 3 named indexes are in none)
- `proposal_events.sql`: objects proposal_events, idx_proposal_events_proposal_id, idx_proposal_events_ref, idx_proposal_events_event — origin bustan-index/supabase, needs DB check before apply (table exists in tracked `011_followups_analytics.sql` with a DIFFERENT schema: `event_type`/`occurred_at` vs `event`/`created_at` here; likely obsolete, do not apply blindly)
