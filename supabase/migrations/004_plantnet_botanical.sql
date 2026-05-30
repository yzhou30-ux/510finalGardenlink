-- 004_plantnet_botanical.sql
-- Add structured botanical fields for PlantNet identification integration.
-- Run in Supabase SQL Editor after 003_community_layout.sql.

-- ── daily_records: store per-photo identification results ──────────────────────
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS species_name    TEXT;
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS genus           TEXT;
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS family          TEXT;
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS plantnet_score  REAL;

-- ── pots: store genus / family for affinity matching ──────────────────────────
-- Populated lazily on the first confident PlantNet identification for that pot.
-- Nullable: old pots and pots with no photo yet remain NULL (graceful fallback).
ALTER TABLE pots ADD COLUMN IF NOT EXISTS genus   TEXT;
ALTER TABLE pots ADD COLUMN IF NOT EXISTS family  TEXT;

-- Index genus so getCommunityMembers join is fast once the column is populated.
CREATE INDEX IF NOT EXISTS idx_pots_genus ON pots (genus);
