-- Bustan schema — confirm detected roofs (P3 of the map + roof-detection upgrade)
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: the offline detector (scripts/roof_detector.py, download_osm_buildings.py)
-- produces candidate roofs that aren't in bustan.properties yet. P3 lets an
-- operator review candidates on the map and CONFIRM them — which inserts a new
-- lead. properties INSERT is admin-only (001_role_based_rls.sql); like P2 we use
-- a narrow SECURITY DEFINER function that role-checks (admin/sales/engineer) and
-- writes the property + a 'new' pipeline row + a pending owner_decision row.
--
-- Idempotent: ON CONFLICT on each PK (properties.id, crm_pipeline.property_id,
-- owner_decision.property_id) so re-confirming a candidate is safe.
--
-- Apply via Supabase MCP apply_migration (name: bustan_detected_roofs).

create or replace function bustan.insert_detected_roof(p jsonb)
returns text
language plpgsql
security definer
set search_path = bustan, public
as $$
declare
  v_id text;
begin
  if bustan.current_role() not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: role % may not confirm detected roofs',
      coalesce(bustan.current_role(), '(none)');
  end if;

  v_id := coalesce(nullif(p->>'id', ''), gen_random_uuid()::text);

  insert into bustan.properties
    (id, name, area_name, property_type, roof_area_sqm, solar_potential_score, lat, lon, roof_geom)
  values (
    v_id,
    coalesce(nullif(p->>'title', ''), 'Detected building'),
    nullif(p->>'location', ''),
    nullif(p->>'category', ''),
    nullif(p->>'area', '')::numeric,
    nullif(p->>'solarScore', '')::numeric,
    nullif(p->>'lat', '')::numeric,
    nullif(p->>'lng', '')::numeric,
    p->'roofGeom'
  )
  on conflict (id) do update set
    roof_geom = excluded.roof_geom,
    roof_area_sqm = coalesce(excluded.roof_area_sqm, bustan.properties.roof_area_sqm),
    solar_potential_score = coalesce(excluded.solar_potential_score, bustan.properties.solar_potential_score);

  insert into bustan.crm_pipeline (property_id, stage, priority, estimated_kwp)
  values (
    v_id, 'new',
    coalesce(nullif(p->>'priority', ''), 'C'),
    nullif(p->>'capacityKwp', '')::numeric
  )
  on conflict (property_id) do nothing;

  insert into bustan.owner_decision (property_id, research_status, data)
  values (v_id, 'pending', coalesce(p->'owner', '{}'::jsonb))
  on conflict (property_id) do nothing;

  return v_id;
end;
$$;

revoke all on function bustan.insert_detected_roof(jsonb) from public;
grant execute on function bustan.insert_detected_roof(jsonb) to authenticated;
