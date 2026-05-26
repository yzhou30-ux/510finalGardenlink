// app/messages/[id]/ChatClient.tsx — chat UI (client component)
// Renders the two-sided conversation and persists sent replies to the DB.
'use client'

import { useState, useRef, useEffect } from 'react'
import { IconSend, IconLoader2 } from '@tabler/icons-react'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Message } from '@/lib/types'

interface Props {
  senderName: string
  senderEmoji: string
  currentUserName: string   // email prefix of the logged-in user (or 'Guest')
  initialMessages: Message[]
}

// A locally-created optimistic message (before DB confirmation)
interface OptimisticMessage {
  id: string
  body: string
  createdAt: string
  isMine: boolean
  senderName: string
}

function formatBubbleTime(iso: string): string {
  const d   = new Date(iso)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 1)  return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatClient({
  senderName,
  senderEmoji,
  currentUserName,
  initialMessages,
}: Props) {
  const [reply,    setReply]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [sendErr,  setSendErr]  = useState<string | null>(null)
  // Optimistic messages appended after a successful send
  const [extras,   setExtras]   = useState<OptimisticMessage[]>([])
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [extras, initialMessages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = reply.trim()
    if (!trimmed || sending) return

    setSending(true)
    setSendErr(null)

    // Optimistically append before the DB round-trip
    const optimisticId = `opt-${Date.now()}`
    const now = new Date().toISOString()
    setExtras(prev => [...prev, {
      id: optimisticId, body: trimmed,
      createdAt: now, isMine: true, senderName: currentUserName,
    }])
    setReply('')
    inputRef.current?.focus()

    try {
      // ── Persist to DB ─────────────────────────────────────────────────
      // messages table has open write policy (WITH CHECK (true)) so we don't
      // strictly need a JWT — but we use the established pattern for consistency.
      const sbrClient = createSupabaseBrowserClient()
      const { data: { session } } = await sbrClient.auth.getSession()

      const supabase = session
        ? createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${session.access_token}` } } }
          )
        : sbrClient   // fall back to cookie client for unauthenticated (Guest) sends

      const { error } = await supabase.from('messages').insert({
        // The message goes into senderName's inbox
        user_name:   senderName,
        sender_name: currentUserName,
        body:        trimmed,
        is_read:     false,
      })

      if (error) {
        // Remove the optimistic entry and show the error
        setExtras(prev => prev.filter(m => m.id !== optimisticId))
        setSendErr('Could not send. Please try again.')
      }
    } catch {
      setExtras(prev => prev.filter(m => m.id !== optimisticId))
      setSendErr('Could not send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  // Determine if a DB message belongs to the current user (they sent it)
  function isMine(msg: Message): boolean {
    return msg.sender_name === currentUserName
  }

  const hasAnyMessages = initialMessages.length > 0 || extras.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* ── Messages area ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 16px 0',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {/* Empty state */}
        {!hasAnyMessages && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--sage-300)', fontSize: 13, gap: 8, paddingTop: 60,
          }}>
            <span style={{ fontSize: 36 }}>{senderEmoji}</span>
            Start your conversation with {senderName}
          </div>
        )}

        {/* Messages from DB — sorted by created_at (done server-side) */}
        {initialMessages.map((msg) =>
          isMine(msg) ? (
            <SentBubble
              key={msg.id}
              body={msg.body}
              timeAgo={formatBubbleTime(msg.created_at)}
            />
          ) : (
            <ReceivedBubble
              key={msg.id}
              emoji={senderEmoji}
              name={msg.sender_name}
              body={msg.body}
              timeAgo={formatBubbleTime(msg.created_at)}
            />
          )
        )}

        {/* Optimistic extras added this session */}
        {extras.map((msg) =>
          msg.isMine ? (
            <SentBubble
              key={msg.id}
              body={msg.body}
              timeAgo={formatBubbleTime(msg.createdAt)}
            />
          ) : (
            <ReceivedBubble
              key={msg.id}
              emoji={senderEmoji}
              name={msg.senderName}
              body={msg.body}
              timeAgo={formatBubbleTime(msg.createdAt)}
            />
          )
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} style={{ height: 120 }} />
      </div>

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0,
        bottom: 76,
        maxWidth: 480,
        margin: '0 auto',
        padding: '8px 16px 10px',
        background: 'var(--glass-cream-medium)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '0.5px solid var(--border-default)',
      }}>
        {sendErr && (
          <p style={{
            fontSize: 11, color: 'var(--danger)', margin: '0 0 6px',
            background: 'rgba(226,75,74,0.07)', borderRadius: 8, padding: '5px 10px',
          }}>
            {sendErr}
          </p>
        )}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${senderName}…`}
            rows={1}
            style={{
              flex: 1,
              background: 'var(--bg-base)',
              border: '0.5px solid var(--border-default)',
              borderRadius: 20,
              padding: '9px 14px',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--sage-700)',
              fontFamily: 'var(--font-sans)',
              resize: 'none',
              outline: 'none',
              maxHeight: 96,
              overflowY: 'auto',
            }}
          />
          <button
            type="submit"
            disabled={!reply.trim() || sending}
            aria-label="Send message"
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: reply.trim() && !sending ? 'var(--success)' : 'var(--glass-sage-medium)',
              border: 'none',
              cursor: reply.trim() && !sending ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              marginBottom: 1,
            }}
          >
            {sending
              ? <IconLoader2 size={16} color="var(--sage-400)" style={{ animation: 'spin 0.8s linear infinite' }} />
              : <IconSend size={16} color={reply.trim() ? '#fff' : 'var(--sage-400)'} strokeWidth={1.8} />
            }
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Bubble components ─────────────────────────────────────────────────────────

function ReceivedBubble({
  emoji, name, body, timeAgo,
}: { emoji: string; name: string; body: string; timeAgo: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '82%' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'var(--glass-sage-medium)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15,
      }}>
        {emoji}
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'var(--sage-400)', marginBottom: 3, paddingLeft: 4 }}>
          {name}
        </div>
        <div style={{
          background: 'var(--bg-card)',
          border: '0.5px solid var(--border-default)',
          borderRadius: '16px 16px 16px 4px',
          padding: '10px 13px',
          boxShadow: '0 1px 3px rgba(61,79,60,0.06)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--sage-700)', margin: 0, lineHeight: 1.55 }}>
            {body}
          </p>
        </div>
        <div style={{ fontSize: 10, color: 'var(--sage-300)', marginTop: 3, paddingLeft: 4 }}>
          {timeAgo}
        </div>
      </div>
    </div>
  )
}

function SentBubble({ body, timeAgo }: { body: string; timeAgo: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: '82%', marginLeft: 'auto' }}>
      <div>
        <div style={{
          background: 'rgba(107,158,107,0.18)',
          border: '0.5px solid rgba(107,158,107,0.3)',
          borderRadius: '16px 16px 4px 16px',
          padding: '10px 13px',
        }}>
          <p style={{ fontSize: 13, color: 'var(--sage-900)', margin: 0, lineHeight: 1.55 }}>
            {body}
          </p>
        </div>
        <div style={{
          fontSize: 10, color: 'var(--sage-300)',
          marginTop: 3, textAlign: 'right', paddingRight: 4,
        }}>
          {timeAgo}
        </div>
      </div>
    </div>
  )
}
