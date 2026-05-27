// components/PublicGarden/useGardenDrag.ts
'use client'

import { useRef, useCallback, useEffect, RefObject } from 'react'
import type { GardenTile, GardenCanvasHandle } from './types'
import {
  MOVE_THRESHOLD, SNAP_DURATION, WHEEL_DEBOUNCE, WHEEL_SENSITIVITY,
} from './constants'
import { calcBase, findNearest, isoProject, easeOutCubic } from './utils'

// Hit-test radius when tap-selecting a tile (in multiples of `base`)
const TAP_RADIUS_FACTOR = 1.6

export interface UseGardenDragOptions {
  allTiles: GardenTile[]   // includes myTile
  canvasRef: RefObject<GardenCanvasHandle | null>
  onFocusChange: (tile: GardenTile | null) => void
}

export interface UseGardenDragResult {
  pointerHandlers: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void
  }
  /** Stable wheel handler for GardenCanvas's onWheel prop */
  onWheel: (e: WheelEvent) => void
  goHome: () => void
  getOffset: () => { x: number; y: number }
}

export function useGardenDrag({
  allTiles,
  canvasRef,
  onFocusChange,
}: UseGardenDragOptions): UseGardenDragResult {
  const offsetRef = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const isPointerDown = useRef(false)
  const startClientPos = useRef({ x: 0, y: 0 })
  const startOffset = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | undefined>(undefined)
  const wheelDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const allTilesRef = useRef(allTiles)
  const onFocusChangeRef = useRef(onFocusChange)

  useEffect(() => { allTilesRef.current = allTiles }, [allTiles])
  useEffect(() => { onFocusChangeRef.current = onFocusChange }, [onFocusChange])

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getCanvasInfo() {
    const el = canvasRef.current?.nativeElement
    const w = el?.clientWidth ?? 390
    const h = el?.clientHeight ?? 600
    return { w, h, base: calcBase(w) }
  }

  function updateOffset(newOffset: { x: number; y: number }) {
    offsetRef.current = newOffset
    canvasRef.current?.redraw(newOffset)
  }

  function cancelSnap() {
    if (rafRef.current !== undefined) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = undefined
    }
  }

  function animateTo(
    target: { x: number; y: number },
    onComplete?: () => void,
  ) {
    cancelSnap()
    const startTime = performance.now()
    const from = { ...offsetRef.current }

    function step(now: number) {
      const t = Math.min(1, (now - startTime) / SNAP_DURATION)
      const eased = easeOutCubic(t)
      updateOffset({
        x: from.x + (target.x - from.x) * eased,
        y: from.y + (target.y - from.y) * eased,
      })
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = undefined
        onComplete?.()
      }
    }

    rafRef.current = requestAnimationFrame(step)
  }

  const snapToNearest = useCallback(() => {
    const { w, h, base } = getCanvasInfo()
    const nearest = findNearest(
      allTilesRef.current,
      offsetRef.current,
      { w, h },
      base,
    )

    if (!nearest) {
      onFocusChangeRef.current(null)
      return
    }

    // Compute offset that places nearest tile at canvas center
    const p = isoProject(nearest.dx, nearest.dy, base)
    const target = { x: -p.x, y: -p.y }

    animateTo(target, () => {
      onFocusChangeRef.current(nearest)
    })
  }, [])

  // ── Pointer handlers ─────────────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    cancelSnap()
    isPointerDown.current = true
    if (wheelDebounce.current) clearTimeout(wheelDebounce.current)
    isDragging.current = false
    startClientPos.current = { x: e.clientX, y: e.clientY }
    startOffset.current = { ...offsetRef.current }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown.current) return
    const dx = e.clientX - startClientPos.current.x
    const dy = e.clientY - startClientPos.current.y
    if (
      !isDragging.current &&
      (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD)
    ) {
      isDragging.current = true
    }
    if (isDragging.current) {
      updateOffset({
        x: startOffset.current.x + dx,
        y: startOffset.current.y + dy,
      })
    }
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDown.current = false
    const wasDragging = isDragging.current
    isDragging.current = false

    if (!wasDragging) {
      // ── Pure tap: hit-test against tap position ─────────────────────────
      // Find the tile visually closest to where the user tapped, then snap
      // directly to it — no need to drag the map first.
      const el = canvasRef.current?.nativeElement
      if (el) {
        const rect = el.getBoundingClientRect()
        const { w, h, base } = getCanvasInfo()
        // Tap position relative to canvas center
        const tapX = e.clientX - rect.left - w / 2
        const tapY = e.clientY - rect.top - h / 2

        let best: GardenTile | null = null
        let bestDist = Infinity
        for (const tile of allTilesRef.current) {
          if (tile.isMe) continue
          const p = isoProject(tile.dx, tile.dy, base)
          const dist = Math.hypot(
            p.x + offsetRef.current.x - tapX,
            p.y + offsetRef.current.y - tapY,
          )
          if (dist < bestDist) { bestDist = dist; best = tile }
        }

        const hitRadius = base * TAP_RADIUS_FACTOR
        if (best && bestDist < hitRadius) {
          const p = isoProject(best.dx, best.dy, base)
          animateTo({ x: -p.x, y: -p.y }, () => {
            onFocusChangeRef.current(best!)
          })
          return
        }
      }
      // Tapped on empty space — clear focus
      onFocusChangeRef.current(null)
      return
    }

    // ── Drag ended: snap to tile nearest to camera center ──────────────────
    snapToNearest()
  }, [snapToNearest])

  const onPointerCancel = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDown.current = false
    isDragging.current = false
    snapToNearest() // cancelled drag → snap to nearest from current camera pos
  }, [snapToNearest])

  // ── Wheel handler (stable — passed directly to GardenCanvas's onWheel prop) ──

  const onWheel = useCallback((e: WheelEvent) => {
    cancelSnap()
    updateOffset({
      x: offsetRef.current.x,
      y: offsetRef.current.y - e.deltaY * WHEEL_SENSITIVITY,
    })
    if (wheelDebounce.current) clearTimeout(wheelDebounce.current)
    wheelDebounce.current = setTimeout(snapToNearest, WHEEL_DEBOUNCE)
  }, [snapToNearest])

  // ── goHome ───────────────────────────────────────────────────────────────

  const goHome = useCallback(() => {
    if (wheelDebounce.current) clearTimeout(wheelDebounce.current)
    cancelSnap()
    animateTo({ x: 0, y: 0 }, () => {
      onFocusChangeRef.current(null)
    })
  }, [])

  // ── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancelSnap()
      if (wheelDebounce.current) clearTimeout(wheelDebounce.current)
    }
  }, [])

  return {
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    onWheel,
    goHome,
    getOffset: () => offsetRef.current,
  }
}
