'use client'

import { useRouter } from 'next/navigation'
import { IconPlant2, IconDroplet, IconPlus } from '@tabler/icons-react'

interface Pot {
  id: string
  name: string
  hasWaterAlert?: boolean
}

interface PlantGridProps {
  pots: Pot[]
  onAddPot?: () => void
}

export function PlantGrid({ pots, onAddPot }: PlantGridProps) {
  const router = useRouter()

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
      }}
      aria-label="My pots"
    >
      {pots.map((pot) => (
        <button
          key={pot.id}
          onClick={() => router.push('/timeline?pot=' + encodeURIComponent(pot.name))}
          style={{
            position: 'relative',
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border-default)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
          aria-label={pot.name}
        >
          <IconPlant2 size={28} color="var(--sage-500)" strokeWidth={1.5} />
          <span
            style={{
              fontSize: 9,
              color: 'var(--sage-500)',
              fontFamily: 'var(--font-sans)',
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            {pot.name}
          </span>

          {/* Water alert badge */}
          {pot.hasWaterAlert && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: 'var(--info-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Needs water"
            >
              <IconDroplet size={8} color="var(--info)" strokeWidth={2} />
            </span>
          )}
        </button>
      ))}

      {/* Add new pot button */}
      <button
        onClick={onAddPot}
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: 'transparent',
          border: '1.5px dashed var(--sage-300)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
          color: 'var(--sage-300)',
        }}
        aria-label="Add pot"
      >
        <IconPlus size={24} strokeWidth={1.5} />
      </button>
    </div>
  )
}
