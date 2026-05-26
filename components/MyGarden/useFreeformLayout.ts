// components/MyGarden/useFreeformLayout.ts
'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

// ─── Public API ───────────────────────────────────────────────────────────────

export interface LayoutItem {
  x: number   // center x in px
  y: number   // center y in px
  r: number   // radius in px
}

export interface UseFreeformLayoutOptions {
  items: Array<{ id: string; sizeWeight?: number }>
  containerRef: RefObject<HTMLDivElement | null>
}

export interface LayoutResult {
  positions: Map<string, LayoutItem>
}

// ─── Deterministic RNG ────────────────────────────────────────────────────────

/** Deterministic hash of a string to a uint32. */
function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) ^ s.charCodeAt(i)) | 0
  }
  return h >>> 0
}

/**
 * Pseudo-random float [0, 1) from a seed + index.
 * Uses a simple LCG so the same (seed, index) pair always gives the same value.
 */
function seededFloat(seed: number, index: number): number {
  let s = (seed ^ Math.imul(index + 1, 2654435761)) | 0
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
  s = s ^ (s >>> 16)
  return (s >>> 0) / 0x100000000
}

// ─── Layout algorithm ─────────────────────────────────────────────────────────

const GOLDEN_ANGLE = 2.39996323  // ~137.5° in radians

/**
 * Compute bubble positions using a golden-angle spiral with collision resolution.
 *
 * Design goals (vs. original):
 *  • Bubbles form a tight cluster — not scattered across the whole canvas.
 *  • Edges are allowed to overlap by ~13% of the combined radius (organic feel).
 *  • Sizes vary deterministically per pot ID: max bubble ≈ 1.5× min bubble.
 *  • The cluster centre sits at ~37% of container height, leaving the bottom
 *    ~80 px clear for the fixed "+" button and labels.
 *
 * ALL dimensions are derived from containerW/H — nothing hardcoded in px.
 */
function computeLayout(
  items: Array<{ id: string; sizeWeight?: number }>,
  containerW: number,
  containerH: number,
): Map<string, LayoutItem> {
  const positions = new Map<string, LayoutItem>()
  if (items.length === 0 || containerW === 0 || containerH === 0) return positions

  // ── Base radius: bigger than before so bubbles read well on screen ─────────
  const baseR = Math.min(containerW, containerH) * 0.145

  // ── Cluster origin — slightly above mid-height to leave room below ─────────
  const cx = containerW * 0.5
  const cy = containerH * 0.37

  // ── Reserve space for the fixed "+" button at bottom ──────────────────────
  // Pot labels are ~r*0.85 below the circle; "+" button sits at bottom-20px.
  // vPadBottom ensures no circle+label overlaps the button area.
  const ADD_BUTTON_CLEARANCE = 80   // px from bottom to leave free for + button

  const placed: Array<{ x: number; y: number; r: number }> = []

  items.forEach((item, i) => {
    const seed = hashString(item.id)
    const baseWeight = item.sizeWeight ?? 1.0

    // ── Deterministic size variation (only for "standard" bubbles) ────────────
    // Range [0.88, 1.32] → max/min ratio = 1.5×
    const sizeW = Math.abs(baseWeight - 1.0) < 0.001
      ? 0.88 + seededFloat(seed, 42) * 0.44
      : baseWeight
    const r = baseR * sizeW

    // ── Candidate position (golden-angle spiral) ──────────────────────────────
    let x: number
    let y: number

    if (i === 0) {
      // First bubble at the cluster origin, tiny seeded nudge
      x = cx + (seededFloat(seed, 0) - 0.5) * baseR * 0.25
      y = cy + (seededFloat(seed, 1) - 0.5) * baseR * 0.25
    } else {
      // Tighter spiral: factor 1.55 (was 2.55) → initial placement much closer
      const jitter = (seededFloat(seed, 0) - 0.5) * 0.35  // ±0.175 rad (was ±0.3)
      const angle   = i * GOLDEN_ANGLE + jitter
      const spiralR = baseR * 1.55 * Math.sqrt(i)
      x = cx + Math.cos(angle) * spiralR
      y = cy + Math.sin(angle) * spiralR
    }

    // ── Collision resolution — allows ~13% overlap between edges ─────────────
    // Instead of pushing to r1+r2+gap (fully separated), we push only to
    // (r1+r2)*0.87, letting edges visually interpenetrate a little.
    const OVERLAP_FACTOR = 0.87  // 1 − 0.13
    for (let iter = 0; iter < 60; iter++) {
      let resolved = true
      for (const p of placed) {
        const dx   = x - p.x
        const dy   = y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = (r + p.r) * OVERLAP_FACTOR

        if (dist < minDist) {
          resolved = false
          if (dist < 0.001) {
            // Coincident: push in a seed-derived direction
            const dir = seededFloat(seed, iter + 10) * Math.PI * 2
            x += Math.cos(dir) * (minDist * 0.55)
            y += Math.sin(dir) * (minDist * 0.55)
          } else {
            const push = (minDist - dist) * 0.55
            x += (dx / dist) * push
            y += (dy / dist) * push
          }
        }
      }
      if (resolved) break
    }

    // ── Boundary clamping ──────────────────────────────────────────────────────
    const hPad      = r + 6
    const vPadTop   = r + 6
    // Bottom: keep circle + label above the "+ button" zone
    const vPadBottom = r * 1.85 + ADD_BUTTON_CLEARANCE

    x = Math.max(hPad, Math.min(containerW - hPad, x))
    y = Math.max(vPadTop, Math.min(containerH - vPadBottom, y))

    placed.push({ x, y, r })
    positions.set(item.id, { x, y, r })
  })

  return positions
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFreeformLayout({
  items,
  containerRef,
}: UseFreeformLayoutOptions): LayoutResult {
  const [positions, setPositions] = useState<Map<string, LayoutItem>>(new Map())

  // Stable key: recompute only when the item list actually changes
  const itemsKey = items.map(it => `${it.id}:${it.sizeWeight ?? 1}`).join('|')
  const itemsKeyRef = useRef(itemsKey)
  itemsKeyRef.current = itemsKey

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function recalc() {
      const el2 = containerRef.current
      if (!el2) return
      const w = el2.clientWidth
      const h = el2.clientHeight
      if (w === 0 || h === 0) return
      const currentKey = itemsKeyRef.current
      const currentItems = currentKey === '' ? [] : currentKey.split('|').map(part => {
        const [id, sw] = part.split(':')
        return { id, sizeWeight: parseFloat(sw) }
      })
      setPositions(computeLayout(currentItems, w, h))
    }

    const ro = new ResizeObserver(recalc)
    ro.observe(el)
    recalc()
    return () => ro.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, containerRef])

  return { positions }
}
