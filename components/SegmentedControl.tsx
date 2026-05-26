'use client'

interface SegmentedControlProps {
  options: string[]
  value: string
  onChange: (val: string) => void
  label?: string
}

export function SegmentedControl({ options, value, onChange, label }: SegmentedControlProps) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--glass-sage-medium)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 10,
        padding: 3,
      }}
      role="tablist"
      aria-label={label ?? 'Switch view'}
    >
      {options.map((option) => {
        const isSelected = option === value
        return (
          <button
            key={option}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option)}
            style={{
              flex: 1,
              padding: '5px 8px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: isSelected ? 500 : 400,
              fontFamily: 'var(--font-sans)',
              color: isSelected ? 'var(--sage-900)' : 'var(--sage-400)',
              background: isSelected ? 'rgba(253,251,247,0.85)' : 'transparent',
              boxShadow: isSelected ? 'var(--shadow-seg-active)' : 'none',
              transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
