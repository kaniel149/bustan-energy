-- Bustan schema -- scan_requests.attempts for cross-tick auto-retry of the
-- on-demand scan worker (api/cron-process-scans.ts).
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: the OSM Overpass API frequently returns 504/429 when overloaded. Without
-- a retry counter a transient failure left a scan 'failed' forever. The worker
-- now re-picks 'failed' (and stale 'running') scans until attempts reaches
-- MAX_ATTEMPTS (3), claiming an attempt at pickup so a mid-flight timeout still
-- counts and a perpetually-failing scan eventually gives up.
--
-- ADDITIVE + IDEMPOTENT. Apply manually to ygoiaabzkuvdsyyduvhv before deploying
-- the updated worker (the worker selects/writes `attempts`).

alter table bustan.scan_requests
  add column if not exists attempts integer not null default 0;

comment on column bustan.scan_requests.attempts is
  'Number of times the scan worker has claimed this request (incremented at pickup). Capped re-pickup at MAX_ATTEMPTS in cron-process-scans.ts.';
