-- ============================================================
-- Migration: 009_buildings_external.sql
-- Purpose : Pre-loaded Overture (+ any future external source)
--           buildings for area-scan worker.  The edge worker
--           can't query Overture parquet/DuckDB live, so an
--           ingestion script writes rows here and the worker
--           reads them alongside OSM Overpass for denser coverage.
--
-- MANUAL APPLY:
--   psql "$BUSTAN_DB_URL" -f supabase/bustan-migrations/009_buildings_external.sql
--   -- or --
--   supabase db push --db-url "$BUSTAN_DB_URL" \
--     --file supabase/bustan-migrations/009_buildings_external.sql
--
-- Idempotent: all statements use IF NOT EXISTS / DO NOTHING.
-- ============================================================

-- Ensure the bustan schema exists (created by 001; guard only)
CREATE SCHEMA IF NOT EXISTS bustan;

-- --------------------------------------------------------
-- Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS bustan.buildings_external (
  id          text        PRIMARY KEY,
  source      text        NOT NULL DEFAULT 'overture',
  lat         numeric     NOT NULL,
  lon         numeric     NOT NULL,
  roof_geom   jsonb,
  area_sqm    numeric,
  height      numeric,
  name        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE bustan.buildings_external IS
  'Pre-loaded building footprints from external sources (Overture Maps, etc.) '
  'for use by the area-scan worker when OSM coverage is sparse. '
  'Ingested offline by scripts/ingest_overture_buildings.py; NOT written by the worker.';

-- --------------------------------------------------------
-- Indexes  (support bbox range queries: lat BETWEEN x AND y,
--           lon BETWEEN x AND y, plus source-level filtering)
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS buildings_external_lat_idx
  ON bustan.buildings_external (lat);

CREATE INDEX IF NOT EXISTS buildings_external_lon_idx
  ON bustan.buildings_external (lon);

CREATE INDEX IF NOT EXISTS buildings_external_source_idx
  ON bustan.buildings_external (source);

-- --------------------------------------------------------
-- RLS
-- --------------------------------------------------------
ALTER TABLE bustan.buildings_external ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read (operator map UI, QA scripts).
-- No INSERT/UPDATE/DELETE policy: only service role (ingestion
-- script) may write.  Client code is never given the service key.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bustan'
      AND tablename  = 'buildings_external'
      AND policyname = 'read_buildings_external'
  ) THEN
    CREATE POLICY read_buildings_external
      ON bustan.buildings_external
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
