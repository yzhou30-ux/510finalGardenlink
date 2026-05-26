// components/PostPublishModal.tsx
// Bottom-sheet that appears when tapping "Post" on a focused card in the timeline.
// Lets the user write/edit a caption and publish the record as a post.
'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { IconX, IconLoader2, IconCheck } from '@tabler/icons-react'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'
import type { CardData } from './CardDeck/types'
import type { PostCategory } from '@/lib/types'

interface PostPublishModalProps {
  card: CardData | null          // null = closed
  onClose: () => void
  onPublished: () => void        // parent reloads data after success
}

// ── Plant-state categories (from legacy highlight concept) ────────────────────
const CATEGORIES: { value: PostCategory; emoji: string; label: string; desc: string }[] = [
  { value: 'bloom',   emoji: '🌸', label: 'Bloom',   desc: 'Flower opened or blossomed' },
  { value: 'harvest', emoji: '🍅', label: 'Harvest', desc: 'Ready to pick or harvested' },
  { value: 'growth',  emoji: '🌱', label: 'Growth',  desc: 'New growth or milestone'    },
  { value: 'help',    emoji: '🆘', label: 'Help',    desc: 'Something looks wrong'      },
]

export function PostPublishModal({ card, onClose, onPublished }: PostPublishModalProps) {
  const [caption,  setCaption]  = useState('')
  const [category, setCategory] = useState<PostCategory | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync caption + reset category whenever the modal opens for a new card
  useEffect(() => {
    if (card) {
      setCaption(card.caption ?? '')
      setCategory(null)
      setDone(false)
      setError(null)
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [card])

  if (!card) return null

  const isOpen = Boolean(card)

  // If it's a demo card (no real UUID), we can't save to DB
  const isDemoCard = !card.id || card.id.length < 10   // demo keys are '1','2'... < 10 chars

  async function handlePublish() {
    if (isDemoCard) {
      setError('This is a demo card — upload a real photo first via the camera button.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Inject access_token as Authorization header so auth.uid() is guaranteed
      // to match server-side — same pattern as camera/page.tsx and AddPotFlow.tsx.
      const sbrClient = createSupabaseBrowserClient()
      const { data: { session } } = await sbrClient.auth.getSession()
      if (!session) throw new Error('Please sign in to publish a post.')

      const supabase = createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${session.access_token}` } } }
      )

      const update: Record<string, unknown> = { has_post: true }
      const trimmed = caption.trim()
      if (trimmed)  update.caption       = trimmed
      if (category) update.post_category = category
      const { error: updateErr } = await supabase
        .from('daily_records')
        .update(update)
        .eq('id', card!.id)
      if (updateErr) throw new Error(updateErr.message)
      setDone(true)
      setTimeout(() => {
        onPublished()
        onClose()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setLoading(false)
    }
  }

  // card is guaranteed non-null here (we return null above when card is null)
  const dateLabel = format(card!.date, 'MMMM d, yyyy')

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(61,79,60,0.25)',
          backdropFilter: 'blur(2px)', zIndex: 500,
          animation: 'fadeIn 0.2s ease both',
        }}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal
        aria-label="Publish post"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          maxWidth: 480, margin: '0 auto',
          background: 'var(--bg-card)',
          borderRadius: '18px 18px 0 0',
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          zIndex: 501,
          boxShadow: '0 -4px 24px rgba(61,79,60,0.10)',
          animation: 'slideUp 0.28s cubic-bezier(0.22,1,0.36,1) both',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--glass-sage-medium)',
          margin: '0 auto 18px',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--sage-900)', margin: 0 }}>
              {card.hasPost ? 'Update post' : 'Publish as post'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--sage-400)', margin: '2px 0 0' }}>
              {dateLabel}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--glass-sage-medium)', border: 'none', borderRadius: '50%',
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--sage-500)',
          }}>
            <IconX size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Cover preview (if any) */}
        {card.coverImageUrl && (
          <div style={{
            width: '100%', aspectRatio: '3/1',
            backgroundImage: `url(${card.coverImageUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            borderRadius: 10, marginBottom: 14, overflow: 'hidden',
          }} aria-hidden />
        )}

        {/* ── Plant state category (legacy highlight concept) ────────────── */}
        <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--sage-500)', margin: '0 0 8px' }}>
          Tag this moment <span style={{ color: 'var(--sage-300)', fontWeight: 400 }}>(optional)</span>
        </p>
        <div style={{ display: 'flex', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(prev => prev === cat.value ? null : cat.value)}
              title={cat.desc}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 14, border: 'none',
                cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)',
                background: category === cat.value ? 'var(--glass-sage-strong)' : 'var(--glass-sage-light)',
                color:      category === cat.value ? 'var(--sage-900)'          : 'var(--sage-500)',
                fontWeight: category === cat.value ? 600                         : 400,
                outline: category === cat.value ? '1.5px solid var(--glass-sage-border)' : 'none',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Caption textarea */}
        <textarea
          ref={textareaRef}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption… (optional)"
          rows={3}
          maxLength={500}
          style={{
            width: '100%', padding: '11px 14px',
            background: 'var(--bg-base)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 10, fontSize: 13,
            color: 'var(--sage-700)', fontFamily: 'var(--font-sans)',
            resize: 'none', outline: 'none', boxSizing: 'border-box',
            lineHeight: 1.5,
          }}
        />
        <p style={{ fontSize: 10, color: 'var(--sage-300)', margin: '4px 0 14px', textAlign: 'right' }}>
          {caption.length}/500
        </p>

        {/* Error */}
        {error && (
          <p style={{
            fontSize: 12, color: 'var(--danger)', margin: '0 0 12px',
            background: 'rgba(226,75,74,0.06)', borderRadius: 8, padding: '8px 12px',
          }}>
            {error}
          </p>
        )}

        {/* Publish button */}
        <button
          onClick={handlePublish}
          disabled={loading || done}
          style={{
            width: '100%', padding: '13px 0',
            background: done
              ? 'rgba(107,158,107,0.18)'
              : 'var(--glass-sage-strong)',
            border: done ? '0.5px solid rgba(107,158,107,0.3)' : 'none',
            borderRadius: 10, fontSize: 14, fontWeight: 600,
            color: done ? 'var(--success)' : 'var(--sage-900)',
            cursor: loading || done ? 'default' : 'pointer',
            fontFamily: 'var(--font-sans)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: loading ? 0.75 : 1, transition: 'background 0.15s',
          }}
        >
          {loading && <IconLoader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />}
          {done    && <IconCheck size={16} />}
          {done ? 'Published!' : loading ? 'Publishing…' : card.hasPost ? 'Save changes' : 'Publish'}
        </button>
      </div>
    </>
  )
}
