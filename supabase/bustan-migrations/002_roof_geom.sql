-- Bustan schema — roof geometry (P2 of the map + roof-detection upgrade)
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: the map can now draw/edit a roof footprint, but there is nowhere to
-- persist it. Add `roof_geom` (GeoJSON Polygon) to bustan.properties.
--
-- SECURITY: bustan.properties writes are admin-only (see 001_role_based_rls.sql,
-- policy write_properties). We do NOT broaden that policy — that would let every
-- editor rewrite the entire core dataset. Instead we expose a narrow
-- SECURITY DEFINER function that (a) validates the role server-side and
-- (b) updates ONLY the roof columns + the pipeline kWp. Decision (2026-05-29):
-- admin + sales + engineer may save roofs (mirrors `survey.edit || crm.edit`).
--
-- Apply with the Supabase MCP `apply_migration` (name: bustan_roof_geom) or via
-- a branch first, then prod. Idempotent.

alter table bustan.properties add column if not exists roof_geom jsonb;

comment on column bustan.properties.roof_geom is
  'GeoJSON Polygon of the roof footprint (drawn in /platform or detected). '
  'On save, roof_area_sqm and crm_pipeline.estimated_kwp are recomputed. '
  'Written only via bustan.save_roof_geom().';

-- Narrow, role-checked writer. SECURITY DEFINER so it can update properties
-- (admin-only RLS) + crm_pipeline on behalf of any editor role, after the role
-- gate below. p_id is text-compared so it works whether id is uuid or text.
create or replace function bustan.save_roof_geom(
  p_id text,
  p_geom jsonb,
  p_area numeric,
  p_kwp numeric
)
returns void
language plpgsql
security definer
set search_path = bustan, public
as $$
begin
  if bustan.current_role() not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: role % may not edit roof geometry',
      coalesce(bustan.current_role(), '(none)');
  end if;

  update bustan.properties
     set roof_geom = p_geom,
         roof_area_sqm = p_area
   where id::text = p_id;

  update bustan.crm_pipeline
     set estimated_kwp = p_kwp
   where property_id::text = p_id;
end;
$$;

revoke all on function bustan.save_roof_geom(text, jsonb, numeric, numeric) from public;
grant execute on function bustan.save_roof_geom(text, jsonb, numeric, numeric) to authenticated;
