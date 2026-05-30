// components/PublicGarden/GardenFeed.tsx
// Photo-first masonry grid for the Community Feed view.
// Replaces the old text-heavy vertical list.
//
// Layout: native CSS `column-count: 2` waterfall — no masonry library required.
// Each card's height is driven by the photo's natural aspect ratio.
// Posts without a photo are silently excluded.
// Client-side infinite scroll: shows PAGE_SIZE cards at a time from the
// pre-fetched tile array (no extra network calls until we exceed the batch).
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { GardenTile } from './types'

interface GardenFeedProps {
  tiles: GardenTile[]
}

const PAGE_SIZE = 12

export function GardenFeed({ tiles }: GardenFeedProps) {
  // Photo-only: exclude tiles with no image
  const photoTiles = tiles.filter(t => Boolean(t.latestPost?.imageUrl))

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset pagination when the tile array changes (e.g. filter toggled)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [tiles])

  // Infinite scroll — attach observer only while more items remain hidden
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || visibleCount >= photoTiles.length) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, photoTiles.length))
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visibleCount, photoTiles.length])

  const visibleTiles = photoTiles.slice(0, visibleCount)
  const hasMore      = visibleCount < photoTiles.length

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>

      {/* ── Sub-tabs ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 20,
        padding: '10px 16px 0',
        borderBottom: '0.5px solid var(--border-subtle)',
        marginBottom: 12,
      }}>
        {/* Discover — always active */}
        <span style={{
          padding: '0 0 10px',
          fontSize: 13, fontWeight: 500,
          color: 'var(--sage-900)',
          borderBottom: '2px solid var(--sage-900)',
          fontFamily: 'var(--font-sans)',
          cursor: 'default',
        }}>
          Discover
        </span>

        {/* Following — deferred placeholder */}
        <span
          title="Coming soon"
          style={{
            padding: '0 0 10px',
            fontSize: 13, fontWeight: 500,
            color: 'var(--sage-300)',
            borderBottom: '2px solid transparent',
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          Following
        </span>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {photoTiles.length === 0 && (
        <div style={{
          textAlign: 'center', paddingTop: 60,
          color: 'var(--sage-300)', fontSize: 13, lineHeight: 2,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🌿</div>
          No posts with photos yet.
        </div>
      )}

      {/* ── Masonry grid ──────────────────────────────────────────────────── */}
      {visibleTiles.length > 0 && (
        <div style={{
          columnCount: 2,
          columnGap: 8,
          padding: '0 16px 80px',
        }}>
          {visibleTiles.map(tile => (
            <MasonryCard key={tile.id} tile={tile} />
          ))}
        </div>
      )}

      {/* Sentinel div — sits below the grid, triggers next page when in view */}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function MasonryCard({ tile }: { tile: GardenTile }) {
  const post     = tile.latestPost!   // safe: GardenFeed filters for imageUrl
  const plantTag = tile.tags.find(t => t.type === 'plant')

  return (
    <Link
      href={tile.href ?? `/post/community/${tile.id}`}
      style={{
        display: 'block',
        breakInside: 'avoid',
        marginBottom: 8,
        borderRadius: 14,
        overflow: 'hidden',
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-default)',
        boxShadow: 'var(--shadow-card-focus)',
        textDecoration: 'none',
        transition: 'transform 0.12s ease',
        // Needs an explicit initial value so the transition works on first hover
        transform: 'scale(1)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.02)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'  }}
    >
      {/* ── Photo ─────────────────────────────────────────────────────────── */}
      {/* Wrapper provides the sage placeholder visible during image load */}
      <div style={{
        width: '100%',
        background: 'var(--glass-sage-light)',
        lineHeight: 0,       // removes phantom gap below inline img
        minHeight: 80,       // prevents container collapse before load
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      {/* ── Text area ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '8px 10px 10px' }}>

        {/* Caption — max 2 lines */}
        {post.text && (
          <p style={{
            margin: '0 0 6px',
            fontSize: 12, lineHeight: 1.5,
            color: 'var(--sage-700)',
            // Multi-line clamp — vendor prefix required
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } as React.CSSProperties}>
            {post.text}
          </p>
        )}

        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

          {/* Tiny emoji avatar */}
          <div style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            background: 'var(--glass-sage-medium)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11,
          }}>
            {tile.emoji ?? '🌱'}
          </div>

          {/* Username */}
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: 'var(--sage-500)',
            flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {tile.userName}
          </span>

          {/* Plant tag pill (optional) */}
          {plantTag && (
            <span style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 10,
              background: 'var(--glass-sage-light)',
              color: 'var(--sage-500)',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              {plantTag.label}
            </span>
          )}

        </div>
      </div>
    </Link>
  )
}
