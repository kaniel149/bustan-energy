-- Created with `supabase migration new scan_promotion_identity` (20260907033944),
-- then moved to this repository's separately applied bustan schema sequence.
-- Additive: no automatic reclassification, deletion, or proximity backfill.
-- Apply only to schema bustan after 015/016. Review/test before applying.

alter table bustan.scan_candidates
  add column if not exists promoted_property_id text
  references bustan.properties(id) on delete restrict;

create index if not exists idx_scan_candidates_promoted_property
  on bustan.scan_candidates(promoted_property_id)
  where promoted_property_id is not null;

comment on column bustan.scan_candidates.promoted_property_id is
  'Actual property returned by promotion; may differ from candidate UUID for an identity duplicate. Null legacy links require explicit resolution.';

create or replace function bustan.promote_scan_candidate(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = bustan, public
as $$
declare
  c bustan.scan_candidates%rowtype;
  v_id text;
  v_source text;
  v_external text;
  v_geom jsonb;
  v_ring jsonb;
  v_point jsonb;
  v_geometry_valid boolean := true;
  v_has_roof_footprint boolean;
  v_match_ids text[];
  v_lock_key text;
  v_created boolean := false;
begin
  -- NULL NOT IN (...) is NULL, not true. Deny both a missing UID and role.
  if auth.uid() is null or coalesce(bustan.current_role(), '') not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: role may not promote candidates'
      using errcode = '42501';
  end if;

  -- Serializes repeated clicks for the same candidate throughout the transaction.
  select * into c from bustan.scan_candidates where id = p_id for update;
  if not found then
    raise exception 'not_found: scan candidate % does not exist', p_id;
  end if;
  if c.status = 'rejected' then
    raise exception 'rejected_candidate: restore candidate % before promotion', p_id;
  end if;
  if c.promoted_property_id is not null then
    return jsonb_build_object('ok', true, 'property_id', c.promoted_property_id, 'already', true);
  end if;

  v_source := nullif(btrim(c.external_source), '');
  v_external := nullif(btrim(c.external_id), '');
  v_has_roof_footprint := c.kind = 'roof' and coalesce(c.footprint_class, 'roof') = 'roof';

  -- Exact stored polygon equality is deliberately conservative. Do not merge
  -- centroids, overlapping footprints, empty polygons or unverified parcels.
  -- Reversed/rotated/shifted polygons are left for operator review.
  if v_has_roof_footprint
    and c.roof_geom->>'type' = 'Polygon'
    and jsonb_typeof(c.roof_geom->'coordinates') = 'array' then
    if jsonb_array_length(c.roof_geom->'coordinates') = 0 then
      v_geometry_valid := false;
    end if;
    for v_ring in select value from jsonb_array_elements(c.roof_geom->'coordinates') loop
      if jsonb_typeof(v_ring) <> 'array' then v_geometry_valid := false; exit; end if;
      if jsonb_array_length(v_ring) < 4 or v_ring->0 <> v_ring->-1 then
        v_geometry_valid := false; exit;
      end if;
      if (select count(distinct value) from jsonb_array_elements(v_ring)) < 3 then
        v_geometry_valid := false; exit;
      end if;
      for v_point in select value from jsonb_array_elements(v_ring) loop
        if jsonb_typeof(v_point) <> 'array' then v_geometry_valid := false; exit; end if;
        if jsonb_array_length(v_point) <> 2 then v_geometry_valid := false; exit; end if;
        if jsonb_typeof(v_point->0) <> 'number' or jsonb_typeof(v_point->1) <> 'number' then
          v_geometry_valid := false; exit;
        end if;
        if (v_point->>0)::numeric not between -180 and 180 or (v_point->>1)::numeric not between -90 and 90 then
          v_geometry_valid := false; exit;
        end if;
      end loop;
      exit when not v_geometry_valid;
      if (select abs(sum(
          (v_ring->i->>0)::numeric * (v_ring->(i + 1)->>1)::numeric
          - (v_ring->(i + 1)->>0)::numeric * (v_ring->i->>1)::numeric
        )) from generate_series(0, jsonb_array_length(v_ring) - 2) as vertices(i)) = 0 then
        v_geometry_valid := false; exit;
      end if;
    end loop;
    if v_geometry_valid then v_geom := c.roof_geom; end if;
  end if;

  -- Different candidates sharing an identity or an exact geometry must see
  -- the previous transaction's result before checking/inserting. Fixed lock
  -- ordering avoids inversion; collisions only serialize unrelated work.
  for v_lock_key in
    select key from unnest(array[
      case when v_source is not null and v_external is not null
        then 'bustan:promotion:external:' || jsonb_build_array(v_source, v_external)::text end,
      case when v_geom is not null then 'bustan:promotion:geometry:' || md5(v_geom::text) end
    ]) as keys(key) where key is not null order by key
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));
  end loop;

  -- An earlier successful insertion used the candidate UUID as its property ID.
  select p.id into v_id from bustan.properties p where p.id = c.id::text;
  if v_id is null and v_source is not null and v_external is not null then
    select p.id into v_id from bustan.properties p
    where p.external_source = v_source and p.external_id = v_external;
  end if;

  if v_id is null and v_geom is not null then
    select array_agg(p.id order by p.id) into v_match_ids from bustan.properties p
    where p.roof_geom = v_geom
      -- A complete but different source identity is not a duplicate. This also
      -- protects two independently identified roofs with equal stored geometry.
      and (v_source is null or v_external is null
        or nullif(btrim(p.external_source), '') is null or nullif(btrim(p.external_id), '') is null)
      -- A legacy property without source columns may already have been linked
      -- by a previous call. Preserve its now-known candidate identity as well.
      and not exists (
        select 1 from bustan.scan_candidates linked
        where linked.promoted_property_id = p.id
          and v_source is not null and v_external is not null
          and nullif(btrim(linked.external_source), '') is not null
          and nullif(btrim(linked.external_id), '') is not null
          and (linked.external_source, linked.external_id) is distinct from (v_source, v_external)
      );
    if coalesce(array_length(v_match_ids, 1), 0) > 1 then
      raise exception 'ambiguous_geometry: candidate % matches multiple properties; verify its identity', p_id;
    end if;
    v_id := v_match_ids[1];
  end if;

  -- Older proximity merges did not save their target. Never invent a property
  -- ID, create another property, or infer the former target from its distance.
  if v_id is null and c.status = 'added' then
    raise exception 'unresolved_legacy_promotion: candidate % needs a verified property link', p_id;
  end if;

  if v_id is null then
    insert into bustan.properties
      (id, name, area_name, property_type, roof_area_sqm, solar_potential_score,
       lat, lon, roof_geom, external_source, external_id)
    values
      (c.id::text, coalesce(c.name, 'Roof ' || left(c.id::text, 8)), c.area_name,
       coalesce(c.property_type, c.category),
       case when v_has_roof_footprint then c.roof_area_sqm end,
       case when v_has_roof_footprint then c.solar_potential_score end,
       c.lat, c.lon, v_geom, v_source, v_external)
    on conflict do nothing
    returning id into v_id;
    v_created := v_id is not null;

    -- A writer outside this RPC may have won the unique ID constraint while
    -- this transaction waited. Resolve the winner; never overwrite its data.
    if v_id is null then
      select p.id into v_id from bustan.properties p where p.id = c.id::text;
      if v_id is null and v_source is not null and v_external is not null then
        select p.id into v_id from bustan.properties p
        where p.external_source = v_source and p.external_id = v_external;
      end if;
      if v_id is null then raise exception 'promotion_conflict: candidate % must be retried', p_id; end if;
    end if;
  end if;

  insert into bustan.crm_pipeline (property_id, stage, priority, estimated_kwp)
  values (v_id, 'new', case when v_has_roof_footprint and c.priority in ('A', 'B', 'C') then c.priority else 'C' end,
    case when v_has_roof_footprint then c.estimated_kwp end)
  on conflict (property_id) do nothing;

  insert into bustan.owner_decision (property_id, research_status, data)
  values (v_id, 'pending', jsonb_strip_nulls(jsonb_build_object('phone', c.phone, 'website', c.website)))
  on conflict (property_id) do nothing;

  update bustan.scan_candidates
  set status = 'added', promoted_property_id = v_id where id = p_id;

  if c.status = 'added' then
    return jsonb_build_object('ok', true, 'property_id', v_id, 'already', true);
  elsif not v_created then
    return jsonb_build_object('ok', false, 'reason', 'duplicate', 'property_id', v_id);
  end if;
  return jsonb_build_object('ok', true, 'property_id', v_id);
end;
$$;

revoke all on function bustan.promote_scan_candidate(uuid) from public;
grant execute on function bustan.promote_scan_candidate(uuid) to authenticated;
