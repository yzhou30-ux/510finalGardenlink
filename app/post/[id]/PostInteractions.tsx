// app/post/[id]/PostInteractions.tsx
// Client component: heart + comment count row with auth gate for guests.
'use client'

import { useState } from 'react'
import { IconHeart, IconMessageCircle } from '@tabler/icons-react'
import { AuthOverlay } from '@/components/AuthOverlay'

interface Props {
  recordId: string
  likeCount: number
  commentCount: number
  isAuthenticated: boolean
}

export function PostInteractions({ likeCount, commentCount, isAuthenticated }: Props) {
  const [showOverlay, setShowOverlay] = useState(false)

  function handleProtectedAction() {
    if (!isAuthenticated) {
      setShowOverlay(true)
    }
    // Future: toggle like / focus comment input when authenticated
  }

  return (
    <>
      {showOverlay && (
        <AuthOverlay
          message="Sign in to join the conversation"
          onClose={() => setShowOverlay(false)}
        />
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        paddingTop: 12,
        borderTop: '0.5px solid var(--border-subtle)',
      }}>
        {/* Like button */}
        <button
          onClick={handleProtectedAction}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: 'var(--sage-400)', background: 'none',
            border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'var(--font-sans)',
          }}
          aria-label="Like this post"
        >
          <IconHeart size={15} strokeWidth={1.6} />
          <span style={{ fontSize: 12 }}>{likeCount}</span>
        </button>

        {/* Comment count (tapping also triggers auth gate if guest) */}
        <button
          onClick={handleProtectedAction}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: 'var(--sage-400)', background: 'none',
            border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'var(--font-sans)',
          }}
          aria-label="View comments"
        >
          <IconMessageCircle size={15} strokeWidth={1.6} />
          <span style={{ fontSize: 12 }}>
            {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </span>
        </button>
      </div>
    </>
  )
}
