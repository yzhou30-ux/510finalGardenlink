'use client'

import type { ReactNode } from 'react'

interface ViewToggleOption {
  value: string
  label: string
  icon: ReactNode
}

interface ViewToggleProps {
  options: ViewToggleOption[]
  value: string
  onChange: (val: string) => void
}

export function ViewToggle({ options, value, onChange }: ViewToggleProps) {
  return (
    <div style={{ display: 'flex', gap: 4 }} role="group" aria-label="Toggle view">
      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '4px 8px',
              borderRadius: 6,
              border: isSelected
                ? '0.5px solid var(--glass-sage-border)'
                : '0.5px solid transparent',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              color: isSelected ? 'var(--sage-900)' : 'var(--sage-300)',
              background: isSelected ? 'var(--glass-sage-strong)' : 'transparent',
            }}
            aria-pressed={isSelected}
          >
            {option.icon}
            <span style={{ fontSize: 10 }}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
