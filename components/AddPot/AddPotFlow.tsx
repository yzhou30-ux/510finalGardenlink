// components/AddPot/AddPotFlow.tsx
// Full-screen "Add new pot" wizard — 3 steps + success screen
'use client'

import { useState, useEffect } from 'react'
import { IconX, IconChevronLeft } from '@tabler/icons-react'
import { differenceInDays, parseISO } from 'date-fns'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { StepPhoto } from './StepPhoto'
import { StepInfo } from './StepInfo'
import { StepConfirm } from './StepConfirm'
import { AddPotSuccess } from './AddPotSuccess'
import type { NewPotData, AddPotStep, AddPotFlowProps } from './types'

// ─── Emoji derivation (shared with StepConfirm) ────────────────────────────────
export function deriveEmoji(name: string, species: string, stored: string): string {
  if (stored !== '🪴') return stored  // user picked via suggestion pill
  const s = (name + ' ' + species).toLowerCase()
  if (s.includes('rose'))      return '🌹'
  if (s.includes('basil'))     return '🌿'
  if (s.includes('succulent')) return '🌵'
  if (s.includes('jasmine'))   return '🌸'
  if (s.includes('mint'))      return '🌱'
  if (s.includes('sunflower')) return '🌻'
  if (s.includes('lavender'))  return '💜'
  if (s.includes('tomato'))    return '🍅'
  if (s.includes('cactus'))    return '🌵'
  if (s.includes('orchid'))    return '🌺'
  if (s.includes('lily'))      return '🌷'
  if (s.includes('fern'))      return '🌿'
  if (s.includes('aloe'))      return '🌵'
  return '🪴'
}

// ─── Step progress percentage ──────────────────────────────────────────────────
const PROGRESS: Record<AddPotStep, string> = {
  photo:   '33%',
  info:    '66%',
  confirm: '100%',
  success: '100%',
}

const STEP_LABEL: Record<AddPotStep, string> = {
  photo:   '1 / 3',
  info:    '2 / 3',
  confirm: '3 / 3',
  success: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddPotFlow({ open, onClose, onComplete }: AddPotFlowProps) {
  const today = new Date().toISOString().split('T')[0]

  const [step, setStep]         = useState<AddPotStep>('photo')
  const [data, setData]         = useState<NewPotData>({
    photoFile: null, photoPreviewUrl: null,
    name: '', species: '', startDate: today, emoji: '🪴',
  })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [newPotId, setNewPotId] = useState<string | null>(null)

  // Reset state whenever the modal opens
  useEffect(() => {
    if (open) {
      const freshToday = new Date().toISOString().split('T')[0]
      setStep('photo')
      setData({ photoFile: null, photoPreviewUrl: null, name: '', species: '', startDate: freshToday, emoji: '🪴' })
      setLoading(false)
      setError(null)
      setNewPotId(null)
    }
  }, [open])

  if (!open) return null

  function updateData(updates: Partial<NewPotData>) {
    setData(prev => ({ ...prev, ...updates }))
  }

  const displayEmoji = deriveEmoji(data.name, data.species, data.emoji)

  // ── Step navigation ────────────────────────────────────────────────────────
  function goBack() {
    if (step === 'confirm') setStep('info')
    else if (step === 'info') setStep('photo')
  }

  // ── DB write ─────────────────────────────────────────────────────────────────
  // Uses a session-token-injected createClient so auth.uid() = user.id is
  // guaranteed server-side regardless of cookie configuration.
  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      // Get the live session from the SSR browser client (reads browser cookie).
      const sbrClient = createSupabaseBrowserClient()
      const { data: { session } } = await sbrClient.auth.getSession()
      if (!session) throw new Error('Please sign in to add a pot.')
      const user = session.user

      // Create a plain supabase-js client with the JWT injected as Authorization
      // header — this guarantees auth.uid() = user.id on the Supabase server.
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${session.access_token}` } } }
      )

      const startDate = data.startDate ? parseISO(data.startDate) : new Date()
      const daysOwned = Math.max(0, differenceInDays(new Date(), startDate))

      const { data: pot, error: insertError } = await supabase
        .from('pots')
        .insert({
          user_id:    user.id,
          user_name:  user.id,   // backward-compat field
          name:       data.name.trim(),
          icon:       displayEmoji,
          days_owned: daysOwned,
        })
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)

      setNewPotId(pot.id)
      setStep('success')
      onComplete(pot.id, data.name.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add pot. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Header logic ───────────────────────────────────────────────────────────
  const isSuccess  = step === 'success'
  const canGoBack  = step === 'info' || step === 'confirm'
  const showHeader = !isSuccess

  return (
    <>
      {/* Backdrop (hidden on success so garden is fully covered) */}
      {!isSuccess && (
        <div
          onClick={onClose}
          aria-hidden
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(61,79,60,0.15)',
            backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
            zIndex: 599,
            animation: 'fadeIn 0.2s ease both',
          }}
        />
      )}

      {/* Full-screen sheet */}
      <div
        role="dialog"
        aria-modal
        aria-label="Add new pot"
        style={{
          position: 'fixed', inset: 0,
          background: 'var(--bg-base)',
          zIndex: 600,
          display: 'flex', flexDirection: 'column',
          fontFamily: 'var(--font-sans)',
          animation: open ? 'slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both' : undefined,
        }}
      >

        {/* ── Chrome: header + progress bar ─────────────────────────────── */}
        {showHeader && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center',
              paddingTop:  'calc(env(safe-area-inset-top, 0px) + 14px)',
              paddingBottom: 14,
              paddingLeft: 16, paddingRight: 16,
              borderBottom: '0.5px solid var(--border-subtle)',
              flexShrink: 0,
            }}>
              {/* Left: ← back or ✕ close */}
              <div style={{ width: 44, display: 'flex' }}>
                {canGoBack ? (
                  <button
                    type="button"
                    onClick={goBack}
                    aria-label="Go back"
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--glass-sage-medium)',
                      border: 'none', cursor: 'pointer', color: 'var(--sage-500)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <IconChevronLeft size={16} strokeWidth={2.2} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--glass-sage-medium)',
                      border: 'none', cursor: 'pointer', color: 'var(--sage-500)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <IconX size={14} strokeWidth={2.2} />
                  </button>
                )}
              </div>

              {/* Center: title */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--sage-900)' }}>
                  Add new pot
                </span>
              </div>

              {/* Right: step counter */}
              <div style={{ width: 44, display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 11, color: 'var(--sage-400)', fontVariantNumeric: 'tabular-nums' }}>
                  {STEP_LABEL[step]}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 2, background: 'var(--border-subtle)', flexShrink: 0 }}>
              <div style={{
                height: '100%',
                background: 'var(--glass-sage-strong)',
                width: PROGRESS[step],
                transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1)',
              }} />
            </div>
          </>
        )}

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {error && (
          <div style={{
            padding: '10px 20px', flexShrink: 0,
            background: 'rgba(226,75,74,0.07)',
            borderBottom: '0.5px solid rgba(226,75,74,0.14)',
            fontSize: 12, color: 'var(--danger)',
            fontFamily: 'var(--font-sans)',
          }}>
            {error}
          </div>
        )}

        {/* ── Step content ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: showHeader ? 8 : 0 }}>
          {step === 'photo' && (
            <StepPhoto
              data={data}
              onChange={updateData}
              onNext={() => setStep('info')}
              onSkip={() => setStep('info')}
            />
          )}
          {step === 'info' && (
            <StepInfo
              data={data}
              onChange={updateData}
              onNext={() => setStep('confirm')}
              onBack={() => setStep('photo')}
            />
          )}
          {step === 'confirm' && (
            <StepConfirm
              data={data}
              displayEmoji={displayEmoji}
              onConfirm={handleConfirm}
              onEdit={() => setStep('info')}
              loading={loading}
            />
          )}
          {step === 'success' && newPotId && (
            <AddPotSuccess
              potName={data.name}
              potId={newPotId}
              emoji={displayEmoji}
              onBackToGarden={onClose}
            />
          )}
        </div>
      </div>
    </>
  )
}
