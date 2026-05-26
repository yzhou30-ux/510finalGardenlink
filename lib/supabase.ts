import { createClient } from '@supabase/supabase-js'

// Centralised env — every other file imports these instead of reading process.env directly.
// The ?? fallback prevents build-time crashes when env vars are missing (e.g. Vercel first deploy).
// Placeholder values produce a valid (but non-connecting) client so module imports never throw.
export const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? 'https://placeholder.supabase.co'
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
