// components/MyGarden/PlantContextMenu.tsx
'use client'

import { useEffect, useRef } from 'react'
import { IconEdit, IconTag, IconArchive } from '@tabler/icons-react'
import type { PlantPot } from './types'

interface PlantContextMenuProps {
  pot: PlantPot | null          // null = hidden
  position: { x: number; y: number }  // relative to garden container
  containerSize: { w: number; h: number }
  onEdit: () => void
  onRename: () => void
  onArchive: () => void
  onClose: () => void
}

const MENU_W = 186
const MENU_H = 132  // approx: 2 items + divider + 1 item

export function PlantContextMenu({
  pot,
  position,
  containerSize,
  onEdit,
  onRename,
  onArchive,
  onClose,
}: PlantContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click/tap
  useEffect(() => {
    if (!pot) return
    const handler = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose()
    }
    // Small delay so the triggering pointerup doesn't immediately close the menu
    const id = setTimeout(() => {
      document.addEventListener('pointerdown', handler)
    }, 50)
    return () => {
      clearTimeout(id)
      document.removeEventListener('pointerdown', handler)
    }
  }, [pot, onClose])

  if (!pot) return null

  // Smart position: flip left/up if near the edge
  const left = position.x + MENU_W > containerSize.w
    ? position.x - MENU_W
    : position.x
  const top = position.y + MENU_H > containerSize.h
    ? position.y - MENU_H
    : position.y

  const itemStyle = (warn = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 400,
    color: warn ? '#B8863A' : 'var(--sage-900)',
    textAlign: 'left',
  })

  const iconColor = (warn = false) => warn ? '#B8863A' : 'var(--sage-500)'

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Plant options"
      style={{
        position: 'absolute',
        left: Math.max(4, left),
        top: Math.max(4, top),
        width: MENU_W,
        background: 'rgba(253,251,247,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 12,
        border: '0.5px solid var(--border-cream)',
        boxShadow: '0 8px 30px rgba(61,79,60,0.14)',
        zIndex: 200,
        overflow: 'hidden',
        animation: 'context-menu-enter 0.15s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      <style>{`
        @keyframes context-menu-enter {
          from { transform: scale(0.88); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>

      {/* Edit */}
      <button
        role="menuitem"
        style={itemStyle()}
        onClick={() => { onEdit(); onClose() }}
      >
        <IconEdit size={15} color={iconColor()} strokeWidth={1.7} />
        Edit pot info
      </button>

      {/* Rename */}
      <button
        role="menuitem"
        style={itemStyle()}
        onClick={() => { onRename(); onClose() }}
      >
        <IconTag size={15} color={iconColor()} strokeWidth={1.7} />
        Rename
      </button>

      {/* Divider */}
      <div style={{ height: '0.5px', background: 'var(--border-subtle)', margin: '0 14px' }} />

      {/* Archive (amber warning colour) */}
      <button
        role="menuitem"
        style={itemStyle(true)}
        onClick={() => { onArchive(); onClose() }}
      >
        <IconArchive size={15} color={iconColor(true)} strokeWidth={1.7} />
        Archive pot
      </button>
    </div>
  )
}
