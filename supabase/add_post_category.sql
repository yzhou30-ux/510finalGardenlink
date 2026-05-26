-- supabase/add_post_category.sql
-- Migration: add post_category column to daily_records.
-- Run this in the Supabase SQL Editor after schema.sql.
--
-- post_category captures the plant-state tag that the user picks when
-- publishing a post (borrowed from the legacy "highlight" concept).
-- Allowed values: bloom | harvest | growth | help

ALTER TABLE daily_records
  ADD COLUMN IF NOT EXISTS post_category TEXT
  CONSTRAINT daily_records_post_category_check
    CHECK (post_category IN ('bloom', 'harvest', 'growth', 'help'));

-- Index for community feed queries that filter/sort by category
CREATE INDEX IF NOT EXISTS idx_records_post_category
  ON daily_records (post_category)
  WHERE post_category IS NOT NULL;
