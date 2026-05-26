-- GardenLink v2 — Demo 种子数据
-- 在 schema.sql 运行之后，在 Supabase SQL Editor 中运行此文件

-- 清空旧数据（按依赖顺序）
-- NOTE: 不 TRUNCATE 旧版 comments 表，避免破坏 legacy 数据
TRUNCATE messages, daily_comments, tasks, daily_records, pots RESTART IDENTITY CASCADE;

-- ─── 花盆 ─────────────────────────────────────────────────────────────────
INSERT INTO pots (id, user_name, name, icon, days_owned) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Guest', '月季',   'plant-2',    128),
  ('11111111-0000-0000-0000-000000000002', 'Guest', '罗勒',   'leaf',        42),
  ('11111111-0000-0000-0000-000000000003', 'Guest', '多肉',   'seeding',     89),
  ('11111111-0000-0000-0000-000000000004', 'Guest', '茉莉',   'flower',      61),
  ('11111111-0000-0000-0000-000000000005', 'Guest', '薄荷',   'herb',        15);

-- ─── 每日记录（最近 2 周，月季为主）──────────────────────────────────────
INSERT INTO daily_records (pot_id, user_name, image_url, caption, tags, has_post, record_date) VALUES
  -- 月季
  ('11111111-0000-0000-0000-000000000001', 'Guest', NULL, '花苞初现，好开心', ARRAY['月季','花苞','期待'], false, CURRENT_DATE - 13),
  ('11111111-0000-0000-0000-000000000001', 'Guest', NULL, '浇了水，叶子更绿了', ARRAY['月季','浇水'], false, CURRENT_DATE - 11),
  ('11111111-0000-0000-0000-000000000001', 'Guest', NULL, '有一片叶子开始发黄', ARRAY['月季','病害','求助'], true,  CURRENT_DATE - 9),
  ('11111111-0000-0000-0000-000000000001', 'Guest', NULL, '剪掉黄叶，施了肥', ARRAY['月季','施肥','修剪'], false, CURRENT_DATE - 7),
  ('11111111-0000-0000-0000-000000000001', 'Guest', NULL, '花苞变大了很多！', ARRAY['月季','花苞','生长'], false, CURRENT_DATE - 5),
  ('11111111-0000-0000-0000-000000000001', 'Guest', NULL, '第一朵花开了🌹', ARRAY['月季','开花','收获'], true,  CURRENT_DATE - 3),
  ('11111111-0000-0000-0000-000000000001', 'Guest', NULL, '今天又多开了两朵', ARRAY['月季','开花'], false, CURRENT_DATE - 1),
  ('11111111-0000-0000-0000-000000000001', 'Guest', NULL, '早晨打卡', ARRAY['月季'], false, CURRENT_DATE),
  -- 罗勒
  ('11111111-0000-0000-0000-000000000002', 'Guest', NULL, '播种第一天', ARRAY['罗勒','播种'], false, CURRENT_DATE - 10),
  ('11111111-0000-0000-0000-000000000002', 'Guest', NULL, '发芽啦！', ARRAY['罗勒','发芽'], true,  CURRENT_DATE - 6),
  ('11111111-0000-0000-0000-000000000002', 'Guest', NULL, '今天摘了几片叶子做意面', ARRAY['罗勒','收获'], false, CURRENT_DATE - 2),
  -- 多肉
  ('11111111-0000-0000-0000-000000000003', 'Guest', NULL, '换了大盆', ARRAY['多肉','换盆'], false, CURRENT_DATE - 8),
  ('11111111-0000-0000-0000-000000000003', 'Guest', NULL, '状态不错', ARRAY['多肉'], false, CURRENT_DATE - 4),
  -- 茉莉
  ('11111111-0000-0000-0000-000000000004', 'Guest', NULL, '花香满阳台', ARRAY['茉莉','开花','香味'], true, CURRENT_DATE - 3);

-- ─── 养护任务 ─────────────────────────────────────────────────────────────
INSERT INTO tasks (pot_id, type, name, frequency, completed_today) VALUES
  ('11111111-0000-0000-0000-000000000001', 'water',    '浇水 · 月季',   '每天 1 次',   false),
  ('11111111-0000-0000-0000-000000000001', 'inspect',  '检查 · 月季',   '每 2 天',     false),
  ('11111111-0000-0000-0000-000000000002', 'water',    '浇水 · 罗勒',   '每天 2 次',   true),
  ('11111111-0000-0000-0000-000000000003', 'water',    '浇水 · 多肉',   '每周 1 次',   false),
  ('11111111-0000-0000-0000-000000000004', 'fertilize','施肥 · 茉莉',   '每月 2 次',   false),
  ('11111111-0000-0000-0000-000000000005', 'water',    '浇水 · 薄荷',   '每天 1-2 次', false);

-- ─── 评论 ─────────────────────────────────────────────────────────────────
-- 找到"月季发黄"那条记录的 id（has_post=true, CURRENT_DATE-9）
WITH yellowing AS (
  SELECT id FROM daily_records
  WHERE pot_id = '11111111-0000-0000-0000-000000000001'
    AND record_date = CURRENT_DATE - 9
  LIMIT 1
)
INSERT INTO daily_comments (record_id, user_name, body)
SELECT id, '园丁小李', '可能是缺铁或者浇水过多，建议先停水3天看看'  FROM yellowing
UNION ALL
SELECT id, '花友张阿姨', '我的月季也遇到过，喷点稀释的硫酸亚铁就好了' FROM yellowing;

-- 月季开花那条评论
WITH blooming AS (
  SELECT id FROM daily_records
  WHERE pot_id = '11111111-0000-0000-0000-000000000001'
    AND record_date = CURRENT_DATE - 3
  LIMIT 1
)
INSERT INTO daily_comments (record_id, user_name, body)
SELECT id, '邻居王叔', '开得真好！什么品种的？'  FROM blooming
UNION ALL
SELECT id, '园丁小李', '颜色好漂亮，养了多久了？' FROM blooming;

-- ─── 消息 ─────────────────────────────────────────────────────────────────
INSERT INTO messages (user_name, sender_name, body, is_read) VALUES
  ('Guest', '园丁小李',  '你的月季开花了吗？上次看你说花苞很大', false),
  ('Guest', '花友张阿姨', '我有一株桂花要分株，你要不要？',         false),
  ('Guest', '邻居王叔',  '明天上午我们一起去花鸟市场吧',           true);
