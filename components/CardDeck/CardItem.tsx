'use client'

import { motion, useTransform, type MotionValue } from 'framer-motion'
import { format } from 'date-fns'
import type { CardData } from './types'
import {
  CARD_HEIGHT_FOCUSED,
  CARD_HEIGHT_NORMAL,
  CARD_SPACING,
  CARD_WIDTH_FOCUSED,
  CARD_WIDTH_NORMAL,
  MIN_OPACITY,
  MIN_SCALE,
  OPACITY_FACTOR,
  SCALE_FACTOR,
} from './constants'

interface CardItemProps {
  card: CardData
  basePosition: number
  scrollOffset: MotionValue<number>
  isFocused: boolean
  onMarkPost?: () => void
  onTagClick?: (tag: string) => void
}

export function CardItem({
  card,
  basePosition,
  scrollOffset,
  isFocused,
  onMarkPost,
  onTagClick,
}: CardItemProps) {
  const translateY = useTransform(
    scrollOffset,
    (off) => (basePosition - off) * CARD_SPACING
  )
  const scale = useTransform(scrollOffset, (off) =>
    Math.max(MIN_SCALE, 1 - Math.abs(basePosition - off) * SCALE_FACTOR)
  )
  const opacity = useTransform(scrollOffset, (off) =>
    Math.max(MIN_OPACITY, 1 - Math.abs(basePosition - off) * OPACITY_FACTOR)
  )

  const hasCover = Boolean(card.coverImageUrl)
  const monthLabel = format(card.date, 'MMM').toUpperCase()
  const dayLabel = format(card.date, 'd')

  const focusedBgStyle: React.CSSProperties = hasCover
    ? {}
    : {
        background: 'var(--glass-cream-strong)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '0.5px solid rgba(200,209,198,0.6)',
        boxShadow: 'var(--shadow-card-focus)',
      }

  const unfocusedBgStyle: React.CSSProperties = {
    background: 'var(--glass-sage-light)',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
    border: '0.5px solid var(--border-subtle)',
  }

  const monthColor = isFocused
    ? hasCover
      ? 'rgba(255,255,255,0.85)'
      : 'var(--sage-400)'
    : 'rgba(74,93,73,0.45)'

  const dayColor = isFocused
    ? hasCover
      ? '#FFFFFF'
      : 'var(--sage-900)'
    : 'rgba(61,79,60,0.35)'

  const markPostBtnStyle: React.CSSProperties = hasCover
    ? {
        background: 'rgba(255,255,255,0.18)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        color: '#FFFFFF',
        border: 'none',
      }
    : {
        background: 'var(--glass-sage-medium)',
        color: 'var(--sage-700)',
        border: '0.5px solid var(--glass-sage-border)',
      }

  const tagStyle: React.CSSProperties = hasCover
    ? {
        background: 'rgba(255,255,255,0.12)',
        color: 'rgba(255,255,255,0.9)',
      }
    : {
        background: 'var(--glass-sage-medium)',
        color: 'var(--sage-500)',
      }

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        x: '-50%',
        y: '-50%',
        translateY,
        scale,
        opacity,
        zIndex: isFocused ? 150 : 100 - Math.round(Math.abs(basePosition) * 10),
        width: isFocused ? CARD_WIDTH_FOCUSED : CARD_WIDTH_NORMAL,
        height: isFocused ? CARD_HEIGHT_FOCUSED : CARD_HEIGHT_NORMAL,
        borderRadius: 14,
        overflow: 'hidden',
        willChange: 'transform, opacity',
        cursor: isFocused ? 'default' : 'pointer',
        transition: 'width 0.15s ease, height 0.15s ease',
        ...(isFocused ? focusedBgStyle : unfocusedBgStyle),
      }}
      role="option"
      aria-selected={isFocused}
    >
      {/* Cover image (only when focused + has cover) */}
      {isFocused && hasCover && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${card.coverImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            aria-hidden
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--card-cover-overlay)',
            }}
            aria-hidden
          />
        </>
      )}

      {/* Content layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: isFocused ? 20 : 16,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: monthColor,
                fontFamily: 'var(--font-sans)',
                letterSpacing: 0.5,
              }}
            >
              {monthLabel}
            </span>
            <span
              style={{
                fontSize: isFocused ? 48 : 36,
                fontWeight: 600,
                color: dayColor,
                fontFamily: 'var(--font-sans)',
                marginTop: 4,
                lineHeight: 1,
              }}
            >
              {dayLabel}
            </span>
          </div>

          {isFocused && (
            <button
              // Stop pointer events from bubbling to the CardDeck container.
              // The container calls setPointerCapture(pointerId) on every
              // pointerdown, which redirects pointerup to itself — the browser
              // then fires `click` on the container instead of this button,
              // so onClick never fires.  Stopping propagation here prevents
              // the capture and restores normal click behaviour.
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onMarkPost?.()
              }}
              style={{
                ...markPostBtnStyle,
                borderRadius: 8,
                fontSize: 11,
                padding: '5px 12px',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
              }}
            >
              {card.hasPost ? 'Edit post' : 'Post'}
            </button>
          )}
        </div>

        {/* Bottom row (tags, focused only) */}
        {isFocused && card.tags && card.tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              justifyContent: 'flex-end',
            }}
          >
            {card.tags.map((tag) => (
              <button
                key={tag}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onTagClick?.(tag)
                }}
                style={{
                  ...tagStyle,
                  borderRadius: 14,
                  fontSize: 9,
                  padding: '3px 8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
