// components/PublicGarden/GardenCanvas.tsx
'use client'

import {
  forwardRef, useRef, useEffect, useCallback, useImperativeHandle,
} from 'react'
import type { GardenTile, GardenCanvasHandle } from './types'
import {
  ALPHA_MIN, ALPHA_DECAY, SPREAD, DIAMOND_ASPECT, ILLUSTRATION_ANCHOR,
} from './constants'
import { calcBase, isoProject } from './utils'

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

/** Deterministic per-tile phase offset so each plant sways independently. Range [0, 2π). */
function tileAnimSeed(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h) + id.charCodeAt(i)
    h |= 0
  }
  return (Math.abs(h) % 1000) / 1000 * Math.PI * 2
}

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
  sway = 0,   // horizontal drift in px
  bob  = 0,   // vertical drift in px
) {
  const imgW = pw
  const imgH = imgW * (img.naturalHeight / img.naturalWidth)
  // anchor: diamond center sits at ILLUSTRATION_ANCHOR (65%) down the image height
  const drawY = sy - imgH * ILLUSTRATION_ANCHOR
  ctx.drawImage(img, sx - imgW / 2 + sway, drawY + bob, imgW, imgH)
}

// ── Thought-bubble colours (Animal Crossing style: soft pastel, icon-only) ─────
const BUBBLE_CONFIG = {
  help:   { bg: 'rgba(220,180,140,0.87)', shadow: 'rgba(196,147,90,0.30)',   icon: '🆘' },
  bloom:  { bg: 'rgba(235,180,180,0.87)', shadow: 'rgba(200,110,140,0.30)',  icon: '🌸' },
  new:    { bg: 'rgba(180,210,180,0.87)', shadow: 'rgba(107,158,107,0.30)',  icon: '✨' },
  newPot: { bg: 'rgba(170,215,175,0.87)', shadow: 'rgba(130,180,140,0.30)', icon: '🌱' },
} as const

/**
 * Draw an Animal Crossing–style thought bubble (rounded pill + downward tail) above a tile.
 * @param cx      horizontal center (tile sx)
 * @param topY    top of the tile illustration / diamond — tail tip anchors just above this
 * @param type    which colour/icon config to use
 * @param alpha   tile's global alpha (bubble inherits it)
 * @param floatY  current float offset in px from animation; default 0
 */
function drawStatusBubble(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  type: keyof typeof BUBBLE_CONFIG,
  alpha: number,
  floatY = 0,
) {
  const { bg, shadow, icon } = BUBBLE_CONFIG[type]

  // Geometry — stadium pill (r = pillH/2) with a centred downward tail
  const pillW  = 28
  const pillH  = 20
  const r      = 10   // = pillH/2 → fully rounded ends
  const tailW  = 6    // tail base (fits within 8px flat bottom: cx±3 inside cx±4 corners)
  const tailH  = 6
  const gap    = 4    // px between tail tip and topY

  // Positions (floatY shifts the whole bubble; positive = down, animation goes negative)
  const tailTipY    = topY - gap + floatY
  const pillBottomY = tailTipY - tailH
  const py          = pillBottomY - pillH
  const px          = cx - pillW / 2

  ctx.save()
  ctx.globalAlpha = alpha

  // Drop shadow (drawn before path; not applied to icon)
  ctx.shadowColor   = shadow
  ctx.shadowBlur    = 6
  ctx.shadowOffsetY = 2

  // ── Thought-bubble path: pill body + triangular tail ──
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.moveTo(px + r, py)
  ctx.lineTo(px + pillW - r, py)
  // Right semicircle
  ctx.arcTo(px + pillW, py,          px + pillW, py + r,          r)
  ctx.arcTo(px + pillW, pillBottomY, px + pillW - r, pillBottomY, r)
  // Bottom-right flat → tail right side → tip → tail left side → bottom-left flat
  ctx.lineTo(cx + tailW / 2, pillBottomY)
  ctx.lineTo(cx,             tailTipY)
  ctx.lineTo(cx - tailW / 2, pillBottomY)
  // Left semicircle
  ctx.lineTo(px + r, pillBottomY)
  ctx.arcTo(px, pillBottomY, px, pillBottomY - r, r)
  ctx.arcTo(px, py,          px + r, py,          r)
  ctx.closePath()
  ctx.fill()

  // Reset shadow so it does not bleed into the icon
  ctx.shadowColor   = 'transparent'
  ctx.shadowBlur    = 0
  ctx.shadowOffsetY = 0

  // ── Icon emoji centred in pill ──
  ctx.font         = '11px serif'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(icon, cx, py + pillH / 2)

  ctx.restore()
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
  /** Non-passive wheel handler — GardenCanvas attaches this directly to the canvas element so preventDefault() works. */
  onWheel: (e: WheelEvent) => void
}

export const GardenCanvas = forwardRef<GardenCanvasHandle, GardenCanvasProps>(
  function GardenCanvas(props, ref) {
    const {
      tiles, focusedTile, getImage, setOnLoad,
      onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
      onWheel,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const canvasElRef = useRef<HTMLCanvasElement>(null)
    const internalOffsetRef = useRef({ x: 0, y: 0 })
    const tilesRef = useRef(tiles)
    const focusedTileRef = useRef(focusedTile)
    const rafPendingRef = useRef(false)
    const onWheelRef = useRef(onWheel)

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
      const time = Date.now() * 0.001   // seconds — shared across all tiles this frame

      // Clear in logical pixels (DPR transform is already applied via setTransform in ResizeObserver)
      ctx.clearRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2

      // Depth sort: lower dy drawn first (further back in isometric view)
      const sorted = [...tilesRef.current].sort(
        (a, b) => a.dy - b.dy || a.dx - b.dx,
      )

      sorted.forEach(tile => {
        const p = isoProject(tile.dx, tile.dy, base)
        const sx = cx + p.x + offset.x
        const sy = cy + p.y + offset.y

        const pw = base * (tile.size ?? 1)
        const ph = pw * DIAMOND_ASPECT

        // Viewport culling — skip tiles outside visible area
        if (sx < -pw * 2 || sx > w + pw * 2 || sy < -ph * 4 || sy > h + ph * 4) return

        // Alpha decay based on distance from origin
        const rawDist = Math.hypot(tile.dx, tile.dy) / SPREAD
        const alpha = Math.max(ALPHA_MIN, 1 - rawDist * ALPHA_DECAY)

        const isFocused = focusedTileRef.current?.id === tile.id

        // Isolate each tile's canvas state so alpha/font/fillStyle don't leak between tiles
        ctx.save()
        ctx.globalAlpha = alpha

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
        // animSeed is shared by plant sway/bob and the status-bubble float animation
        const animSeed = tileAnimSeed(tile.id)
        const img = tile.illustrationUrl ? getImage(tile.illustrationUrl) : null
        // Track the bottom edge of whatever we draw so the label clears it (Task 1 fix)
        let contentBottomY: number | null = null
        let illustrationTopY: number | null = null  // for status bubble anchor
        if (img && img.complete && img.naturalWidth > 0) {
          const sway = Math.sin(time * 0.8 + animSeed) * 2   // ±2 px left/right
          const bob  = Math.sin(time * 0.5 + animSeed) * 1   // ±1 px up/down
          drawTileIllustration(ctx, img, sx, sy, pw, sway, bob)
          const imgH = pw * (img.naturalHeight / img.naturalWidth)
          const drawY = sy - imgH * ILLUSTRATION_ANCHOR
          illustrationTopY  = drawY + bob
          contentBottomY    = drawY + imgH + bob
        } else {
          // emoji fallback
          const emojiSize = Math.max(12, base * 0.24)
          ctx.font = `${emojiSize}px serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.globalAlpha = alpha * 0.9
          ctx.fillText(tile.emoji, sx, sy - ph * 0.05)
        }

        // ── Status bubble (floats above illustration / diamond top) ──
        if (tile.statusBubble && !tile.isMe) {
          const bubbleAnchorY = illustrationTopY ?? (sy - ph / 2)
          // Opposite phase to plant bob so bubble rises while plant dips — feels alive
          const bubbleFloat   = Math.sin(time * 1.57 + animSeed + Math.PI) * 2   // ±2px, ~4s cycle
          drawStatusBubble(ctx, sx, bubbleAnchorY, tile.statusBubble.type, alpha, bubbleFloat)
        }

        // ── Username label ──
        // Option A: smart Y — push below illustration bottom when image is taller than diamond
        const defaultLabelY = sy + ph * 0.32
        const labelY = contentBottomY !== null
          ? Math.max(defaultLabelY, contentBottomY + 4)
          : defaultLabelY
        const namePx = Math.max(9, base * 0.09)
        const nameWeight = tile.isMe ? '500' : '400'
        ctx.font = `${nameWeight} ${namePx}px -apple-system,'PingFang SC',sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.globalAlpha = alpha
        // Option B: cream shadow — keeps label legible if a neighbouring illustration drifts close
        ctx.shadowColor = 'rgba(253,251,247,0.95)'
        ctx.shadowBlur = 4
        if (tile.isMe) ctx.fillStyle = 'rgba(61,79,60,0.7)'
        else if (isFocused) ctx.fillStyle = 'rgba(61,79,60,0.8)'
        else if (tile.isEvent) ctx.fillStyle = 'rgba(139,100,32,0.5)'
        else ctx.fillStyle = 'rgba(107,123,106,0.4)'
        ctx.fillText(tile.userName, sx, labelY)
        ctx.shadowBlur = 0   // always reset — shadow must not leak into later draws

        ctx.restore()
      })
    }, [getImage])

    // ── Batched redraw ───────────────────────────────────────────────────────
    const scheduleRedraw = useCallback(() => {
      if (rafPendingRef.current) return
      rafPendingRef.current = true
      requestAnimationFrame(() => {
        rafPendingRef.current = false
        renderFrame()
      })
    }, [renderFrame])

    // Keep refs in sync with props
    useEffect(() => { tilesRef.current = tiles; scheduleRedraw() }, [tiles, scheduleRedraw])
    useEffect(() => { focusedTileRef.current = focusedTile; scheduleRedraw() }, [focusedTile, scheduleRedraw])
    useEffect(() => { onWheelRef.current = onWheel }, [onWheel])

    // ── Expose handle ────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      redraw(newOffset: { x: number; y: number }) {
        internalOffsetRef.current = newOffset
        scheduleRedraw()
      },
      get nativeElement() {
        return canvasElRef.current
      },
    }), [scheduleRedraw])

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
    }, [scheduleRedraw])

    // ── Non-passive wheel listener ────────────────────────────────────────────
    // React's synthetic onWheel is passive (can't preventDefault). We attach directly.
    // onWheelRef is kept current via a sync effect, so this effect only runs once.
    useEffect(() => {
      const canvas = canvasElRef.current
      if (!canvas) return
      const handler = (e: WheelEvent) => { e.preventDefault(); onWheelRef.current(e) }
      canvas.addEventListener('wheel', handler, { passive: false })
      return () => canvas.removeEventListener('wheel', handler)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Register image-load redraw ────────────────────────────────────────────
    useEffect(() => {
      setOnLoad(scheduleRedraw)
    }, [setOnLoad, scheduleRedraw])

    // ── Continuous animation loop (sway / bob) ────────────────────────────────
    // Runs only when at least one tile has an illustration.
    // On every frame it calls renderFrame() so the time-based offsets update.
    useEffect(() => {
      const hasAnim = tiles.some(t => !!t.illustrationUrl)
      if (!hasAnim) return

      let running = true
      let rafId: number

      const loop = () => {
        if (!running) return
        renderFrame()
        rafId = requestAnimationFrame(loop)
      }
      rafId = requestAnimationFrame(loop)

      return () => {
        running = false
        cancelAnimationFrame(rafId)
      }
    }, [tiles, renderFrame])

    return (
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'relative', touchAction: 'none', cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        role="application"
        aria-label="Community garden map"
        tabIndex={0}
      >
        <canvas ref={canvasElRef} style={{ display: 'block' }} />
      </div>
    )
  },
)
