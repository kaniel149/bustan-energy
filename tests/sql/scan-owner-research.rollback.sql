-- Execute as the administrative SQL runner after migrations 018 and 019.
-- Uses one existing admin as auth context, with temporary role changes. No
-- account/customer values are returned and every fixture change is rolled back.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  v_admin uuid;
  v_unknown uuid := gen_random_uuid();
  v_tag text := 'scan-owner-qa-' || gen_random_uuid()::text;
  c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid(); c4 uuid := gen_random_uuid();
  p1 text; p2 text;
  v_run uuid; v_old_run uuid;
  v_response jsonb; v_record jsonb; v_snapshot jsonb; v_bad jsonb;
  v_role text;
  v_result jsonb := '{"version":1,"status":"findings","searchedAt":"2026-09-07T00:00:00Z","nearby":[{"id":"fixture-business","name":"Fixture business","source":"candidate","distanceM":12}],"selectedBusiness":{"id":"fixture-business","name":"Fixture business","source":"candidate"},"findings":[{"kind":"manager","name":"Fixture manager","role":"General manager","sourceUrl":"https://example.com/team","excerpt":"Public professional role."}],"sources":[{"url":"https://example.com/team","title":"Team"}],"issues":[]}';
  v_review jsonb := '{"legalOwnerName":"Verified fixture owner","decisionMakerName":"Manual contact","decisionMakerRole":"Director","titleReference":"Fixture title 123","sourceUrl":"","evidenceNote":"Fixture-only inspected document reference.","status":"document_verified"}';
  v_contact jsonb := '{"status":"needs_review","company":{},"decisionMaker":{},"confidence":0.5,"sources":["https://example.com/team"],"ownershipStatus":"unverified","researchedAt":"2026-01-01T00:00:00Z","caller":"rollback-fixture"}';
begin
  select id into v_admin from bustan.app_users where role = 'admin' order by id limit 1;
  if v_admin is null then raise exception 'fixture_requires_existing_admin'; end if;
  if exists (select 1 from bustan.app_users where id = v_unknown) then raise exception 'fixture_uid_collision'; end if;
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  p1 := v_tag || '-manual-property'; p2 := v_tag || '-new-property';
  insert into bustan.properties (id, name) values (p1, v_tag), (p2, v_tag);
  insert into bustan.owner_decision
    (property_id, legal_owner_name, decision_maker_name, research_status, source_url, data)
  values (p1, 'Manual legal owner', 'Manual decision maker', 'verified', 'https://example.com/manual',
    '{"phone":"manual-phone","website":"https://example.com/manual","manualNote":"retain","otherData":{"keep":true}}');
  insert into bustan.scan_candidates (id, name, kind, status, lat, lon, external_source, external_id, footprint_class)
  values (c1, v_tag, 'roof', 'pending', 50, 120, v_tag, '1', 'roof'),
    (c2, v_tag, 'roof', 'pending', 50.01, 120.01, v_tag, '2', 'roof'),
    (c3, v_tag, 'roof', 'rejected', 50.02, 120.02, v_tag, '3', 'roof'),
    (c4, v_tag, 'roof', 'pending', 50.03, 120.03, v_tag, '4', 'roof');

  -- Reject untrusted actions/missing or rejected candidates without creating rows.
  begin perform bustan.begin_scan_owner_research(c1, 'delete'); raise exception 'bad_action_allowed';
    exception when invalid_parameter_value then null; end;
  begin perform bustan.begin_scan_owner_research(c1, null); raise exception 'null_action_allowed';
    exception when invalid_parameter_value then null; end;
  begin perform bustan.begin_scan_owner_research(v_unknown, 'discover'); raise exception 'unknown_candidate_allowed';
    exception when no_data_found then null; end;
  begin perform bustan.begin_scan_owner_research(c3, 'discover'); raise exception 'rejected_candidate_allowed';
    exception when invalid_parameter_value then null; end;

  v_response := bustan.begin_scan_owner_research(c1, 'discover');
  v_run := (v_response->>'runId')::uuid;
  if v_run is null or v_response#>>'{record,candidate_id}' <> c1::text then raise exception 'invalid_begin_contract'; end if;
  if (select locked_until - last_attempt_at from bustan.scan_owner_research where candidate_id = c1) <> interval '90 seconds' then
    raise exception 'incorrect_lease_length';
  end if;
  begin perform bustan.begin_scan_owner_research(c1, 'research'); raise exception 'same_candidate_concurrent_request_allowed';
    exception when sqlstate '55000' then null; end;
  begin perform bustan.begin_scan_owner_research(c2, 'discover'); raise exception 'same_user_parallel_request_allowed';
    exception when sqlstate '55000' then null; end;

  -- Emulate another lease owner's committed row, then try as our known admin.
  update bustan.scan_owner_research set last_attempt_by = v_unknown where candidate_id = c1;
  begin perform bustan.begin_scan_owner_research(c1, 'discover'); raise exception 'other_actor_candidate_lease_ignored';
    exception when sqlstate '55000' then null; end;
  begin perform bustan.finish_scan_owner_research(c1, v_run, v_result); raise exception 'another_actors_lease_finished';
    exception when sqlstate '55000' then null; end;
  update bustan.scan_owner_research set last_attempt_by = v_admin where candidate_id = c1;
  begin perform bustan.finish_scan_owner_research(c1, gen_random_uuid(), v_result); raise exception 'wrong_run_finished';
    exception when sqlstate '55000' then null; end;

  for v_bad in select value from jsonb_array_elements('[null,true,[],{},
    {"status":"document_verified"},{"status":"unverified","reviewedBy":"spoof"},
    {"status":"unverified","legalOwnerName":true},{"status":"unverified","legalOwnerName":null},
    {"status":"unverified","sourceUrl":"javascript:alert(1)"}]') loop
    begin perform bustan.save_scan_owner_review(c1, v_bad); raise exception 'invalid_review_allowed';
      exception when invalid_parameter_value then null; end;
  end loop;
  begin perform bustan.save_scan_owner_review(c1, jsonb_build_object('status','unverified','evidenceNote',repeat('x',4001)));
    raise exception 'oversized_review_allowed'; exception when invalid_parameter_value then null; end;

  -- Review during a network request must survive finish, including server audit.
  v_record := bustan.save_scan_owner_review(c1, v_review);
  if v_record->'review' <> v_review or (v_record->>'reviewed_at')::timestamptz is null
    or (select reviewed_by from bustan.scan_owner_research where candidate_id = c1) <> v_admin then
    raise exception 'review_or_server_audit_wrong';
  end if;
  if (select run_id from bustan.scan_owner_research where candidate_id = c1) <> v_run then raise exception 'review_cleared_lease'; end if;

  for v_bad in select value from jsonb_array_elements(jsonb_build_array(
    null, true, '[]'::jsonb, '{}'::jsonb, v_result || '{"review":{"status":"document_verified"}}'::jsonb,
    jsonb_set(v_result, '{findings,0,kind}', '"legal_owner"'),
    jsonb_set(v_result, '{findings,0,sourceUrl}', '"javascript:alert(1)"'),
    jsonb_set(v_result, '{nearby}', '{}'::jsonb))) loop
    begin perform bustan.finish_scan_owner_research(c1, v_run, v_bad); raise exception 'invalid_result_allowed';
      exception when invalid_parameter_value then null; end;
  end loop;
  v_record := bustan.finish_scan_owner_research(c1, v_run, v_result);
  if v_record->'review' <> v_review or v_record->'result' <> v_result then raise exception 'finish_overwrote_manual_review'; end if;
  if exists (select 1 from bustan.scan_owner_research where candidate_id = c1 and (run_id is not null or locked_until is not null)) then
    raise exception 'finish_did_not_release_lease';
  end if;
  begin perform bustan.finish_scan_owner_research(c1, v_run, v_result); raise exception 'completed_run_replayed';
    exception when sqlstate '55000' then null; end;
  begin perform bustan.begin_scan_owner_research(c1, 'discover'); raise exception 'same_action_cooldown_ignored';
    exception when sqlstate '55000' then null; end;
  v_response := bustan.begin_scan_owner_research(c1, 'research');
  v_run := (v_response->>'runId')::uuid;
  if v_response#>'{record,result}' <> v_result then raise exception 'begin_erased_last_result'; end if;

  -- Promotion into a manual CRM row copies only the namespaced snapshot.
  update bustan.scan_candidates set promoted_property_id = p1 where id = c1;
  v_snapshot := (select data->'scanOwnerResearch' from bustan.owner_decision where property_id = p1);
  if v_snapshot is distinct from v_record then raise exception 'promotion_snapshot_wrong'; end if;
  v_record := bustan.finish_scan_owner_research(c1, v_run, v_result || '{"issues":["Second research run"]}'::jsonb);
  if (select data->'scanOwnerResearch' from bustan.owner_decision where property_id = p1) is distinct from v_record then
    raise exception 'finish_snapshot_not_updated';
  end if;
  v_record := bustan.save_scan_owner_review(c1, v_review || '{"decisionMakerRole":"Updated manual role"}'::jsonb);
  if (select data->'scanOwnerResearch' from bustan.owner_decision where property_id = p1) is distinct from v_record then
    raise exception 'review_snapshot_not_updated';
  end if;

  -- An expired request cannot finish; a replacement invalidates its run ID.
  v_response := bustan.begin_scan_owner_research(c2, 'discover'); v_old_run := (v_response->>'runId')::uuid;
  update bustan.scan_owner_research set locked_until = clock_timestamp() - interval '1 second',
    last_attempt_at = clock_timestamp() - interval '2 minutes' where candidate_id = c2;
  begin perform bustan.finish_scan_owner_research(c2, v_old_run, v_result); raise exception 'expired_lease_finished';
    exception when sqlstate '55000' then null; end;
  v_response := bustan.begin_scan_owner_research(c2, 'discover'); v_run := (v_response->>'runId')::uuid;
  if v_run = v_old_run then raise exception 'replacement_reused_run_id'; end if;
  begin perform bustan.finish_scan_owner_research(c2, v_old_run, v_result); raise exception 'old_run_overwrote_replacement';
    exception when sqlstate '55000' then null; end;
  perform bustan.finish_scan_owner_research(c2, v_run, v_result);

  -- The real promotion RPC triggers an atomic snapshot into its newly made row.
  v_record := bustan.save_scan_owner_review(c4, v_review);
  v_response := bustan.promote_scan_candidate(c4);
  if (select data->'scanOwnerResearch' from bustan.owner_decision where property_id = v_response->>'property_id')
    is distinct from v_record then raise exception 'actual_promotion_lost_existing_research'; end if;

  -- Public functions have no inherited PUBLIC/anon grant. Private helpers and
  -- direct mutations stay inaccessible even to authorized operators.
  if has_function_privilege('anon', 'bustan.begin_scan_owner_research(uuid,text)', 'execute')
    or has_function_privilege('authenticated', 'bustan._sync_scan_owner_research(uuid)', 'execute')
    or has_function_privilege('authenticated', 'bustan.merge_contact_research(text,jsonb)', 'execute')
    or not has_function_privilege('service_role', 'bustan.merge_contact_research(text,jsonb)', 'execute') then
    raise exception 'incorrect_function_grants';
  end if;
  foreach v_role in array array['admin', 'sales', 'engineer', 'viewer'] loop
    update bustan.app_users set role = v_role where id = v_admin;
    update bustan.scan_owner_research set last_attempt_at = clock_timestamp() - interval '2 minutes' where candidate_id = c2;
    execute 'set local role authenticated';
    if (select count(*) from bustan.scan_owner_research where candidate_id = c1) <> 1 then raise exception 'registered_role_cannot_read'; end if;
    begin update bustan.scan_owner_research set result = '{}' where candidate_id = c1; raise exception 'direct_update_allowed';
      exception when insufficient_privilege then null; end;
    if v_role = 'viewer' then
      begin perform bustan.save_scan_owner_review(c1, v_review); raise exception 'viewer_review_allowed';
        exception when insufficient_privilege then null; end;
      begin perform bustan.begin_scan_owner_research(c2, 'research'); raise exception 'viewer_research_allowed';
        exception when insufficient_privilege then null; end;
      begin perform bustan.finish_scan_owner_research(c2, v_run, v_result); raise exception 'viewer_finish_allowed';
        exception when insufficient_privilege then null; end;
    else
      perform bustan.save_scan_owner_review(c1, v_review);
      v_response := bustan.begin_scan_owner_research(c2, 'research');
      perform bustan.finish_scan_owner_research(c2, (v_response->>'runId')::uuid, v_result);
    end if;
    execute 'reset role';
  end loop;
  update bustan.app_users set role = 'admin' where id = v_admin;

  perform set_config('request.jwt.claim.sub', v_unknown::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',v_unknown,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  if exists (select 1 from bustan.scan_owner_research where candidate_id = c1) then raise exception 'unknown_user_can_read'; end if;
  begin perform bustan.begin_scan_owner_research(c2, 'research'); raise exception 'unknown_user_can_begin';
    exception when insufficient_privilege then null; end;
  begin perform bustan.save_scan_owner_review(c1, v_review); raise exception 'unknown_user_can_review';
    exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  execute 'set local role authenticated';
  if exists (select 1 from bustan.scan_owner_research where candidate_id = c1) then raise exception 'missing_uid_can_read'; end if;
  begin perform bustan.begin_scan_owner_research(c2, 'research'); raise exception 'missing_uid_can_begin';
    exception when insufficient_privilege then null; end;
  execute 'reset role';

  execute 'set local role service_role';
  if bustan.merge_contact_research(v_tag || '-absent', v_contact) then raise exception 'contact_merge_claimed_absent_property'; end if;
  if not bustan.merge_contact_research(p1, v_contact) or not bustan.merge_contact_research(p2, v_contact) then
    raise exception 'contact_merge_failed';
  end if;
  execute 'reset role';
  if not exists (select 1 from bustan.owner_decision where property_id = p1
    and legal_owner_name = 'Manual legal owner' and decision_maker_name = 'Manual decision maker'
    and research_status = 'verified' and source_url = 'https://example.com/manual'
    and data->>'phone' = 'manual-phone' and data->>'website' = 'https://example.com/manual'
    and data->>'manualNote' = 'retain' and data#>>'{otherData,keep}' = 'true'
    and data->'scanOwnerResearch' is not null and data->'contactResearch' = v_contact
    and (data->>'lastResearchedAt')::timestamptz > '2026-01-01T00:00:00Z'::timestamptz) then
    raise exception 'research_merge_changed_canonical_or_manual_fields';
  end if;
  if not exists (select 1 from bustan.owner_decision where property_id = p2 and research_status = 'pending'
    and legal_owner_name is null and decision_maker_name is null and data->'contactResearch' = v_contact) then
    raise exception 'contact_merge_new_row_wrong';
  end if;

  delete from bustan.scan_candidates where id = c2;
  if exists (select 1 from bustan.scan_owner_research where candidate_id = c2) then raise exception 'candidate_delete_did_not_cascade'; end if;
  raise notice 'scan owner research fixture passed: leases, cooldown, review audit, untrusted input, roles/RLS, promotion, canonical preservation, atomic contact merge and cascade';
end;
$$;
rollback;

-- This single-session fixture tests committed lease states and rejects stale,
-- repeated and overlapping attempts. It does not simulate two connections.
-- Cross-transaction serialization is enforced by the actor advisory lock and
-- candidate FOR UPDATE locks; both persist until the caller transaction ends.
