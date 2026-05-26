'use client'

import { useEffect, useRef, useState } from 'react'
import { IconCheck, IconChevronDown, IconPlant2 } from '@tabler/icons-react'

export interface PotOption {
  id: string
  name: string
  daysOwned: number
}

interface PotSelectorProps {
  pots: PotOption[]
  selectedId: string
  onChange: (id: string) => void
}

export function PotSelector({ pots, selectedId, onChange }: PotSelectorProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selected =
    pots.find((p) => p.id === selectedId) ?? pots[0]

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e: PointerEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  if (!selected) return null

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          background: 'var(--glass-cream-light)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '0.5px solid rgba(200,209,198,0.5)',
          borderRadius: 12,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--glass-sage-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconPlant2 size={16} color="var(--sage-500)" stroke={1.75} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage-900)' }}>
            {selected.name}
          </span>
          <span style={{ fontSize: 9, color: 'var(--sage-400)', marginTop: 2 }}>
            {selected.daysOwned} days
          </span>
        </div>
        <IconChevronDown
          size={16}
          color="var(--sage-500)"
          stroke={1.75}
          style={{
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown */}
      <div
        role="listbox"
        aria-hidden={!open}
        style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: 'var(--bg-card)',
          border: '0.5px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          maxHeight: open ? 280 : 0,
          opacity: open ? 1 : 0,
          transition: 'max-height 0.22s cubic-bezier(0.22,1,0.36,1), opacity 0.18s ease',
          zIndex: 300,
          boxShadow: open ? '0 4px 20px rgba(61,79,60,0.08)' : 'none',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {pots.map((pot) => {
          const isSelected = pot.id === selected.id
          return (
            <button
              key={pot.id}
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                onChange(pot.id)
                setOpen(false)
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: '0.5px solid var(--border-subtle)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--glass-sage-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconPlant2 size={14} color="var(--sage-500)" stroke={1.75} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isSelected ? 'var(--info)' : 'var(--sage-900)',
                  }}
                >
                  {pot.name}
                </span>
                <span style={{ fontSize: 9, color: 'var(--sage-400)', marginTop: 2 }}>
                  {pot.daysOwned} days
                </span>
              </div>
              {isSelected && (
                <IconCheck size={16} color="var(--info)" stroke={2} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
