// app/post/community/[id]/CommunityCommentInput.tsx
// Comment input for community posts.
// When a real UUID recordId is passed, persists to daily_comments.
// Falls back to optimistic-local-only for demo tile IDs (non-UUID strings).
'use client'

import { useState } from 'react'
import { IconSend } from '@tabler/icons-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// ── UUID validator (matches the standard 8-4-4-4-12 hex format) ──────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Props {
  viewerEmoji: string
  viewerName: string
  /** When this is a valid UUID the comment is also written to daily_comments. */
  recordId?: string
}

interface LocalComment {
  text: string
}

export function CommunityCommentInput({ viewerEmoji, viewerName, recordId }: Props) {
  const [body, setBody]     = useState('')
  const [sent, setSent]     = useState<LocalComment[]>([])
  const [saving, setSaving] = useState(false)

  const isRealRecord = !!recordId && UUID_RE.test(recordId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || saving) return

    // Optimistic update — show immediately regardless of DB outcome
    setSent(prev => [...prev, { text: trimmed }])
    setBody('')

    if (isRealRecord) {
      setSaving(true)
      try {
        const supabase = createSupabaseBrowserClient()
        await supabase.from('daily_comments').insert({
          record_id: recordId,
          user_name: viewerName,
          body: trimmed,
        })
      } catch {
        // Silently swallow — optimistic comment is already shown
      } finally {
        setSaving(false)
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Optimistic replies */}
      {sent.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--glass-sage-medium)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}>
            {viewerEmoji}
          </div>
          <div style={{
            flex: 1, background: 'var(--bg-base)',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage-900)', marginBottom: 4 }}>
              {viewerName}
            </div>
            <p style={{ fontSize: 13, color: 'var(--sage-700)', margin: 0, lineHeight: 1.5 }}>
              {c.text}
            </p>
          </div>
        </div>
      ))}

      {/* Input row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--glass-sage-medium)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, marginTop: 2,
        }}>
          {viewerEmoji}
        </div>
        <form onSubmit={handleSubmit} style={{ flex: 1, position: 'relative' }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave a comment…"
            rows={2}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--bg-base)',
              border: '0.5px solid var(--border-default)',
              borderRadius: 10,
              padding: '8px 40px 8px 12px',
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
            disabled={!body.trim() || saving}
            aria-label="Post comment"
            style={{
              position: 'absolute', bottom: 7, right: 8,
              width: 26, height: 26, borderRadius: '50%',
              background: body.trim() && !saving ? 'var(--success)' : 'var(--glass-sage-medium)',
              border: 'none',
              cursor: body.trim() && !saving ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            <IconSend size={13} color={body.trim() && !saving ? '#fff' : 'var(--sage-400)'} strokeWidth={1.8} />
          </button>
        </form>
      </div>
    </div>
  )
}
