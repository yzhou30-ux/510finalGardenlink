// app/auth/signup/SignupForm.tsx
'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react'

const AVATAR_OPTIONS = ['🪴', '🌹', '🌻', '🌵', '🌸', '🌿', '🌱', '🍀']

export function SignupForm({ nextUrl }: { nextUrl: string }) {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [displayName, setDisplay] = useState('')
  const [avatar, setAvatar]       = useState('🪴')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim() || email.split('@')[0],
            avatar_emoji: avatar,
          },
          emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
      })
      if (authError) throw new Error(authError.message)
      setConfirmed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed')
      setLoading(false)
    }
  }

  if (confirmed) {
    return (
      <div style={{
        width: '100%', maxWidth: 360, textAlign: 'center',
        background: 'var(--bg-card)', border: '0.5px solid var(--border-default)',
        borderRadius: 14, padding: '28px 24px',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--sage-900)', marginBottom: 6 }}>
          Check your email
        </p>
        <p style={{ fontSize: 12, color: 'var(--sage-400)', lineHeight: 1.6 }}>
          We sent a confirmation link to <strong style={{ color: 'var(--sage-700)' }}>{email}</strong>.
          Click it to activate your account.
        </p>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    background: 'var(--bg-card)',
    border: '0.5px solid var(--border-default)',
    borderRadius: 10, fontSize: 14,
    color: 'var(--sage-900)',
    fontFamily: 'var(--font-sans)',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Display name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sage-700)' }}>
          Name <span style={{ color: 'var(--sage-300)', fontWeight: 400 }}>(optional)</span>
        </label>
        <input type="text" value={displayName} autoComplete="name"
          onChange={(e) => setDisplay(e.target.value)}
          placeholder="Your plant name or nickname"
          style={inputStyle} />
      </div>

      {/* Avatar picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sage-700)' }}>Avatar</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {AVATAR_OPTIONS.map(em => (
            <button key={em} type="button" onClick={() => setAvatar(em)}
              style={{
                width: 38, height: 38, borderRadius: '50%', fontSize: 20,
                background: avatar === em ? 'var(--glass-sage-medium)' : 'var(--bg-card)',
                border: avatar === em ? '1.5px solid var(--glass-sage-border)' : '0.5px solid var(--border-subtle)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.1s',
              }}>
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* Email */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sage-700)' }}>Email</label>
        <input type="email" value={email} autoComplete="email" required
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" style={inputStyle} />
      </div>

      {/* Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sage-700)' }}>
          Password <span style={{ color: 'var(--sage-300)', fontWeight: 400 }}>(6+ chars)</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input type={showPw ? 'text' : 'password'} value={password}
            autoComplete="new-password" required minLength={6}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ ...inputStyle, paddingRight: 44 }} />
          <button type="button" onClick={() => setShowPw(v => !v)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage-400)',
              display: 'flex', alignItems: 'center', padding: 2 }}>
            {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0,
          background: 'rgba(226,75,74,0.06)', borderRadius: 8, padding: '8px 12px' }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button type="submit" disabled={loading || !email || !password}
        style={{
          padding: '12px 0', borderRadius: 10, border: 'none', cursor: loading ? 'wait' : 'pointer',
          background: 'var(--glass-sage-strong)', color: 'var(--sage-900)',
          fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: loading ? 0.75 : 1, transition: 'opacity 0.15s',
        }}>
        {loading && <IconLoader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />}
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  )
}
