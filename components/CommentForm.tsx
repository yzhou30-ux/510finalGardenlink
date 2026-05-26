// components/CommentForm.tsx — client component used in post detail pages
'use client'

import { useState } from 'react'
import { IconSend } from '@tabler/icons-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { AuthOverlay } from './AuthOverlay'

interface CommentFormProps {
  recordId: string
  /** When false, tapping the textarea shows the auth overlay instead. */
  isAuthenticated?: boolean
}

export function CommentForm({ recordId, isAuthenticated = true }: CommentFormProps) {
  const [body, setBody]     = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showOverlay, setShowOverlay] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return

    setStatus('saving')
    setErrorMsg('')

    const supabase = createSupabaseBrowserClient()
    // Resolve real user name; fall back to 'Guest' for unauthenticated visitors
    const { data: { user } } = await supabase.auth.getUser()
    const userName = user?.email?.split('@')[0] ?? 'Guest'

    const { error } = await supabase
      .from('daily_comments')
      .insert({ record_id: recordId, user_name: userName, body: trimmed })

    if (error) {
      setErrorMsg('Could not post your comment. Please try again.')
      setStatus('error')
      return
    }

    setBody('')
    setStatus('idle')
    window.location.reload()
  }

  return (
    <>
      {showOverlay && (
        <AuthOverlay
          message="Sign in to join the conversation"
          onClose={() => setShowOverlay(false)}
        />
      )}

    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}
    >
      <div style={{ position: 'relative' }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => { if (!isAuthenticated) { setShowOverlay(true) } }}
          placeholder="Share a tip or encouragement…"
          rows={3}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'var(--bg-base)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 10,
            padding: '10px 42px 10px 12px',
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--sage-700)',
            fontFamily: 'var(--font-sans)',
            resize: 'none',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={status === 'saving' || !body.trim()}
          aria-label="Post comment"
          style={{
            position: 'absolute',
            bottom: 8,
            right: 10,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: body.trim() ? 'var(--success)' : 'var(--glass-sage-medium)',
            border: 'none',
            cursor: body.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          <IconSend size={14} color={body.trim() ? '#fff' : 'var(--sage-400)'} strokeWidth={1.8} />
        </button>
      </div>

      {status === 'error' && (
        <p role="alert" style={{ fontSize: 11, color: 'var(--danger)', margin: 0 }}>
          {errorMsg}
        </p>
      )}
    </form>
    </>
  )
}
