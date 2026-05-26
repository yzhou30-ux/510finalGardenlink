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
