-- 015_external_ids_promotion.sql — schema bustan on ygoiaabzkuvdsyyduvhv
-- (a) stable external ids so island-scan JSON (OSM-keyed) can be upserted idempotently
-- (b) footprint-quality + PV-coverage columns from the Aug-2026 scan
-- (c) one atomic, deduping promotion RPC (replaces the two-step client flow)
-- (d) requeue low-confidence PV checks so they get re-examined with the z18 method
--
-- Apply via Supabase MCP apply_migration (name: bustan_external_ids_promotion).

alter table bustan.scan_candidates
  add column if not exists external_source      text,
  add column if not exists external_id          text,
  add column if not exists footprint_class      text check (footprint_class in ('roof','parcel','compound','unclear')),
  add column if not exists roof_pct             numeric,
  add column if not exists footprint_confidence numeric,
  add column if not exists panel_coverage_pct   numeric,
  add column if not exists estimated_kwp_raw    numeric,
  add column if not exists category             text,
  add column if not exists phone                text,
  add column if not exists website              text;

create unique index if not exists uq_scan_candidates_external
  on bustan.scan_candidates(external_source, external_id)
  where external_id is not null;

create index if not exists idx_scan_candidates_latlon
  on bustan.scan_candidates(lat, lon);

alter table bustan.properties
  add column if not exists external_source text,
  add column if not exists external_id     text;

create unique index if not exists uq_properties_external
  on bustan.properties(external_source, external_id)
  where external_id is not null;

-- (c) promotion: candidate -> properties + crm_pipeline + owner_decision, deduped.
-- Returns {ok:true, property_id} or {ok:false, reason:'duplicate', property_id:<existing>}.
-- A duplicate is still marked status='added' (the roof IS in the CRM) so it
-- leaves the review queue instead of reappearing on the next fetch.
create or replace function bustan.promote_scan_candidate(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = bustan, public
as $$
declare
  c    bustan.scan_candidates%rowtype;
  dup  text;
  v_id text;
begin
  if bustan.current_role() not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: role % may not promote candidates',
      coalesce(bustan.current_role(), '(none)');
  end if;

  select * into c from bustan.scan_candidates where id = p_id;
  if not found then
    raise exception 'not_found: scan candidate % does not exist', p_id;
  end if;
  if c.status = 'added' then
    return jsonb_build_object('ok', true, 'property_id', c.id::text, 'already', true);
  end if;

  -- dedup 1: same external id already promoted
  if c.external_id is not null then
    select id into dup from bustan.properties
     where external_source = c.external_source and external_id = c.external_id
     limit 1;
  end if;
  -- dedup 2: another property within ~28 m (same tolerance as cron-process-scans DEDUP_DEG)
  if dup is null and c.lat is not null and c.lon is not null then
    select id into dup from bustan.properties
     where lat is not null and lon is not null
       and abs(lat - c.lat) < 0.00025 and abs(lon - c.lon) < 0.00025
       and id <> c.id::text
     limit 1;
  end if;
  if dup is not null then
    update bustan.scan_candidates set status = 'added' where id = p_id;
    return jsonb_build_object('ok', false, 'reason', 'duplicate', 'property_id', dup);
  end if;

  v_id := c.id::text;
  insert into bustan.properties
    (id, name, area_name, property_type, roof_area_sqm, solar_potential_score,
     lat, lon, roof_geom, external_source, external_id)
  values
    (v_id, coalesce(c.name, 'Roof ' || left(v_id, 8)), c.area_name, c.property_type,
     c.roof_area_sqm, c.solar_potential_score, c.lat, c.lon, c.roof_geom,
     c.external_source, c.external_id)
  on conflict (id) do update
    set roof_geom             = excluded.roof_geom,
        roof_area_sqm         = coalesce(excluded.roof_area_sqm, bustan.properties.roof_area_sqm),
        solar_potential_score = coalesce(excluded.solar_potential_score, bustan.properties.solar_potential_score),
        external_source       = coalesce(excluded.external_source, bustan.properties.external_source),
        external_id           = coalesce(excluded.external_id,     bustan.properties.external_id);

  insert into bustan.crm_pipeline (property_id, stage, priority, estimated_kwp)
  values (v_id, 'new', coalesce(c.priority, 'C'), c.estimated_kwp)
  on conflict (property_id) do nothing;

  insert into bustan.owner_decision (property_id, research_status, data)
  values (v_id, 'pending',
          jsonb_strip_nulls(jsonb_build_object('phone', c.phone, 'website', c.website)))
  on conflict (property_id) do nothing;

  update bustan.scan_candidates set status = 'added' where id = p_id;

  return jsonb_build_object('ok', true, 'property_id', v_id);
end;
$$;

revoke all on function bustan.promote_scan_candidate(uuid) from public;
grant execute on function bustan.promote_scan_candidate(uuid) to authenticated;

-- (d) requeue: checks that came back "unclear image" get another look with the z18 method
-- Scoped to Ko Phangan: 31,579 rows nationwide match this predicate (most are error-stamped
-- confidence=0 from the z19 era); at 10/tick that would never drain. KP first; widen later per region.
update bustan.scan_candidates
   set solar_checked_at = null
 where solar_checked_at is not null
   and coalesce(solar_check_confidence, 0) < 0.3
   and existing_solar is not true
   and lat between 9.65 and 9.82 and lon between 99.93 and 100.10;

update bustan.properties
   set solar_checked_at = null
 where solar_checked_at is not null
   and coalesce(solar_check_confidence, 0) < 0.3
   and existing_solar is not true;
