// app/user/[id]/garden/page.tsx — User garden detail page (no FloatingTabBar)
//
// Routing convention (mirrors app/user/[id]/page.tsx):
//   Short non-UUID IDs  → demo community user  (CommunityTile from COMMUNITY_TILE_MAP)
//   Full UUID (36 chars) → real DB user
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { IconArrowLeft } from '@tabler/icons-react'
import { COMMUNITY_TILE_MAP } from '@/lib/communityDemoData'
import {
  getProfileByUserId,
  getPotsByUserId,
  getPublicPostsByUserId,
  getFollowStatus,
} from '@/lib/queries'
import { getServerUser } from '@/lib/auth'
import type { DailyRecord } from '@/lib/types'
import type { RelationTag } from '@/components/PublicGarden/types'
import { UserGardenClient } from './UserGardenClient'

// ── Tag styles (shared with GardenBottomSheet) ─────────────────────────────────

const TAG_STYLES: Record<RelationTag['type'], { bg: string; color: string }> = {
  geo:    { bg: 'rgba(91,143,185,0.1)',  color: '#3D7BA8' },
  plant:  { bg: 'rgba(107,158,107,0.1)', color: '#4A7D4A' },
  social: { bg: 'rgba(196,147,90,0.1)',  color: '#8B6420' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function potEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('rose'))      return '🌹'
  if (n.includes('succulent')) return '🌵'
  if (n.includes('jasmine'))   return '🌸'
  if (n.includes('mint'))      return '🌱'
  if (n.includes('sunflower')) return '🌻'
  if (n.includes('cactus'))    return '🌵'
  if (n.includes('fern'))      return '🌿'
  if (n.includes('basil'))     return '🌿'
  if (n.includes('orchid'))    return '🌸'
  if (n.includes('lavender'))  return '💜'
  return '🪴'
}

// ── Sub-components (server-renderable) ───────────────────────────────────────

function StickyHeader({ title }: { title: string }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 16px',
      background: 'var(--glass-cream-medium)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '0.5px solid var(--border-default)',
      fontFamily: 'var(--font-sans)',
    }}>
      <Link
        href="/garden"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--glass-sage-light)',
          border: '0.5px solid var(--border-default)',
          color: 'var(--sage-700)', textDecoration: 'none', flexShrink: 0,
        }}
        aria-label="Back to garden"
      >
        <IconArrowLeft size={16} strokeWidth={1.7} />
      </Link>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--sage-900)', flex: 1 }}>
        {title}
      </span>
    </div>
  )
}

function TagPill({ tag }: { tag: RelationTag }) {
  const s = TAG_STYLES[tag.type] ?? { bg: 'rgba(74,93,73,0.08)', color: 'var(--sage-400)' }
  return (
    <span style={{
      fontSize: 9, padding: '3px 9px', borderRadius: 10,
      background: s.bg, color: s.color, fontFamily: 'var(--font-sans)',
    }}>
      {tag.label}
    </span>
  )
}

function Divider() {
  return <div style={{ height: '0.5px', background: 'var(--border-subtle)', margin: '0 16px' }} />
}

// ── Demo user garden page ─────────────────────────────────────────────────────

function DemoGardenPage({ id }: { id: string }) {
  const tile = COMMUNITY_TILE_MAP[id]
  if (!tile) return notFound()

  // Fixed demo pots for every demo user
  const demoPots = [
    { id: `${id}-0`, name: 'Rose',      emoji: '🌹', days: 256 },
    { id: `${id}-1`, name: 'Sunflower', emoji: '🌻', days: 45  },
    { id: `${id}-2`, name: 'Succulent', emoji: '🪴', days: 180 },
  ]

  // Build a minimal post array from the tile's latestPost (if any)
  const demoPosts: DailyRecord[] = tile.latestPost
    ? [{
        id:           `${id}-post-0`,
        pot_id:       `${id}-pot-0`,
        user_id:      null,
        user_name:    tile.userName,
        image_url:    tile.latestPost.imageUrl ?? null,
        thumb_url:    null,
        caption:      tile.latestPost.text,
        tags:         [],
        has_post:     true,
        post_category: null,
        record_date:  '2026-05-24',
        created_at:   '2026-05-24T09:00:00Z',
        species_name: null,
        genus:        null,
        family:       null,
        plantnet_score: null,
      }]
    : []

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg-base)', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <StickyHeader title={`${tile.userName}'s garden`} />

      {/* Profile section */}
      <div style={{ padding: '16px 16px 14px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(253,251,247,0.9)', border: '2px solid rgba(200,209,198,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
        }}>
          {tile.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--sage-900)', marginBottom: 2 }}>
            {tile.userName}
          </div>
          {tile.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {tile.tags.map((t, i) => <TagPill key={i} tag={t} />)}
            </div>
          )}
        </div>
      </div>

      {/* Interactive section: follow button + pots strip + photo grid */}
      <UserGardenClient
        userId={id}
        pots={demoPots}
        posts={demoPosts}
        initialFollowing={false}
        isOwnGarden={false}
        isDemoUser={true}
      />
    </div>
  )
}

// ── Real user garden page ─────────────────────────────────────────────────────

async function RealGardenPage({
  id,
  currentUserId,
}: {
  id: string
  currentUserId: string | null
}) {
  const [profile, pots, posts, isFollowing] = await Promise.all([
    getProfileByUserId(id),
    getPotsByUserId(id),
    getPublicPostsByUserId(id),
    currentUserId && currentUserId !== id
      ? getFollowStatus(currentUserId, id)
      : Promise.resolve(false),
  ])

  if (!profile) return notFound()

  const isOwnGarden = currentUserId === id

  // Years since account creation (shown in profile sub-line)
  const yearsActive = Math.max(0,
    Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (365.25 * 86_400_000))
  )

  // Relation tags from viewer's perspective (Follow status; city/plant overlap is post-MVP)
  const tags: RelationTag[] = []
  if (!isOwnGarden && isFollowing) tags.push({ type: 'social', label: 'Following' })

  // Map DB pots to the shape UserGardenClient expects
  const potItems = pots.map(p => ({
    id:    p.id,
    name:  p.name,
    emoji: potEmoji(p.name),
    days:  p.days_owned,
  }))

  const bioLine = [
    profile.bio,
    yearsActive > 0 ? `${yearsActive}y gardening` : null,
    profile.city || null,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg-base)', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <StickyHeader title={isOwnGarden ? 'My garden' : `${profile.display_name}'s garden`} />

      {/* Profile section — static, server-rendered */}
      <div style={{ padding: '16px 16px 14px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(253,251,247,0.9)', border: '2px solid rgba(200,209,198,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
        }}>
          {profile.avatar_emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--sage-900)', marginBottom: 2 }}>
            {profile.display_name}
          </div>
          {bioLine && (
            <div style={{ fontSize: 11, color: 'var(--sage-400)', lineHeight: 1.5, marginBottom: 6 }}>
              {bioLine}
            </div>
          )}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tags.map((t, i) => <TagPill key={i} tag={t} />)}
            </div>
          )}
        </div>
      </div>

      {/* Interactive section: action buttons + pots strip + photo grid */}
      <UserGardenClient
        userId={id}
        pots={potItems}
        posts={posts}
        initialFollowing={isFollowing}
        isOwnGarden={isOwnGarden}
        isDemoUser={false}
      />
    </div>
  )
}

// ── Page entry point ──────────────────────────────────────────────────────────

export default async function UserGardenPage({ params }: { params: { id: string } }) {
  const { id } = params
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  if (!isUUID) {
    return <DemoGardenPage id={id} />
  }

  const user = await getServerUser()
  return <RealGardenPage id={id} currentUserId={user?.id ?? null} />
}
