-- Bustan schema -- scan_candidates: reviewable roof candidates from area scans
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: previously cron-process-scans inserted OSM buildings directly as leads
-- (properties + crm_pipeline + owner_decision). That bypassed human review and
-- flooded the pipeline with low-confidence rows. This migration introduces
-- bustan.scan_candidates as a staging table: the worker writes here; an operator
-- reviews on the map (frontend agent) and calls set_scan_candidate_status to
-- either 'added' (triggers insert_detected_roof) or 'rejected'.
--
-- ADDITIVE + IDEMPOTENT. Apply manually to ygoiaabzkuvdsyyduvhv.
-- Run AFTER 007_scan_attempts.sql.

create table if not exists bustan.scan_candidates (
  id                    uuid primary key default gen_random_uuid(),
  scan_request_id       uuid,
  name                  text,
  area_name             text,
  property_type         text,
  lat                   numeric,
  lon                   numeric,
  roof_geom             jsonb,
  roof_area_sqm         numeric,
  solar_potential_score numeric,
  estimated_kwp         numeric,
  priority              text,
  status                text not null default 'pending'
                          check (status in ('pending', 'added', 'rejected')),
  created_at            timestamptz default now()
);

create index if not exists scan_candidates_status_idx
  on bustan.scan_candidates (status);

create index if not exists scan_candidates_scan_request_idx
  on bustan.scan_candidates (scan_request_id);

-- RLS: read open to authenticated (mirrors read_all_properties).
-- No direct INSERT/UPDATE for clients; all writes are via the service role
-- (worker inserts) or the set_scan_candidate_status RPC below.
alter table bustan.scan_candidates enable row level security;

drop policy if exists read_scan_candidates on bustan.scan_candidates;
create policy read_scan_candidates on bustan.scan_candidates
  for select to authenticated using (true);

-- set_scan_candidate_status: role-checked status transition (admin/sales/engineer).
-- Validates p_status is a legal value and updates the row.
-- The frontend review layer calls this; promoting to 'added' is a separate step
-- (the client calls confirmDetectedRoof / insert_detected_roof after calling this).
create or replace function bustan.set_scan_candidate_status(
  p_id     uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = bustan, public
as $$
begin
  if bustan.current_role() not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: role % may not update scan candidates',
      coalesce(bustan.current_role(), '(none)');
  end if;

  if p_status not in ('pending', 'added', 'rejected') then
    raise exception 'invalid_status: % is not a valid scan candidate status', p_status;
  end if;

  update bustan.scan_candidates
  set    status = p_status
  where  id = p_id;

  if not found then
    raise exception 'not_found: scan candidate % does not exist', p_id;
  end if;
end;
$$;

revoke all on function bustan.set_scan_candidate_status(uuid, text) from public;
grant execute on function bustan.set_scan_candidate_status(uuid, text) to authenticated;
