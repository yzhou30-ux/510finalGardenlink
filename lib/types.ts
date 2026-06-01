// lib/types.ts — v2 data type definitions

export interface Profile {
  user_id: string
  display_name: string
  avatar_emoji: string
  bio: string | null
  created_at: string
  /** City displayName as chosen in Settings (e.g. "San Francisco, CA"). Empty string = not set. */
  city: string
}

export interface Pot {
  id: string
  user_id: string | null    // null for seed/demo rows that pre-date auth
  user_name: string
  name: string
  icon: string
  days_owned: number
  created_at: string
  // PlantNet botanical classification (populated lazily on first confident identification)
  genus: string | null
  family: string | null
}

export type PostCategory = 'bloom' | 'harvest' | 'growth' | 'help'

export interface DailyRecord {
  id: string
  pot_id: string
  user_id: string | null    // null for seed/demo rows that pre-date auth
  user_name: string
  image_url: string | null
  thumb_url: string | null
  caption: string | null
  tags: string[] | null
  has_post: boolean
  post_category: PostCategory | null   // set when has_post=true (bloom/harvest/growth/help)
  record_date: string   // ISO date string "YYYY-MM-DD"
  created_at: string
  // PlantNet botanical identification (null when not yet identified or below threshold)
  species_name: string | null
  genus: string | null
  family: string | null
  plantnet_score: number | null
}

export interface Task {
  id: string
  pot_id: string
  type: 'water' | 'inspect' | 'fertilize' | 'prune'
  name: string
  frequency: string | null
  completed_today: boolean
  created_at: string
}

// Stored in `daily_comments` table (legacy `comments` table has different schema)
export interface DailyComment {
  id: string
  record_id: string
  user_name: string
  body: string
  created_at: string
}

export interface Message {
  id: string
  user_name: string
  sender_name: string
  body: string
  is_read: boolean
  created_at: string
}
