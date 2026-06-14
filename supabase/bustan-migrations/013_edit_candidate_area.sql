-- Bustan schema — operator can correct a roof candidate's area during review.
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: the OSM/Overture footprint is sometimes wrong (multipart buildings, a
-- shared roof split across parcels, a courtyard counted as roof). The reviewer
-- knows the real usable roof — let them fix roof_area_sqm and have estimated_kwp
-- + priority recompute server-side with the SAME formula the scan worker uses
-- (api/cron-process-scans.ts: usable 0.65 × 0.18 kWp/m²; priority A≥50 B≥20 C≥5).
--
-- SECURITY DEFINER + role gate (admin/sales/engineer) — mirrors
-- set_scan_candidate_status. Land candidates are rejected (use MWp flow, n/a here).
-- Idempotent: CREATE OR REPLACE + REVOKE/GRANT are safe to re-run.

create or replace function bustan.update_scan_candidate_area(
  p_id        uuid,
  p_area_sqm  numeric
)
returns table (id uuid, roof_area_sqm numeric, estimated_kwp numeric, priority text)
language plpgsql
security definer
set search_path = bustan, public
as $$
declare
  v_kwp   numeric;
  v_prio  text;
  v_kind  text;
begin
  if bustan.current_role() not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: role % may not edit scan candidates',
      coalesce(bustan.current_role(), '(none)');
  end if;

  if p_area_sqm is null or p_area_sqm <= 0 then
    raise exception 'invalid_area: area must be a positive number of square metres';
  end if;
  if p_area_sqm > 1000000 then
    raise exception 'invalid_area: % m2 exceeds the 1,000,000 m2 sanity cap', p_area_sqm;
  end if;

  select sc.kind into v_kind from bustan.scan_candidates sc where sc.id = p_id;
  if v_kind is null then
    raise exception 'not_found: scan candidate % does not exist', p_id;
  end if;
  if v_kind <> 'roof' then
    raise exception 'not_a_roof: area edit applies to roof candidates only (got %)', v_kind;
  end if;

  -- Same scoring as the scan worker: usable = area * 0.65, kWp = usable * 0.18.
  v_kwp  := round((p_area_sqm * 0.65 * 0.18)::numeric, 2);
  v_prio := case
              when v_kwp >= 50 then 'A'
              when v_kwp >= 20 then 'B'
              when v_kwp >= 5  then 'C'
              else 'D'
            end;

  update bustan.scan_candidates sc
  set    roof_area_sqm = p_area_sqm,
         estimated_kwp = v_kwp,
         priority      = v_prio
  where  sc.id = p_id;

  return query
    select p_id, p_area_sqm, v_kwp, v_prio;
end;
$$;

revoke all on function bustan.update_scan_candidate_area(uuid, numeric) from public;
grant execute on function bustan.update_scan_candidate_area(uuid, numeric) to authenticated;
