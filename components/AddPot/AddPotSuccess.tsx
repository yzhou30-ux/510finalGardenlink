// components/AddPot/AddPotSuccess.tsx
// Final screen — shown after pot is successfully created
'use client'

import { useRouter } from 'next/navigation'

interface AddPotSuccessProps {
  potName: string
  potId: string
  emoji: string
  onBackToGarden: () => void
}

export function AddPotSuccess({ potName, potId, emoji, onBackToGarden }: AddPotSuccessProps) {
  const router = useRouter()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 32px 48px',
      fontFamily: 'var(--font-sans)',
    }}>

      {/* Big emoji — pops in */}
      <div style={{
        fontSize: 72, marginBottom: 22,
        animation: 'fadeIn 0.45s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {emoji}
      </div>

      <h2 style={{
        fontSize: 22, fontWeight: 600, color: 'var(--sage-900)',
        margin: '0 0 10px', textAlign: 'center',
      }}>
        {potName} added!
      </h2>

      <p style={{
        fontSize: 13, color: 'var(--sage-400)',
        margin: '0 0 40px', textAlign: 'center', lineHeight: 1.6,
      }}>
        Your new pot is ready.{'\n'}Capture the first photo to start your record.
      </p>

      {/* Primary CTA — camera */}
      <button
        type="button"
        onClick={() => router.push(`/camera?pot=${encodeURIComponent(potId)}`)}
        style={{
          width: '100%', padding: '14px 0', marginBottom: 14,
          background: 'var(--glass-sage-strong)',
          border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 600, color: 'var(--sage-900)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>📷</span> Take the first photo
      </button>

      {/* Secondary — back */}
      <button
        type="button"
        onClick={onBackToGarden}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--sage-400)',
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}
      >
        Back to my garden
      </button>
    </div>
  )
}
