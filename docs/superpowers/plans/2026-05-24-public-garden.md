# Public Garden Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an isometric infinite-canvas "公共花园" page where each diamond tile represents a user's garden, with drag-to-explore, snap-to-center, and a bottom detail sheet.

**Architecture:** A Canvas-based render engine (`GardenCanvas`) is driven imperatively — it exposes a `redraw(offset)` handle so the drag hook can update it without React re-renders. `useGardenDrag` manages all pointer/wheel interaction and snap animation entirely through refs + rAF, calling `canvasRef.current.redraw()` on every frame. Only `focusedTile` (which controls the bottom sheet) is React state, because it triggers DOM re-renders.

**Tech Stack:** Canvas API, Framer Motion (bottom sheet animation), React refs + rAF (drag physics), ResizeObserver (responsive canvas), @tabler/icons-react, date-fns is not needed here.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `jest.config.ts` | Create | Jest + ts-jest setup for the project |
| `components/PublicGarden/types.ts` | Create | GardenTile, RelationTag, LatestPost, Props interfaces |
| `components/PublicGarden/constants.ts` | Create | All numeric constants (BASE_RATIO, SPREAD, SHEET_HEIGHT, etc.) |
| `components/PublicGarden/utils.ts` | Create | Pure functions: calcBase, isoProject, findNearest, easeOutCubic |
| `components/PublicGarden/__tests__/utils.test.ts` | Create | Unit tests for pure functions |
| `components/PublicGarden/useGardenTiles.ts` | Create | Image preload cache + load callback |
| `components/PublicGarden/GardenCanvas.tsx` | Create | Canvas render engine, exposes GardenCanvasHandle via ref |
| `components/PublicGarden/useGardenDrag.ts` | Create | Drag, wheel, snap-to-center, goHome — all via refs + rAF |
| `components/PublicGarden/GardenBottomSheet.tsx` | Create | Framer Motion bottom detail panel |
| `components/PublicGarden/GardenFeed.tsx` | Create | Simple feed list (alternative view) |
| `components/PublicGarden/PublicGarden.tsx` | Create | Main container — wires everything together |
| `components/PublicGarden/index.ts` | Create | Barrel export |
| `app/(tabs)/garden/page.tsx` | Modify | Replace `<DiamondGrid />` with `<PublicGarden />`, delete import |

---

## Task 1: Jest config + Foundation (types, constants, utils, tests)

**Files:**
- Create: `jest.config.ts`
- Create: `components/PublicGarden/types.ts`
- Create: `components/PublicGarden/constants.ts`
- Create: `components/PublicGarden/utils.ts`
- Create: `components/PublicGarden/__tests__/utils.test.ts`

- [ ] **Step 1.1: Create jest.config.ts at project root**

```typescript
// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default config
```

Also create `jest.setup.ts` if it doesn't exist:
```typescript
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 1.2: Create types.ts**

```typescript
// components/PublicGarden/types.ts

export interface RelationTag {
  type: 'geo' | 'plant' | 'social'
  label: string
}

export interface LatestPost {
  imageUrl?: string
  text: string
  timeAgo: string
}

export interface GardenTile {
  id: string
  dx: number           // display X (already multiplied by SPREAD)
  dy: number           // display Y
  userName: string
  emoji: string        // fallback when no illustration
  illustrationUrl?: string
  tags: RelationTag[]
  latestPost?: LatestPost
  isMe?: boolean
  isEvent?: boolean
  size?: number        // size multiplier, default 1, event tiles 1.4
}

export interface PublicGardenProps {
  tiles: GardenTile[]
  myTile: GardenTile
  onTileSelect?: (tile: GardenTile) => void
  onVisitGarden?: (tile: GardenTile) => void
  onMessage?: (tile: GardenTile) => void
}

export type GardenCanvasHandle = {
  redraw: (offset: { x: number; y: number }) => void
  nativeElement: HTMLCanvasElement | null
}
```

- [ ] **Step 1.3: Create constants.ts**

```typescript
// components/PublicGarden/constants.ts

// Responsive base tile width
export const BASE_RATIO = 0.22
export const BASE_MIN = 70
export const BASE_MAX = 120

// Diamond aspect ratio (width : height)
export const DIAMOND_ASPECT = 0.55

// Spacing
export const GAP_RATIO = 0.5    // GAP = BASE * 0.5
export const SPREAD = 1.8       // coordinate spread multiplier

// Snap
export const SNAP_THRESHOLD = 0.9   // snap radius = BASE * 0.9
export const SNAP_DURATION = 220    // ms

// Wheel
export const WHEEL_DEBOUNCE = 400   // ms
export const WHEEL_SENSITIVITY = 0.8

// Drag
export const MOVE_THRESHOLD = 4     // px before drag is registered

// Alpha decay
export const ALPHA_MIN = 0.2
export const ALPHA_DECAY = 0.1      // per unit distance from origin

// Bottom sheet
export const SHEET_HEIGHT = 290     // px
export const MAP_COMPRESSED_HEIGHT = 310  // px when sheet is open
```

- [ ] **Step 1.4: Create utils.ts**

```typescript
// components/PublicGarden/utils.ts
import type { GardenTile } from './types'
import { GAP_RATIO, DIAMOND_ASPECT, SNAP_THRESHOLD, BASE_RATIO, BASE_MIN, BASE_MAX } from './constants'

export function calcBase(screenWidth: number): number {
  return Math.min(Math.max(screenWidth * BASE_RATIO, BASE_MIN), BASE_MAX)
}

export function isoProject(
  dx: number,
  dy: number,
  base: number,
): { x: number; y: number } {
  const gap = base * GAP_RATIO
  const tw = base + gap          // tile step width
  const th = base * DIAMOND_ASPECT + gap  // tile step height
  return {
    x: dx * tw * 0.5,
    y: dy * th * 0.6,
  }
}

export function findNearest(
  tiles: GardenTile[],
  offset: { x: number; y: number },
  canvasSize: { w: number; h: number },
  base: number,
): GardenTile | null {
  const cx = canvasSize.w / 2
  const cy = canvasSize.h / 2
  let best: GardenTile | null = null
  let bestDist = Infinity

  for (const tile of tiles) {
    if (tile.isMe) continue
    const p = isoProject(tile.dx, tile.dy, base)
    const sx = cx + p.x + offset.x
    const sy = cy + p.y + offset.y
    const dist = Math.hypot(sx - cx, sy - cy)
    if (dist < bestDist) {
      bestDist = dist
      best = tile
    }
  }

  return bestDist < base * SNAP_THRESHOLD ? best : null
}

// ease-out-cubic for snap animation
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}
```

- [ ] **Step 1.5: Write failing tests**

```typescript
// components/PublicGarden/__tests__/utils.test.ts
import { calcBase, isoProject, findNearest, easeOutCubic } from '../utils'
import type { GardenTile } from '../types'

describe('calcBase', () => {
  it('clamps to BASE_MIN for narrow screens', () => {
    // 200 * 0.22 = 44 < 70
    expect(calcBase(200)).toBe(70)
  })
  it('clamps to BASE_MAX for wide screens', () => {
    // 800 * 0.22 = 176 > 120
    expect(calcBase(800)).toBe(120)
  })
  it('returns proportional value for mid-range screen', () => {
    // 390 * 0.22 = 85.8
    expect(calcBase(390)).toBeCloseTo(85.8, 0)
  })
})

describe('isoProject', () => {
  it('returns zero at origin', () => {
    expect(isoProject(0, 0, 100)).toEqual({ x: 0, y: 0 })
  })
  it('projects dx=1 along x axis', () => {
    // base=100, gap=50, tw=150, x = 1 * 150 * 0.5 = 75
    const r = isoProject(1, 0, 100)
    expect(r.x).toBe(75)
    expect(r.y).toBe(0)
  })
  it('projects dy=1 along y axis', () => {
    // base=100, gap=50, th=105, y = 1 * 105 * 0.6 = 63
    const r = isoProject(0, 1, 100)
    expect(r.x).toBe(0)
    expect(r.y).toBeCloseTo(63, 0)
  })
  it('projection is linear: dx=2 gives double x of dx=1', () => {
    const r1 = isoProject(1, 0, 100)
    const r2 = isoProject(2, 0, 100)
    expect(r2.x).toBeCloseTo(r1.x * 2, 5)
  })
})

describe('findNearest', () => {
  const base = 100
  const canvasSize = { w: 400, h: 600 }

  it('returns null when all tiles are out of threshold', () => {
    const far: GardenTile = {
      id: '1', dx: 20, dy: 20, userName: 'Far', emoji: '🌿', tags: [],
    }
    expect(findNearest([far], { x: 0, y: 0 }, canvasSize, base)).toBeNull()
  })

  it('returns null when only matching tile is isMe=true', () => {
    const me: GardenTile = {
      id: 'me', dx: 0, dy: 0, userName: 'Me', emoji: '🏡', tags: [], isMe: true,
    }
    expect(findNearest([me], { x: 0, y: 0 }, canvasSize, base)).toBeNull()
  })

  it('returns the tile at canvas center (offset 0, tile at dx=0 dy=0)', () => {
    // tile at dx=0,dy=0 → screen pos = canvasCenter = dist 0 < base*0.9=90
    const near: GardenTile = {
      id: '2', dx: 0, dy: 0, userName: 'Near', emoji: '🌺', tags: [],
    }
    expect(findNearest([near], { x: 0, y: 0 }, canvasSize, base)).toBe(near)
  })

  it('picks the closer of two tiles', () => {
    const a: GardenTile = { id: 'a', dx: 0, dy: 0, userName: 'A', emoji: '🌱', tags: [] }
    const b: GardenTile = { id: 'b', dx: 0.1, dy: 0.1, userName: 'B', emoji: '🌿', tags: [] }
    const result = findNearest([a, b], { x: 0, y: 0 }, canvasSize, base)
    expect(result?.id).toBe('a')
  })
})

describe('easeOutCubic', () => {
  it('returns 0 at t=0', () => expect(easeOutCubic(0)).toBe(0))
  it('returns 1 at t=1', () => expect(easeOutCubic(1)).toBe(1))
  it('is > 0.5 at t=0.5 (decelerates toward end)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })
  it('is monotonically increasing', () => {
    expect(easeOutCubic(0.3)).toBeLessThan(easeOutCubic(0.7))
  })
})
```

- [ ] **Step 1.6: Run tests (expect them to fail — files don't exist yet)**

```bash
cd /Users/wendyz/Desktop/Spring_2026/Tech510/GardenLink_Revision && npm test -- --testPathPattern="utils.test" --no-coverage 2>&1 | tail -20
```
Expected: FAIL — "Cannot find module '../utils'"

- [ ] **Step 1.7: Run tests again after creating files (expect PASS)**

```bash
cd /Users/wendyz/Desktop/Spring_2026/Tech510/GardenLink_Revision && npm test -- --testPathPattern="utils.test" --no-coverage 2>&1 | tail -20
```
Expected: All 13 tests PASS.

- [ ] **Step 1.8: Verify TypeScript compiles**

```bash
cd /Users/wendyz/Desktop/Spring_2026/Tech510/GardenLink_Revision && npx tsc --noEmit 2>&1 | head -20
```
Expected: no output (no errors).

---

## Task 2: useGardenTiles hook

**Files:**
- Create: `components/PublicGarden/useGardenTiles.ts`

- [ ] **Step 2.1: Create useGardenTiles.ts**

```typescript
// components/PublicGarden/useGardenTiles.ts
'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { GardenTile } from './types'

export interface UseGardenTilesResult {
  getImage: (url: string) => HTMLImageElement | null
  preloadImage: (url: string) => Promise<HTMLImageElement>
  /** Register a callback fired after any image finishes loading. */
  setOnLoad: (cb: () => void) => void
}

export function useGardenTiles(
  tiles: GardenTile[],
  myTile: GardenTile,
): UseGardenTilesResult {
  const cache = useRef(new Map<string, HTMLImageElement>())
  const onLoadCb = useRef<(() => void) | null>(null)

  const preloadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    if (cache.current.has(url)) {
      return Promise.resolve(cache.current.get(url)!)
    }
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        cache.current.set(url, img)
        onLoadCb.current?.()   // trigger canvas redraw
        resolve(img)
      }
      img.onerror = reject
      img.src = url
    })
  }, [])

  // Preload myTile + first ring (dist < 4 in display coords) on mount
  useEffect(() => {
    const allTiles = [myTile, ...tiles]
    allTiles
      .filter(t => {
        const dist = Math.hypot(t.dx, t.dy)
        return dist < 4
      })
      .forEach(t => {
        if (t.illustrationUrl) preloadImage(t.illustrationUrl)
      })
  }, [tiles, myTile, preloadImage])

  const getImage = useCallback((url: string): HTMLImageElement | null => {
    return cache.current.get(url) ?? null
  }, [])

  const setOnLoad = useCallback((cb: () => void) => {
    onLoadCb.current = cb
  }, [])

  return { getImage, preloadImage, setOnLoad }
}
```

- [ ] **Step 2.2: Verify build**

```bash
cd /Users/wendyz/Desktop/Spring_2026/Tech510/GardenLink_Revision && npx next build --no-lint 2>&1 | tail -5
```
Expected: build succeeds (no new routes yet — this is just a hook file).

---

## Task 3: GardenCanvas component

**Files:**
- Create: `components/PublicGarden/GardenCanvas.tsx`

This is the render engine. It exposes a `GardenCanvasHandle` via `useImperativeHandle`, stores offset in an internal ref, and batches redraws via rAF.

- [ ] **Step 3.1: Create GardenCanvas.tsx**

```typescript
// components/PublicGarden/GardenCanvas.tsx
'use client'

import {
  forwardRef, useRef, useEffect, useCallback, useImperativeHandle,
} from 'react'
import type { GardenTile, GardenCanvasHandle } from './types'
import {
  ALPHA_MIN, ALPHA_DECAY, SPREAD, DIAMOND_ASPECT,
} from './constants'
import { calcBase, isoProject } from './utils'

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  fill?: string,
  stroke?: string,
  lineWidth?: number,
) {
  ctx.beginPath()
  ctx.moveTo(x, y - h / 2)
  ctx.lineTo(x + w / 2, y)
  ctx.lineTo(x, y + h / 2)
  ctx.lineTo(x - w / 2, y)
  ctx.closePath()
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth ?? 0.5; ctx.stroke() }
}

function drawTileIllustration(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number, sy: number,
  pw: number,
) {
  const imgW = pw
  const imgH = imgW * (img.naturalHeight / img.naturalWidth)
  // anchor: diamond center sits at 65% down the image height
  const drawY = sy - imgH * 0.65
  ctx.drawImage(img, sx - imgW / 2, drawY, imgW, imgH)
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GardenCanvasProps {
  tiles: GardenTile[]           // all tiles including myTile
  focusedTile: GardenTile | null
  getImage: (url: string) => HTMLImageElement | null
  setOnLoad: (cb: () => void) => void
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void
  registerWheelHandler: (handler: (e: WheelEvent) => void) => void
}

export const GardenCanvas = forwardRef<GardenCanvasHandle, GardenCanvasProps>(
  function GardenCanvas(props, ref) {
    const {
      tiles, focusedTile, getImage, setOnLoad,
      onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
      registerWheelHandler,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const canvasElRef = useRef<HTMLCanvasElement>(null)
    const internalOffsetRef = useRef({ x: 0, y: 0 })
    const tilesRef = useRef(tiles)
    const focusedTileRef = useRef(focusedTile)
    const rafPendingRef = useRef(false)

    // Keep refs in sync with props
    useEffect(() => { tilesRef.current = tiles; scheduleRedraw() }, [tiles])
    useEffect(() => { focusedTileRef.current = focusedTile; scheduleRedraw() }, [focusedTile])

    // ── Render function ─────────────────────────────────────────────────────
    const renderFrame = useCallback(() => {
      const canvas = canvasElRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w === 0 || h === 0) return

      const base = calcBase(w)
      const offset = internalOffsetRef.current

      // DPR-aware clear
      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const cx = w / 2
      const cy = h / 2

      // Depth sort: lower dy drawn later (in front)
      const sorted = [...tilesRef.current].sort(
        (a, b) => a.dy - b.dy || a.dx - b.dx,
      )

      sorted.forEach(tile => {
        const p = isoProject(tile.dx, tile.dy, base)
        const sx = cx + p.x + offset.x
        const sy = cy + p.y + offset.y

        const pw = base * (tile.size ?? 1)
        const ph = pw * DIAMOND_ASPECT

        // Viewport culling
        if (sx < -pw * 2 || sx > w + pw * 2 || sy < -ph * 4 || sy > h + ph * 4) return

        // Alpha decay based on distance from origin
        const rawDist = Math.hypot(tile.dx, tile.dy) / SPREAD
        const alpha = Math.max(ALPHA_MIN, 1 - rawDist * ALPHA_DECAY)
        ctx.globalAlpha = alpha

        const isFocused = focusedTileRef.current?.id === tile.id

        // ── Diamond background ──
        if (tile.isMe) {
          drawDiamond(ctx, sx, sy, pw * 1.12, ph * 1.12,
            'rgba(74,93,73,0.16)', 'rgba(74,93,73,0.32)', 1.5)
          drawDiamond(ctx, sx, sy, pw, ph,
            'rgba(253,251,247,0.65)', 'rgba(74,93,73,0.22)', 1)
        } else if (isFocused) {
          drawDiamond(ctx, sx, sy, pw * 1.08, ph * 1.08,
            'rgba(74,93,73,0.12)', 'rgba(74,93,73,0.35)', 1.5)
          drawDiamond(ctx, sx, sy, pw, ph,
            'rgba(253,251,247,0.7)', 'rgba(74,93,73,0.25)', 1)
        } else if (tile.isEvent) {
          drawDiamond(ctx, sx, sy, pw, ph,
            'rgba(196,147,90,0.09)', 'rgba(196,147,90,0.2)', 0.8)
        } else {
          const f = (0.04 + 0.02 * alpha).toFixed(3)
          const s = (0.08 + 0.04 * alpha).toFixed(3)
          drawDiamond(ctx, sx, sy, pw, ph,
            `rgba(74,93,73,${f})`, `rgba(74,93,73,${s})`, 0.5)
        }

        // ── Illustration or emoji ──
        const img = tile.illustrationUrl ? getImage(tile.illustrationUrl) : null
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.globalAlpha = alpha
          drawTileIllustration(ctx, img, sx, sy, pw)
        } else {
          // emoji fallback
          const emojiSize = Math.max(12, base * 0.24)
          ctx.font = `${emojiSize}px serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.globalAlpha = alpha * 0.9
          ctx.fillText(tile.emoji, sx, sy - ph * 0.05)
        }

        // ── Username label ──
        const namePx = Math.max(9, base * 0.09)
        const nameWeight = tile.isMe ? '500' : '400'
        ctx.font = `${nameWeight} ${namePx}px -apple-system,'PingFang SC',sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.globalAlpha = alpha
        if (tile.isMe) ctx.fillStyle = 'rgba(61,79,60,0.7)'
        else if (isFocused) ctx.fillStyle = 'rgba(61,79,60,0.8)'
        else if (tile.isEvent) ctx.fillStyle = 'rgba(139,100,32,0.5)'
        else ctx.fillStyle = 'rgba(107,123,106,0.4)'
        ctx.fillText(tile.userName, sx, sy + ph * 0.32)

        ctx.globalAlpha = 1
      })

      ctx.restore()
    }, [getImage])

    // ── Batched redraw ───────────────────────────────────────────────────────
    function scheduleRedraw() {
      if (rafPendingRef.current) return
      rafPendingRef.current = true
      requestAnimationFrame(() => {
        rafPendingRef.current = false
        renderFrame()
      })
    }

    // ── Expose handle ────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      redraw(newOffset: { x: number; y: number }) {
        internalOffsetRef.current = newOffset
        scheduleRedraw()
      },
      get nativeElement() {
        return canvasElRef.current
      },
    }), [])

    // ── Canvas sizing (DPR + ResizeObserver) ─────────────────────────────────
    useEffect(() => {
      const container = containerRef.current
      const canvas = canvasElRef.current
      if (!container || !canvas) return

      function resize() {
        const dpr = window.devicePixelRatio || 1
        const w = container!.clientWidth
        const h = container!.clientHeight
        canvas!.width = w * dpr
        canvas!.height = h * dpr
        canvas!.style.width = `${w}px`
        canvas!.style.height = `${h}px`
        const ctx = canvas!.getContext('2d')
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        scheduleRedraw()
      }

      const ro = new ResizeObserver(resize)
      ro.observe(container)
      resize()
      return () => ro.disconnect()
    }, [])

    // ── Non-passive wheel listener ────────────────────────────────────────────
    useEffect(() => {
      const canvas = canvasElRef.current
      if (!canvas) return
      let wheelHandler: ((e: WheelEvent) => void) | null = null
      registerWheelHandler(h => { wheelHandler = h })
      const handler = (e: WheelEvent) => { e.preventDefault(); wheelHandler?.(e) }
      canvas.addEventListener('wheel', handler, { passive: false })
      return () => canvas.removeEventListener('wheel', handler)
    }, [registerWheelHandler])

    // ── Register image-load redraw ────────────────────────────────────────────
    useEffect(() => {
      setOnLoad(scheduleRedraw)
    }, [setOnLoad])

    return (
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'relative', touchAction: 'none', cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        role="application"
        aria-label="公共花园地图"
        tabIndex={0}
      >
        <canvas ref={canvasElRef} style={{ display: 'block' }} />
      </div>
    )
  },
)
```

- [ ] **Step 3.2: Verify build**

```bash
cd /Users/wendyz/Desktop/Spring_2026/Tech510/GardenLink_Revision && npx next build --no-lint 2>&1 | tail -5
```
Expected: builds successfully.

---

## Task 4: useGardenDrag hook

**Files:**
- Create: `components/PublicGarden/useGardenDrag.ts`

This hook owns all interaction: pointer drag, wheel, snap-to-center animation, and goHome. It never uses `useState` — offset stays in a ref. Only `focusedTile` is surfaced to the parent via callback (which becomes React state there).

- [ ] **Step 4.1: Create useGardenDrag.ts**

```typescript
// components/PublicGarden/useGardenDrag.ts
'use client'

import { useRef, useCallback, useEffect, RefObject } from 'react'
import type { GardenTile, GardenCanvasHandle } from './types'
import {
  MOVE_THRESHOLD, SNAP_DURATION, WHEEL_DEBOUNCE, WHEEL_SENSITIVITY,
} from './constants'
import { calcBase, findNearest, isoProject, easeOutCubic } from './utils'

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
  /** Call this with a setter; the setter receives the actual WheelEvent handler. */
  registerWheelHandler: (setter: (h: (e: WheelEvent) => void) => void) => void
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
    if (wheelDebounce.current) clearTimeout(wheelDebounce.current)
    isDragging.current = false
    startClientPos.current = { x: e.clientX, y: e.clientY }
    startOffset.current = { ...offsetRef.current }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
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

  const onPointerUp = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false
    snapToNearest()
  }, [snapToNearest])

  const onPointerCancel = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false
    snapToNearest()
  }, [snapToNearest])

  // ── Wheel ────────────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: WheelEvent) => {
    // preventDefault() called in GardenCanvas before forwarding
    cancelSnap()
    updateOffset({
      x: offsetRef.current.x,
      y: offsetRef.current.y - e.deltaY * WHEEL_SENSITIVITY,
    })
    if (wheelDebounce.current) clearTimeout(wheelDebounce.current)
    wheelDebounce.current = setTimeout(snapToNearest, WHEEL_DEBOUNCE)
  }, [snapToNearest])

  /** GardenCanvas calls registerWheelHandler(setter) to receive the wheel handler. */
  const registerWheelHandler = useCallback(
    (setter: (h: (e: WheelEvent) => void) => void) => {
      setter(handleWheel)
    },
    [handleWheel],
  )

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
    registerWheelHandler,
    goHome,
    getOffset: () => offsetRef.current,
  }
}
```

- [ ] **Step 4.2: Verify TypeScript**

```bash
cd /Users/wendyz/Desktop/Spring_2026/Tech510/GardenLink_Revision && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

---

## Task 5: GardenBottomSheet + GardenFeed

**Files:**
- Create: `components/PublicGarden/GardenBottomSheet.tsx`
- Create: `components/PublicGarden/GardenFeed.tsx`

- [ ] **Step 5.1: Create GardenBottomSheet.tsx**

```typescript
// components/PublicGarden/GardenBottomSheet.tsx
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
                {tile.tags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 10,
                      background: TAG_STYLES[tag.type].bg,
                      color: TAG_STYLES[tag.type].color,
                    }}
                  >
                    {tag.label}
                  </span>
                ))}
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
              <IconArrowRight size={14} /> 看看花园
            </button>
            <button
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
              <IconMessageCircle size={14} /> 留言
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 5.2: Create GardenFeed.tsx**

```typescript
// components/PublicGarden/GardenFeed.tsx
import type { GardenTile } from './types'

interface GardenFeedProps {
  tiles: GardenTile[]
}

export function GardenFeed({ tiles }: GardenFeedProps) {
  const tilesWithPosts = tiles.filter(t => t.latestPost)

  return (
    <div style={{
      overflowY: 'auto',
      padding: '0 16px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {tilesWithPosts.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--sage-300)', fontSize: 13, padding: '40px 0' }}>
          暂无动态
        </p>
      )}
      {tilesWithPosts.map(tile => (
        <div
          key={tile.id}
          style={{
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 14, padding: '12px 14px',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}
        >
          {/* Avatar */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: 'var(--glass-sage-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            {tile.emoji}
          </div>
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 500, color: 'var(--sage-900)', marginBottom: 4,
            }}>
              {tile.userName}
            </div>
            <p style={{
              fontSize: 12, color: 'var(--sage-700)', margin: '0 0 6px',
              lineHeight: 1.5,
            }}>
              {tile.latestPost!.text}
            </p>
            <span style={{ fontSize: 10, color: 'var(--sage-300)' }}>
              {tile.latestPost!.timeAgo}
            </span>
          </div>
          {/* Post image thumbnail */}
          {tile.latestPost?.imageUrl && (
            <div style={{
              width: 56, height: 56, borderRadius: 8, flexShrink: 0,
              backgroundImage: `url(${tile.latestPost.imageUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              background: 'var(--glass-sage-light)',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5.3: Verify build**

```bash
cd /Users/wendyz/Desktop/Spring_2026/Tech510/GardenLink_Revision && npx next build --no-lint 2>&1 | tail -5
```
Expected: builds successfully.

---

## Task 6: PublicGarden container + index.ts

**Files:**
- Create: `components/PublicGarden/PublicGarden.tsx`
- Create: `components/PublicGarden/index.ts`

- [ ] **Step 6.1: Create PublicGarden.tsx**

```typescript
// components/PublicGarden/PublicGarden.tsx
'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCurrentLocation, IconMap, IconLayoutList } from '@tabler/icons-react'
import type { PublicGardenProps, GardenCanvasHandle, GardenTile } from './types'
import { MAP_COMPRESSED_HEIGHT, SHEET_HEIGHT } from './constants'
import { GardenCanvas } from './GardenCanvas'
import { GardenBottomSheet } from './GardenBottomSheet'
import { GardenFeed } from './GardenFeed'
import { useGardenDrag } from './useGardenDrag'
import { useGardenTiles } from './useGardenTiles'

export function PublicGarden({
  tiles,
  myTile,
  onTileSelect,
  onVisitGarden,
  onMessage,
}: PublicGardenProps) {
  const allTiles: GardenTile[] = [myTile, ...tiles]
  const [viewMode, setViewMode] = useState<'map' | 'feed'>('map')
  const [focusedTile, setFocusedTile] = useState<GardenTile | null>(null)

  const canvasRef = useRef<GardenCanvasHandle | null>(null)

  const { getImage, setOnLoad } = useGardenTiles(tiles, myTile)

  const { pointerHandlers, registerWheelHandler, goHome } = useGardenDrag({
    allTiles,
    canvasRef,
    onFocusChange: (tile) => {
      setFocusedTile(tile)
      if (tile) onTileSelect?.(tile)
    },
  })

  const isOpen = focusedTile !== null

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40,
        padding: '12px 16px 8px',
        background: 'linear-gradient(to bottom, var(--bg-base) 60%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--sage-900)', fontFamily: 'var(--font-sans)' }}>
          公共花园
        </span>
        {/* Map / Feed toggle */}
        <div style={{
          display: 'flex', gap: 2, padding: '3px',
          background: 'var(--glass-sage-medium)',
          borderRadius: 8,
        }}>
          {([
            { value: 'map', label: '地图', icon: <IconMap size={13} /> },
            { value: 'feed', label: '动态', icon: <IconLayoutList size={13} /> },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setViewMode(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '4px 10px', borderRadius: 6,
                background: viewMode === opt.value ? 'var(--glass-cream-strong)' : 'transparent',
                boxShadow: viewMode === opt.value ? 'var(--shadow-seg-active)' : 'none',
                color: viewMode === opt.value ? 'var(--sage-900)' : 'var(--sage-400)',
                border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 500,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'map' ? (
        <>
          {/* ── Canvas area — compresses when sheet is open ─────────────── */}
          <motion.div
            animate={{
              height: isOpen ? MAP_COMPRESSED_HEIGHT : '100%',
            }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' }}
          >
            <GardenCanvas
              ref={canvasRef}
              tiles={allTiles}
              focusedTile={focusedTile}
              getImage={getImage}
              setOnLoad={setOnLoad}
              {...pointerHandlers}
              registerWheelHandler={registerWheelHandler}
            />

            {/* Locate button */}
            <button
              onClick={goHome}
              style={{
                position: 'absolute', bottom: 16, right: 16, zIndex: 20,
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--glass-cream-strong)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '0.5px solid var(--border-cream)',
                boxShadow: 'var(--shadow-card-focus)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="回到我的位置"
            >
              <IconCurrentLocation size={18} color="var(--sage-700)" />
            </button>
          </motion.div>

          {/* ── Bottom detail sheet ──────────────────────────────────────── */}
          <GardenBottomSheet
            tile={focusedTile}
            onVisitGarden={() => focusedTile && onVisitGarden?.(focusedTile)}
            onMessage={() => focusedTile && onMessage?.(focusedTile)}
          />
        </>
      ) : (
        /* ── Feed view ──────────────────────────────────────────────────── */
        <div style={{
          position: 'absolute', top: 50, left: 0, right: 0, bottom: 0,
          overflowY: 'auto',
        }}>
          <GardenFeed tiles={tiles} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6.2: Create index.ts**

```typescript
// components/PublicGarden/index.ts
export { PublicGarden } from './PublicGarden'
export type { PublicGardenProps, GardenTile, RelationTag, LatestPost } from './types'
```

- [ ] **Step 6.3: Verify build**

```bash
cd /Users/wendyz/Desktop/Spring_2026/Tech510/GardenLink_Revision && npx next build --no-lint 2>&1 | tail -10
```
Expected: builds successfully, `/garden` route still exists.

---

## Task 7: Garden page integration + demo data

**Files:**
- Modify: `app/(tabs)/garden/page.tsx`

- [ ] **Step 7.1: Replace DiamondGrid import with PublicGarden in garden/page.tsx**

Full replacement of `app/(tabs)/garden/page.tsx`:

```typescript
// app/(tabs)/garden/page.tsx
'use client'

import { useState } from 'react'
import { IconLayoutGrid, IconList } from '@tabler/icons-react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { ViewToggle } from '@/components/ViewToggle'
import { PlantGrid } from '@/components/PlantGrid'
import { TaskList } from '@/components/TaskList'
import { PublicGarden } from '@/components/PublicGarden'
import type { GardenTile } from '@/components/PublicGarden'

// ── Demo data ────────────────────────────────────────────────────────────────

const MY_TILE: GardenTile = {
  id: 'me',
  dx: 0, dy: 0,
  userName: '我',
  emoji: '🏡',
  tags: [],
  isMe: true,
}

const DEMO_TILES: GardenTile[] = [
  {
    id: '1', dx: -1.8, dy: -1.8,
    userName: '花花',
    emoji: '🌹',
    tags: [{ type: 'social', label: '互关' }, { type: 'plant', label: '月季' }],
    latestPost: { text: '今天月季开了第一朵花！好开心～', timeAgo: '3小时前' },
  },
  {
    id: '2', dx: 1.8, dy: -1.8,
    userName: '绿植控',
    emoji: '🌿',
    tags: [{ type: 'geo', label: '同城' }, { type: 'plant', label: '绿萝' }],
    latestPost: { text: '绿萝真的好养，完全不用担心', timeAgo: '1天前' },
  },
  {
    id: '3', dx: 0, dy: -2.8,
    userName: '多肉萌主',
    emoji: '🌵',
    tags: [{ type: 'plant', label: '多肉' }],
    latestPost: { text: '新到了一批多肉，摆满窗台了', timeAgo: '2天前' },
  },
  {
    id: '4', dx: -2.8, dy: 0,
    userName: '茉莉香',
    emoji: '🌸',
    tags: [{ type: 'geo', label: '同小区' }, { type: 'plant', label: '茉莉' }],
    latestPost: { text: '茉莉花开满园，香气飘出老远', timeAgo: '2小时前' },
  },
  {
    id: '5', dx: 2.8, dy: 0,
    userName: '仙人球',
    emoji: '🎋',
    tags: [{ type: 'plant', label: '仙人球' }],
  },
  {
    id: '6', dx: 0, dy: 2.8,
    userName: '蕨类控',
    emoji: '🌿',
    tags: [{ type: 'social', label: '推荐' }],
    latestPost: { text: '波士顿蕨越来越大了，挂起来超好看', timeAgo: '5小时前' },
  },
  {
    id: '7', dx: -1.8, dy: 1.8,
    userName: '园艺达人',
    emoji: '🌼',
    tags: [{ type: 'geo', label: '同区' }],
    latestPost: { text: '分享一下今年的种植计划', timeAgo: '3天前' },
  },
  {
    id: '8', dx: 1.8, dy: 1.8,
    userName: '向日葵',
    emoji: '🌻',
    tags: [{ type: 'plant', label: '向日葵' }],
    latestPost: { text: '向日葵终于有 2 米高啦！', timeAgo: '1天前' },
  },
  {
    id: 'event-1', dx: 3.6, dy: -1.8,
    userName: '春季花展',
    emoji: '🎉',
    tags: [{ type: 'social', label: '活动' }],
    isEvent: true, size: 1.4,
    latestPost: { text: '2026 春季花卉展 · 5月28日开幕', timeAgo: '刚刚' },
  },
]

// ── My garden demo data ───────────────────────────────────────────────────────

const demoPots = [
  { id: '1', name: '月季', hasWaterAlert: true },
  { id: '2', name: '多肉', hasWaterAlert: false },
  { id: '3', name: '绿萝', hasWaterAlert: true },
  { id: '4', name: '茉莉', hasWaterAlert: false },
  { id: '5', name: '仙人掌', hasWaterAlert: false },
]

const demoTasks = [
  { id: '1', name: '浇水 · 月季', type: 'water' as const, frequency: '每天 1-2 次', completed: false },
  { id: '2', name: '检查 · 多肉', type: 'inspect' as const, frequency: '每周 1 次', completed: true },
  { id: '3', name: '浇水 · 绿萝', type: 'water' as const, frequency: '每 2 天一次', completed: false },
]

const VIEW_OPTIONS = [
  { value: 'grid', label: '网格', icon: <IconLayoutGrid size={12} strokeWidth={1.7} /> },
  { value: 'list', label: '列表', icon: <IconList size={12} strokeWidth={1.7} /> },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GardenPage() {
  const [segment, setSegment] = useState('公共花园')
  const [view, setView] = useState('grid')

  const isMyGarden = segment === '我的花园'

  return (
    <div
      style={{
        position: 'relative',
        height: 'calc(100vh - 80px)',  // leave space for FloatingTabBar
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
        background: 'var(--bg-base)',
      }}
    >
      {/* ── Public garden: full-height canvas, no outer padding ─────────── */}
      {!isMyGarden && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {/* Segmented Control overlay at top */}
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 50, width: 200,
          }}>
            <SegmentedControl
              options={['公共花园', '我的花园']}
              value={segment}
              onChange={setSegment}
              label="花园切换"
            />
          </div>
          <PublicGarden
            tiles={DEMO_TILES}
            myTile={MY_TILE}
            onVisitGarden={(tile) => console.log('visit', tile.id)}
            onMessage={(tile) => console.log('message', tile.id)}
          />
        </div>
      )}

      {/* ── My garden: scrollable, with normal padding ──────────────────── */}
      {isMyGarden && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 16, position: 'relative',
          }}>
            <h1 style={{
              fontSize: 18, fontWeight: 600, color: 'var(--sage-900)', margin: 0,
            }}>花园</h1>
            <div style={{ position: 'absolute', right: 0 }}>
              <ViewToggle options={VIEW_OPTIONS} value={view} onChange={setView} />
            </div>
          </div>
          {/* Segmented control */}
          <div style={{ marginBottom: 20 }}>
            <SegmentedControl
              options={['公共花园', '我的花园']}
              value={segment}
              onChange={setSegment}
              label="花园切换"
            />
          </div>
          {/* Content */}
          {view === 'grid' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <PlantGrid pots={demoPots} />
              <TaskList tasks={demoTasks} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {demoPots.map(pot => (
                <div key={pot.id} style={{
                  background: 'var(--bg-card)', border: '0.5px solid var(--border-default)',
                  borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--sage-900)',
                }}>
                  {pot.name} {pot.hasWaterAlert ? '💧' : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7.2: Final build check**

```bash
cd /Users/wendyz/Desktop/Spring_2026/Tech510/GardenLink_Revision && npx next build --no-lint 2>&1 | tail -15
```
Expected: all routes build, `/garden` now includes PublicGarden (~TBD kB).

- [ ] **Step 7.3: Run all tests**

```bash
cd /Users/wendyz/Desktop/Spring_2026/Tech510/GardenLink_Revision && npm test -- --no-coverage 2>&1 | tail -20
```
Expected: utils.test passes, no other failures.

- [ ] **Step 7.4: Manual smoke test (npm run dev)**

Start dev server and verify in Chrome DevTools → Device Mode (iPhone 14, 390×844):

1. `/garden` loads with warm cream background
2. Public garden view: canvas renders with "我" tile at center + surrounding demo tiles
3. Mouse drag moves the canvas 1:1
4. Release drag → nearest tile snaps to center, bottom sheet slides up
5. Bottom sheet shows correct name, tags, and action buttons
6. "看看花园" and "留言" buttons are tappable
7. Locate button (bottom-right circle) returns to origin and closes sheet
8. "地图/动态" toggle switches to feed list view
9. Clicking "我的花园" in SegmentedControl switches to PlantGrid + TaskList view
10. Tab bar still visible and working throughout

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Isometric canvas with isoProject (§3.1)
- ✅ SPREAD=1.8 coord expansion (§3.2)
- ✅ calcBase responsive sizing (§3.3)
- ✅ Depth sort by dy (§3.4)
- ✅ Alpha decay by distance (§3.5)
- ✅ Tile types: me / normal / focused / event (§4.1–4.2)
- ✅ Username text with per-type colors (§4.3)
- ✅ Illustration drawImage with anchor ratio (§5.4)
- ✅ Image preload first ring (§5.5)
- ✅ Pointer drag 1:1, MOVE_THRESHOLD (§6.1)
- ✅ Snap-to-center, 220ms ease-out-cubic (§6.2)
- ✅ Bottom sheet 290px, Framer Motion, 400ms (§6.3)
- ✅ Relation tags with three color types (§6.5)
- ✅ Wheel with WHEEL_SENSITIVITY, WHEEL_DEBOUNCE (§6.6)
- ✅ Locate button → goHome (§6.7)
- ✅ Map/Feed view toggle (§2, view switching)
- ✅ Canvas height compresses to MAP_COMPRESSED_HEIGHT when sheet opens (§2)
- ✅ Viewport culling (§8)
- ✅ DPR + ResizeObserver canvas sizing (note §1)
- ✅ Non-passive wheel listener (note §1)
- ✅ rAF-batched redraws (note §2)
- ✅ role="application" + aria-label (§9)
- ✅ aria-live="polite" on sheet (§9)
- ⚠️  Keyboard nav (ArrowKeys, Enter, Esc) — NOT in this plan. Add if required.
- ⚠️  prefers-reduced-motion — NOT in this plan. Can add as a follow-up.
- ⚠️  Lazy-load on drag to far tiles — NOT implemented; first-ring preload only for MVP.

**Type consistency:** `GardenCanvasHandle` defined in `types.ts` (Task 1), used in `GardenCanvas.tsx` (Task 3) and `useGardenDrag.ts` (Task 4). `GardenTile` defined once, referenced everywhere. No mismatched names found.
