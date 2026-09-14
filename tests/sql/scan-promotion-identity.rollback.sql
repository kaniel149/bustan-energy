-- Run against an already migrated database, as the administrative SQL runner.
-- Uses an existing admin only as auth context; prints no account/customer data.
-- All fixtures and resulting properties/pipeline/owner rows are rolled back.
-- Before migration 018 this intentionally fails the neighbour/idempotence tests.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  v_admin uuid;
  v_tag text := 'scan-promotion-qa-' || gen_random_uuid()::text;
  c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid(); c5 uuid := gen_random_uuid(); c6 uuid := gen_random_uuid();
  c7 uuid := gen_random_uuid(); c8 uuid := gen_random_uuid(); c9 uuid := gen_random_uuid();
  c10 uuid := gen_random_uuid();
  r1 jsonb; r2 jsonb; r3 jsonb; r4 jsonb;
  malformed jsonb;
  malformed_id uuid;
  unknown_actor uuid := gen_random_uuid();
  geom_a jsonb := '{"type":"Polygon","coordinates":[[[120,50],[120.00008,50],[120.00008,50.00008],[120,50.00008],[120,50]]]}';
  geom_b jsonb := '{"type":"Polygon","coordinates":[[[120.00012,50],[120.00020,50],[120.00020,50.00008],[120.00012,50.00008],[120.00012,50]]]}';
  geom_legacy jsonb := '{"type":"Polygon","coordinates":[[[120.01,50],[120.01008,50],[120.01008,50.00008],[120.01,50.00008],[120.01,50]]]}';
begin
  select id into v_admin from bustan.app_users where role = 'admin' order by id limit 1;
  if v_admin is null then raise exception 'fixture_requires_existing_admin'; end if;
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  insert into bustan.scan_candidates
    (id, name, kind, status, lat, lon, roof_geom, roof_area_sqm, estimated_kwp,
     external_source, external_id, footprint_class)
  values
    (c1, v_tag, 'roof', 'pending', 50.00004, 120.00004, geom_a, 64, 7, v_tag, 'roof-1', 'roof'),
    (c2, v_tag, 'roof', 'pending', 50.00004, 120.00016, geom_b, 64, 7, v_tag, 'roof-2', 'roof'),
    -- Same stored geometry but conflicting stable identity remains separate.
    (c3, v_tag, 'roof', 'pending', 50.00004, 120.00004, geom_a, 64, 7, v_tag, 'roof-3', 'roof'),
    -- Legacy exact-geometry duplicate without a stable source identity.
    (c4, v_tag, 'roof', 'pending', 50.00004, 120.01004, geom_legacy, 64, 7, null, null, 'roof'),
    (c5, v_tag, 'roof', 'pending', 50.00004, 120.01004, geom_legacy, 64, 7, null, null, 'roof'),
    (c6, v_tag, 'roof', 'added', 50.5, 120.5, null, 64, 7, v_tag, 'unresolved-legacy', 'roof'),
    (c7, v_tag, 'roof', 'rejected', 50.6, 120.6, null, 64, 7, v_tag, 'rejected', 'roof'),
    (c8, v_tag, 'roof', 'pending', 50.7, 120.7, geom_a, 9000, 1500, v_tag, 'compound', 'compound'),
    (c9, v_tag, 'land', 'pending', 50.8, 120.8, geom_a, 9000, 1500, v_tag, 'land', null),
    (c10, v_tag, 'roof', 'pending', 50.9, 120.9, geom_a, 9000, 1500, v_tag, 'parcel', 'parcel');

  -- Scan grade D must map to the CRM's lowest supported priority, C.
  update bustan.scan_candidates set priority = 'D' where id = c1;
  r1 := bustan.promote_scan_candidate(c1);
  if (select priority from bustan.crm_pipeline where property_id = r1->>'property_id') <> 'C' then
    raise exception 'scan_grade_d_not_mapped_to_crm_c';
  end if;
  r2 := bustan.promote_scan_candidate(c2);
  if r1->>'property_id' = r2->>'property_id' then raise exception 'neighbouring_roofs_were_merged'; end if;
  r3 := bustan.promote_scan_candidate(c3);
  if r1->>'property_id' = r3->>'property_id' then raise exception 'conflicting_stable_ids_were_merged'; end if;

  r2 := bustan.promote_scan_candidate(c1);
  if r2->>'property_id' <> r1->>'property_id' or r2->>'already' <> 'true' then raise exception 'same_candidate_not_idempotent'; end if;
  if (select count(*) from bustan.crm_pipeline where property_id = r1->>'property_id') <> 1 then raise exception 'pipeline_not_idempotent'; end if;
  if (select count(*) from bustan.owner_decision where property_id = r1->>'property_id') <> 1 then raise exception 'owner_row_not_idempotent'; end if;

  r3 := bustan.promote_scan_candidate(c4);
  r4 := bustan.promote_scan_candidate(c5);
  if r3->>'property_id' <> r4->>'property_id' or r4->>'reason' <> 'duplicate' then raise exception 'exact_legacy_geometry_not_deduped'; end if;
  r4 := bustan.promote_scan_candidate(c5);
  if r4->>'property_id' <> r3->>'property_id' or r4->>'already' <> 'true' then raise exception 'duplicate_target_not_persisted'; end if;
  if (select promoted_property_id from bustan.scan_candidates where id = c5) <> r3->>'property_id' then raise exception 'stored_property_link_wrong'; end if;

  begin
    perform bustan.promote_scan_candidate(c6);
    raise exception 'unresolved_legacy_returned_a_fabricated_target';
  exception when others then
    if sqlerrm not like 'unresolved_legacy_promotion:%' then raise; end if;
  end;
  if exists (select 1 from bustan.properties where id = c6::text) then raise exception 'unresolved_legacy_created_an_extra_property'; end if;

  -- Recover a legacy added duplicate via its true source identity; no proximity.
  insert into bustan.properties (id, name, external_source, external_id)
  values (v_tag || '-source-property', v_tag, v_tag, 'unresolved-legacy');
  r4 := bustan.promote_scan_candidate(c6);
  if r4->>'property_id' <> (v_tag || '-source-property') then raise exception 'legacy_source_target_wrong'; end if;

  begin
    perform bustan.promote_scan_candidate(c7);
    raise exception 'rejected_candidate_was_promoted';
  exception when others then
    if sqlerrm not like 'rejected_candidate:%' then raise; end if;
  end;

  for r4 in select bustan.promote_scan_candidate(id) from bustan.scan_candidates where id in (c8, c9, c10) loop
    if exists (select 1 from bustan.properties where id = r4->>'property_id' and (roof_area_sqm is not null or roof_geom is not null)) then
      raise exception 'unverified_footprint_became_roof_measurement';
    end if;
    if exists (select 1 from bustan.crm_pipeline where property_id = r4->>'property_id' and estimated_kwp is not null) then
      raise exception 'unverified_footprint_became_system_size';
    end if;
  end loop;

  for malformed in select value from jsonb_array_elements('[
    true,
    [],
    {"type":"Polygon","coordinates":{}},
    {"type":"Polygon","coordinates":[]},
    {"type":"Polygon","coordinates":[123]},
    {"type":"Polygon","coordinates":[[[120,50],["invalid",50],[120,51],[120,50]]]},
    {"type":"Polygon","coordinates":[[[120,50],[121,51],[122,52],[120,50]]]}
  ]'::jsonb) loop
    malformed_id := gen_random_uuid();
    insert into bustan.scan_candidates
      (id, name, kind, status, lat, lon, roof_geom, roof_area_sqm, estimated_kwp, external_source, external_id, footprint_class)
    values (malformed_id, v_tag, 'roof', 'pending', 50.95, 120.95, malformed, 64, 7, v_tag, malformed_id::text, 'roof');
    r4 := bustan.promote_scan_candidate(malformed_id);
    if exists (select 1 from bustan.properties where id = r4->>'property_id' and roof_geom is not null) then
      raise exception 'malformed_polygon_was_copied_to_property';
    end if;
  end loop;

  -- A non-null auth UID with no app_users role is also denied.
  if exists (select 1 from bustan.app_users where id = unknown_actor) then raise exception 'fixture_uid_collision'; end if;
  perform set_config('request.jwt.claim.sub', unknown_actor::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', unknown_actor, 'role', 'authenticated')::text, true);
  begin
    perform bustan.promote_scan_candidate(c1);
    raise exception 'unknown_auth_role_was_allowed';
  exception when insufficient_privilege then null;
  end;

  -- Unknown/missing auth identity must fail despite postgres fixture privileges.
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  begin
    perform bustan.promote_scan_candidate(c1);
    raise exception 'missing_auth_was_allowed';
  exception when insufficient_privilege then null;
  end;

  raise notice 'scan promotion fixture passed: neighbours, stable identity, legacy exact geometry, repeat target, unresolved legacy, permissions, unsafe sizing, malformed polygons';
end;
$$;

rollback;

-- Concurrent idempotence is enforced by FOR UPDATE (same candidate) and sorted
-- transaction advisory locks (shared identity/geometry). This single-session
-- rollback fixture does not claim to execute a two-connection concurrency test.
