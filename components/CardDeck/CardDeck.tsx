'use client'

import { useEffect, useMemo, useRef } from 'react'
import { CardItem } from './CardItem'
import { useCardDeckScroll } from './useCardDeckScroll'
import { VISIBLE_RANGE } from './constants'
import type { CardDeckProps } from './types'

export function CardDeck({
  cards,
  initialIndex = 0,
  onActiveChange,
  onMarkPost,
  onTagClick,
}: CardDeckProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    scrollOffset,
    activeIndex,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyDown,
  } = useCardDeckScroll({
    cardCount: cards.length,
    initialIndex,
    onActiveChange,
  })

  // Non-passive wheel listener — must call preventDefault, so we can't use onWheel
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const visibleCards = useMemo(() => {
    const result: Array<{ card: (typeof cards)[number]; basePosition: number }> = []
    for (let i = -VISIBLE_RANGE; i <= VISIBLE_RANGE; i++) {
      const cardIndex = activeIndex + i
      if (cardIndex < 0 || cardIndex >= cards.length) continue
      result.push({ card: cards[cardIndex], basePosition: i })
    }
    return result
  }, [activeIndex, cards])

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Date timeline"
      tabIndex={0}
      style={{
        position: 'relative',
        width: 440,
        height: 560,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'transparent',
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
        outline: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      {/* Top gradient mask */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          zIndex: 200,
          pointerEvents: 'none',
          background: 'var(--mask-top)',
        }}
        aria-hidden
      />

      {/* Card items */}
      {visibleCards.map(({ card, basePosition }) => (
        <CardItem
          key={card.id}
          card={card}
          basePosition={basePosition}
          scrollOffset={scrollOffset}
          isFocused={basePosition === 0}
          onMarkPost={() => onMarkPost?.(card)}
          onTagClick={(tag) => onTagClick?.(card, tag)}
        />
      ))}

      {/* Bottom gradient mask */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          zIndex: 200,
          pointerEvents: 'none',
          background: 'var(--mask-bottom)',
        }}
        aria-hidden
      />
    </div>
  )
}
