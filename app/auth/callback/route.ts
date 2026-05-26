// app/auth/callback/route.ts — Handles email confirmation + OAuth redirect
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/garden'

  if (code) {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Redirect to the page the user was trying to visit (or garden)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Exchange failed — send to login with error
  const loginUrl = new URL('/auth/login', origin)
  loginUrl.searchParams.set('error', 'callback_failed')
  return NextResponse.redirect(loginUrl)
}
