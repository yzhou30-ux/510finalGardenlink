'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMotionValue } from 'framer-motion'
import {
  CARD_SPACING,
  DAMPING,
  SNAP_THRESHOLD,
  SPRING_STIFFNESS,
  VELOCITY_THRESHOLD,
  WHEEL_SENSITIVITY,
} from './constants'

interface UseCardDeckScrollOptions {
  cardCount: number
  initialIndex?: number
  onActiveChange?: (index: number) => void
}

export function useCardDeckScroll({
  cardCount,
  initialIndex = 0,
  onActiveChange,
}: UseCardDeckScrollOptions) {
  const scrollOffset = useMotionValue(0)
  const [activeIndex, setActiveIndex] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(0, cardCount - 1))
  )

  // Mutable refs (no re-renders)
  const vel = useRef(0)
  const rafId = useRef<number | null>(null)
  const activeIndexRef = useRef(activeIndex)
  const isDragging = useRef(false)
  const lastY = useRef(0)

  // Stable refs for props that change without needing to restart the physics loop
  const cardCountRef = useRef(cardCount)
  useEffect(() => { cardCountRef.current = cardCount }, [cardCount])

  const onActiveChangeRef = useRef(onActiveChange)
  useEffect(() => { onActiveChangeRef.current = onActiveChange }, [onActiveChange])

  // Keep ref in sync with state
  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  const runPhysics = useCallback(() => {
    const offset = scrollOffset.get()
    const diff = -offset // snap target is always 0

    if (
      Math.abs(diff) < SNAP_THRESHOLD &&
      Math.abs(vel.current) < VELOCITY_THRESHOLD
    ) {
      scrollOffset.set(0)
      vel.current = 0
      rafId.current = null
      return
    }

    vel.current += diff * SPRING_STIFFNESS
    vel.current *= DAMPING
    let newOffset = offset + vel.current

    if (Math.abs(newOffset) >= 0.5) {
      const dir = newOffset > 0 ? 1 : -1
      const newIdx = activeIndexRef.current + dir
      if (newIdx >= 0 && newIdx < cardCountRef.current) {
        activeIndexRef.current = newIdx
        newOffset -= dir
        setActiveIndex(newIdx)
        onActiveChangeRef.current?.(newIdx)
      } else {
        // boundary hit — clamp
        newOffset = 0
        vel.current = 0
      }
    }

    scrollOffset.set(newOffset)
    rafId.current = requestAnimationFrame(runPhysics)
  }, [scrollOffset])

  // startSnap: cancel any running frame and restart (use after pointer-up)
  const startSnap = useCallback(() => {
    if (rafId.current != null) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(runPhysics)
  }, [runPhysics])

  // addVelocity: accumulate velocity; only start the loop if it's not already running
  const addVelocity = useCallback(
    (delta: number) => {
      vel.current += delta
      if (rafId.current == null) {
        rafId.current = requestAnimationFrame(runPhysics)
      }
    },
    [runPhysics]
  )

  // Wheel handler for non-passive event listeners attached imperatively in CardDeck
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      addVelocity(e.deltaY > 0 ? WHEEL_SENSITIVITY : -WHEEL_SENSITIVITY)
    },
    [addVelocity]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true
      lastY.current = e.clientY
      if (rafId.current != null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
      vel.current = 0
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      const dy = e.clientY - lastY.current
      lastY.current = e.clientY
      // Dragging up (dy < 0) should advance forward (offset > 0)
      let newOffset = scrollOffset.get() + -dy / CARD_SPACING

      if (Math.abs(newOffset) >= 0.5) {
        const dir = newOffset > 0 ? 1 : -1
        const newIdx = activeIndexRef.current + dir
        if (newIdx >= 0 && newIdx < cardCountRef.current) {
          activeIndexRef.current = newIdx
          newOffset -= dir
          setActiveIndex(newIdx)
          onActiveChangeRef.current?.(newIdx)
        } else {
          // boundary: clamp and kill velocity
          newOffset = Math.sign(newOffset) * 0.49
          vel.current = 0
        }
      }

      scrollOffset.set(newOffset)
    },
    [scrollOffset]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      isDragging.current = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      startSnap()
    },
    [startSnap]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        addVelocity(WHEEL_SENSITIVITY)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        addVelocity(-WHEEL_SENSITIVITY)
      }
    },
    [addVelocity]
  )

  useEffect(() => {
    return () => {
      if (rafId.current != null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
    }
  }, [])

  return {
    scrollOffset,
    activeIndex,
    startSnap,
    addVelocity,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyDown,
  }
}
