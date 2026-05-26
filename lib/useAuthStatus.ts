// lib/useAuthStatus.ts
// Client-side hook that reads the Supabase session once on mount.
// Returns null while loading (optimistic — don't block UI during check).
'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from './supabase-browser'

interface AuthStatus {
  /** true = logged in, false = guest, null = still checking */
  isAuthenticated: boolean | null
  /** Shorthand: true only when we've confirmed the user is NOT logged in */
  isGuest: boolean
}

export function useAuthStatus(): AuthStatus {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data: { user } }: { data: { user: import('@supabase/supabase-js').User | null } }) =>
        setIsAuthenticated(!!user)
      )
  }, [])

  return {
    isAuthenticated,
    isGuest: isAuthenticated === false,
  }
}
