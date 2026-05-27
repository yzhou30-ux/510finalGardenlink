// components/MyGarden/PlantBubble.tsx
'use client'

import { useCallback, useRef, useState } from 'react'
import { IconCamera, IconPlus } from '@tabler/icons-react'
import type { PlantPot } from './types'

const LONG_PRESS_MS = 500

interface PlantBubbleProps {
  pot: PlantPot
  x: number         // center x in px
  y: number         // center y in px
  r: number         // radius in px
  index: number     // for staggered animation delays
  zIndex?: number   // explicit stacking order (unrecorded pots float to top)
  onTap: () => void
  onLongPress: (clientX: number, clientY: number) => void
  isAddButton?: boolean
}

export function PlantBubble({
  pot,
  x, y, r,
  index,
  zIndex,
  onTap,
  onLongPress,
  isAddButton = false,
}: PlantBubbleProps) {
  const [pressing, setPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPressRef = useRef(false)

  // ── Entry + breathe animation timing ──────────────────────────────────────
  const entryDelay = index * 80         // ms
  const breatheDelay = entryDelay + 460 // starts right after entry finishes

  // ── Pointer handlers ───────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    didLongPressRef.current = false
    setPressing(false)

    timerRef.current = setTimeout(() => {
      didLongPressRef.current = true
      // Brief press-down feedback then show menu
      setPressing(true)
      setTimeout(() => {
        setPressing(false)
        onLongPress(e.clientX, e.clientY)
      }, 150)
    }, LONG_PRESS_MS)
  }, [onLongPress])

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!didLongPressRef.current) {
      onTap()
    }
  }, [onTap])

  const cancelPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setPressing(false)
  }, [])

  // ── Styles ─────────────────────────────────────────────────────────────────
  const d = r * 2  // diameter

  const outerStyle: React.CSSProperties = {
    position: 'absolute',
    left: x - r,
    top: y - r,
    // Entry animation on outer wrapper
    animation: `bubble-enter 0.45s cubic-bezier(0.34,1.56,0.64,1) ${entryDelay}ms both`,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    // Reserve space for label below the circle
    paddingBottom: r * 0.9,
    // Stacking order: ensures unrecorded-pot badges are never hidden by sibling bubbles
    zIndex: zIndex ?? index + 1,
  }

  const circleStyle: React.CSSProperties = {
    width: d,
    height: d,
    borderRadius: '50%',
    position: 'relative',
    // Breathe animation on inner circle (starts after entry)
    animation: isAddButton
      ? undefined
      : `bubble-breathe 4s ease-in-out ${breatheDelay}ms infinite`,
    animationPlayState: pressing ? 'paused' : 'running',
    // Press-down feedback
    transform: pressing ? 'scale(0.92)' : undefined,
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    boxShadow: pressing
      ? '0 6px 20px rgba(61,79,60,0.18)'
      : '0 2px 8px rgba(61,79,60,0.06)',
    // Visual style depends on isAddButton
    background: isAddButton
      ? 'transparent'
      : 'rgba(253,251,247,0.85)',
    border: isAddButton
      ? '1.5px dashed rgba(139,158,137,0.35)'
      : '0.5px solid rgba(200,209,198,0.55)',
    backdropFilter: isAddButton ? undefined : 'blur(4px)',
    WebkitBackdropFilter: isAddButton ? undefined : 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  // ── Unrecorded badge (only when !recordedToday and not add button) ─────────
  const showBadge = !isAddButton && !pot.recordedToday

  const ariaLabel = isAddButton
    ? 'Add a new pot'
    : `${pot.name}, day ${pot.daysSinceStart}${!pot.recordedToday ? ', not recorded today' : ''}`

  return (
    <div
      style={outerStyle}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTap() }}
    >
      {/* Circle */}
      <div style={circleStyle}>
        {isAddButton ? (
          <IconPlus size={r * 0.55} color="rgba(139,158,137,0.6)" strokeWidth={1.5} />
        ) : pot.illustrationUrl ? (
          // PNG illustration — sized to fill most of the circle with a little breathing room
          <img
            src={pot.illustrationUrl}
            alt=""
            aria-hidden
            style={{
              width: r * 2.1,
              height: r * 2.1,
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
              flexShrink: 0,
              transform: `translateY(${r * 0.22}px)`,
            }}
          />
        ) : (
          <span style={{ fontSize: r * 0.6, lineHeight: 1, userSelect: 'none' }} aria-hidden>
            {pot.emoji}
          </span>
        )}

        {/* Unrecorded-today badge */}
        {showBadge && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: r * 0.08,
              right: r * 0.08,
              width: r * 0.42,
              height: r * 0.42,
              borderRadius: '50%',
              background: 'rgba(196,147,90,0.18)',
              border: '0.5px solid rgba(196,147,90,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'badge-pulse 2.5s ease-in-out infinite',
            }}
          >
            <IconCamera
              size={r * 0.22}
              color="#B8863A"
              strokeWidth={1.8}
            />
          </div>
        )}
      </div>

      {/* Label (below circle) */}
      {!isAddButton && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: d + r * 0.14,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            fontSize: Math.max(9, r * 0.24),
            fontWeight: 500,
            color: 'var(--sage-700)',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.2,
          }}>
            {pot.name}
          </div>
          <div style={{
            fontSize: Math.max(8, r * 0.2),
            color: 'var(--sage-400)',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.2,
            marginTop: 1,
          }}>
            Day {pot.daysSinceStart}
          </div>
        </div>
      )}
    </div>
  )
}
