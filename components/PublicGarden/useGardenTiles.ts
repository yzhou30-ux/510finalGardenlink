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

  // Preload illustrations for all tiles on mount.
  // We don't distance-filter here because outer tiles (events, far members) also
  // need their images ready — the Spring Fair event tile at dist ≈ 4 was silently
  // skipped by a dist < 4 cutoff and fell back to emoji.
  useEffect(() => {
    const allTiles = [myTile, ...tiles]
    allTiles.forEach(t => {
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
