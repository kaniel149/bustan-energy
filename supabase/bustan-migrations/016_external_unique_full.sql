-- 016_external_unique_full.sql — schema bustan on ygoiaabzkuvdsyyduvhv
-- PostgREST on_conflict inference (scripts/ingest-kp-scan.mjs upsert) needs a
-- non-partial unique constraint. NULL external_id never conflicts in a unique
-- index anyway, so the partial WHERE from 015 was unnecessary.
-- Applied 2026-09-03 via Supabase MCP (team lead); file kept for the record.
drop index if exists bustan.uq_scan_candidates_external;
alter table bustan.scan_candidates add constraint uq_scan_candidates_external unique (external_source, external_id);
drop index if exists bustan.uq_properties_external;
alter table bustan.properties add constraint uq_properties_external unique (external_source, external_id);
