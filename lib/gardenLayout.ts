// lib/gardenLayout.ts
// Affinity-based spatial layout for the community garden canvas.
// Pure function: data in → positioned tiles out. No DB calls, no side effects.

import type { GardenTile, RelationTag, StatusBubble } from '@/components/PublicGarden/types'
import { getTileIllustrationUrl } from '@/lib/tileIllustrations'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CommunityMember {
  userId: string
  displayName: string
  avatarEmoji: string
  city: string
  plants: string[]            // pot names this user grows
  latestPostText?: string
  latestPostTimeAgo?: string
  latestPostImageUrl?: string
  latestPostCategory?: string | null   // 'help' | 'bloom' | 'growth' | null
  latestPostDate?: string              // ISO timestamp of the most recent published post
  lastActiveAt?: string                // ISO timestamp of most recent daily_record
  potCreatedAt?: string                // ISO timestamp of earliest pot (for newPot bubble)
  isFollowedByMe: boolean
  followsMe: boolean
}

export interface CommunityEvent {
  id: string
  name: string
  emoji: string
  relatedPlant: string        // which plant cluster to anchor near
  text?: string
  timeAgo?: string
}

export interface LayoutConfig {
  myCity: string
  myPlants: string[]          // current user's pot names
  weights?: {
    follow?: number           // default 0.30
    geo?: number              // default 0.25
    plant?: number            // default 0.25
    activity?: number         // default 0.15
    mutual?: number           // default 0.05
  }
  spread?: number             // coordinate spread multiplier, default 1.8
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS = {
  follow:   0.30,
  geo:      0.25,
  plant:    0.25,
  activity: 0.15,
  mutual:   0.05,
}

const MIN_DISTANCE      = 1.5   // closest ring (highest affinity)
const MAX_DISTANCE      = 6.0   // farthest ring (zero affinity)
const ACTIVITY_WINDOW   = 14    // how far back to measure "active" (days)

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Deterministic hash → non-negative integer. Same input → same output. */
function stableHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** Map a plant name to a stable angle zone (radians) within the full circle. */
function plantToAngle(plant: string, allPlants: string[]): number {
  const sorted = [...new Set(allPlants)].sort()
  const idx = sorted.indexOf(plant)
  if (idx === -1) return (stableHash(plant) % 628) / 100
  return (idx / sorted.length) * Math.PI * 2
}

/** Small deterministic jitter (±30°) to prevent tiles from stacking. */
function jitter(userId: string): number {
  return ((stableHash(userId) % 60) - 30) * (Math.PI / 180)
}

/** Recency score: 1.0 if active today, linear decay to 0 over ACTIVITY_WINDOW days. */
function activityScore(lastActiveAt?: string): number {
  if (!lastActiveAt) return 0
  const days = (Date.now() - new Date(lastActiveAt).getTime()) / 86_400_000
  if (days < 0)              return 1
  if (days > ACTIVITY_WINDOW) return 0
  return 1 - days / ACTIVITY_WINDOW
}

/** Plant overlap ratio: |intersection| / max(|mine|, |theirs|). Range [0, 1]. */
function plantOverlap(myPlants: string[], theirPlants: string[]): number {
  if (myPlants.length === 0 || theirPlants.length === 0) return 0
  const mine = new Set(myPlants.map(p => p.toLowerCase()))
  const overlap = theirPlants.filter(p => mine.has(p.toLowerCase())).length
  return overlap / Math.max(myPlants.length, theirPlants.length)
}

// ── Main layout function ───────────────────────────────────────────────────────

export function computeGardenLayout(
  members: CommunityMember[],
  events: CommunityEvent[],
  config: LayoutConfig,
): { memberTiles: GardenTile[]; eventTiles: GardenTile[] } {

  const w      = { ...DEFAULT_WEIGHTS, ...config.weights }
  const spread = config.spread ?? 1.8

  // Pool of all plant names for stable angle assignment across the canvas
  const allPlants = [
    ...config.myPlants,
    ...members.flatMap(m => m.plants),
  ]

  // ── Position each community member ─────────────────────────────────────────

  const memberTiles: GardenTile[] = members.map(member => {
    // 1. Weighted affinity score ∈ [0, 1]
    const affinity = Math.min(1, Math.max(0,
      w.follow   * (member.isFollowedByMe ? 1 : 0) +
      w.geo      * (member.city && member.city === config.myCity ? 1 : 0) +
      w.plant    * plantOverlap(config.myPlants, member.plants) +
      w.activity * activityScore(member.lastActiveAt) +
      w.mutual   * (member.followsMe ? 1 : 0),
    ))

    // 2. Affinity → radial distance (high affinity = small distance = close to me)
    const distance = MIN_DISTANCE + (MAX_DISTANCE - MIN_DISTANCE) * (1 - affinity)

    // 3. Primary plant → angle sector + per-user jitter to prevent overlap
    const primaryPlant = member.plants[0] ?? member.displayName
    const angle = plantToAngle(primaryPlant, allPlants) + jitter(member.userId)

    // 4. Polar → Cartesian, scaled by spread
    const dx = distance * Math.cos(angle) * spread
    const dy = distance * Math.sin(angle) * spread

    // 5. Build relation tags visible in map/feed cards
    const tags: RelationTag[] = []
    if (member.isFollowedByMe)
      tags.push({ type: 'social', label: 'Following' })
    if (member.city && member.city === config.myCity)
      tags.push({ type: 'geo', label: 'Nearby' })
    member.plants.forEach(plant => {
      if (config.myPlants.map(p => p.toLowerCase()).includes(plant.toLowerCase()))
        tags.push({ type: 'plant', label: plant })
    })

    // Pick illustration from primary plant; undefined = emoji fallback in canvas
    const illustrationUrl = getTileIllustrationUrl(primaryPlant)

    // 6. Status bubble — most specific recent signal wins
    const ONE_DAY_MS = 86_400_000
    const postTime = member.latestPostDate
      ? new Date(member.latestPostDate).getTime() : 0
    const potAgeDays = member.potCreatedAt
      ? (Date.now() - new Date(member.potCreatedAt).getTime()) / ONE_DAY_MS
      : Infinity

    let statusBubble: StatusBubble | undefined
    if (postTime > Date.now() - ONE_DAY_MS) {
      if (member.latestPostCategory === 'help') {
        statusBubble = { type: 'help',  label: 'Help'  }
      } else if (member.latestPostCategory === 'bloom') {
        statusBubble = { type: 'bloom', label: 'Bloom' }
      } else {
        statusBubble = { type: 'new',   label: 'New'   }
      }
    } else if (potAgeDays < 7) {
      statusBubble = { type: 'newPot', label: 'New pot' }
    }

    return {
      id:       member.userId,
      dx,
      dy,
      userName: member.displayName,
      emoji:    member.avatarEmoji,
      tags,
      href:             `/user/${member.userId}`,
      illustrationUrl,
      statusBubble,
      latestPost: member.latestPostText
        ? {
            text:     member.latestPostText,
            timeAgo:  member.latestPostTimeAgo ?? '',
            imageUrl: member.latestPostImageUrl,
          }
        : undefined,
    }
  })

  // ── Position events near their relevant plant cluster ──────────────────────

  const eventTiles: GardenTile[] = events.map(event => {
    // Find which member tiles grow the event's related plant
    const cluster = memberTiles.filter((_, i) =>
      members[i].plants.some(
        p => p.toLowerCase() === event.relatedPlant.toLowerCase(),
      ),
    )

    let dx: number, dy: number
    if (cluster.length > 0) {
      // Place near the cluster centroid with a stable offset
      const avgDx  = cluster.reduce((s, t) => s + t.dx, 0) / cluster.length
      const avgDy  = cluster.reduce((s, t) => s + t.dy, 0) / cluster.length
      const offset = (stableHash(event.id) % 40 - 20) / 10
      dx = avgDx + offset
      dy = avgDy + spread * 0.8
    } else {
      // No cluster — place in the outer ring at a stable angle
      const angle = (stableHash(event.id) % 628) / 100
      dx = MAX_DISTANCE * Math.cos(angle) * spread
      dy = MAX_DISTANCE * Math.sin(angle) * spread
    }

    return {
      id:       event.id,
      dx,
      dy,
      userName: event.name,
      emoji:    event.emoji,
      tags:     [{ type: 'social' as const, label: 'Event' }],
      isEvent:  true,
      size:     1.4,
      latestPost: event.text
        ? { text: event.text, timeAgo: event.timeAgo ?? '' }
        : undefined,
    }
  })

  return { memberTiles, eventTiles }
}
