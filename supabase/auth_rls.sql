-- supabase/auth_rls.sql
-- Option A Security Migration: user-owned data
-- Run this in Supabase SQL Editor AFTER the base schema.sql has been applied.
--
-- Security chain implemented:
--   ① Sign-up/in  → auth pages
--   ②③ Session   → @supabase/ssr middleware
--   ④ Route guard → middleware.ts (/camera requires auth)
--   ⑤ Ownership  → user_id column + RLS below
--   ⑥ RLS Policy → every write checks auth.uid() = user_id
--   ⑦ 0 rows     → cross-user queries return nothing

-- ─── 1. profiles table ───────────────────────────────────────────────────────
-- Stores display_name + avatar per user. Auto-created on signup via trigger below.

CREATE TABLE IF NOT EXISTS profiles (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL DEFAULT 'Plant Lover',
  avatar_emoji  TEXT NOT NULL DEFAULT '🪴',
  bio           TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read a profile (for the community / user profile pages)
CREATE POLICY "Public read profiles"
  ON profiles FOR SELECT USING (true);

-- Users can only write their own profile
CREATE POLICY "Own profile write"
  ON profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 2. Trigger: auto-create profile on signup ──────────────────────────────
-- Reads display_name + avatar_emoji from signUp() metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_emoji)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Plant Lover'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_emoji', '🪴')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 3. Add user_id column to pots ──────────────────────────────────────────
-- Nullable for backward compat with seed data that pre-dates auth.

ALTER TABLE pots
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- ─── 4. Add user_id column to daily_records ─────────────────────────────────
ALTER TABLE daily_records
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- ─── 5. Drop old "public write" policies (allow everything) ─────────────────
DROP POLICY IF EXISTS "public write pots"   ON pots;
DROP POLICY IF EXISTS "public update pots"  ON pots;
DROP POLICY IF EXISTS "public write records"  ON daily_records;
DROP POLICY IF EXISTS "public update records" ON daily_records;
DROP POLICY IF EXISTS "public delete records" ON daily_records;
DROP POLICY IF EXISTS "public write tasks"    ON tasks;
DROP POLICY IF EXISTS "public update tasks"   ON tasks;

-- ─── 6. Re-create auth-based write policies ─────────────────────────────────
-- Pots: only the owner may insert/update/delete their own pots

CREATE POLICY "Own insert pots"
  ON pots FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Own update pots"
  ON pots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own delete pots"
  ON pots FOR DELETE
  USING (auth.uid() = user_id);

-- Daily records: same ownership pattern

CREATE POLICY "Own insert records"
  ON daily_records FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Own update records"
  ON daily_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own delete records"
  ON daily_records FOR DELETE
  USING (auth.uid() = user_id);

-- Tasks: owned by the same user as the parent pot

CREATE POLICY "Own insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM pots WHERE pots.id = tasks.pot_id AND pots.user_id = auth.uid())
  );

CREATE POLICY "Own update tasks"
  ON tasks FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM pots WHERE pots.id = tasks.pot_id AND pots.user_id = auth.uid())
  );

-- ─── 7. Supabase Storage: auth-gated uploads ────────────────────────────────
-- Run these in Supabase SQL Editor if the 'photos' bucket doesn't already have them.
-- SELECT policies are kept open (images must be publicly readable for <img> tags).

-- DROP POLICY IF EXISTS "Public read photos storage" ON storage.objects;
-- DROP POLICY IF EXISTS "Auth upload photos storage"  ON storage.objects;
-- DROP POLICY IF EXISTS "Own delete photos storage"   ON storage.objects;

-- CREATE POLICY "Public read photos storage"
--   ON storage.objects FOR SELECT USING (bucket_id = 'photos');

-- CREATE POLICY "Auth upload photos storage"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

-- CREATE POLICY "Own delete photos storage"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
