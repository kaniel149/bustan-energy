-- Bustan scan owner research: sourced findings and explicit human review.
-- Created with `supabase migration new scan_owner_research`, then moved here to
-- follow the project's numbered Bustan migration convention. Requires 018.
-- Automated findings are never canonical proof of legal property ownership.

create table if not exists bustan.scan_owner_research (
  candidate_id uuid primary key references bustan.scan_candidates(id) on delete cascade,
  result jsonb,
  review jsonb,
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  last_attempt_at timestamptz,
  last_attempt_by uuid,
  last_action text check (last_action in ('discover', 'research')),
  run_id uuid,
  locked_until timestamptz,
  constraint scan_owner_result_object check (result is null or jsonb_typeof(result) = 'object'),
  constraint scan_owner_review_object check (review is null or jsonb_typeof(review) = 'object')
);

create index if not exists scan_owner_research_actor_lease_idx
  on bustan.scan_owner_research (last_attempt_by, locked_until)
  where locked_until is not null;

alter table bustan.scan_owner_research enable row level security;
revoke all on bustan.scan_owner_research from public, anon, authenticated, service_role;
grant select on bustan.scan_owner_research to authenticated, service_role;
drop policy if exists read_scan_owner_research on bustan.scan_owner_research;
create policy read_scan_owner_research on bustan.scan_owner_research
  for select to authenticated using (
    (select auth.uid()) is not null
    and (select bustan.current_role()) in ('admin', 'sales', 'engineer', 'viewer')
  );

-- Lease internals are deliberately absent from the public record/snapshot.
create or replace function bustan._scan_owner_research_record(p_row bustan.scan_owner_research)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'candidate_id', p_row.candidate_id, 'result', p_row.result, 'review', p_row.review,
    'updated_at', p_row.updated_at, 'reviewed_at', p_row.reviewed_at
  );
$$;
revoke all on function bustan._scan_owner_research_record(bustan.scan_owner_research)
  from public, anon, authenticated, service_role;

-- Callers hold the candidate lock before changing its research. Promotion also
-- holds that lock, so snapshots cannot race a result/review or miss a promotion.
create or replace function bustan._sync_scan_owner_research(p_candidate_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_property_id text;
  v_record bustan.scan_owner_research;
begin
  select promoted_property_id into v_property_id
  from bustan.scan_candidates where id = p_candidate_id;
  if v_property_id is null then return; end if;
  select * into v_record from bustan.scan_owner_research where candidate_id = p_candidate_id;
  if not found then return; end if;

  insert into bustan.owner_decision as existing (property_id, research_status, data)
  values (v_property_id, 'pending', jsonb_build_object(
    'scanOwnerResearch', bustan._scan_owner_research_record(v_record)))
  on conflict (property_id) do update
    set data = existing.data || excluded.data, updated_at = clock_timestamp();
end;
$$;
revoke all on function bustan._sync_scan_owner_research(uuid)
  from public, anon, authenticated, service_role;

create or replace function bustan._scan_owner_research_on_promotion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.promoted_property_id is not null and
    (tg_op = 'INSERT' or old.promoted_property_id is distinct from new.promoted_property_id) then
    perform bustan._sync_scan_owner_research(new.id);
  end if;
  return new;
end;
$$;
revoke all on function bustan._scan_owner_research_on_promotion()
  from public, anon, authenticated, service_role;
drop trigger if exists scan_owner_research_on_promotion on bustan.scan_candidates;
create trigger scan_owner_research_on_promotion
  after insert or update of promoted_property_id on bustan.scan_candidates
  for each row execute function bustan._scan_owner_research_on_promotion();

create or replace function bustan.begin_scan_owner_research(p_candidate_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_record bustan.scan_owner_research;
  v_now timestamptz;
begin
  if v_actor is null or coalesce(bustan.current_role(), '') not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: owner research requires an authorized operator' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('discover', 'research') then
    raise exception 'invalid_action: expected discover or research' using errcode = '22023';
  end if;

  -- Serialize attempts by this user even when they target different candidates.
  perform pg_advisory_xact_lock(hashtextextended('bustan.scan_owner_research:' || v_actor::text, 0));
  select status into v_status from bustan.scan_candidates where id = p_candidate_id for update;
  if not found then raise exception 'not_found: scan candidate does not exist' using errcode = 'P0002'; end if;
  if v_status = 'rejected' then raise exception 'rejected_candidate: owner research is unavailable' using errcode = '22023'; end if;
  v_now := clock_timestamp();

  if exists (select 1 from bustan.scan_owner_research
    where last_attempt_by = v_actor and locked_until > v_now) then
    raise exception 'active_research: this operator already has a running request' using errcode = '55000';
  end if;

  insert into bustan.scan_owner_research (candidate_id) values (p_candidate_id) on conflict do nothing;
  select * into v_record from bustan.scan_owner_research where candidate_id = p_candidate_id for update;
  if v_record.locked_until > v_now then
    raise exception 'active_research: this candidate already has a running request' using errcode = '55000';
  end if;
  if v_record.last_action = p_action and v_record.last_attempt_at > v_now - interval '60 seconds' then
    raise exception 'research_cooldown: wait 60 seconds before repeating this action' using errcode = '55000';
  end if;

  update bustan.scan_owner_research
  set last_attempt_at = v_now, last_attempt_by = v_actor, last_action = p_action,
    run_id = gen_random_uuid(), locked_until = v_now + interval '90 seconds'
  where candidate_id = p_candidate_id returning * into v_record;
  return jsonb_build_object('runId', v_record.run_id, 'record', bustan._scan_owner_research_record(v_record));
end;
$$;
revoke all on function bustan.begin_scan_owner_research(uuid, text) from public, anon, authenticated, service_role;
grant execute on function bustan.begin_scan_owner_research(uuid, text) to authenticated;

create or replace function bustan.finish_scan_owner_research(p_candidate_id uuid, p_run_id uuid, p_result jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_record bustan.scan_owner_research;
  v_item jsonb;
  v_key text;
begin
  if v_actor is null or coalesce(bustan.current_role(), '') not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: owner research requires an authorized operator' using errcode = '42501';
  end if;
  select status into v_status from bustan.scan_candidates where id = p_candidate_id for update;
  if not found then raise exception 'not_found: scan candidate does not exist' using errcode = 'P0002'; end if;
  if v_status = 'rejected' then raise exception 'rejected_candidate: owner research is unavailable' using errcode = '22023'; end if;
  select * into v_record from bustan.scan_owner_research where candidate_id = p_candidate_id for update;
  if not found or p_run_id is null or v_record.run_id is distinct from p_run_id
    or v_record.last_attempt_by is distinct from v_actor
    or v_record.locked_until is null or v_record.locked_until <= clock_timestamp() then
    raise exception 'stale_research: this request no longer owns the active lease' using errcode = '55000';
  end if;

  -- Bound untrusted output and keep only the documented evidence model. Legal
  -- ownership verification belongs exclusively to the separately audited review.
  if p_result is null or jsonb_typeof(p_result) <> 'object' or octet_length(p_result::text) > 262144 then
    raise exception 'invalid_result: expected a bounded research object' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(p_result) k
    where k not in ('version', 'status', 'searchedAt', 'nearby', 'selectedBusiness', 'findings', 'sources', 'issues'))
    or p_result->'version' is distinct from '1'::jsonb
    or coalesce(p_result->>'status', '') not in ('needs_identity', 'findings', 'not_found', 'failed')
    or jsonb_typeof(p_result->'searchedAt') is distinct from 'string'
    or length(p_result->>'searchedAt') not between 1 and 64
    or jsonb_typeof(p_result->'nearby') is distinct from 'array'
    or jsonb_typeof(p_result->'findings') is distinct from 'array'
    or jsonb_typeof(p_result->'sources') is distinct from 'array'
    or jsonb_typeof(p_result->'issues') is distinct from 'array' then
    raise exception 'invalid_result: invalid research fields' using errcode = '22023';
  end if;
  if jsonb_array_length(p_result->'nearby') > 20 or jsonb_array_length(p_result->'findings') > 30
    or jsonb_array_length(p_result->'sources') > 40 or jsonb_array_length(p_result->'issues') > 30 then
    raise exception 'invalid_result: too many research entries' using errcode = '22023';
  end if;
  if p_result ? 'selectedBusiness' and jsonb_typeof(p_result->'selectedBusiness') <> 'object' then
    raise exception 'invalid_result: selectedBusiness must be an object' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements((p_result->'nearby') ||
    case when p_result ? 'selectedBusiness' then jsonb_build_array(p_result->'selectedBusiness') else '[]'::jsonb end)
  loop
    if jsonb_typeof(v_item) <> 'object' or jsonb_typeof(v_item->'id') is distinct from 'string'
      or length(v_item->>'id') not between 1 and 300
      or jsonb_typeof(v_item->'name') is distinct from 'string' or length(v_item->>'name') not between 1 and 500
      or coalesce(v_item->>'source', '') not in ('google_places', 'candidate', 'manual') then
      raise exception 'invalid_result: invalid business match' using errcode = '22023';
    end if;
    foreach v_key in array array['website', 'phone', 'address', 'mapsUrl'] loop
      if v_item ? v_key and (jsonb_typeof(v_item->v_key) <> 'string' or length(v_item->>v_key) > 2048) then
        raise exception 'invalid_result: invalid business detail' using errcode = '22023';
      end if;
    end loop;
    if v_item ? 'distanceM' then
      if jsonb_typeof(v_item->'distanceM') <> 'number' then
        raise exception 'invalid_result: invalid business distance' using errcode = '22023';
      end if;
      if (v_item->>'distanceM')::numeric < 0 then
        raise exception 'invalid_result: invalid business distance' using errcode = '22023';
      end if;
    end if;
  end loop;
  for v_item in select value from jsonb_array_elements(p_result->'findings') loop
    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item->>'kind', '') not in ('business_owner', 'founder', 'manager', 'operator', 'company', 'business_contact')
      or jsonb_typeof(v_item->'name') is distinct from 'string' or length(v_item->>'name') not between 1 and 500
      or jsonb_typeof(v_item->'role') is distinct from 'string' or length(v_item->>'role') > 500
      or jsonb_typeof(v_item->'sourceUrl') is distinct from 'string'
      or length(v_item->>'sourceUrl') > 2048 or v_item->>'sourceUrl' !~* '^https?://[^[:space:]]+$'
      or jsonb_typeof(v_item->'excerpt') is distinct from 'string' or length(v_item->>'excerpt') > 4000 then
      raise exception 'invalid_result: findings require a public source and professional role' using errcode = '22023';
    end if;
    if v_item ? 'sourceDate' and (jsonb_typeof(v_item->'sourceDate') <> 'string' or length(v_item->>'sourceDate') > 100) then
      raise exception 'invalid_result: invalid source date' using errcode = '22023';
    end if;
  end loop;
  for v_item in select value from jsonb_array_elements(p_result->'sources') loop
    if jsonb_typeof(v_item) <> 'object' or jsonb_typeof(v_item->'url') is distinct from 'string'
      or length(v_item->>'url') > 2048 or v_item->>'url' !~* '^https?://[^[:space:]]+$'
      or jsonb_typeof(v_item->'title') is distinct from 'string' or length(v_item->>'title') > 500 then
      raise exception 'invalid_result: invalid source' using errcode = '22023';
    end if;
  end loop;
  for v_item in select value from jsonb_array_elements(p_result->'issues') loop
    if jsonb_typeof(v_item) <> 'string' or length(v_item #>> '{}') > 2000 then
      raise exception 'invalid_result: invalid issue' using errcode = '22023';
    end if;
  end loop;

  update bustan.scan_owner_research set result = p_result, updated_at = clock_timestamp(),
    run_id = null, locked_until = null where candidate_id = p_candidate_id returning * into v_record;
  perform bustan._sync_scan_owner_research(p_candidate_id);
  return bustan._scan_owner_research_record(v_record);
end;
$$;
revoke all on function bustan.finish_scan_owner_research(uuid, uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function bustan.finish_scan_owner_research(uuid, uuid, jsonb) to authenticated;

create or replace function bustan.save_scan_owner_review(p_candidate_id uuid, p_review jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_key text;
  v_review jsonb := '{}'::jsonb;
  v_value text;
  v_limit integer;
  v_record bustan.scan_owner_research;
begin
  if v_actor is null or coalesce(bustan.current_role(), '') not in ('admin', 'sales', 'engineer') then
    raise exception 'insufficient_privilege: owner review requires an authorized operator' using errcode = '42501';
  end if;
  if p_review is null or jsonb_typeof(p_review) <> 'object' or octet_length(p_review::text) > 32768 then
    raise exception 'invalid_review: expected a bounded review object' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(p_review) k where k not in
    ('legalOwnerName', 'decisionMakerName', 'decisionMakerRole', 'titleReference', 'sourceUrl', 'evidenceNote', 'status')) then
    raise exception 'invalid_review: unknown review field' using errcode = '22023';
  end if;
  foreach v_key in array array['legalOwnerName', 'decisionMakerName', 'decisionMakerRole', 'titleReference', 'sourceUrl', 'evidenceNote', 'status'] loop
    if p_review ? v_key and jsonb_typeof(p_review->v_key) <> 'string' then
      raise exception 'invalid_review: % must be text', v_key using errcode = '22023';
    end if;
    v_value := btrim(coalesce(p_review->>v_key, ''));
    v_limit := case v_key when 'titleReference' then 500 when 'sourceUrl' then 2048 when 'evidenceNote' then 4000 else 250 end;
    if length(v_value) > v_limit then
      raise exception 'invalid_review: % is too long', v_key using errcode = '22023';
    end if;
    v_review := v_review || jsonb_build_object(v_key, v_value);
  end loop;
  if v_review->>'status' not in ('unverified', 'document_verified') then
    raise exception 'invalid_review: unsupported review status' using errcode = '22023';
  end if;
  if v_review->>'sourceUrl' <> '' and v_review->>'sourceUrl' !~* '^https?://[^[:space:]]+$' then
    raise exception 'invalid_review: sourceUrl must be an http(s) URL' using errcode = '22023';
  end if;
  if v_review->>'status' = 'document_verified' and
    (v_review->>'legalOwnerName' = '' or v_review->>'titleReference' = '' or v_review->>'evidenceNote' = '') then
    raise exception 'invalid_review: document verification requires owner, title reference and evidence note' using errcode = '22023';
  end if;

  select status into v_status from bustan.scan_candidates where id = p_candidate_id for update;
  if not found then raise exception 'not_found: scan candidate does not exist' using errcode = 'P0002'; end if;
  if v_status = 'rejected' then raise exception 'rejected_candidate: owner review is unavailable' using errcode = '22023'; end if;
  insert into bustan.scan_owner_research as existing (candidate_id, review, reviewed_at, reviewed_by, updated_at)
  values (p_candidate_id, v_review, clock_timestamp(), v_actor, clock_timestamp())
  on conflict (candidate_id) do update set review = excluded.review,
    reviewed_at = excluded.reviewed_at, reviewed_by = excluded.reviewed_by, updated_at = excluded.updated_at
  returning * into v_record;
  perform bustan._sync_scan_owner_research(p_candidate_id);
  return bustan._scan_owner_research_record(v_record);
end;
$$;
revoke all on function bustan.save_scan_owner_review(uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function bustan.save_scan_owner_review(uuid, jsonb) to authenticated;

-- Backend-only companion for property contact research. This never writes the
-- canonical identity columns, research_status or existing manual JSON fields.
create or replace function bustan.merge_contact_research(p_property_id text, p_research jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_written integer;
begin
  if p_research is null or jsonb_typeof(p_research) <> 'object' or octet_length(p_research::text) > 262144 then
    raise exception 'invalid_research: expected a bounded contact research object' using errcode = '22023';
  end if;
  insert into bustan.owner_decision as existing (property_id, research_status, data)
  select p.id, 'pending', jsonb_build_object(
    'contactResearch', p_research, 'lastResearchedAt', clock_timestamp())
  from bustan.properties p where p.id = p_property_id
  on conflict (property_id) do update
    set data = existing.data || excluded.data, updated_at = clock_timestamp();
  get diagnostics v_written = row_count;
  return v_written > 0;
end;
$$;
revoke all on function bustan.merge_contact_research(text, jsonb) from public, anon, authenticated, service_role;
grant execute on function bustan.merge_contact_research(text, jsonb) to service_role;

comment on table bustan.scan_owner_research is
  'Public-source professional research and separately audited human review; automated findings do not establish legal property ownership.';
