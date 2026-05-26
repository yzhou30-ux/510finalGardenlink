// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Use ?? fallback so the module doesn't throw during `next build` when
// env vars are absent (Vercel build container).  The real values are
// injected at runtime via Vercel Environment Variables.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL    ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
)
