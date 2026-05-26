// app/(tabs)/garden/page.tsx — Server Component wrapper
import { getServerUser } from '@/lib/auth'
import {
  getPotsForUser,
  getTasksByUser,
  getTodayRecordedPotIdsForUser,
  getCommunityPosts,
} from '@/lib/queries'
import { GardenClientPage } from './GardenClientPage'
import type { PostWithPot } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function GardenPage() {
  const user   = await getServerUser()
  const userId = user?.id ?? null

  // Use auth-aware fetches — falls back to 'Guest' demo data when not logged in
  const [pots, tasks, todayRecordedIds, communityPosts] = await Promise.all([
    getPotsForUser(userId).catch(() => []),
    getTasksByUser(userId ? userId : 'Guest').catch(() => []),
    getTodayRecordedPotIdsForUser(userId).catch(() => [] as string[]),
    getCommunityPosts(30).catch(() => [] as PostWithPot[]),
  ])

  return (
    <GardenClientPage
      pots={pots}
      tasks={tasks}
      todayRecordedIds={todayRecordedIds}
      communityPosts={communityPosts}
      isAuthenticated={!!user}
    />
  )
}
