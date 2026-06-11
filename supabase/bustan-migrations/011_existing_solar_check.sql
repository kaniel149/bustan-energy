-- Bustan schema — automated existing-solar detection for scan candidates + properties
-- Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), schema `bustan`.
--
-- WHY: operators report many current leads already have PV installed. This migration
-- adds the storage columns that api/cron-detect-solar.ts writes, then creates work-
-- queue indexes so the cron picks up only unchecked rows efficiently.
--
-- Flow:
--   cron-detect-solar runs every 10 min (offset 5-55/10) →
--   fetches unchecked scan_candidates (kind='roof', solar_checked_at IS NULL) +
--   unchecked properties (existing_solar IS NULL, solar_checked_at IS NULL) →
--   fetches Esri World Imagery aerial per row → Gemini 2.0 Flash strict-JSON →
--   writes existing_solar / solar_check_confidence / solar_checked_at back →
--   operator sees 🔴 "already has solar" badge on map candidates.
--
-- ADDITIVE + IDEMPOTENT.
-- Apply after 010_land_scan.sql.

-- ----------------------------------------------------------------
-- 1. scan_candidates: add existing-solar check columns
-- ----------------------------------------------------------------
alter table bustan.scan_candidates
  add column if not exists existing_solar         boolean,
  add column if not exists solar_check_confidence numeric,
  add column if not exists solar_checked_at       timestamptz;

comment on column bustan.scan_candidates.existing_solar is
  'True when Gemini aerial analysis detected PV panels already installed on this roof. Null = not yet checked.';
comment on column bustan.scan_candidates.solar_check_confidence is
  'Gemini confidence score [0-1] for the existing_solar determination. 0 = error/unclear.';
comment on column bustan.scan_candidates.solar_checked_at is
  'Timestamp of last cron-detect-solar run for this candidate. Null = not yet processed.';

-- Work-queue index: the cron selects pending roof candidates where solar_checked_at
-- IS NULL, ordered by priority asc, estimated_kwp desc.
-- Partial index keeps it small (only unprocessed pending roofs).
create index if not exists scan_candidates_solar_queue_idx
  on bustan.scan_candidates (priority asc, estimated_kwp desc nulls last)
  where kind = 'roof' and status = 'pending' and solar_checked_at is null;

-- Lookup index for on-demand re-checks by id array (POST handler).
create index if not exists scan_candidates_solar_checked_idx
  on bustan.scan_candidates (solar_checked_at)
  where solar_checked_at is null;

-- ----------------------------------------------------------------
-- 2. properties: add check-tracking columns (existing_solar already present)
-- ----------------------------------------------------------------
alter table bustan.properties
  add column if not exists solar_check_confidence numeric,
  add column if not exists solar_checked_at       timestamptz;

comment on column bustan.properties.solar_check_confidence is
  'Gemini confidence score [0-1] for the existing_solar determination on this property. 0 = error/unclear.';
comment on column bustan.properties.solar_checked_at is
  'Timestamp of last cron-detect-solar run for this property. Null = not yet processed.';

-- Work-queue index: the cron fills remaining slots with properties where
-- existing_solar IS NULL (meaning we have not yet determined it via aerial).
-- Solar_checked_at IS NULL guards against re-processing already-stamped rows.
create index if not exists properties_solar_queue_idx
  on bustan.properties (id)
  where existing_solar is null and solar_checked_at is null;
