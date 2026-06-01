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
