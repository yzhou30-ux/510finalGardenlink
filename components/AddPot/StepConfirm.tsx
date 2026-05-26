// components/AddPot/StepConfirm.tsx
// Step 3 of 3 — preview card and final confirmation
'use client'

import { differenceInDays, parseISO, format } from 'date-fns'
import { IconEdit, IconLoader2 } from '@tabler/icons-react'
import type { NewPotData } from './types'

interface StepConfirmProps {
  data: NewPotData
  displayEmoji: string
  onConfirm: () => Promise<void>
  onEdit: () => void
  loading: boolean
}

export function StepConfirm({ data, displayEmoji, onConfirm, onEdit, loading }: StepConfirmProps) {
  const startDate  = data.startDate ? parseISO(data.startDate) : new Date()
  const daysOwned  = Math.max(0, differenceInDays(new Date(), startDate))
  const dateLabel  = format(startDate, 'MMMM d, yyyy')

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      padding: '8px 20px 24px', overflowY: 'auto',
    }}>

      <p style={{
        fontSize: 13, color: 'var(--sage-400)',
        fontFamily: 'var(--font-sans)',
        margin: '0 0 24px', textAlign: 'center', lineHeight: 1.5,
      }}>
        Looks good? Confirm to add this pot to your garden.
      </p>

      {/* ── Preview card ── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 16, padding: '28px 20px 22px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        boxShadow: 'var(--shadow-card-focus)',
        marginBottom: 24,
      }}>
        {/* Emoji avatar */}
        <div style={{
          width: 76, height: 76, borderRadius: '50%',
          background: 'var(--glass-sage-medium)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, marginBottom: 4,
        }}>
          {displayEmoji}
        </div>

        {/* Pot name */}
        <div style={{
          fontSize: 20, fontWeight: 600, color: 'var(--sage-900)',
          fontFamily: 'var(--font-sans)', textAlign: 'center',
        }}>
          {data.name}
        </div>

        {/* Species · date · days */}
        <div style={{
          fontSize: 12, color: 'var(--sage-400)',
          fontFamily: 'var(--font-sans)', textAlign: 'center', lineHeight: 1.6,
        }}>
          {data.species && <>{data.species} · </>}
          {dateLabel}
          {daysOwned > 0 && (
            <> · <span style={{ color: 'var(--sage-500)' }}>{daysOwned} day{daysOwned !== 1 ? 's' : ''}</span></>
          )}
        </div>

        {/* Edit link */}
        <button
          type="button"
          onClick={onEdit}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'var(--info)',
            fontFamily: 'var(--font-sans)',
            display: 'flex', alignItems: 'center', gap: 4,
            marginTop: 4,
            textDecoration: 'underline', textUnderlineOffset: 2,
          }}
        >
          <IconEdit size={12} strokeWidth={1.75} /> Edit details
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1, minHeight: 16 }} />

      {/* ── Add to garden ── */}
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        style={{
          width: '100%', padding: '14px 0',
          background: 'var(--glass-sage-strong)',
          border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 600, color: 'var(--sage-900)',
          fontFamily: 'var(--font-sans)',
          cursor: loading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: loading ? 0.72 : 1,
          transition: 'opacity 0.15s',
          flexShrink: 0,
        }}
      >
        {loading && <IconLoader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />}
        {loading ? 'Adding…' : 'Add to my garden 🌱'}
      </button>
    </div>
  )
}
