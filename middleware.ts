// middleware.ts — Route protection (project root, NOT inside src/ or app/)
//
// Security chain link ④: Protected Routes
// - /camera requires auth (creating records)
// - /auth/* is always public (login / signup / callback)
// - All other routes are public (reads are fine without auth)
//
// The Supabase SSR middleware also refreshes the session cookie so it doesn't
// expire mid-session, following the recommended @supabase/ssr pattern.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabase'

export async function middleware(request: NextRequest) {
  // Bootstrap the SSR client so it can refresh the session cookie
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the user session (extends cookie TTL automatically)
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/auth')

  // ── Guard: camera page requires auth ────────────────────────────────────
  if (!user && pathname === '/camera') {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('next', '/camera')
    return NextResponse.redirect(loginUrl)
  }

  // ── Guard: redirect logged-in users away from auth pages ─────────────
  if (user && isAuthRoute && !pathname.startsWith('/auth/callback')) {
    const gardenUrl = request.nextUrl.clone()
    gardenUrl.pathname = '/garden'
    gardenUrl.searchParams.delete('next')
    return NextResponse.redirect(gardenUrl)
  }

  return supabaseResponse
}

export const config = {
  // Run on every route except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
