// components/PublicGarden/utils.ts
import type { GardenTile } from './types'
import { GAP_RATIO, DIAMOND_ASPECT, SNAP_THRESHOLD, BASE_RATIO, BASE_MIN, BASE_MAX, ISO_X_FACTOR, ISO_Y_FACTOR } from './constants'

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
    x: dx * tw * ISO_X_FACTOR,
    y: dy * th * ISO_Y_FACTOR,
  }
}

export function findNearest(
  tiles: GardenTile[],
  offset: { x: number; y: number },
  _canvasSize: { w: number; h: number },  // reserved: future implementations may need canvas dims
  base: number,
): GardenTile | null {
  let best: GardenTile | null = null
  let bestDist = Infinity

  for (const tile of tiles) {
    if (tile.isMe) continue
    const p = isoProject(tile.dx, tile.dy, base)
    // dist from canvas center = how far tile's screen pos (with offset) is from center
    const dist = Math.hypot(p.x + offset.x, p.y + offset.y)
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
