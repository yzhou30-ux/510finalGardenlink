// components/AuthOverlay.tsx
// Full-screen frosted-glass overlay shown when a guest attempts a protected action.
// Renders with position:fixed so it works from any component in the tree.
'use client'

import Link from 'next/link'
import { IconX } from '@tabler/icons-react'

interface AuthOverlayProps {
  /** Context-specific message, e.g. "Sign in to start your plant diary" */
  message?: string
  /** Called when the user taps ✕ or the dim backdrop */
  onClose: () => void
}

export function AuthOverlay({
  message = 'Sign in to start your plant diary',
  onClose,
}: AuthOverlayProps) {
  return (
    // Backdrop — clicking it dismisses the overlay
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in required"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        // Cream-tinted semi-transparent bg so the content behind is visible but blurred
        background: 'rgba(245,240,232,0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ✕ Close button */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--glass-sage-medium)',
          border: '0.5px solid var(--glass-sage-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--sage-700)',
          flexShrink: 0,
        }}
      >
        <IconX size={16} strokeWidth={1.75} />
      </button>

      {/* Content card */}
      <div style={{
        background: 'var(--glass-cream-strong)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '0.5px solid rgba(200,209,198,0.6)',
        borderRadius: 20,
        padding: '36px 28px 28px',
        textAlign: 'center',
        maxWidth: 300,
        width: '100%',
        boxShadow: 'var(--shadow-card-focus)',
      }}>
        {/* Plant emoji */}
        <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 18 }}>🌱</div>

        {/* Headline */}
        <p style={{
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--sage-900)',
          margin: '0 0 6px',
          lineHeight: 1.35,
        }}>
          {message}
        </p>

        {/* Sub-text */}
        <p style={{
          fontSize: 12,
          color: 'var(--sage-400)',
          margin: '0 0 26px',
          lineHeight: 1.5,
        }}>
          Join the GardenLink community
        </p>

        {/* Primary CTA — Sign up */}
        <Link
          href="/auth/signup"
          style={{
            display: 'block',
            padding: '13px 0',
            borderRadius: 12,
            background: 'var(--success)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: 10,
            letterSpacing: 0.1,
          }}
        >
          Sign up
        </Link>

        {/* Secondary CTA — Log in */}
        <Link
          href="/auth/login"
          style={{
            display: 'block',
            padding: '12px 0',
            borderRadius: 12,
            background: 'var(--glass-sage-light)',
            border: '0.5px solid var(--glass-sage-border)',
            color: 'var(--sage-700)',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Log in
        </Link>
      </div>
    </div>
  )
}
