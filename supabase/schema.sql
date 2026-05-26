-- GardenLink v2 — 新版 DDL
-- 在 Supabase SQL Editor 中运行此文件以创建 v2 表
-- 旧版表（gardens, photos, highlights, comments）保持不变

-- ─── 花盆（植物）─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name   TEXT NOT NULL DEFAULT 'Guest',
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT 'plant-2',
  days_owned  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── 每日记录（photos 表的 v2 演化）──────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_id       UUID REFERENCES pots(id) ON DELETE CASCADE,
  user_name    TEXT NOT NULL DEFAULT 'Guest',
  image_url    TEXT,
  thumb_url    TEXT,
  caption      TEXT,
  tags         TEXT[],
  has_post     BOOLEAN DEFAULT false,
  record_date  DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (pot_id, record_date)
);

-- ─── 养护任务 ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_id          UUID REFERENCES pots(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('water', 'inspect', 'fertilize', 'prune')),
  name            TEXT NOT NULL,
  frequency       TEXT,
  completed_today BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── 评论 ─────────────────────────────────────────────────────────────────
-- NOTE: 旧版已有 comments 表（highlight_id），v2 使用 daily_comments 避免冲突
CREATE TABLE IF NOT EXISTS daily_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id   UUID REFERENCES daily_records(id) ON DELETE CASCADE,
  user_name   TEXT NOT NULL DEFAULT 'Guest',
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── 消息 ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name    TEXT NOT NULL DEFAULT 'Guest',
  sender_name  TEXT NOT NULL,
  body         TEXT NOT NULL,
  is_read      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── 索引 ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_records_pot   ON daily_records (pot_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_pot     ON tasks (pot_id);
CREATE INDEX IF NOT EXISTS idx_comments_rec  ON daily_comments (record_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages (user_name, is_read);

-- ─── RLS（MVP 暂关闭，所有表 public read+write）──────────────────────────
ALTER TABLE pots           ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;

-- 允许 anon 读写（MVP 无认证）
CREATE POLICY "public read pots"           ON pots           FOR SELECT USING (true);
CREATE POLICY "public write pots"          ON pots           FOR INSERT WITH CHECK (true);
CREATE POLICY "public update pots"         ON pots           FOR UPDATE USING (true);

CREATE POLICY "public read records"        ON daily_records  FOR SELECT USING (true);
CREATE POLICY "public write records"       ON daily_records  FOR INSERT WITH CHECK (true);
CREATE POLICY "public update records"      ON daily_records  FOR UPDATE USING (true);
CREATE POLICY "public delete records"      ON daily_records  FOR DELETE USING (true);

CREATE POLICY "public read tasks"          ON tasks          FOR SELECT USING (true);
CREATE POLICY "public write tasks"         ON tasks          FOR INSERT WITH CHECK (true);
CREATE POLICY "public update tasks"        ON tasks          FOR UPDATE USING (true);

CREATE POLICY "public read comments"       ON daily_comments FOR SELECT USING (true);
CREATE POLICY "public write comments"      ON daily_comments FOR INSERT WITH CHECK (true);

CREATE POLICY "public read messages"       ON messages       FOR SELECT USING (true);
CREATE POLICY "public write messages"      ON messages       FOR INSERT WITH CHECK (true);
CREATE POLICY "public update messages"     ON messages       FOR UPDATE USING (true);
