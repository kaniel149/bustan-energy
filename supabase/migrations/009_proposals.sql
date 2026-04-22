-- =====================================================
-- 009_proposals_extend.sql
-- Extends EXISTING proposals table + adds proposal_views
-- =====================================================
-- NOTE: Existing proposals table already has:
--   ref_number, system_size_kwp, panel_count, panel_model, panel_watt,
--   inverter_model, inverter_count, battery_kwh, total_price_thb,
--   monthly_savings_thb, annual_savings_thb, payback_years, roi_percent,
--   status, sent_at, viewed_at, signed_at, expires_at, html_url, pdf_url,
--   view_count, signature_data, options jsonb, selected_option
-- We add what's needed for password-gated proposal builder.

-- ── EXTEND existing proposals ──────────────────────────
alter table public.proposals add column if not exists password_hash text;
alter table public.proposals add column if not exists language text default 'he';
alter table public.proposals add column if not exists client_name text;
alter table public.proposals add column if not exists client_phone text;
alter table public.proposals add column if not exists client_email text;
alter table public.proposals add column if not exists location text;
alter table public.proposals add column if not exists first_viewed_at timestamptz;
alter table public.proposals add column if not exists metadata jsonb default '{}'::jsonb;

create index if not exists idx_proposals_ref_number on public.proposals(ref_number);
create index if not exists idx_proposals_status on public.proposals(status);

-- ── PROPOSAL VIEWS (new) ───────────────────────────────
create table if not exists public.proposal_views (
  id uuid primary key default gen_random_uuid(),
  proposal_ref text not null,
  viewed_at timestamptz default now(),
  ip inet,
  user_agent text,
  country text,
  city text,
  duration_seconds int,
  password_correct boolean default true,
  referrer text,
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_views_ref on public.proposal_views(proposal_ref);
create index if not exists idx_views_viewed on public.proposal_views(viewed_at desc);

-- ── TRIGGER: update proposal view_count + viewed_at ────
create or replace function update_proposal_on_view()
returns trigger as $$
begin
  if NEW.password_correct then
    update public.proposals
    set
      view_count = coalesce(view_count, 0) + 1,
      first_viewed_at = coalesce(first_viewed_at, NEW.viewed_at),
      viewed_at = NEW.viewed_at,
      status = case when status in ('draft','sent') then 'viewed' else status end
    where ref_number = NEW.proposal_ref;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_update_proposal_on_view on public.proposal_views;
create trigger trg_update_proposal_on_view
  after insert on public.proposal_views
  for each row execute function update_proposal_on_view();

-- ── RLS ────────────────────────────────────────────────
alter table public.proposal_views enable row level security;

drop policy if exists "service_role_all_views" on public.proposal_views;
create policy "service_role_all_views" on public.proposal_views
  for all using (auth.role() = 'service_role');

drop policy if exists "admin_read_views" on public.proposal_views;
create policy "admin_read_views" on public.proposal_views
  for select using (auth.role() = 'authenticated');

comment on table public.proposal_views is 'Tracks each view/unlock attempt on proposal URLs';
