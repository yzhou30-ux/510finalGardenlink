// components/AddPot/StepPhoto.tsx
// Step 1 of 3 — capture or pick a plant photo (optional, can skip)
'use client'

import { useRef } from 'react'
import { IconCamera, IconPhoto, IconRefresh } from '@tabler/icons-react'
import type { NewPotData } from './types'

interface StepPhotoProps {
  data: NewPotData
  onChange: (updates: Partial<NewPotData>) => void
  onNext: () => void   // photo was taken — proceed to info
  onSkip: () => void   // go to info without a photo
}

export function StepPhoto({ data, onChange, onNext, onSkip }: StepPhotoProps) {
  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File | null) {
    if (!file) return
    // Revoke any previous object URL to avoid memory leak
    if (data.photoPreviewUrl) URL.revokeObjectURL(data.photoPreviewUrl)
    const url = URL.createObjectURL(file)
    onChange({ photoFile: file, photoPreviewUrl: url })
  }

  const hasPhoto = Boolean(data.photoPreviewUrl)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      padding: '8px 20px 24px', overflowY: 'auto',
    }}>

      {/* ── Photo area ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        {!hasPhoto ? (
          /* Dashed placeholder */
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            style={{
              width: '100%', aspectRatio: '4/3',
              border: '1.5px dashed rgba(139,158,137,0.50)',
              borderRadius: 16, cursor: 'pointer',
              background: 'var(--glass-sage-subtle)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <span style={{ fontSize: 40 }}>📷</span>
            <span style={{
              fontSize: 13, color: 'var(--sage-400)',
              fontFamily: 'var(--font-sans)',
            }}>
              Tap to take a photo
            </span>
          </button>
        ) : (
          /* Photo preview with Retake overlay */
          <div style={{
            width: '100%', aspectRatio: '4/3',
            position: 'relative', borderRadius: 16, overflow: 'hidden',
          }}>
            <img
              src={data.photoPreviewUrl!}
              alt="Plant preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              style={{
                position: 'absolute', top: 10, right: 10,
                padding: '6px 12px', borderRadius: 20,
                background: 'rgba(253,251,247,0.82)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                border: '0.5px solid rgba(200,209,198,0.55)',
                fontSize: 12, color: 'var(--sage-700)',
                fontFamily: 'var(--font-sans)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <IconRefresh size={13} strokeWidth={1.75} /> Retake
            </button>
          </div>
        )}
      </div>

      {/* ── Hidden file inputs ── */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {/* ── Camera / Gallery buttons (only before photo is chosen) ── */}
      {!hasPhoto && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            style={{
              flex: 1, padding: '12px 0',
              background: 'var(--glass-sage-medium)',
              border: '0.5px solid var(--glass-sage-border)',
              borderRadius: 10, cursor: 'pointer',
              fontSize: 13, fontWeight: 500, color: 'var(--sage-700)',
              fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <IconCamera size={16} strokeWidth={1.75} /> Camera
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            style={{
              flex: 1, padding: '12px 0',
              background: 'var(--glass-sage-medium)',
              border: '0.5px solid var(--glass-sage-border)',
              borderRadius: 10, cursor: 'pointer',
              fontSize: 13, fontWeight: 500, color: 'var(--sage-700)',
              fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <IconPhoto size={16} strokeWidth={1.75} /> Gallery
          </button>
        </div>
      )}

      {/* ── Next button (enabled only when photo is chosen) ── */}
      <button
        type="button"
        onClick={onNext}
        disabled={!hasPhoto}
        style={{
          width: '100%', padding: '14px 0', marginBottom: 12,
          background: hasPhoto ? 'var(--glass-sage-strong)' : 'var(--glass-sage-subtle)',
          border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 600,
          color: hasPhoto ? 'var(--sage-900)' : 'var(--sage-300)',
          fontFamily: 'var(--font-sans)',
          cursor: hasPhoto ? 'pointer' : 'default',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        Next →
      </button>

      {/* ── Skip for now ── */}
      <button
        type="button"
        onClick={onSkip}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, color: 'var(--sage-400)',
          fontFamily: 'var(--font-sans)',
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}
      >
        Skip for now →
      </button>
    </div>
  )
}
