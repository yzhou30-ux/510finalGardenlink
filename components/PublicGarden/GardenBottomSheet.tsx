'use client'

import { motion } from 'framer-motion'
import type { GardenTile, RelationTag } from './types'
import { SHEET_HEIGHT } from './constants'
import { IconArrowRight, IconMessageCircle } from '@tabler/icons-react'

const TAG_STYLES: Record<RelationTag['type'], { bg: string; color: string }> = {
  geo:    { bg: 'rgba(91,143,185,0.1)',  color: '#3D7BA8' },
  plant:  { bg: 'rgba(107,158,107,0.1)', color: '#4A7D4A' },
  social: { bg: 'rgba(196,147,90,0.1)',  color: '#8B6420' },
}

interface GardenBottomSheetProps {
  tile: GardenTile | null
  onVisitGarden?: () => void
  onMessage?: () => void
}

export function GardenBottomSheet({ tile, onVisitGarden, onMessage }: GardenBottomSheetProps) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: tile ? 0 : '100%' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
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
        <div style={{ padding: '14px 20px', fontFamily: 'var(--font-sans)' }}>
          {/* Header: avatar + name + tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {/* Avatar circle */}
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
              {/* Relation tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {tile.tags.map((tag, i) => {
                  const tagStyle = TAG_STYLES[tag.type] ?? { bg: 'rgba(74,93,73,0.08)', color: 'var(--sage-400)' }
                  return (
                  <span
                    key={i}
                    style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 10,
                      background: tagStyle.bg,
                      color: tagStyle.color,
                    }}
                  >
                    {tag.label}
                  </span>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Latest post */}
          {tile.latestPost && (
            <div style={{ marginBottom: 12 }}>
              {tile.latestPost.imageUrl && (
                <div style={{
                  height: 100, borderRadius: 10, overflow: 'hidden',
                  background: 'var(--glass-sage-light)', marginBottom: 8,
                  backgroundImage: `url(${tile.latestPost.imageUrl})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute', bottom: 6, right: 8,
                    fontSize: 9, color: 'rgba(255,255,255,0.8)',
                  }}>
                    {tile.latestPost.timeAgo}
                  </span>
                </div>
              )}
              <p style={{
                fontSize: 12, color: 'var(--sage-700)', margin: 0,
                lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {tile.latestPost.text}
                {!tile.latestPost.imageUrl && (
                  <span style={{ color: 'var(--sage-300)', marginLeft: 4, fontSize: 10 }}>
                    {tile.latestPost.timeAgo}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
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
