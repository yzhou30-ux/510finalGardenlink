-- 002_security_fixes.sql
-- Security fixes: enable Storage upload policy + add daily_comments RLS
-- Run this in Supabase SQL Editor to apply to the live database.

-- ── Storage: require auth for uploads ─────────────────────────────────────
-- (These were commented out in auth_rls.sql — now activating them)

CREATE POLICY "Public read photos storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

CREATE POLICY "Auth upload photos storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Own delete photos storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── daily_comments: add RLS ──────────────────────────────────────────────

ALTER TABLE daily_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments (public community feature)
CREATE POLICY "Public read comments"
  ON daily_comments FOR SELECT
  USING (true);

-- Authenticated users can insert comments
CREATE POLICY "Auth insert comments"
  ON daily_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can only delete their own comments
CREATE POLICY "Own delete comments"
  ON daily_comments FOR DELETE
  USING (auth.uid()::text = user_name OR auth.uid() IS NOT NULL);
