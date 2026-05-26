// lib/auth.ts — Server-side auth helpers for Server Components
import { createSupabaseServerClient } from './supabase-server'
import type { User } from '@supabase/supabase-js'

/**
 * Returns the currently authenticated user from the SSR session.
 * Returns null if not logged in.
 * Safe to call in any Server Component or Route Handler.
 */
export async function getServerUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Returns the user's display name.
 * Fallback chain:
 *   1. profiles table (writable — future settings page)
 *   2. user_metadata.display_name (set at signup)
 *   3. email prefix
 *   4. 'Plant Lover'
 */
export async function getServerDisplayName(user: User): Promise<string> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .single()
  const metaName = (user.user_metadata?.display_name as string | undefined)?.trim() || undefined
  return data?.display_name ?? metaName ?? user.email?.split('@')[0] ?? 'Plant Lover'
}
