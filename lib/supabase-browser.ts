// lib/supabase-browser.ts
// Browser-side Supabase client — uses cookies for session persistence.
// Use this inside 'use client' components that need auth or DB writes.
import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'

let _client: ReturnType<typeof createBrowserClient> | null = null

/** Singleton browser client — safe to call multiple times. */
export function createSupabaseBrowserClient() {
  if (_client) return _client
  _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return _client
}
