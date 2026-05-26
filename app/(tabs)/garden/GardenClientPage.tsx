// app/(tabs)/garden/GardenClientPage.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { IconMap, IconLayoutList, IconLayoutGrid, IconList } from '@tabler/icons-react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { ViewToggle } from '@/components/ViewToggle'
import { PublicGarden } from '@/components/PublicGarden'
import { MyGarden } from '@/components/MyGarden'
import { AddPotFlow } from '@/components/AddPot'
import type { PlantPot } from '@/components/MyGarden'
import type { Pot, Task } from '@/lib/types'
import type { PostWithPot } from '@/lib/queries'
import type { GardenTile } from '@/components/PublicGarden/types'
import { MY_TILE, DEMO_COMMUNITY_TILES } from '@/lib/communityDemoData'

// ── helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const d    = new Date(dateStr)
  const now  = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000)  // days
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Convert a DB post record to the GardenTile shape expected by GardenFeed. */
function postToTile(post: PostWithPot): GardenTile {
  return {
    id:     post.id,
    dx: 0, dy: 0,                    // not used in feed mode
    userName: post.pot_name,          // pot name reads better than a UUID
    emoji:    post.pot_icon || '🌱',
    tags:     [],
    href:     `/post/${post.id}`,     // real posts link to /post/[record-id]
    latestPost: {
      text:     post.caption || `New record: ${post.pot_name}`,
      timeAgo:  timeAgo(post.record_date),
      imageUrl: post.image_url ?? undefined,
    },
  }
}

// ── Helper: assign a display emoji from pot name ───────────────────────────────

function potEmoji(pot: Pot): string {
  const n = pot.name.toLowerCase()
  if (n.includes('rose'))      return '🌹'
  if (n.includes('basil'))     return '🌿'
  if (n.includes('succulent')) return '🌵'
  if (n.includes('jasmine'))   return '🌸'
  if (n.includes('mint'))      return '🌱'
  if (n.includes('sunflower')) return '🌻'
  if (n.includes('lavender'))  return '💜'
  if (n.includes('tomato'))    return '🍅'
  if (n.includes('cactus'))    return '🌵'
  if (n.includes('fern'))      return '🌿'
  return '🪴'
}

// ── My Garden — simple list view ──────────────────────────────────────────────

function PotListView({
  pots,
  onPotTap,
}: {
  pots: PlantPot[]
  onPotTap: (pot: PlantPot) => void
}) {
  if (pots.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%',
        color: 'var(--sage-300)', fontSize: 13, gap: 10,
        fontFamily: 'var(--font-sans)',
      }}>
        <span style={{ fontSize: 32 }}>🪴</span>
        Tap + to add your first plant
      </div>
    )
  }

  return (
    <div style={{
      padding: '4px 0 80px',
      fontFamily: 'var(--font-sans)',
    }}>
      {pots.map((pot) => (
        <button
          key={pot.id}
          type="button"
          onClick={() => onPotTap(pot)}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            width: '100%', padding: '13px 16px',
            background: 'none', border: 'none',
            borderBottom: '0.5px solid var(--border-subtle)',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          {/* Emoji circle */}
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: 'var(--glass-sage-medium)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>
            {pot.emoji}
          </div>

          {/* Name + days */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--sage-900)', marginBottom: 2 }}>
              {pot.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--sage-400)' }}>
              {pot.daysSinceStart} {pot.daysSinceStart === 1 ? 'day' : 'days'}
            </div>
          </div>

          {/* Unrecorded indicator */}
          {!pot.recordedToday && (
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--info)', flexShrink: 0,
            }} title="No record today" />
          )}
        </button>
      ))}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface GardenClientPageProps {
  pots: Pot[]
  tasks: Task[]
  todayRecordedIds: string[]
  /** Real community posts fetched server-side (has_post=true, all users). */
  communityPosts: PostWithPot[]
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function GardenClientPage({ pots, tasks: _tasks, todayRecordedIds, communityPosts }: GardenClientPageProps) {
  const router = useRouter()

  // ── State ─────────────────────────────────────────────────────────────────
  const [segment, setSegment]           = useState<'Community' | 'My Garden'>('Community')
  const [communityView, setCommunityView] = useState<'map' | 'feed'>('map')
  const [gardenView, setGardenView]     = useState<'grid' | 'list'>('grid')
  const [showAddPot, setShowAddPot]     = useState(false)

  const isMyGarden = segment === 'My Garden'

  // ── Data ──────────────────────────────────────────────────────────────────
  const recordedSet = new Set(todayRecordedIds)
  const myGardenPots: PlantPot[] = pots.map(pot => ({
    id: pot.id,
    name: pot.name,
    emoji: potEmoji(pot),
    daysSinceStart: pot.days_owned,
    recordedToday: recordedSet.has(pot.id),
  }))

  // ── ViewToggle options (change per sub-view) ──────────────────────────────
  const communityViewOptions = useMemo(() => [
    { value: 'map',  label: 'Map',  icon: <IconMap        size={12} strokeWidth={1.75} /> },
    { value: 'feed', label: 'Feed', icon: <IconLayoutList size={12} strokeWidth={1.75} /> },
  ], [])

  const gardenViewOptions = useMemo(() => [
    { value: 'grid', label: 'Grid', icon: <IconLayoutGrid size={12} strokeWidth={1.75} /> },
    { value: 'list', label: 'List', icon: <IconList       size={12} strokeWidth={1.75} /> },
  ], [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      height: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)',
      background: 'var(--bg-base)',
    }}>

      {/* ── Header: Row 1 (title + toggle) + Row 2 (segmented) ─────────────
          Mirrors exactly the structure in Timeline page:
            Row 1 → <span>Title</span>  +  <ViewToggle />
            Row 2 → selector/control (full width)
      ─────────────────────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>

        {/* Row 1 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--sage-900)' }}>
            Garden
          </span>
          {/* Toggle options swap when switching between Community / My Garden */}
          {!isMyGarden ? (
            <ViewToggle
              options={communityViewOptions}
              value={communityView}
              onChange={(v) => setCommunityView(v as 'map' | 'feed')}
            />
          ) : (
            <ViewToggle
              options={gardenViewOptions}
              value={gardenView}
              onChange={(v) => setGardenView(v as 'grid' | 'list')}
            />
          )}
        </div>

        {/* Row 2 — full-width segmented control */}
        <div style={{ marginBottom: 12 }}>
          <SegmentedControl
            options={['Community', 'My Garden']}
            value={segment}
            onChange={(v) => setSegment(v as 'Community' | 'My Garden')}
            label="Garden view"
          />
        </div>
      </div>

      {/* ── Content area: fills all remaining height ─────────────────────── */}
      {/* position:relative lets absolute children fill exactly this box     */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>

        {!isMyGarden ? (
          /* Community — canvas / feed fills the full content box.
             Map mode: always uses pre-positioned DEMO_COMMUNITY_TILES.
             Feed mode: prefers real DB posts; falls back to demo tiles if none yet. */
          <div style={{ position: 'absolute', inset: 0 }}>
            <PublicGarden
              tiles={
                communityView === 'feed' && communityPosts.length > 0
                  ? communityPosts.map(postToTile)   // real live posts
                  : DEMO_COMMUNITY_TILES              // map or no posts yet → demo
              }
              myTile={MY_TILE}
              viewMode={communityView}
              onVisitGarden={(tile) => console.log('visit', tile.id)}
              onMessage={(tile) => console.log('message', tile.id)}
            />
          </div>

        ) : gardenView === 'grid' ? (
          /* My Garden grid — bubble canvas with horizontal padding */
          <div style={{
            position: 'absolute', inset: 0,
            padding: '0 16px 16px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}>
            <MyGarden
              pots={myGardenPots}
              onPotTap={(pot) => router.push(`/timeline?pot=${encodeURIComponent(pot.id)}`)}
              onAddPot={() => setShowAddPot(true)}
              onEditPot={(pot) => console.log('edit', pot.id)}
              onRenamePot={(pot) => console.log('rename', pot.id)}
              onArchivePot={(pot) => console.log('archive', pot.id)}
            />
          </div>

        ) : (
          /* My Garden list — scrollable */
          <div style={{
            position: 'absolute', inset: 0,
            overflowY: 'auto',
          }}>
            <PotListView
              pots={myGardenPots}
              onPotTap={(pot) => router.push(`/timeline?pot=${encodeURIComponent(pot.id)}`)}
            />
            {/* Floating + button for list view */}
            <button
              type="button"
              onClick={() => setShowAddPot(true)}
              aria-label="Add a new pot"
              style={{
                position: 'fixed', bottom: 90, right: 20,
                width: 50, height: 50, borderRadius: '50%',
                background: 'rgba(253,251,247,0.88)',
                border: '1.5px dashed rgba(139,158,137,0.45)',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                boxShadow: '0 2px 10px rgba(61,79,60,0.10)',
                zIndex: 100, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: 'rgba(74,93,73,0.65)',
              }}
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* ── AddPot modal ──────────────────────────────────────────────────── */}
      <AddPotFlow
        open={showAddPot}
        onClose={() => setShowAddPot(false)}
        onComplete={(_newPotId, _potName) => {
          // Refresh server data so new pot appears in the garden
          router.refresh()
          // Keep modal open — success screen shows inside the flow
        }}
      />
    </div>
  )
}
