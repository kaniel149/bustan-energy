-- Bustan schema — on-demand scan engine (P4 of the map + roof-detection upgrade)
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: the north-star — an operator draws/points at an area in Thailand and a
-- worker acquires buildings (OSM Overpass / CV), scores, dedups, enriches, and
-- upserts new leads. This table is the queue + audit; a worker polls it.
--
-- Flow: client inserts a 'queued' row via create_scan_request() (role-checked) →
-- a worker (service role, bypasses RLS) sets 'running', processes, then 'done'
-- with counts (or 'failed' with error). Upserts use bustan.insert_detected_roof.
--
-- Apply via Supabase MCP apply_migration (name: bustan_scan_requests).

create table if not exists bustan.scan_requests (
  id            uuid primary key default gen_random_uuid(),
  area_geojson  jsonb not null,                 -- GeoJSON Polygon of the scan area
  bbox          numeric[],                      -- [minLng,minLat,maxLng,maxLat] convenience
  filters       jsonb not null default '{}',    -- { propertyType, minRoofM2, commercialOnly, ... }
  status        text  not null default 'queued'
                  check (status in ('queued','running','done','failed')),
  requested_by  uuid default auth.uid(),
  counts        jsonb not null default '{}',    -- { found, kept, deduped, inserted, enriched, skipped }
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists scan_requests_status_idx on bustan.scan_requests (status, created_at);

alter table bustan.scan_requests enable row level security;

-- Reads: any authenticated user (mirrors the other bustan read policies).
drop policy if exists read_scans on bustan.scan_requests;
create policy read_scans on bustan.scan_requests
  for select to authenticated using (true);

-- Direct client writes: admin only. Editors create requests via the RPC below;
-- the worker uses the service role (bypasses RLS).
drop policy if exists write_scans on bustan.scan_requests;
create policy write_scans on bustan.scan_requests
  for all to authenticated
  using (bustan.current_role() = 'admin')
  with check (bustan.current_role() = 'admin');

-- Role-checked request creator (admin/sales/engineer).
create or replace function bustan.create_scan_request(
  p_area jsonb,
  p_bbox numeric[],
  p_filters jsonb
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
  insert into bustan.scan_requests (area_geojson, bbox, filters)
  values (p_area, p_bbox, coalesce(p_filters, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function bustan.create_scan_request(jsonb, numeric[], jsonb) from public;
grant execute on function bustan.create_scan_request(jsonb, numeric[], jsonb) to authenticated;
