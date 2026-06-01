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
