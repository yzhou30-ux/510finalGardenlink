// components/MyGarden/MyGarden.tsx
'use client'

import { useRef, useState, useCallback } from 'react'
import { IconPlus } from '@tabler/icons-react'
import type { MyGardenProps, PlantPot } from './types'
import { useFreeformLayout } from './useFreeformLayout'
import { PlantBubble } from './PlantBubble'
import { PlantContextMenu } from './PlantContextMenu'

export function MyGarden({
  pots,
  onPotTap,
  onAddPot,
  onEditPot,
  onRenamePot,
  onArchivePot,
}: MyGardenProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Context menu state ────────────────────────────────────────────────────
  const [menuPot, setMenuPot] = useState<PlantPot | null>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  // Filter out archived pots for the main view
  const visiblePots = pots.filter(p => !p.isArchived)

  // Layout items: only real pots — the + button is fixed, not part of the algorithm
  const layoutItems = visiblePots.map(p => ({ id: p.id, sizeWeight: 1.0 }))

  const { positions } = useFreeformLayout({ items: layoutItems, containerRef })

  // ── Long-press handler ────────────────────────────────────────────────────
  const handleLongPress = useCallback((pot: PlantPot, clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = clientX - rect.left
    const y = clientY - rect.top
    setContainerSize({ w: rect.width, h: rect.height })
    setMenuPos({ x, y })
    setMenuPot(pot)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        padding: '0 0 6px',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--sage-900)',
          fontFamily: 'var(--font-sans)',
        }}>
          My Garden
        </span>
        {visiblePots.length > 0 && (
          <span style={{
            fontSize: 11,
            color: 'var(--sage-400)',
            fontFamily: 'var(--font-sans)',
          }}>
            {visiblePots.length} {visiblePots.length === 1 ? 'pot' : 'pots'}
          </span>
        )}
      </div>

      {/* ── Bubble canvas ──────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          // Subtle radial gradient for depth
          background: 'radial-gradient(ellipse at 50% 35%, rgba(253,251,247,0.6) 0%, transparent 70%)',
        }}
        aria-label="My garden pots"
      >
        {/* Empty state */}
        {visiblePots.length === 0 && (
          <p style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            color: 'var(--sage-300)',
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            Tap + to add your first plant
          </p>
        )}

        {/* Pot bubbles */}
        {visiblePots.map((pot, i) => {
          const pos = positions.get(pot.id)
          if (!pos) return null
          // Unrecorded pots float above all recorded pots so the camera badge is
          // never hidden behind a sibling bubble that overlaps it.
          const zIndex = pot.recordedToday
            ? i + 1
            : visiblePots.length + i + 10
          return (
            <PlantBubble
              key={pot.id}
              pot={pot}
              x={pos.x}
              y={pos.y}
              r={pos.r}
              index={i}
              zIndex={zIndex}
              onTap={() => onPotTap(pot)}
              onLongPress={(cx, cy) => handleLongPress(pot, cx, cy)}
            />
          )
        })}

        {/* Fixed + button — bottom-right corner, outside the layout algorithm */}
        <button
          type="button"
          onClick={onAddPot}
          aria-label="Add a new pot"
          style={{
            position: 'absolute',
            bottom: 20,
            right: 16,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(253,251,247,0.88)',
            border: '1.5px dashed rgba(139,158,137,0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            boxShadow: '0 2px 10px rgba(61,79,60,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 200,
            // Subtle hover/active handled by CSS; JS feedback via transform
            transition: 'transform 0.12s ease, box-shadow 0.12s ease',
          }}
          onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.91)' }}
          onPointerUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
          onPointerLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
        >
          <IconPlus size={22} color="rgba(74,93,73,0.65)" strokeWidth={1.75} />
        </button>

        {/* Context menu */}
        <PlantContextMenu
          pot={menuPot}
          position={menuPos}
          containerSize={containerSize}
          onEdit={() => menuPot && onEditPot(menuPot)}
          onRename={() => menuPot && onRenamePot(menuPot)}
          onArchive={() => menuPot && onArchivePot(menuPot)}
          onClose={() => setMenuPot(null)}
        />
      </div>
    </div>
  )
}
