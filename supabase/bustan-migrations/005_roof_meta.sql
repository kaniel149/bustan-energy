-- Bustan schema -- roof analysis metadata (P4 of the map + roof-analysis pipeline)
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: api/admin-analyze-roof returns orientation, tilt, shading, usable_area and
-- confidence (from Gemini 2.0 Flash) but these results are only shown in a modal
-- and never persisted. This migration adds the storage columns and a narrow
-- SECURITY DEFINER writer so the CRM can cache the last analysis result per lead.
--
-- IMPORTANT: This migration MUST be applied manually to the bustan Supabase project
-- (ref: ygoiaabzkuvdsyyduvhv) before the saveRoofMeta() write path in
-- src/lib/bustan-crm-service.ts will succeed. Until then the client-side call is
-- best-effort and silently suppressed (console.warn only -- no user-facing error).
--
-- DEFERRAL NOTE: usable_area_sqm and tilt_deg from this analysis are stored for
-- reference only. Reconciliation of these values into kWp / financial estimates
-- (owner-decision-layer.ts) is explicitly deferred to avoid changing already-quoted
-- numbers. Do NOT feed these columns into normalizeCrmLayer() without a separate
-- design review.
--
-- SECURITY: same role gate as save_roof_geom (admin/sales/engineer).
-- Additive only -- no existing columns or policies are modified.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE.

alter table bustan.properties
  add column if not exists roof_orientation         text,
  add column if not exists roof_tilt_deg            numeric,
  add column if not exists roof_shading             text,
  add column if not exists roof_usable_area_sqm     numeric,
  add column if not exists roof_analysis_confidence numeric,
  add column if not exists roof_analysis_json       jsonb;

comment on column bustan.properties.roof_orientation is
  'Dominant panel orientation from last Gemini roof analysis (south/east/west/east-west/mixed/unknown).';
comment on column bustan.properties.roof_tilt_deg is
  'Estimated roof tilt in degrees from last Gemini roof analysis.';
comment on column bustan.properties.roof_shading is
  'Shading category from last Gemini roof analysis (none/partial/heavy).';
comment on column bustan.properties.roof_usable_area_sqm is
  'Usable roof area in m2 as estimated by Gemini. Stored for reference; NOT yet wired into kWp logic.';
comment on column bustan.properties.roof_analysis_confidence is
  'Gemini confidence score [0-1] for the last roof analysis.';
comment on column bustan.properties.roof_analysis_json is
  'Full RoofAnalysis JSON blob from the last api/admin-analyze-roof call.';

-- Narrow, role-checked writer. SECURITY DEFINER so it can update bustan.properties
-- (admin-only RLS) on behalf of any editor role, after the role gate below.
-- Mirrors the pattern in bustan.save_roof_geom (002_roof_geom.sql).
create or replace function bustan.save_roof_meta(
  p_id          uuid,
  p_orientation text,
  p_tilt        numeric,
  p_shading     text,
  p_usable      numeric,
  p_confidence  numeric,
  p_json        jsonb
)
returns void
language plpgsql
security definer
set search_path = bustan, public
as $$
begin
  if bustan.current_role() not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: role % may not save roof analysis metadata',
      coalesce(bustan.current_role(), '(none)');
  end if;

  update bustan.properties
     set roof_orientation         = p_orientation,
         roof_tilt_deg            = p_tilt,
         roof_shading             = p_shading,
         roof_usable_area_sqm     = p_usable,
         roof_analysis_confidence = p_confidence,
         roof_analysis_json       = p_json
   where id = p_id;
end;
$$;

revoke all on function bustan.save_roof_meta(uuid, text, numeric, text, numeric, numeric, jsonb) from public;
grant execute on function bustan.save_roof_meta(uuid, text, numeric, text, numeric, numeric, jsonb) to authenticated;
