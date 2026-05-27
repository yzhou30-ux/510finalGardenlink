-- seed_community.sql
-- 30 fake community members for testing the affinity layout.
--
-- IMPORTANT: Run in Supabase SQL Editor (service_role access required to
-- insert into auth.users).  Execute the three blocks in order:
--   Block 1 → creates test auth users
--   Block 2 → creates profiles, pots, daily_records
--   Block 3 → creates follow relationships

-- ── Block 1: minimal auth.users rows ─────────────────────────────────────────
-- Generates 30 rows with IDs 10000000-0000-0000-0000-000000000001 … 000000000030

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  instance_id
)
SELECT
  ('10000000-0000-0000-0000-' || lpad(s::text, 12, '0'))::UUID,
  'authenticated',
  'authenticated',
  'seed-user-' || s || '@gardenlink.test',
  '',
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  '00000000-0000-0000-0000-000000000000'::UUID
FROM generate_series(1, 30) AS s
ON CONFLICT (id) DO NOTHING;

-- ── Block 2: profiles, pots, daily_records ────────────────────────────────────

DO $$
DECLARE
  cities        TEXT[] := ARRAY['Seattle', 'Bellevue', 'Redmond', 'Bothell', 'Kirkland', 'Tacoma'];
  plant_names   TEXT[] := ARRAY['Rose', 'Succulent', 'Pothos', 'Cactus', 'Jasmine',
                                 'Sunflower', 'Basil', 'Fern', 'Orchid', 'Lavender',
                                 'Mint', 'Tomato'];
  emojis        TEXT[] := ARRAY['🌹', '🌵', '🌿', '🎋', '🌸', '🌻', '🌿', '🌿',
                                 '🌺', '💜', '🌱', '🍅'];
  display_names TEXT[] := ARRAY[
    'Flora', 'GreenThumb', 'SuccyCat', 'CactusKing', 'JasmineGal',
    'SunnyDay', 'BasilChef', 'FernLover', 'OrchidQueen', 'LavenderHill',
    'MintFresh', 'TomatoFarmer', 'RoseGarden', 'PlantMom', 'UrbanJungle',
    'LeafyLife', 'BloomBuddy', 'GardenGuru', 'PetalPower', 'SeedStarter',
    'PlantDad', 'GrowGreen', 'BotanyBoss', 'FlowerChild', 'HerbHero',
    'VineVibes', 'SproutScout', 'ThornQueen', 'MossMan', 'DaisyDream'
  ];
  help_captions TEXT[] := ARRAY[
    'My rose has yellow leaves — any idea what''s wrong?',
    'Cactus is wilting despite barely any water, help!',
    'Jasmine won''t bloom — what am I missing?',
    'Fern tips are turning brown, please advise'
  ];
  user_uuid    UUID;
  pot_uuid     UUID;
  i            INT;
  j            INT;
  num_pots     INT;
  plant_idx    INT;
  city_idx     INT;
  days_back    INT;
  is_help      BOOLEAN;
  cap_text     TEXT;
  post_cat     TEXT;
BEGIN
  FOR i IN 1..30 LOOP
    user_uuid := ('10000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::UUID;
    city_idx  := ((i - 1) % array_length(cities, 1)) + 1;

    -- Profile (trigger may have already created a row from Block 1; update city)
    INSERT INTO profiles (user_id, display_name, avatar_emoji, city)
    VALUES (
      user_uuid,
      display_names[i],
      emojis[((i - 1) % array_length(emojis, 1)) + 1],
      cities[city_idx]
    )
    ON CONFLICT (user_id) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          avatar_emoji = EXCLUDED.avatar_emoji,
          city         = EXCLUDED.city;

    -- Each test user gets 1–3 pots
    num_pots := (i % 3) + 1;
    FOR j IN 1..num_pots LOOP
      pot_uuid  := gen_random_uuid();
      plant_idx := ((i + j - 2) % array_length(plant_names, 1)) + 1;

      INSERT INTO pots (id, user_id, user_name, name, icon, days_owned)
      VALUES (
        pot_uuid,
        user_uuid,
        user_uuid::text,
        plant_names[plant_idx],
        'plant-2',
        i * 7 + j * 3
      )
      ON CONFLICT (id) DO NOTHING;

      -- Each pot gets up to 5 daily records spanning 5 days
      FOR days_back IN 0..((i + j) % 5) LOOP
        -- Decide post type: ~20 % are 'help' posts (for filter testing)
        is_help   := ((i + j + days_back) % 5 = 0);
        post_cat  := CASE WHEN is_help THEN 'help'
                          WHEN days_back % 4 = 1 THEN 'bloom'
                          WHEN days_back % 4 = 2 THEN 'growth'
                          ELSE NULL END;
        cap_text  := CASE
          WHEN is_help     THEN help_captions[((i + j) % array_length(help_captions, 1)) + 1]
          WHEN days_back % 3 = 0
            THEN display_names[i] || '''s ' || plant_names[plant_idx] || ' update'
          ELSE NULL END;

        INSERT INTO daily_records (
          pot_id, user_id, user_name, record_date,
          caption, has_post, post_category, tags
        )
        VALUES (
          pot_uuid,
          user_uuid,
          user_uuid::text,
          CURRENT_DATE - days_back,
          cap_text,
          (days_back % 2 = 0),          -- every other day is a published post
          CASE WHEN (days_back % 2 = 0) THEN post_cat ELSE NULL END,
          ARRAY[plant_names[plant_idx]]
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ── Block 3: follow relationships ─────────────────────────────────────────────
-- Seed user #1 follows users #2, #4, #5, #8, #12, #15, #20, #25.
-- Users #3, #7, #11 follow #1 (gives mutual relationships for testing).
--
-- Replace the first UUID below with YOUR real account UUID
-- if you want to test from your own account:

INSERT INTO follows (follower_id, following_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000012'),
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000015'),
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000020'),
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000025'),
  ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001'),
  -- cross-follows among test users (adds realistic graph density)
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000012'),
  ('10000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000020'),
  ('10000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000030')
ON CONFLICT DO NOTHING;
