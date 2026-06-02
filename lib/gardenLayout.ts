// lib/gardenLayout.ts
// Affinity-based spatial layout for the community garden canvas.
// Pure function: data in → positioned tiles out. No DB calls, no side effects.

import type { GardenTile, RelationTag, StatusBubble } from '@/components/PublicGarden/types'
import { getTileIllustrationUrl, getEventIllustrationUrl } from '@/lib/tileIllustrations'

// ── Types ──────────────────────────────────────────────────────────────────────

/** One plant entry — name is required, botanical fields optional (populated via PlantNet). */
export interface PlantEntry {
  name: string
  genus?: string | null
  family?: string | null
}

export interface CommunityMember {
  userId: string
  displayName: string
  avatarEmoji: string
  city: string
  plants: PlantEntry[]        // pots this user grows, with optional botanical data
  latestPostText?: string
  latestPostTimeAgo?: string
  latestPostImageUrl?: string
  latestPostCategory?: string | null   // 'help' | 'bloom' | 'growth' | null
  latestPostDate?: string              // ISO timestamp of the most recent published post
  latestPostId?: string                // DB record id for the post link
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
  illustrationUrl?: string    // optional override — defaults to getEventIllustrationUrl()
}

export interface LayoutConfig {
  myCity: string
  myPlants: PlantEntry[]      // current user's pots, with optional botanical data
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

/**
 * Tiered plant overlap score ∈ [0, 1].
 *
 * For each of my plants, find the best-matching plant in theirs:
 *   genus match  → 1.0  (same species cluster)
 *   family match → 0.3  (botanical cousins)
 *   name match   → 0.5  (string equality fallback, e.g. demo data with no taxonomy)
 *
 * Total is divided by max(mine, theirs) so the score stays in [0, 1].
 */
function plantOverlap(myPlants: PlantEntry[], theirPlants: PlantEntry[]): number {
  if (myPlants.length === 0 || theirPlants.length === 0) return 0
  let totalScore = 0
  const maxPairs = Math.max(myPlants.length, theirPlants.length)
  const matched  = new Set<number>()

  for (const mine of myPlants) {
    let bestScore = 0
    let bestIdx   = -1

    for (let j = 0; j < theirPlants.length; j++) {
      if (matched.has(j)) continue
      const theirs = theirPlants[j]
      let pairScore = 0

      if (mine.genus && theirs.genus &&
          mine.genus.toLowerCase() === theirs.genus.toLowerCase()) {
        pairScore = 1.0
      } else if (mine.family && theirs.family &&
                 mine.family.toLowerCase() === theirs.family.toLowerCase()) {
        pairScore = 0.3
      } else if (mine.name.toLowerCase() === theirs.name.toLowerCase()) {
        pairScore = 0.5
      }

      if (pairScore > bestScore) { bestScore = pairScore; bestIdx = j }
    }

    if (bestIdx >= 0) { matched.add(bestIdx); totalScore += bestScore }
  }

  return totalScore / maxPairs
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
  const allPlantNames = [
    ...config.myPlants.map(p => p.name),
    ...members.flatMap(m => m.plants.map(p => p.name)),
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
    const primaryPlantName = member.plants[0]?.name ?? member.displayName
    const angle = plantToAngle(primaryPlantName, allPlantNames) + jitter(member.userId)

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
      if (config.myPlants.some(p => p.name.toLowerCase() === plant.name.toLowerCase()))
        tags.push({ type: 'plant', label: plant.name })
    })

    // Pick illustration from primary plant; undefined = emoji fallback in canvas
    const illustrationUrl = getTileIllustrationUrl(primaryPlantName)

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
            text:          member.latestPostText,
            timeAgo:       member.latestPostTimeAgo ?? '',
            imageUrl:      member.latestPostImageUrl,
            latestPostId:  member.latestPostId,
          }
        : undefined,
    }
  })

  // ── Position events near their relevant plant cluster ──────────────────────
  //
  // Each event is placed at the centroid of its related plant cluster, then
  // nudged by two mechanisms to prevent stacking:
  //
  //   1. Vertical stagger: dy offset grows by 1.5 per event index so multiple
  //      events anchored to the same cluster spread vertically rather than
  //      landing on the exact same point.
  //
  //   2. Minimum-distance push: after placing each event we scan all already-
  //      placed event tiles. If the Euclidean distance to any existing tile is
  //      < MIN_EVENT_GAP we push the new tile outward along the separation
  //      vector until the gap is satisfied.

  const MIN_EVENT_GAP = 2.0   // grid units — same coordinate space as dx/dy

  const eventTiles: GardenTile[] = []

  events.forEach((event, eventIndex) => {
    // Find which member tiles grow the event's related plant
    const cluster = memberTiles.filter((_, i) =>
      members[i].plants.some(
        p => p.name.toLowerCase() === event.relatedPlant.toLowerCase(),
      ),
    )

    let dx: number, dy: number
    if (cluster.length > 0) {
      // Place near the cluster centroid with a stable horizontal offset.
      // Vertical offset grows with eventIndex so same-cluster events stack
      // downward (1.5 units apart) instead of piling on the same point.
      const avgDx  = cluster.reduce((s, t) => s + t.dx, 0) / cluster.length
      const avgDy  = cluster.reduce((s, t) => s + t.dy, 0) / cluster.length
      const offset = (stableHash(event.id) % 40 - 20) / 10
      dx = avgDx + offset
      dy = avgDy + spread * 0.8 + eventIndex * 1.5
    } else {
      // No cluster — place in the outer ring at a stable angle
      const angle = (stableHash(event.id) % 628) / 100
      dx = MAX_DISTANCE * Math.cos(angle) * spread
      dy = MAX_DISTANCE * Math.sin(angle) * spread
    }

    // Minimum-distance push: iterate already-placed event tiles and push
    // this one outward until no overlap remains.
    for (const placed of eventTiles) {
      const dist = Math.hypot(dx - placed.dx, dy - placed.dy)
      if (dist < MIN_EVENT_GAP) {
        // Push along the vector from the conflicting tile toward this one.
        // If they're exactly coincident use a stable fallback direction.
        const pushDist = dist > 0 ? dist : 0.001
        const nx = (dx - placed.dx) / pushDist   // unit vector x
        const ny = (dy - placed.dy) / pushDist   // unit vector y
        const gap = MIN_EVENT_GAP - dist
        dx += nx * gap
        dy += ny * gap
      }
    }

    eventTiles.push({
      id:       event.id,
      dx,
      dy,
      userName: event.name,
      emoji:    event.emoji,
      tags:     [{ type: 'social' as const, label: 'Event' }],
      isEvent:  true,
      size:     1.4,
      illustrationUrl: event.illustrationUrl ?? getEventIllustrationUrl(),
      latestPost: event.text
        ? { text: event.text, timeAgo: event.timeAgo ?? '' }
        : undefined,
    })
  })

  return { memberTiles, eventTiles }
}
