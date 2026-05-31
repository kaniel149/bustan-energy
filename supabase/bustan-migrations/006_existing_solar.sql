-- Bustan schema -- wire has_existing_solar from Gemini roof analysis into
-- bustan.properties.existing_solar so owner-decision-layer.ts can deprioritize
-- leads that already have PV installed.
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: api/admin-analyze-roof.ts now returns `has_existing_solar` (bool) from
-- Gemini 2.0 Flash.  Until this migration the value was discarded because
-- save_roof_meta had no parameter for it.  After this migration the value is
-- persisted to bustan.properties.existing_solar which mapLeadToProperty() reads
-- as `existingSolar`, consumed by hasExistingSolar() and derivePriority() in
-- owner-decision-layer.ts:
--   derivePriority -> hasExistingSolar -> existingSolar -> existing_solar (DB)
--
-- IMPORTANT: MUST be applied manually to ygoiaabzkuvdsyyduvhv before the new
-- p_existing_solar argument in saveRoofMeta() (bustan-crm-service.ts) will
-- succeed.  Until then the RPC call will fail with "wrong number of arguments"
-- (the JS side passes null for the new param; the old 7-arg function rejects it).
--
-- ADDITIVE: existing_solar column already exists (001_role_based_rls.sql or
-- initial schema).  This migration only replaces the function signature.
--
-- IDEMPOTENT: DROP IF EXISTS + CREATE replaces the function cleanly; REVOKE/GRANT
-- are safe to re-run.

-- Drop the old 7-argument function so the new 8-argument one can be created
-- without a signature conflict.
drop function if exists bustan.save_roof_meta(uuid, text, numeric, text, numeric, numeric, jsonb);

-- Re-create with the 8th parameter p_existing_solar.
-- existing_solar is only overwritten when the caller provides a non-null value
-- (COALESCE preserves the stored value otherwise), keeping backward compatibility
-- for any call sites that pass null.
create or replace function bustan.save_roof_meta(
  p_id             uuid,
  p_orientation    text,
  p_tilt           numeric,
  p_shading        text,
  p_usable         numeric,
  p_confidence     numeric,
  p_json           jsonb,
  p_existing_solar boolean default null
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
         roof_analysis_json       = p_json,
         existing_solar           = coalesce(p_existing_solar, existing_solar)
   where id = p_id;
end;
$$;

revoke all on function bustan.save_roof_meta(uuid, text, numeric, text, numeric, numeric, jsonb, boolean) from public;
grant execute on function bustan.save_roof_meta(uuid, text, numeric, text, numeric, numeric, jsonb, boolean) to authenticated;
