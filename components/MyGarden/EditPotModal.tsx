// components/MyGarden/EditPotModal.tsx
// Bottom-sheet modal for editing an existing pot's name, emoji, and start date.
// Slides up from the bottom; closes on backdrop tap or ✕ button.
'use client'

import { useState, useEffect } from 'react'
import { IconX } from '@tabler/icons-react'
import { differenceInDays, parseISO, subDays, format } from 'date-fns'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { deriveEmoji } from '@/components/AddPot/AddPotFlow'
import type { PlantPot } from './types'

interface EditPotModalProps {
  pot: PlantPot | null   // null = closed
  onClose: () => void
  onSaved: () => void
}

export function EditPotModal({ pot, onClose, onSaved }: EditPotModalProps) {
  const today = format(new Date(), 'yyyy-MM-dd')

  const [name,      setName]      = useState('')
  const [startDate, setStartDate] = useState(today)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Pre-fill fields whenever the modal opens for a new pot
  useEffect(() => {
    if (!pot) return
    setName(pot.name)
    // Reconstruct approximate start date from daysSinceStart
    const approxStart = subDays(new Date(), pot.daysSinceStart)
    setStartDate(format(approxStart, 'yyyy-MM-dd'))
    setError(null)
  }, [pot])

  if (!pot) return null

  const displayEmoji = deriveEmoji(name, '', '🪴')
  const canSave      = name.trim().length > 0 && startDate.length > 0

  async function handleSave() {
    if (!canSave || !pot) return
    setSaving(true)
    setError(null)
    try {
      const supabase  = createSupabaseBrowserClient()
      const daysOwned = Math.max(0, differenceInDays(new Date(), parseISO(startDate)))

      const { error: dbErr } = await supabase
        .from('pots')
        .update({
          name:       name.trim(),
          icon:       displayEmoji,
          days_owned: daysOwned,
        })
        .eq('id', pot.id)

      if (dbErr) throw new Error(dbErr.message)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  // ── Shared input style ──────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--bg-base)',
    border: '0.5px solid var(--border-default)',
    borderRadius: 10,
    fontSize: 14,
    color: 'var(--sage-900)',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--sage-700)',
    fontFamily: 'var(--font-sans)',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(61,79,60,0.18)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          zIndex: 499,
          animation: 'fadeIn 0.18s ease both',
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal
        aria-label="Edit pot"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          maxHeight: '80vh',
          background: 'var(--bg-base)',
          borderRadius: '18px 18px 0 0',
          border: '0.5px solid var(--border-cream)',
          boxShadow: '0 -4px 30px rgba(61,79,60,0.12)',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-sans)',
          animation: 'slideUpSheet 0.28s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        <style>{`
          @keyframes slideUpSheet {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>

        {/* Handle bar + header */}
        <div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>
          {/* Drag handle */}
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'var(--border-default)',
            margin: '0 auto 14px',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Pot preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--glass-sage-medium)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {displayEmoji}
              </div>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--sage-900)' }}>
                Edit pot
              </span>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--glass-sage-medium)',
                border: 'none', cursor: 'pointer', color: 'var(--sage-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconX size={13} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'var(--border-subtle)', flexShrink: 0 }} />

        {/* Scrollable fields */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '20px 16px 24px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>

          {/* Error banner */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(226,75,74,0.07)',
              border: '0.5px solid rgba(226,75,74,0.14)',
              fontSize: 12, color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label style={labelStyle}>
              Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="e.g. Balcony Rose"
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Start date */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Start date <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => setStartDate(today)}
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
              value={startDate}
              max={today}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
            {startDate && (
              <p style={{
                margin: '6px 0 0',
                fontSize: 11, color: 'var(--sage-400)',
                fontFamily: 'var(--font-sans)',
              }}>
                {Math.max(0, differenceInDays(new Date(), parseISO(startDate)))} days
              </p>
            )}
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            style={{
              width: '100%', padding: '14px 0',
              background: canSave && !saving ? 'var(--glass-sage-strong)' : 'var(--glass-sage-subtle)',
              border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              color: canSave && !saving ? 'var(--sage-900)' : 'var(--sage-300)',
              fontFamily: 'var(--font-sans)',
              cursor: canSave && !saving ? 'pointer' : 'default',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </>
  )
}
