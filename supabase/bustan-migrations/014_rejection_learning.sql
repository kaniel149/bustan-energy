-- Bustan schema — learn from rejected candidates (global) + re-apply lessons.
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: the operator rejects roof candidates for concrete reasons (already has PV,
-- not actually a roof, too small, other). We capture the REASON and, for spatial
-- reasons, record a global exclusion zone so the scan worker never re-surfaces
-- that spot for ANY scanner. "has_pv" is NOT excluded spatially — the roof is
-- valid, just taken — it relies on the existing existing_solar detection instead.
--
-- Three pieces:
--   1. rejection_reason column on scan_candidates (audit trail)
--   2. bustan.scan_exclusions — global blocklist of rejected locations
--   3. reject_scan_candidate(id, reason) RPC — sets status+reason, seeds exclusion
--   4. apply_learned_filters() RPC — bulk-rejects pending candidates that match a
--      learned rule (near an exclusion, or existing_solar=true). The "re-scan the
--      list" action. Returns how many were auto-rejected.
-- Idempotent / additive.

-- ── 1. rejection_reason column ──────────────────────────────────────────────
alter table bustan.scan_candidates
  add column if not exists rejection_reason text
    check (rejection_reason is null or rejection_reason in ('has_pv', 'not_a_roof', 'too_small', 'other'));

-- ── 2. global exclusion table ───────────────────────────────────────────────
create table if not exists bustan.scan_exclusions (
  id            uuid primary key default gen_random_uuid(),
  lat           numeric not null,
  lon           numeric not null,
  reason        text not null check (reason in ('not_a_roof', 'too_small', 'other')),
  source_id     uuid,            -- the scan_candidate that created it (audit)
  created_by    text,            -- app_users.email of the rejecter
  created_at    timestamptz default now()
);
create index if not exists scan_exclusions_geo_idx on bustan.scan_exclusions (lat, lon);

alter table bustan.scan_exclusions enable row level security;
drop policy if exists read_scan_exclusions on bustan.scan_exclusions;
create policy read_scan_exclusions on bustan.scan_exclusions
  for select using (bustan.current_role() in ('admin', 'sales', 'engineer'));

-- ── 3. reject with reason (+ seed exclusion for spatial reasons) ─────────────
create or replace function bustan.reject_scan_candidate(
  p_id      uuid,
  p_reason  text
)
returns void
language plpgsql
security definer
set search_path = bustan, public
as $$
declare
  v_lat numeric;
  v_lon numeric;
begin
  if bustan.current_role() not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: role % may not reject candidates',
      coalesce(bustan.current_role(), '(none)');
  end if;
  if p_reason not in ('has_pv', 'not_a_roof', 'too_small', 'other') then
    raise exception 'invalid_reason: %', p_reason;
  end if;

  update bustan.scan_candidates
  set    status = 'rejected', rejection_reason = p_reason
  where  id = p_id
  returning lat, lon into v_lat, v_lon;

  if not found then
    raise exception 'not_found: scan candidate % does not exist', p_id;
  end if;

  -- Spatial reasons feed the global blocklist. has_pv does not (roof is valid).
  if p_reason in ('not_a_roof', 'too_small', 'other') and v_lat is not null and v_lon is not null then
    insert into bustan.scan_exclusions (lat, lon, reason, source_id, created_by)
    values (v_lat, v_lon, p_reason, p_id,
            (select email from bustan.app_users where id = auth.uid()));
  end if;
end;
$$;

revoke all on function bustan.reject_scan_candidate(uuid, text) from public;
grant execute on function bustan.reject_scan_candidate(uuid, text) to authenticated;

-- ── 4. apply learned filters to the current pending list ────────────────────
-- ~30 m match radius (0.00027° lat ≈ 30 m; lon scaled by cos(lat≈9.7°N)≈0.985).
create or replace function bustan.apply_learned_filters()
returns integer
language plpgsql
security definer
set search_path = bustan, public
as $$
declare
  v_removed integer := 0;
begin
  if bustan.current_role() not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: role % may not apply filters',
      coalesce(bustan.current_role(), '(none)');
  end if;

  with rejected as (
    update bustan.scan_candidates sc
    set    status = 'rejected',
           rejection_reason = coalesce(sc.rejection_reason,
             case when sc.existing_solar is true then 'has_pv' else 'not_a_roof' end)
    where  sc.status = 'pending'
      and  sc.kind = 'roof'
      and (
        sc.existing_solar is true
        or exists (
          select 1 from bustan.scan_exclusions ex
          where abs(ex.lat - sc.lat) < 0.00027
            and abs(ex.lon - sc.lon) < 0.000274
        )
      )
    returning 1
  )
  select count(*) into v_removed from rejected;

  return v_removed;
end;
$$;

revoke all on function bustan.apply_learned_filters() from public;
grant execute on function bustan.apply_learned_filters() to authenticated;
