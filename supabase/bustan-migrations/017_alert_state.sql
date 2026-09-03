-- 017_alert_state.sql — schema bustan on ygoiaabzkuvdsyyduvhv
-- Watermark for api/cron-alerts (service-role only; no client policies on purpose).
create table if not exists bustan.alert_state (
  key         text primary key,
  last_run_at timestamptz not null default now(),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table bustan.alert_state enable row level security;
