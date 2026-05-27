-- 003_community_layout.sql
-- Affinity-based community garden layout
-- Run in Supabase SQL Editor after 002_security_fixes.sql

-- ── follows 表 ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read follows"  ON follows FOR SELECT USING (true);
CREATE POLICY "Own insert follows"   ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Own delete follows"   ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ── profiles 扩展：加 city 字段 ──────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
