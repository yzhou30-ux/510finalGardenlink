// app/(tabs)/garden/page.tsx — Server Component wrapper
import { getServerUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  getPotsForUser,
  getTasksByUser,
  getTodayRecordedPotIdsForUser,
  getCommunityPosts,
  getCommunityMembers,
  getMyLayoutConfig,
} from '@/lib/queries'
import { computeGardenLayout } from '@/lib/gardenLayout'
import type { CommunityEvent } from '@/lib/gardenLayout'
import type { GardenTile } from '@/components/PublicGarden/types'
import type { PostWithPot } from '@/lib/queries'
import { GardenClientPage } from './GardenClientPage'

export const dynamic = 'force-dynamic'

// ── Hardcoded community events (future: fetch from DB) ────────────────────────
const COMMUNITY_EVENTS: CommunityEvent[] = [
  {
    id: 'event-spring',
    name: 'Spring Fair',
    emoji: '🎉',
    relatedPlant: 'Rose',
    text: 'Annual spring flower fair — May 28',
    timeAgo: 'upcoming',
  },
  {
    id: 'event-swap',
    name: 'Succulent Swap',
    emoji: '🔄',
    relatedPlant: 'Succulent',
    text: 'Trade your succulents with the community!',
    timeAgo: '3d away',
  },
]

export default async function GardenPage() {
  const user   = await getServerUser()
  const userId = user?.id ?? null

  // ── Lazy profile backfill ───────────────────────────────────────────────────
  // Users who signed up before the auth/callback upsert was added have no
  // profiles row yet. Run a no-op upsert on every page load so their display
  // name appears in the community feed the next time anyone views it.
  if (user) {
    const meta = user.user_metadata ?? {}
    createSupabaseServerClient()
      .from('profiles')
      .upsert(
        {
          user_id:      user.id,
          display_name: (meta.display_name as string | undefined)
                          ?? user.email?.split('@')[0]
                          ?? 'Gardener',
          avatar_emoji: (meta.avatar_emoji as string | undefined) ?? '🪴',
        },
        { onConflict: 'user_id', ignoreDuplicates: true },
      )
      .then()   // fire-and-forget — never delays the page render
  }

  // Auth-aware base data (falls back to Guest demo when not logged in)
  const [pots, tasks, todayRecordedIds, communityPosts] = await Promise.all([
    getPotsForUser(userId).catch(() => []),
    getTasksByUser(userId ?? 'Guest').catch(() => []),
    getTodayRecordedPotIdsForUser(userId).catch(() => [] as string[]),
    getCommunityPosts(30).catch(() => [] as PostWithPot[]),
  ])

  // ── Affinity layout (logged-in users only) ──────────────────────────────────
  // Falls back to null → client renders demo tiles instead.
  let computedTiles: GardenTile[] | null = null

  if (userId) {
    try {
      const [members, layoutConfig] = await Promise.all([
        getCommunityMembers(userId),
        getMyLayoutConfig(userId),
      ])

      if (members.length > 0) {
        const { memberTiles, eventTiles } = computeGardenLayout(
          members,
          COMMUNITY_EVENTS,
          layoutConfig,
        )
        // Use computed tiles whenever there are real community members.
        // The old "hasVisibleTile < 6" guard was rejecting low-affinity users
        // (e.g. follow-only affinity 0.30 → dx/dy hypot ≈ 8.4) — real users
        // should always appear on the map; the canvas supports panning to reach
        // tiles that start off the initial viewport.
        computedTiles = [...memberTiles, ...eventTiles]
      }
    } catch {
      // Layout computation failed (e.g. migration not applied yet) — use demo
    }
  }

  return (
    <GardenClientPage
      pots={pots}
      tasks={tasks}
      todayRecordedIds={todayRecordedIds}
      communityPosts={communityPosts}
      isAuthenticated={!!user}
      computedTiles={computedTiles}
    />
  )
}
