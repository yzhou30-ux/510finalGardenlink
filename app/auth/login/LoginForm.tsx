// app/auth/login/LoginForm.tsx
'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react'

export function LoginForm({ nextUrl }: { nextUrl: string }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw new Error(authError.message)
      // Hard navigation so the auth cookie is included in the next request
      window.location.href = nextUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
      setLoading(false)
    }
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
      {/* Email */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sage-700)' }}>Email</label>
        <input
          type="email" value={email} autoComplete="email" required
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
        />
      </div>

      {/* Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sage-700)' }}>Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'} value={password} autoComplete="current-password" required
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ ...inputStyle, paddingRight: 44 }}
          />
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
          background: loading ? 'var(--glass-sage-medium)' : 'var(--glass-sage-strong)',
          color: 'var(--sage-900)', fontSize: 14, fontWeight: 600,
          fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 6, opacity: loading ? 0.75 : 1,
          transition: 'opacity 0.15s',
        }}>
        {loading && <IconLoader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />}
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
