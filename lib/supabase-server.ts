// lib/supabase-server.ts
// SSR-compatible Supabase client — reads auth session from cookies.
// Use this in Server Components, Route Handlers, and middleware.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'

export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot call cookies().set().
            // The middleware (below) handles refreshing the session cookie.
          }
        },
      },
    }
  )
}
