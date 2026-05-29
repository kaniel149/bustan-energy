-- Bustan schema — role-based RLS write enforcement
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: today every `authenticated` user can write to every bustan table, so the
-- handoff requirement "viewer = read-only" is NOT enforced server-side — only the
-- client `can()` gate prevents it. This migration enforces the role matrix at the
-- database (RLS), the real security boundary.
--
-- Role matrix (mirrors src/lib/bustan-permissions.ts):
--   admin    → everything
--   sales    → crm_pipeline + owner_decision writes
--   engineer → site_surveys + om_sites writes
--   viewer   → read-only
-- Reads stay open to any authenticated user. activity_log stays read-only from
-- the client (written by the trg_log_crm_change trigger, SECURITY DEFINER).
--
-- ⚠️ BEFORE APPLYING: app_users is currently empty. Role-based writes require the
-- caller to have an app_users row. The signup trigger creates it (k@kanielt.com →
-- admin). Apply this together with a real login test so admin writes are confirmed
-- working before relying on the restriction.

-- Helper: the current user's role (null if no app_users row yet).
create or replace function bustan.current_role()
returns text
language sql
stable
security definer
set search_path = bustan, public
as $$
  select role from bustan.app_users where id = auth.uid()
$$;

-- crm_pipeline: admin + sales may write
drop policy if exists write_crm on bustan.crm_pipeline;
create policy write_crm on bustan.crm_pipeline
  for all to authenticated
  using (bustan.current_role() in ('admin', 'sales'))
  with check (bustan.current_role() in ('admin', 'sales'));

-- owner_decision: admin + sales may write
drop policy if exists write_owner on bustan.owner_decision;
create policy write_owner on bustan.owner_decision
  for all to authenticated
  using (bustan.current_role() in ('admin', 'sales'))
  with check (bustan.current_role() in ('admin', 'sales'));

-- site_surveys: admin + engineer may write
drop policy if exists write_survey on bustan.site_surveys;
create policy write_survey on bustan.site_surveys
  for all to authenticated
  using (bustan.current_role() in ('admin', 'engineer'))
  with check (bustan.current_role() in ('admin', 'engineer'));

-- om_sites: admin + engineer may write
drop policy if exists write_om on bustan.om_sites;
create policy write_om on bustan.om_sites
  for all to authenticated
  using (bustan.current_role() in ('admin', 'engineer'))
  with check (bustan.current_role() in ('admin', 'engineer'));

-- properties: admin only (core dataset)
drop policy if exists write_properties on bustan.properties;
create policy write_properties on bustan.properties
  for all to authenticated
  using (bustan.current_role() = 'admin')
  with check (bustan.current_role() = 'admin');

-- app_users: admin only (role management)
drop policy if exists write_users on bustan.app_users;
create policy write_users on bustan.app_users
  for all to authenticated
  using (bustan.current_role() = 'admin')
  with check (bustan.current_role() = 'admin');

-- NOTE: read policies (read_all_*, read_users, read_activity) are unchanged —
-- any authenticated user may read. Anonymous access stays blocked (no anon policy).
