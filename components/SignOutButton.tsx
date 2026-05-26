'use client'

// components/SignOutButton.tsx
// Signs out via the browser Supabase client, which can directly clear the
// auth cookie. Server-side signOut() via Route Handler is unreliable because
// the Set-Cookie header from the Next.js headers() store isn't guaranteed to
// be applied to a NextResponse.redirect() response in all Next.js 14 builds.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconLogout, IconLoader2 } from '@tabler/icons-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    // router.push navigates away; router.refresh re-fetches all Server Component
    // data so the session is gone by the time the new page renders.
    router.push('/garden')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '5px 10px',
        background: 'none',
        border: '0.5px solid var(--border-subtle)',
        borderRadius: 8,
        cursor: loading ? 'default' : 'pointer',
        fontSize: 11,
        color: 'var(--sage-400)',
        fontFamily: 'var(--font-sans)',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading
        ? <IconLoader2 size={13} strokeWidth={1.75} style={{ animation: 'spin 0.8s linear infinite' }} />
        : <IconLogout  size={13} strokeWidth={1.75} />
      }
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
