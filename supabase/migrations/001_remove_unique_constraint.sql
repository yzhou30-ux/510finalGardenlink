-- Migration: allow multiple daily_records per pot per day
-- Run this in Supabase SQL Editor to apply to the live database.
--
-- The original schema had UNIQUE(pot_id, record_date), which caused every
-- subsequent photo upload on the same day to overwrite the first record.
-- With this constraint removed, each upload creates an independent row.
-- The timeline groups records by date client-side and uses the latest row
-- as the cover image.

ALTER TABLE daily_records DROP CONSTRAINT IF EXISTS daily_records_pot_id_record_date_key;
