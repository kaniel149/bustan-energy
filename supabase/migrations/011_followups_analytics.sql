-- =====================================================
-- 011_followups_analytics.sql
-- Scheduled follow-ups + analytics event tracking
-- =====================================================

-- ── FOLLOW-UPS ─────────────────────────────────────────
create table if not exists public.proposal_followups (
  id uuid primary key default gen_random_uuid(),
  proposal_ref text not null,
  followup_type text not null,                -- 'not_viewed_3d', 'not_signed_after_view_5d', 'expiring_soon'
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  channel text default 'email',               -- 'email' | 'whatsapp' | 'both'
  recipient text,
  status text default 'pending',              -- 'pending' | 'sent' | 'cancelled' | 'failed'
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_followups_scheduled on public.proposal_followups(scheduled_for) where status = 'pending';
create index if not exists idx_followups_ref on public.proposal_followups(proposal_ref);

-- ── ANALYTICS EVENTS ───────────────────────────────────
-- Lightweight event log for admin dashboard stats
create table if not exists public.proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_ref text not null,
  event_type text not null,                   -- 'sent', 'viewed_first', 'viewed_return', 'scroll_milestone', 'contract_viewed', 'signed', 'pdf_downloaded'
  event_data jsonb default '{}'::jsonb,
  occurred_at timestamptz default now()
);

create index if not exists idx_events_ref on public.proposal_events(proposal_ref);
create index if not exists idx_events_type on public.proposal_events(event_type, occurred_at desc);
create index if not exists idx_events_date on public.proposal_events(occurred_at desc);

-- ── RLS ────────────────────────────────────────────────
alter table public.proposal_followups enable row level security;
alter table public.proposal_events enable row level security;

drop policy if exists "service_role_all_followups" on public.proposal_followups;
create policy "service_role_all_followups" on public.proposal_followups
  for all using (auth.role() = 'service_role');

drop policy if exists "admin_read_followups" on public.proposal_followups;
create policy "admin_read_followups" on public.proposal_followups
  for select using (auth.role() = 'authenticated');

drop policy if exists "service_role_all_events" on public.proposal_events;
create policy "service_role_all_events" on public.proposal_events
  for all using (auth.role() = 'service_role');

drop policy if exists "admin_read_events" on public.proposal_events;
create policy "admin_read_events" on public.proposal_events
  for select using (auth.role() = 'authenticated');

-- ── AUTO-SCHEDULE follow-ups on proposal send ──
create or replace function schedule_followups_on_send()
returns trigger as $$
begin
  -- Only schedule on transition to 'sent' status
  if NEW.status = 'sent' and (OLD.status is null or OLD.status != 'sent') then
    -- Cancel any pending followups for this proposal
    update public.proposal_followups
    set status = 'cancelled'
    where proposal_ref = NEW.ref_number and status = 'pending';

    -- Schedule new ones
    insert into public.proposal_followups (proposal_ref, followup_type, scheduled_for, recipient)
    values
      (NEW.ref_number, 'not_viewed_3d', NEW.sent_at + interval '3 days', NEW.client_email),
      (NEW.ref_number, 'not_viewed_7d', NEW.sent_at + interval '7 days', NEW.client_email),
      (NEW.ref_number, 'expiring_soon', NEW.expires_at - interval '3 days', NEW.client_email);
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_schedule_followups on public.proposals;
create trigger trg_schedule_followups
  after insert or update on public.proposals
  for each row execute function schedule_followups_on_send();

-- ── CANCEL follow-ups on view/sign ──
create or replace function cancel_followups_on_action()
returns trigger as $$
begin
  if TG_OP = 'INSERT' and NEW.password_correct then
    -- Cancel 'not_viewed_*' followups
    update public.proposal_followups
    set status = 'cancelled'
    where proposal_ref = NEW.proposal_ref
      and followup_type like 'not_viewed%'
      and status = 'pending';
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_cancel_followups_on_view on public.proposal_views;
create trigger trg_cancel_followups_on_view
  after insert on public.proposal_views
  for each row execute function cancel_followups_on_action();

-- ── ANALYTICS HELPER: stats materialized view ──
create or replace view public.proposal_stats as
select
  date_trunc('day', created_at)::date as day,
  count(*) filter (where status = 'draft') as drafts,
  count(*) filter (where status = 'sent') as sent,
  count(*) filter (where status = 'viewed') as viewed,
  count(*) filter (where status = 'signed') as signed,
  count(*) filter (where status = 'rejected') as rejected,
  count(*) as total,
  sum(total_price_thb) filter (where status = 'signed') as signed_value_thb,
  avg(extract(epoch from (first_viewed_at - sent_at))/3600) filter (where first_viewed_at is not null) as avg_hours_to_view,
  avg(extract(epoch from (signed_at - first_viewed_at))/3600) filter (where signed_at is not null and first_viewed_at is not null) as avg_hours_view_to_sign
from public.proposals
group by day
order by day desc;

comment on table public.proposal_followups is 'Scheduled follow-up actions per proposal';
comment on table public.proposal_events is 'Lightweight analytics event log';
comment on view public.proposal_stats is 'Daily aggregate stats for admin dashboard';
