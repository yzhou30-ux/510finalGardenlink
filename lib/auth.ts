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
 * Returns the user's display name from the profiles table,
 * falling back to the email prefix or 'Plant Lover'.
 */
export async function getServerDisplayName(user: User): Promise<string> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .single()
  return data?.display_name ?? user.email?.split('@')[0] ?? 'Plant Lover'
}
