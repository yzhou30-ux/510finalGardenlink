// components/AddPot/StepInfo.tsx
// Step 2 of 3 — name, optional species, start date
'use client'

import { useEffect, useState, useRef } from 'react'
import { IconLoader2 } from '@tabler/icons-react'
import type { NewPotData, SpeciesSuggestion } from './types'

// Calls the server-side /api/identify-plant proxy (keeps PlantNet key off client)
async function detectSpecies(file: File): Promise<SpeciesSuggestion[]> {
  try {
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch('/api/identify-plant', { method: 'POST', body: fd })
    if (!res.ok) return []
    const data = await res.json() as { results?: SpeciesSuggestion[] }
    return data.results ?? []
  } catch {
    return []
  }
}

interface StepInfoProps {
  data: NewPotData
  onChange: (updates: Partial<NewPotData>) => void
  onNext: () => void
  onBack: () => void
}

export function StepInfo({ data, onChange, onNext }: StepInfoProps) {
  const [suggestions, setSuggestions] = useState<SpeciesSuggestion[]>([])
  const [detecting, setDetecting]     = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Auto-focus name on mount
  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 120)
  }, [])

  // Run species detection when a photo is available
  useEffect(() => {
    if (data.photoFile) {
      setDetecting(true)
      setSuggestions([])
      detectSpecies(data.photoFile)
        .then(setSuggestions)
        .finally(() => setDetecting(false))
    } else {
      setSuggestions([])
      setDetecting(false)
    }
  }, [data.photoFile])

  const today = new Date().toISOString().split('T')[0]
  const canNext = data.name.trim().length > 0 && data.startDate.length > 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      padding: '8px 20px 24px', overflowY: 'auto', gap: 20,
    }}>

      {/* ── Name ── */}
      <div>
        <label style={{
          display: 'block', marginBottom: 6,
          fontSize: 12, fontWeight: 500, color: 'var(--sage-700)',
          fontFamily: 'var(--font-sans)',
        }}>
          Name <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          ref={nameRef}
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Balcony Rose"
          maxLength={40}
          style={{
            width: '100%', padding: '12px 14px',
            background: 'var(--bg-base)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 10, fontSize: 14, color: 'var(--sage-900)',
            fontFamily: 'var(--font-sans)', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ── Species (optional) ── */}
      <div>
        <label style={{
          display: 'block', marginBottom: 6,
          fontSize: 12, fontWeight: 500, color: 'var(--sage-700)',
          fontFamily: 'var(--font-sans)',
        }}>
          Species{' '}
          <span style={{ fontSize: 10, color: 'var(--sage-300)', fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          type="text"
          value={data.species}
          onChange={(e) => onChange({ species: e.target.value })}
          placeholder="e.g. Rosa chinensis"
          maxLength={60}
          style={{
            width: '100%', padding: '12px 14px',
            background: 'var(--bg-base)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 10, fontSize: 14, color: 'var(--sage-900)',
            fontFamily: 'var(--font-sans)', outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* Detecting spinner — shown while PlantNet is running */}
        {detecting && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 8, fontSize: 11, color: 'var(--sage-400)',
            fontFamily: 'var(--font-sans)',
          }}>
            <IconLoader2 size={12} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--sage-400)' }} />
            Identifying plant…
          </div>
        )}

        {/* Species suggestion pills — shown after PlantNet returns results */}
        {!detecting && suggestions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => onChange({ species: s.name, emoji: s.emoji })}
                style={{
                  padding: '4px 10px', borderRadius: 16,
                  background: data.species === s.name
                    ? 'var(--glass-sage-strong)'
                    : 'var(--glass-sage-light)',
                  border: '0.5px solid var(--glass-sage-border)',
                  fontSize: 11, color: 'var(--sage-700)',
                  fontFamily: 'var(--font-sans)', cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Start Date ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{
            fontSize: 12, fontWeight: 500, color: 'var(--sage-700)',
            fontFamily: 'var(--font-sans)',
          }}>
            Start Date <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <button
            type="button"
            onClick={() => onChange({ startDate: today })}
            style={{
              padding: '3px 8px', borderRadius: 6,
              background: 'var(--info-bg)',
              border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--info)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Today
          </button>
        </div>
        <input
          type="date"
          value={data.startDate}
          max={today}
          onChange={(e) => onChange({ startDate: e.target.value })}
          style={{
            width: '100%', padding: '12px 14px',
            background: 'var(--bg-base)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 10, fontSize: 14, color: 'var(--sage-900)',
            fontFamily: 'var(--font-sans)', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Spacer to push button to bottom */}
      <div style={{ flex: 1, minHeight: 24 }} />

      {/* ── Next button ── */}
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        style={{
          width: '100%', padding: '14px 0',
          background: canNext ? 'var(--glass-sage-strong)' : 'var(--glass-sage-subtle)',
          border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 600,
          color: canNext ? 'var(--sage-900)' : 'var(--sage-300)',
          fontFamily: 'var(--font-sans)',
          cursor: canNext ? 'pointer' : 'default',
          transition: 'background 0.15s, color 0.15s',
          flexShrink: 0,
        }}
      >
        Next →
      </button>
    </div>
  )
}
