// components/PublicGarden/PublicGarden.tsx
'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { IconCurrentLocation } from '@tabler/icons-react'
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
  viewMode = 'map',
  onTileSelect,
  onVisitGarden,
  onMessage,
}: PublicGardenProps) {
  const allTiles: GardenTile[] = [myTile, ...tiles]
  const [focusedTile, setFocusedTile] = useState<GardenTile | null>(null)

  const canvasRef = useRef<GardenCanvasHandle | null>(null)

  const { getImage, setOnLoad } = useGardenTiles(tiles, myTile)

  const { pointerHandlers, onWheel, goHome } = useGardenDrag({
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
              onWheel={onWheel}
            />

            {/* Locate button */}
            <button
              type="button"
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
              aria-label="Back to my location"
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
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          overflowY: 'auto',
          paddingTop: 8,
        }}>
          <GardenFeed tiles={tiles} />
        </div>
      )}
    </div>
  )
}
