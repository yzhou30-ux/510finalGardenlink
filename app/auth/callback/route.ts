// app/auth/callback/route.ts — Handles email confirmation + OAuth redirect
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/garden'

  if (code) {
    const supabase = createSupabaseServerClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && session) {
      // Ensure a profiles row exists for this user.
      // display_name and avatar_emoji were stored in auth user_metadata during signup.
      // ignoreDuplicates: true makes this a true no-op for users who already have a row.
      const meta = session.user.user_metadata ?? {}
      await supabase.from('profiles').upsert(
        {
          user_id:      session.user.id,
          display_name: (meta.display_name as string | undefined)
                          ?? session.user.email?.split('@')[0]
                          ?? 'Gardener',
          avatar_emoji: (meta.avatar_emoji as string | undefined) ?? '🪴',
        },
        { onConflict: 'user_id', ignoreDuplicates: true },
      )
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Exchange failed — send to login with error
  const loginUrl = new URL('/auth/login', origin)
  loginUrl.searchParams.set('error', 'callback_failed')
  return NextResponse.redirect(loginUrl)
}
