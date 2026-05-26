// app/(tabs)/timeline/page.tsx — Server Component
// Fetches pots + records for the current user, then renders TimelineClientPage.
import { getServerUser } from '@/lib/auth'
import { getPotsForUser, getRecordsByPot } from '@/lib/queries'
import { TimelineClientPage } from './TimelineClientPage'

export const dynamic = 'force-dynamic'

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: { pot?: string }
}) {
  const user = await getServerUser()
  const userId = user?.id ?? null

  // Fetch user's pots (falls back to Guest demo if not logged in)
  const pots = await getPotsForUser(userId).catch(() => [])

  // Determine which pot to show
  const firstPotId    = pots[0]?.id ?? ''
  const selectedPotId = searchParams.pot
    ? (pots.find(p => p.id === searchParams.pot)?.id ?? firstPotId)
    : firstPotId

  // Fetch records for the selected pot
  const records = selectedPotId
    ? await getRecordsByPot(selectedPotId).catch(() => [])
    : []

  return (
    <TimelineClientPage
      pots={pots}
      records={records}
      selectedPotId={selectedPotId}
    />
  )
}
