-- supabase/auth_rls_patch.sql
-- Patch for RLS issues discovered after initial auth_rls.sql deployment.
-- Run this in the Supabase SQL Editor AFTER auth_rls.sql.
--
-- Fixes:
--   1. UPDATE policies were blocking rows with user_id = NULL (seed / legacy data).
--      Any authenticated user can now update a previously unclaimed row; the new
--      user_id is locked in via WITH CHECK so it becomes owned by that user.
--   2. Confirms the SELECT (public read) policies from schema.sql are still present.
--      If you ran schema.sql + auth_rls.sql in order, these already exist —
--      the CREATE POLICY IF NOT EXISTS guards are safe to re-run.

-- ─── 1. Re-create UPDATE policies to accept null-user_id rows ────────────────

-- pots: allow updating a row that has no owner yet (null user_id)
DROP POLICY IF EXISTS "Own update pots" ON pots;
CREATE POLICY "Own update pots"
  ON pots FOR UPDATE
  USING  (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- daily_records: same — lets the camera page overwrite seed/legacy rows
DROP POLICY IF EXISTS "Own update records" ON daily_records;
CREATE POLICY "Own update records"
  ON daily_records FOR UPDATE
  USING  (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ─── 2. Ensure public SELECT policies exist (schema.sql should have created
--        these; recreating with IF NOT EXISTS is safe) ──────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pots' AND policyname = 'public read pots'
  ) THEN
    CREATE POLICY "public read pots"
      ON pots FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_records' AND policyname = 'public read records'
  ) THEN
    CREATE POLICY "public read records"
      ON daily_records FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tasks' AND policyname = 'public read tasks'
  ) THEN
    CREATE POLICY "public read tasks"
      ON tasks FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_comments' AND policyname = 'public read comments'
  ) THEN
    CREATE POLICY "public read comments"
      ON daily_comments FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages' AND policyname = 'public read messages'
  ) THEN
    CREATE POLICY "public read messages"
      ON messages FOR SELECT USING (true);
  END IF;
END
$$;

-- ─── 3. Back-fill: link any existing unclaimed pots/records to whoever
--        later uploads a photo for them. (Optional — safe to skip if you
--        don't need old seed data to show up under a user account.)
-- UPDATE pots          SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;
-- UPDATE daily_records SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;
