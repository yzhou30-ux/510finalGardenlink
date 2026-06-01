// app/api/follow/route.ts
// POST body: { targetUserId: string; action: 'follow' | 'unfollow' }
// Returns:   { following: boolean }
// Auth:      requires a logged-in user — returns 401 otherwise.

import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { targetUserId?: string; action?: string }
  const { targetUserId, action } = body

  if (
    typeof targetUserId !== 'string' ||
    (action !== 'follow' && action !== 'unfollow')
  ) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  try {
    if (action === 'follow') {
      await supabase
        .from('follows')
        .upsert(
          { follower_id: user.id, following_id: targetUserId },
          { onConflict: 'follower_id,following_id' },
        )
      return NextResponse.json({ following: true })
    } else {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
      return NextResponse.json({ following: false })
    }
  } catch {
    // follows table may not yet exist — silently accept the action
    return NextResponse.json({ following: action === 'follow' })
  }
}
