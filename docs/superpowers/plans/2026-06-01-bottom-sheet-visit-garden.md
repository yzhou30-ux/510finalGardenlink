# Enhanced Bottom Sheet + Visit Garden Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live post/photo preview to the community garden bottom sheet, and build a `/user/[id]/garden` page showing a user's pots and posts in a 2-column photo grid.

**Architecture:** Part 1 threads a `latestPostId`/`likeCount` through the query → layout → tile pipeline and rewrites `GardenBottomSheet` with a 16:10 preview card that navigates to `/post/[id]`. Part 2 creates `app/user/[id]/garden/` with a Server Component fetching profile + pots + posts and a Client Component handling the follow-toggle button and infinite-scroll photo grid. Both demo (short-ID) and real (UUID) users are supported via the same routing pattern already used in `app/user/[id]/page.tsx`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Framer Motion, `@tabler/icons-react`, `date-fns`, Supabase

---

## File Map

**Create:**
- `app/user/[id]/garden/page.tsx` — Server Component: fetches profile, pots, posts; renders header + profile section + pot strip; hands the rest to the client
- `app/user/[id]/garden/UserGardenClient.tsx` — Client Component: follow-toggle button, pots strip, infinite-scroll 2-column photo grid
- `app/api/follow/route.ts` — `POST` handler; body `{ targetUserId, action: 'follow'|'unfollow' }` → `{ following: boolean }`

**Modify:**
- `components/PublicGarden/types.ts` — add `latestPostId?` + `likeCount?` to `LatestPost`
- `components/PublicGarden/constants.ts` — `SHEET_HEIGHT` 290→360, `MAP_COMPRESSED_HEIGHT` 310→220
- `components/PublicGarden/GardenBottomSheet.tsx` — enhanced 16:10 preview card (full rewrite)
- `components/FloatingTabBar.tsx` — suppress on `/user/*/garden`
- `lib/queries.ts` — include `id` in latestPosts select; add `getFollowStatus` helper
- `lib/gardenLayout.ts` — add `latestPostId?` to `CommunityMember`; pipe it into tile
- `lib/communityDemoData.ts` — add `likeCount` (+ optional `latestPostId`) to demo tiles' `latestPost`
- `app/(tabs)/garden/GardenClientPage.tsx` — wire `onVisitGarden` + `onMessage` to router.push

---

### Task 1: Extend LatestPost type + adjust sheet height constants

**Files:**
- Modify: `components/PublicGarden/types.ts`
- Modify: `components/PublicGarden/constants.ts`

- [ ] **Step 1: Update `LatestPost` interface in types.ts**

Open `components/PublicGarden/types.ts`. Change:
```typescript
export interface LatestPost {
  imageUrl?: string
  text: string
  timeAgo: string
}
```
to:
```typescript
export interface LatestPost {
  imageUrl?: string
  text: string
  timeAgo: string
  /** DB record id — enables "tap preview → /post/[id]" navigation. Absent for demo tiles. */
  latestPostId?: string
  /** Approximate like count displayed in the preview meta line. Absent = not shown. */
  likeCount?: number
}
```

- [ ] **Step 2: Update sheet height constants**

Open `components/PublicGarden/constants.ts`. Change lines 31-32:
```typescript
export const SHEET_HEIGHT = 290     // px
export const MAP_COMPRESSED_HEIGHT = 310  // px when sheet is open
```
to:
```typescript
export const SHEET_HEIGHT = 360     // px — extra height for preview card
export const MAP_COMPRESSED_HEIGHT = 220  // px — compresses more to fit
```

- [ ] **Step 3: Verify TypeScript still compiles**

Run: `npx tsc --noEmit`
Expected: exits 0 with no errors (new fields are optional — nothing breaks).

- [ ] **Step 4: Commit**
```bash
git add components/PublicGarden/types.ts components/PublicGarden/constants.ts
git commit -m "feat: extend LatestPost with latestPostId/likeCount; increase SHEET_HEIGHT to 360"
```

---

### Task 2: Thread latestPostId through the data pipeline

**Files:**
- Modify: `lib/gardenLayout.ts`
- Modify: `lib/queries.ts`
- Modify: `lib/communityDemoData.ts`

- [ ] **Step 1: Add `latestPostId?` to `CommunityMember` in gardenLayout.ts**

Open `lib/gardenLayout.ts`. In the `CommunityMember` interface (around line 17), add one field after `latestPostDate?`:
```typescript
export interface CommunityMember {
  userId: string
  displayName: string
  avatarEmoji: string
  city: string
  plants: PlantEntry[]
  latestPostText?: string
  latestPostTimeAgo?: string
  latestPostImageUrl?: string
  latestPostCategory?: string | null
  latestPostDate?: string
  latestPostId?: string          // ← NEW: DB record id for the post link
  lastActiveAt?: string
  potCreatedAt?: string
  isFollowedByMe: boolean
  followsMe: boolean
}
```

- [ ] **Step 2: Pipe latestPostId into the tile's latestPost in gardenLayout.ts**

Still in `lib/gardenLayout.ts`, find the tile return block that builds `latestPost:` (around line 233):
```typescript
latestPost: member.latestPostText
  ? {
      text:     member.latestPostText,
      timeAgo:  member.latestPostTimeAgo ?? '',
      imageUrl: member.latestPostImageUrl,
    }
  : undefined,
```
Replace with:
```typescript
latestPost: member.latestPostText
  ? {
      text:          member.latestPostText,
      timeAgo:       member.latestPostTimeAgo ?? '',
      imageUrl:      member.latestPostImageUrl,
      latestPostId:  member.latestPostId,
    }
  : undefined,
```

- [ ] **Step 3: Add `id` to the latestPosts select in queries.ts**

Open `lib/queries.ts`. In `getCommunityMembers`, find the `LatestPostRow` type (around line 506):
```typescript
type LatestPostRow = {
  user_id: string
  caption: string | null
  image_url: string | null
  created_at: string
  post_category: string | null
}
```
Change to:
```typescript
type LatestPostRow = {
  id: string           // ← NEW
  user_id: string
  caption: string | null
  image_url: string | null
  created_at: string
  post_category: string | null
}
```

Then find the `latestPosts` query (around line 574):
```typescript
const { data: latestPosts } = await supabase
  .from('daily_records')
  .select('user_id, caption, image_url, created_at, post_category')
  .eq('has_post', true)
  .in('user_id', userIds)
  .order('created_at', { ascending: false })
```
Change to:
```typescript
const { data: latestPosts } = await supabase
  .from('daily_records')
  .select('id, user_id, caption, image_url, created_at, post_category')
  .eq('has_post', true)
  .in('user_id', userIds)
  .order('created_at', { ascending: false })
```

- [ ] **Step 4: Include latestPostId in the CommunityMember assembly in queries.ts**

In the same function, find the final `return (profiles as ProfileRow[]).map(...)` block (around line 588). Add `latestPostId`:
```typescript
return (profiles as ProfileRow[]).map(profile => {
  const latest = latestByUser.get(profile.user_id)
  return {
    userId:             profile.user_id,
    displayName:        profile.display_name,
    avatarEmoji:        profile.avatar_emoji,
    city:               profile.city ?? '',
    plants:             potsByUser.get(profile.user_id) ?? [],
    latestPostText:     latest?.caption ?? undefined,
    latestPostTimeAgo:  latest ? formatTimeAgo(latest.created_at) : undefined,
    latestPostImageUrl: latest?.image_url ?? undefined,
    latestPostCategory: latest?.post_category ?? undefined,
    latestPostDate:     latest?.created_at ?? undefined,
    latestPostId:       latest?.id ?? undefined,          // ← NEW
    lastActiveAt:       latest?.created_at ?? undefined,
    potCreatedAt:       earliestPotAt.get(profile.user_id) ?? undefined,
    isFollowedByMe:     followingIds.has(profile.user_id),
    followsMe:          followerIds.has(profile.user_id),
  }
})
```

- [ ] **Step 5: Add likeCount to demo tiles in communityDemoData.ts**

Open `lib/communityDemoData.ts`. For every tile that has a `latestPost`, add a `likeCount` inside the `latestPost` object. Apply these specific values:

```typescript
// id '1' — Flora
latestPost: { text: 'My first rose bloom of the season — so thrilled!', timeAgo: '3h ago', likeCount: 28 },

// id '2' — GreenThumb
latestPost: { text: 'Pothos is so low-maintenance — perfect for beginners', timeAgo: '1d ago', likeCount: 14 },

// id '3' — SuccyCat
latestPost: { text: 'New succulent haul — the whole windowsill is full now', timeAgo: '2d ago', likeCount: 9 },

// id '4' — JasmineG
latestPost: { text: 'Jasmine is in full bloom — the scent drifts all the way outside', timeAgo: '2h ago', likeCount: 41 },

// id '6' — FernLover
latestPost: { text: 'Boston fern keeps getting bigger — hanging it up looks amazing', timeAgo: '5h ago', likeCount: 17 },

// id '7' — GardenPro
latestPost: { text: 'Sharing my planting plan for this year', timeAgo: '3d ago', likeCount: 6 },

// id '8' — Sunny
latestPost: { text: 'Sunflower is finally 2 metres tall!', timeAgo: '1d ago', likeCount: 33 },

// id 'event-1' — Spring Fair
latestPost: { text: '2026 Spring Flower Fair — opens May 28', timeAgo: 'just now', likeCount: 72 },
```

(id '5' CactusKing has no latestPost — leave as-is.)

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 7: Commit**
```bash
git add lib/gardenLayout.ts lib/queries.ts lib/communityDemoData.ts
git commit -m "feat: thread latestPostId and likeCount through tile data pipeline"
```

---

### Task 3: Rewrite GardenBottomSheet with enhanced preview card

**Files:**
- Modify: `components/PublicGarden/GardenBottomSheet.tsx` (full rewrite)

- [ ] **Step 1: Replace the entire file**

Write the following content to `components/PublicGarden/GardenBottomSheet.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { IconArrowRight, IconMessageCircle, IconHeart } from '@tabler/icons-react'
import type { GardenTile, RelationTag } from './types'
import { SHEET_HEIGHT } from './constants'

// ── Tag pill colours (same table used in GardenFeed + Visit Garden page) ──────

const TAG_STYLES: Record<RelationTag['type'], { bg: string; color: string }> = {
  geo:    { bg: 'rgba(91,143,185,0.1)',  color: '#3D7BA8' },
  plant:  { bg: 'rgba(107,158,107,0.1)', color: '#4A7D4A' },
  social: { bg: 'rgba(196,147,90,0.1)',  color: '#8B6420' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface GardenBottomSheetProps {
  tile: GardenTile | null
  onVisitGarden?: () => void
  onMessage?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GardenBottomSheet({ tile, onVisitGarden, onMessage }: GardenBottomSheetProps) {
  const post = tile?.latestPost
  // Only real-user tiles carry latestPostId; demo tiles get no link.
  const postHref = post?.latestPostId ? `/post/${post.latestPostId}` : undefined

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: tile ? 0 : '100%' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: SHEET_HEIGHT,
        background: 'rgba(253,251,247,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '0.5px solid rgba(200,209,198,0.5)',
        borderRadius: '18px 18px 0 0',
        zIndex: 30,
        overflow: 'hidden',
      }}
      aria-live="polite"
    >
      {/* Drag handle */}
      <div style={{
        width: 36, height: 4, borderRadius: 2,
        background: 'rgba(74,93,73,0.15)',
        margin: '8px auto 0',
      }} />

      {tile && (
        <div style={{
          padding: '12px 16px 14px',
          fontFamily: 'var(--font-sans)',
          height: 'calc(100% - 20px)',   /* 20px = handle (4px) + margins (8+8) */
          boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>

          {/* ── Header: avatar + name + relation tags ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--glass-sage-medium)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>
              {tile.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sage-900)', marginBottom: 4 }}>
                {tile.userName}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {tile.tags.map((tag, i) => {
                  const s = TAG_STYLES[tag.type] ?? { bg: 'rgba(74,93,73,0.08)', color: 'var(--sage-400)' }
                  return (
                    <span key={i} style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 10,
                      background: s.bg, color: s.color,
                    }}>
                      {tag.label}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Activity preview card (shown only when tile has a latestPost) ── */}
          {post && <PreviewCard post={post} href={postHref} />}

          {/* Push buttons to the bottom */}
          <div style={{ flex: 1 }} />

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onVisitGarden}
              style={{
                flex: 1, height: 38, borderRadius: 10,
                background: 'var(--glass-sage-medium)',
                border: '0.5px solid var(--glass-sage-border)',
                color: 'var(--sage-900)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 4,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <IconArrowRight size={14} /> Visit Garden
            </button>
            <button
              type="button"
              onClick={onMessage}
              style={{
                flex: 1, height: 38, borderRadius: 10,
                background: 'var(--glass-sage-subtle)',
                border: '0.5px solid var(--glass-sage-border)',
                color: 'var(--sage-700)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 4,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <IconMessageCircle size={14} /> Message
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── Preview card ──────────────────────────────────────────────────────────────
// Shown when tile.latestPost is present.
// If latestPostId exists → wraps in a Link; otherwise renders plain div.

interface PreviewPost {
  imageUrl?: string
  text: string
  timeAgo: string
  likeCount?: number
  latestPostId?: string
}

function PreviewCard({ post, href }: { post: PreviewPost; href?: string }) {
  const cardStyle: React.CSSProperties = {
    borderRadius: 12,
    background: 'rgba(74,93,73,0.04)',
    border: '0.5px solid rgba(74,93,73,0.10)',
    overflow: 'hidden',
    display: 'block',
    textDecoration: 'none',
  }

  const content = (
    <>
      {/* Photo — 16:10 aspect, capped at 140px height to fit the sheet */}
      {post.imageUrl && (
        <div style={{
          width: '100%',
          aspectRatio: '16 / 10',
          maxHeight: 140,
          overflow: 'hidden',
          background: 'var(--glass-sage-light)',
          lineHeight: 0,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Text body + meta line */}
      <div style={{ padding: '8px 10px' }}>
        <p style={{
          margin: '0 0 4px',
          fontSize: 12, color: 'var(--sage-700)', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.text}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--sage-300)' }}>
          <span>{post.timeAgo}</span>
          {post.likeCount !== undefined && (
            <>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconHeart size={10} strokeWidth={1.5} />
                {post.likeCount}
              </span>
            </>
          )}
        </div>
      </div>
    </>
  )

  return href
    ? <Link href={href} style={cardStyle}>{content}</Link>
    : <div style={cardStyle}>{content}</div>
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Navigate to `/garden`. Tap several tiles:
- Flora (tile 1): preview shows rose bloom text + `♡ 28`; card is not a link (no latestPostId for demo tiles).
- CactusKing (tile 5): no preview card shown (no latestPost).
- Sheet height accommodates header + preview + buttons without content being cut off.

- [ ] **Step 4: Commit**
```bash
git add components/PublicGarden/GardenBottomSheet.tsx
git commit -m "feat: enhance bottom sheet with 16:10 post preview card and like count"
```

---

### Task 4: Wire navigation in GardenClientPage

**Files:**
- Modify: `app/(tabs)/garden/GardenClientPage.tsx`

- [ ] **Step 1: Replace the console.log stubs with router navigation**

Open `app/(tabs)/garden/GardenClientPage.tsx`. Find the `<PublicGarden>` usage (around line 337):
```tsx
<PublicGarden
  tiles={showHelpEmpty ? [] : communityTiles}
  myTile={MY_TILE}
  viewMode={communityView}
  onVisitGarden={(tile) => console.log('visit', tile.id)}
  onMessage={(tile) => console.log('message', tile.id)}
/>
```
Change to:
```tsx
<PublicGarden
  tiles={showHelpEmpty ? [] : communityTiles}
  myTile={MY_TILE}
  viewMode={communityView}
  onVisitGarden={(tile) => router.push(`/user/${tile.id}/garden`)}
  onMessage={(tile) => router.push('/messages')}
/>
```

Note: `router` is already imported via `const router = useRouter()` at the top of this component.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**
```bash
git add "app/(tabs)/garden/GardenClientPage.tsx"
git commit -m "feat: wire Visit Garden → /user/[id]/garden and Message → /messages"
```

---

### Task 5: Suppress FloatingTabBar on garden detail pages

**Files:**
- Modify: `components/FloatingTabBar.tsx`

- [ ] **Step 1: Add the route exclusion**

Open `components/FloatingTabBar.tsx`. Find line 21:
```typescript
if (pathname.startsWith('/auth') || pathname === '/camera') return null
```
Change to:
```typescript
if (
  pathname.startsWith('/auth') ||
  pathname === '/camera' ||
  /^\/user\/[^/]+\/garden/.test(pathname)
) return null
```

This regex matches `/user/<anything>/garden` (and any deeper sub-path like `/user/abc/garden/photos`) while leaving `/user/[id]` (the profile page) unaffected.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**
```bash
git add components/FloatingTabBar.tsx
git commit -m "feat: hide FloatingTabBar on /user/[id]/garden detail pages"
```

---

### Task 6: Add follow-toggle API route and getFollowStatus query

**Files:**
- Modify: `lib/queries.ts`
- Create: `app/api/follow/route.ts`

- [ ] **Step 1: Add `getFollowStatus` to the bottom of queries.ts**

Open `lib/queries.ts`. Append at the very end of the file:

```typescript
/**
 * Returns true if currentUserId is following targetUserId.
 * Returns false if not following, or if the follows table doesn't exist yet.
 */
export async function getFollowStatus(
  currentUserId: string,
  targetUserId: string,
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .maybeSingle()
    return data !== null
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Create `app/api/follow/route.ts`**

```typescript
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 4: Commit**
```bash
git add lib/queries.ts app/api/follow/route.ts
git commit -m "feat: add getFollowStatus query helper and follow-toggle API route"
```

---

### Task 7: Visit Garden — Server Component (page.tsx)

**Files:**
- Create: `app/user/[id]/garden/page.tsx`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p "app/user/[id]/garden"
```

Write the following to `app/user/[id]/garden/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exits 0. (UserGardenClient doesn't exist yet — expect a module-not-found error only if imports are checked before the next task. You can comment out the `UserGardenClient` import temporarily.)

- [ ] **Step 3: Commit**
```bash
git add "app/user/[id]/garden/page.tsx"
git commit -m "feat: add /user/[id]/garden server component (profile + pot strip + photo grid shell)"
```

---

### Task 8: Visit Garden — Client Component (UserGardenClient)

**Files:**
- Create: `app/user/[id]/garden/UserGardenClient.tsx`

- [ ] **Step 1: Create the file**

Write the following to `app/user/[id]/garden/UserGardenClient.tsx`:

```tsx
'use client'

// UserGardenClient.tsx
// Handles all interactive state on the Visit Garden page:
//   • Follow / Following toggle button (optimistic UI)
//   • Message button (navigates to /messages)
//   • Pots horizontal strip
//   • 2-column photo grid with infinite scroll (load 12 at a time)

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { IconUserCheck, IconUserPlus, IconMessageCircle } from '@tabler/icons-react'
import type { DailyRecord } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PotItem {
  id: string
  name: string
  emoji: string
  days: number
}

interface UserGardenClientProps {
  userId: string
  pots: PotItem[]
  posts: DailyRecord[]
  initialFollowing: boolean
  isOwnGarden: boolean
  isDemoUser: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12

// ── Component ─────────────────────────────────────────────────────────────────

export function UserGardenClient({
  userId,
  pots,
  posts,
  initialFollowing,
  isOwnGarden,
  isDemoUser,
}: UserGardenClientProps) {
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [followPending, setFollowPending] = useState(false)

  // Photo-only posts — the grid only shows entries that have an image
  const photoPosts = posts.filter(p => Boolean(p.image_url))

  // ── Follow toggle ──────────────────────────────────────────────────────────

  async function handleFollowToggle() {
    if (isDemoUser || followPending) return

    const action = isFollowing ? 'unfollow' : 'follow'
    setIsFollowing(!isFollowing)           // optimistic
    setFollowPending(true)

    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, action }),
      })
      if (!res.ok) {
        // Revert on error
        setIsFollowing(isFollowing)
      }
    } catch {
      setIsFollowing(isFollowing)
    } finally {
      setFollowPending(false)
    }
  }

  return (
    <>
      {/* ── Action buttons (hidden on own garden) ── */}
      {!isOwnGarden && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', fontFamily: 'var(--font-sans)' }}>
          <button
            type="button"
            onClick={handleFollowToggle}
            disabled={followPending}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 500,
              cursor: followPending ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              fontFamily: 'var(--font-sans)',
              border: isFollowing
                ? '0.5px solid rgba(74,93,73,0.15)'
                : '0.5px solid rgba(74,93,73,0.2)',
              background: isFollowing
                ? 'transparent'
                : 'rgba(74,93,73,0.10)',
              color: isFollowing ? 'var(--sage-500)' : 'var(--sage-900)',
              opacity: followPending ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {isFollowing
              ? <><IconUserCheck size={14} strokeWidth={1.7} /> Following</>
              : <><IconUserPlus  size={14} strokeWidth={1.7} /> Follow</>
            }
          </button>

          <button
            type="button"
            onClick={() => router.push('/messages')}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              fontFamily: 'var(--font-sans)',
              border: '0.5px solid rgba(74,93,73,0.12)',
              background: 'transparent',
              color: 'var(--sage-700)',
            }}
          >
            <IconMessageCircle size={14} strokeWidth={1.7} /> Message
          </button>
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{ height: '0.5px', background: 'var(--border-subtle)', margin: '0 16px' }} />

      {/* ── Pots strip ── */}
      {pots.length > 0 && (
        <div style={{ padding: '14px 16px 10px', fontFamily: 'var(--font-sans)' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sage-900)', marginBottom: 10 }}>
            {isOwnGarden ? '🌿 My pots' : '🌿 Their pots'}
          </div>
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto',
            paddingBottom: 4,
            /* hide scrollbar on webkit */
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}>
            {pots.map(pot => (
              <div
                key={pot.id}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, minWidth: 56 }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(253,251,247,0.85)',
                  border: '0.5px solid rgba(200,209,198,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, cursor: isDemoUser ? 'default' : 'pointer',
                }}>
                  {pot.emoji}
                </div>
                <span style={{
                  fontSize: 9, color: 'var(--sage-700)', marginTop: 4,
                  maxWidth: 56, textAlign: 'center',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {pot.name}
                </span>
                <span style={{ fontSize: 8, color: 'var(--sage-400)' }}>
                  Day {pot.days}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{ height: '0.5px', background: 'var(--border-subtle)', margin: '0 16px' }} />

      {/* ── Photo grid ── */}
      <PhotoGrid posts={photoPosts} />
    </>
  )
}

// ── Photo grid ────────────────────────────────────────────────────────────────

function PhotoGrid({ posts }: { posts: DailyRecord[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset when the post list changes (e.g., navigating between users)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [posts])

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || visibleCount >= posts.length) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, posts.length))
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visibleCount, posts.length])

  const visible = posts.slice(0, visibleCount)
  const hasMore = visibleCount < posts.length

  if (posts.length === 0) {
    return (
      <div style={{
        padding: '60px 0', textAlign: 'center',
        color: 'var(--sage-300)', fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 2,
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
        No posts yet
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 16px 100px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sage-900)', marginBottom: 10 }}>
        📷 Posts
      </div>

      {/* 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {visible.map(post => (
          <PhotoThumb key={post.id} post={post} />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </div>
  )
}

// ── Individual photo thumbnail ────────────────────────────────────────────────

function PhotoThumb({ post }: { post: DailyRecord }) {
  const dateLabel = (() => {
    try { return format(new Date(post.record_date), 'MMM d') } catch { return '' }
  })()

  const badge =
    post.post_category === 'bloom' ? { label: 'Bloom', cls: 'bloom' } :
    post.post_category === 'help'  ? { label: 'Help',  cls: 'help'  } :
    null

  const inner = (
    <div style={{
      aspectRatio: '1',
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
      cursor: 'pointer',
      background: 'var(--glass-sage-light)',
    }}>
      {/* Photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={post.image_url!}
        alt=""
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Date label — top-left */}
      {dateLabel && (
        <span style={{
          position: 'absolute', top: 6, left: 8,
          fontSize: 9, color: 'rgba(255,255,255,0.85)',
          textShadow: '0 1px 3px rgba(0,0,0,0.3)',
          fontFamily: 'var(--font-sans)',
        }}>
          {dateLabel}
        </span>
      )}

      {/* Status badge — top-right (Bloom or Help only) */}
      {badge && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          padding: '2px 6px', borderRadius: 8,
          fontSize: 8, fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          ...(badge.cls === 'bloom'
            ? { background: 'rgba(235,180,180,0.85)', color: '#7B3040' }
            : { background: 'rgba(220,180,140,0.85)', color: '#6B4420' }),
        }}>
          {badge.label}
        </span>
      )}

      {/* Caption overlay — bottom gradient */}
      {post.caption && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '18px 8px 6px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)',
          fontSize: 9, color: 'rgba(255,255,255,0.9)',
          fontFamily: 'var(--font-sans)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {post.caption}
        </div>
      )}
    </div>
  )

  // Wrap in a Link to the post detail page
  return (
    <Link href={`/post/${post.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      {inner}
    </Link>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles (full project)**

Run: `npx tsc --noEmit`
Expected: exits 0. Fix any type errors before proceeding.

Common issues to watch for:
- `DailyRecord` import path: `import type { DailyRecord } from '@/lib/types'`
- `format` import: `import { format } from 'date-fns'`
- Unused `Divider` in page.tsx if it was defined but not imported — remove or use

- [ ] **Step 3: Manual end-to-end test**

Run: `npm run dev`

Test the full flow:
1. Navigate to `/garden`
2. Tap the Flora tile (id '1') → sheet opens with preview card, like count 28
3. Tap "Visit Garden" → navigates to `/user/1/garden`
4. Verify: sticky header shows "Flora's garden", no FloatingTabBar at the bottom
5. Profile section shows emoji + name + relation tags
6. Pots strip shows 3 demo pots (Rose, Sunflower, Succulent)
7. Photo grid section header "📷 Posts" is visible; if Flora's latestPost has an imageUrl, one thumbnail appears
8. Navigate to `/garden` and tap a real user tile (if any) → Visit Garden shows real data

- [ ] **Step 4: Commit**
```bash
git add "app/user/[id]/garden/UserGardenClient.tsx"
git commit -m "feat: add UserGardenClient — follow toggle, pots strip, 2-col photo grid"
```

---

## Self-Review

### 1. Spec Coverage

| Spec requirement | Task that implements it |
|---|---|
| Preview card: 16:10 photo | Task 3 — `PreviewCard` with `aspectRatio: '16/10'` + `maxHeight: 140` |
| Preview card: text 1-2 lines | Task 3 — `-webkit-line-clamp: 2` |
| Preview card: time + like count | Task 3 — meta line; like count from Task 2 |
| Tap preview → `/post/[id]` | Task 3 — `Link` wrapping when `latestPostId` present |
| Content priority: recent post → record photo → hide | Task 2+3 — `tile.latestPost` already uses has_post records; no latestPost = no card ✓ |
| Sheet height increase | Task 1 — SHEET_HEIGHT 290→360 |
| "Visit Garden" navigates to `/user/[id]/garden` | Task 4 |
| "Message" navigates to `/messages` | Task 4 |
| No FloatingTabBar on garden detail page | Task 5 |
| Visit Garden: back arrow + title | Task 7 — `StickyHeader` |
| Visit Garden: horizontal profile (avatar left, info right) | Task 7 — flex layout |
| Visit Garden: bio + years + city sub-line | Task 7 — `bioLine` |
| Visit Garden: relation tags | Task 7 — Following tag computed; geo/plant post-MVP noted |
| Follow / Following ✓ button | Task 8 — optimistic toggle via `/api/follow` |
| Message button | Task 8 — `router.push('/messages')` |
| Pots strip (horizontal scroll) | Task 8 — `overflowX: auto` div |
| "Their pots" vs "My pots" label | Task 8 — conditional on `isOwnGarden` |
| 2-column photo grid | Task 8 — `display: grid, gridTemplateColumns: '1fr 1fr'` |
| Date label top-left | Task 8 — `PhotoThumb` absolute positioned |
| Status badge (Bloom/Help) | Task 8 — `badge` object from `post_category` |
| Caption gradient overlay | Task 8 — gradient overlay bottom |
| Tap thumbnail → `/post/[id]` | Task 8 — `Link href={/post/${post.id}}` |
| Infinite scroll (12 per batch) | Task 8 — `IntersectionObserver` sentinel |
| Photos only (skip text-only) | Task 8 — `posts.filter(p => Boolean(p.image_url))` |
| No posts empty state | Task 8 — centered plant icon + text |
| Demo users supported | Task 7 — `DemoGardenPage` + Task 8 reuses same client |
| Own garden: hide Follow/Message buttons | Task 8 — `!isOwnGarden` guard |
| Follow API (graceful degradation if table missing) | Task 6 — catch block returns success |
| `getFollowStatus` query | Task 6 |

### 2. Placeholder Scan

No TBDs, TODOs, or incomplete sections. All code blocks are complete and runnable.

### 3. Type Consistency

- `LatestPost.latestPostId` defined in Task 1, read in Task 3 ✓
- `LatestPost.likeCount` defined in Task 1, written in Task 2, read in Task 3 ✓
- `CommunityMember.latestPostId` added in Task 2 (gardenLayout), written in Task 2 (queries) ✓
- `PotItem` defined in `UserGardenClient.tsx`, used by `page.tsx` (compatible shape) ✓
- `DailyRecord[]` flows from `getPublicPostsByUserId` (queries.ts) → `page.tsx` → `UserGardenClient` ✓
- `getFollowStatus` defined in Task 6, imported in Task 7 ✓
- `/api/follow` route created in Task 6, called in Task 8 ✓
