import { IconPlant2 } from '@tabler/icons-react'

// Server Component — no 'use client'
export function DiamondGrid() {
  const cells = Array.from({ length: 9 }, (_, i) => i)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
      }}
      aria-label="Community garden"
    >
      {cells.map((i) => (
        <div
          key={i}
          style={{
            aspectRatio: '1',
            position: 'relative',
            // Clip the rotated child so overflow is hidden at the cell boundary
            overflow: 'hidden',
          }}
        >
          {/* The diamond shape: rotate the inner box 45deg */}
          <div
            style={{
              position: 'absolute',
              // Expand slightly so the rotated square fills the cell corner-to-corner
              top: '-15%',
              left: '-15%',
              width: '130%',
              height: '130%',
              transform: 'rotate(45deg)',
              background: 'var(--glass-sage-light)',
              border: '0.5px solid var(--border-subtle)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Counter-rotate the icon so it displays upright */}
            <div style={{ transform: 'rotate(-45deg)' }}>
              <IconPlant2 size={20} color="var(--sage-300)" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
