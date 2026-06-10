-- =====================================================
-- 018_email_drip.sql
-- Email drip system: sequences + steps + send queue
-- Welcome sequence for new website leads (day 0/3/7/14)
-- Processed by /api/cron-email-queue (hourly)
-- =====================================================

-- ── SEQUENCES (drip campaign definitions) ──────────────
create table if not exists public.email_sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_event text not null default 'lead_created',  -- 'lead_created' | 'manual'
  active boolean not null default true,
  created_at timestamptz default now()
);

-- ── STEPS (emails within a sequence) ───────────────────
create table if not exists public.email_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.email_sequences(id) on delete cascade,
  step_order int not null,
  delay_days int not null default 0,
  subject text not null,
  template_key text not null,                          -- maps to api/_lib/drip-templates.ts
  created_at timestamptz default now(),
  unique (sequence_id, step_order)
);

-- ── QUEUE (scheduled sends, one row per step per lead) ─
create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  sequence_id uuid not null references public.email_sequences(id) on delete cascade,
  step_id uuid not null references public.email_sequence_steps(id) on delete cascade,
  recipient text not null,
  recipient_name text,
  send_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending',              -- 'pending' | 'sent' | 'failed' | 'cancelled'
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Never enroll the same email address in the same step twice
create unique index if not exists idx_email_queue_dedupe
  on public.email_queue(recipient, step_id);
create index if not exists idx_email_queue_pending
  on public.email_queue(send_at) where status = 'pending';
create index if not exists idx_email_queue_project
  on public.email_queue(project_id);

-- ── RLS (same pattern as 011: service role writes, admins read) ──
alter table public.email_sequences enable row level security;
alter table public.email_sequence_steps enable row level security;
alter table public.email_queue enable row level security;

drop policy if exists "service_role_all_email_sequences" on public.email_sequences;
create policy "service_role_all_email_sequences" on public.email_sequences
  for all using (auth.role() = 'service_role');

drop policy if exists "admin_read_email_sequences" on public.email_sequences;
create policy "admin_read_email_sequences" on public.email_sequences
  for select using (auth.role() = 'authenticated');

drop policy if exists "service_role_all_email_sequence_steps" on public.email_sequence_steps;
create policy "service_role_all_email_sequence_steps" on public.email_sequence_steps
  for all using (auth.role() = 'service_role');

drop policy if exists "admin_read_email_sequence_steps" on public.email_sequence_steps;
create policy "admin_read_email_sequence_steps" on public.email_sequence_steps
  for select using (auth.role() = 'authenticated');

drop policy if exists "service_role_all_email_queue" on public.email_queue;
create policy "service_role_all_email_queue" on public.email_queue
  for all using (auth.role() = 'service_role');

drop policy if exists "admin_read_email_queue" on public.email_queue;
create policy "admin_read_email_queue" on public.email_queue
  for select using (auth.role() = 'authenticated');

-- ── SEED: Bustan Energy welcome drip (EN, day 0/3/7/14) ──
-- Fixed UUIDs so re-running the migration is a no-op.
insert into public.email_sequences (id, name, trigger_event, active)
values (
  '7d1f4c0a-2b6e-4e8f-9a3d-5c0b1e2f3a4d',
  'Bustan Energy — Island Solar Welcome (EN)',
  'lead_created',
  true
)
on conflict (id) do nothing;

insert into public.email_sequence_steps (id, sequence_id, step_order, delay_days, subject, template_key) values
  ('1a2b3c4d-0001-4a01-8001-aaaaaaaa0001', '7d1f4c0a-2b6e-4e8f-9a3d-5c0b1e2f3a4d', 1, 0,
   'Welcome to Bustan Energy — here''s what happens next', 'welcome_day0'),
  ('1a2b3c4d-0002-4a02-8002-aaaaaaaa0002', '7d1f4c0a-2b6e-4e8f-9a3d-5c0b1e2f3a4d', 2, 3,
   'What solar actually saves on Ko Phangan', 'welcome_day3'),
  ('1a2b3c4d-0003-4a03-8003-aaaaaaaa0003', '7d1f4c0a-2b6e-4e8f-9a3d-5c0b1e2f3a4d', 3, 7,
   'From roof survey to switch-on: how an island install works', 'welcome_day7'),
  ('1a2b3c4d-0004-4a04-8004-aaaaaaaa0004', '7d1f4c0a-2b6e-4e8f-9a3d-5c0b1e2f3a4d', 4, 14,
   'The questions island owners ask before going solar', 'welcome_day14')
on conflict (id) do nothing;
