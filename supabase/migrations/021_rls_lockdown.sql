-- 021_rls_lockdown.sql
-- Project: trvgpgpsqvvdsudpgwpm (site/CRM)
--
-- WHY: verified 2026-08-23 — the public anon key (present in every deployed
-- JS bundle, and additionally published in plaintext at
-- https://index.bustan-energy.com/DRONE_ORTHOMOSAIC_HANDOFF.md) grants
-- unauthenticated SELECT on:
--     proposals   8 rows  -- client_name, client_phone, client_email,
--                         -- total_price_thb, password_hash, signature_data
--     buildings   30,258 rows
--     activities  1 row
-- Every other table already denies anon.
--
-- BREAKING CHANGE — these public, unauthenticated pages read those tables
-- with the anon key and WILL stop working after this migration:
--     bustan-index/platform/pro/index.html            (buildings, proposals, leads, activities, zones)
--     bustan-index/platform/pro/generate-proposal.html (buildings, proposals)
-- That is the intended outcome: they are internal tools served on a public
-- URL with no auth. Equivalent functionality exists in the authenticated
-- /admin app (Proposal Builder in CRM Dashboard / LeadDetail).
--
-- NOT affected: api/* serverless functions (service_role bypasses RLS) and
-- src/lib/admin-service.ts (runs as an authenticated Supabase session).

begin;

-- 1. proposals — customer PII, proposal password hashes, e-signatures.
--    Authenticated staff only. Public clients reach their proposal through
--    /api/proposal-serve, which uses the service_role key server-side.
alter table public.proposals enable row level security;

drop policy if exists "proposals_authenticated_all" on public.proposals;
create policy "proposals_authenticated_all"
  on public.proposals
  for all
  to authenticated
  using (true)
  with check (true);

-- 2. buildings — 30k scanned roof records; commercially sensitive prospect list.
alter table public.buildings enable row level security;

drop policy if exists "buildings_authenticated_read" on public.buildings;
create policy "buildings_authenticated_read"
  on public.buildings
  for select
  to authenticated
  using (true);

-- 3. activities
alter table public.activities enable row level security;

drop policy if exists "activities_authenticated_all" on public.activities;
create policy "activities_authenticated_all"
  on public.activities
  for all
  to authenticated
  using (true)
  with check (true);

commit;

-- VERIFY after applying (should print 0 rows for all three):
--   curl -s "https://trvgpgpsqvvdsudpgwpm.supabase.co/rest/v1/proposals?select=id" \
--     -H "apikey: $VITE_SUPABASE_ANON_KEY"
--
-- ROLLBACK:
--   alter table public.proposals  disable row level security;
--   alter table public.buildings  disable row level security;
--   alter table public.activities disable row level security;
