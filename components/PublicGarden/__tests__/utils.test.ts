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
