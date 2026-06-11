-- Bustan schema — land scan mode: farm & utility tier ground-mount discovery
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: extends the existing on-demand scan engine (004/008) with a 'land' mode
-- so operators can queue scans that find OSM landuse polygons suitable for
-- ground-mount solar farms (farm: 1–9 MWp) and utility-scale plants (>9 MWp).
-- All changes are additive + idempotent. Apply after 009_buildings_external.sql.
--
-- Flow mirrors the roof pipeline exactly:
--   create_scan_request(scan_type='land') → worker polls scan_requests →
--   land pipeline runs Overpass landuse query → scores → inserts scan_candidates
--   (kind='land') → operator reviews on map.

-- ----------------------------------------------------------------
-- 1. scan_requests: add scan_type discriminator
-- ----------------------------------------------------------------
alter table bustan.scan_requests
  add column if not exists scan_type text not null default 'roof'
    check (scan_type in ('roof', 'land'));

create index if not exists scan_requests_scan_type_idx
  on bustan.scan_requests (scan_type, status, created_at);

-- ----------------------------------------------------------------
-- 2. scan_candidates: add land-specific columns + kind discriminator
-- ----------------------------------------------------------------
alter table bustan.scan_candidates
  add column if not exists kind        text not null default 'roof'
    check (kind in ('roof', 'land')),
  add column if not exists land_area_m2  numeric,
  add column if not exists area_rai      numeric,
  add column if not exists estimated_mwp numeric,
  add column if not exists tier          text
    check (tier in ('commercial', 'farm', 'utility')),
  add column if not exists landuse       text,
  add column if not exists land_geom     jsonb;

-- Indexes for common filter + map queries
create index if not exists scan_candidates_kind_idx
  on bustan.scan_candidates (kind);

create index if not exists scan_candidates_tier_idx
  on bustan.scan_candidates (tier)
  where tier is not null;

-- ----------------------------------------------------------------
-- 3. Extend create_scan_request RPC to accept scan_type (default 'roof')
--    Backward-compatible: existing callers that don't pass p_scan_type continue
--    to work because the column defaults to 'roof'.
-- ----------------------------------------------------------------
-- Drop the old 3-arg signature FIRST: keeping it alongside a 4-arg version with
-- a default would make rpc('create_scan_request', {p_area,p_bbox,p_filters})
-- ambiguous ("function is not unique"). The 4-arg default covers old callers.
drop function if exists bustan.create_scan_request(jsonb, numeric[], jsonb);

create or replace function bustan.create_scan_request(
  p_area      jsonb,
  p_bbox      numeric[],
  p_filters   jsonb,
  p_scan_type text default 'roof'
)
returns uuid
language plpgsql
security definer
set search_path = bustan, public
as $$
declare
  v_id uuid;
begin
  if bustan.current_role() not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: role % may not request scans',
      coalesce(bustan.current_role(), '(none)');
  end if;

  if p_scan_type not in ('roof', 'land') then
    raise exception 'invalid_scan_type: % is not a valid scan type', p_scan_type;
  end if;

  insert into bustan.scan_requests (area_geojson, bbox, filters, scan_type)
  values (p_area, p_bbox, coalesce(p_filters, '{}'::jsonb), coalesce(p_scan_type, 'roof'))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function bustan.create_scan_request(jsonb, numeric[], jsonb, text) from public;
grant execute on function bustan.create_scan_request(jsonb, numeric[], jsonb, text) to authenticated;

-- NOTE: no 3-arg overload is kept — the p_scan_type default covers old callers,
-- and a second signature would make PostgREST rpc calls ambiguous.
