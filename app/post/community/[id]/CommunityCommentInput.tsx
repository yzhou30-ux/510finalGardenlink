// app/post/community/[id]/CommunityCommentInput.tsx
// Optimistic comment input for community posts (no DB — demo only)
'use client'

import { useState } from 'react'
import { IconSend } from '@tabler/icons-react'

interface Props {
  viewerEmoji: string
  viewerName: string
}

interface LocalComment {
  text: string
}

export function CommunityCommentInput({ viewerEmoji, viewerName }: Props) {
  const [body, setBody]         = useState('')
  const [sent, setSent]         = useState<LocalComment[]>([])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    setSent(prev => [...prev, { text: trimmed }])
    setBody('')
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
            disabled={!body.trim()}
            aria-label="Post comment"
            style={{
              position: 'absolute', bottom: 7, right: 8,
              width: 26, height: 26, borderRadius: '50%',
              background: body.trim() ? 'var(--success)' : 'var(--glass-sage-medium)',
              border: 'none',
              cursor: body.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            <IconSend size={13} color={body.trim() ? '#fff' : 'var(--sage-400)'} strokeWidth={1.8} />
          </button>
        </form>
      </div>
    </div>
  )
}
