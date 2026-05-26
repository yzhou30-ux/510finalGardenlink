// app/messages/page.tsx — Messages list (server component)
// Shows the inbox of the currently authenticated user.
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { IconArrowLeft, IconCheck, IconMessageCircle } from '@tabler/icons-react'
import { getServerUser } from '@/lib/auth'
import { getMessages } from '@/lib/queries'
import type { Message } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Deterministic emoji from a sender name string. */
function senderEmoji(name: string): string {
  const known: Record<string, string> = {
    Flora: '🌹', GreenThumb: '🌿', SuccyCat: '🌵',
    JasmineG: '🌸', CactusKing: '🎋', FernLover: '🌿',
    GardenPro: '🌼', Sunny: '🌻', 'Spring Fair': '🎉',
  }
  return known[name] ?? '🌱'
}

// ── Message row ───────────────────────────────────────────────────────────────

function MessageRow({ msg }: { msg: Message }) {
  return (
    <Link
      href={`/messages/${msg.id}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        background: msg.is_read ? 'transparent' : 'rgba(91,143,185,0.04)',
        borderBottom: '0.5px solid var(--border-subtle)',
        textDecoration: 'none',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: '50%',
        background: 'var(--glass-sage-medium)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 18,
      }}>
        {senderEmoji(msg.sender_name)}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', gap: 8, marginBottom: 3,
        }}>
          <span style={{
            fontSize: 13, fontWeight: msg.is_read ? 400 : 600,
            color: 'var(--sage-900)', fontFamily: 'var(--font-sans)',
          }}>
            {msg.sender_name}
          </span>
          <span style={{ fontSize: 10, color: 'var(--sage-300)', flexShrink: 0 }}>
            {formatTime(msg.created_at)}
          </span>
        </div>
        <p style={{
          fontSize: 12,
          color: msg.is_read ? 'var(--sage-300)' : 'var(--sage-700)',
          margin: 0, lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          fontFamily: 'var(--font-sans)',
        }}>
          {msg.body}
        </p>
      </div>

      {/* Unread dot */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 2,
      }}>
        {!msg.is_read && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--info)',
          }} aria-label="Unread" />
        )}
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MessagesPage() {
  const user = await getServerUser()

  // Determine the current user's name used in the messages table.
  // Authenticated users: email prefix (e.g. "wendyz" from "wendyz@gmail.com")
  // Guest/demo: 'Guest'
  const userName = user?.email?.split('@')[0] ?? 'Guest'

  const messages = await getMessages(userName).catch(() => [] as Message[])
  const unreadCount = messages.filter(m => !m.is_read).length

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      minHeight: '100vh',
      fontFamily: 'var(--font-sans)',
      background: 'var(--bg-base)',
    }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '16px 16px 12px',
        borderBottom: '0.5px solid var(--border-default)',
        background: 'var(--bg-base)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link
          href="/profile"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--glass-sage-light)',
            border: '0.5px solid var(--border-default)',
            color: 'var(--sage-700)', textDecoration: 'none', flexShrink: 0,
          }}
          aria-label="Back"
        >
          <IconArrowLeft size={16} strokeWidth={1.7} />
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--sage-900)', margin: 0, flex: 1 }}>
          Messages
        </h1>
        {unreadCount > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: 'var(--info)', fontFamily: 'var(--font-sans)',
          }}>
            {unreadCount} unread
          </span>
        )}
      </div>

      {/* ── Not signed in ─────────────────────────────────────────────── */}
      {!user && (
        <div style={{
          padding: '60px 16px', textAlign: 'center',
          color: 'var(--sage-300)', fontSize: 13,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>
            <IconMessageCircle size={40} strokeWidth={1.25} color="var(--sage-300)" />
          </div>
          <p style={{ margin: '0 0 14px', lineHeight: 1.6 }}>
            Sign in to see your messages.
          </p>
          <Link href="/auth/login" style={{
            display: 'inline-block', padding: '8px 20px', borderRadius: 10,
            background: 'var(--glass-sage-medium)',
            color: 'var(--sage-700)', fontSize: 12, fontWeight: 500,
            textDecoration: 'none',
          }}>
            Sign in →
          </Link>
        </div>
      )}

      {/* ── Message list ──────────────────────────────────────────────── */}
      {user && (
        <>
          <div style={{
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 14,
            margin: '16px',
            overflow: 'hidden',
          }}>
            {messages.length === 0 ? (
              <div style={{
                padding: '48px 16px',
                textAlign: 'center',
                color: 'var(--sage-300)',
                fontSize: 13,
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                No messages yet
              </div>
            ) : (
              messages.map((msg) => <MessageRow key={msg.id} msg={msg} />)
            )}
          </div>

          {messages.length > 0 && unreadCount === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '0 16px 16px',
              fontSize: 11, color: 'var(--sage-300)',
            }}>
              <IconCheck size={12} strokeWidth={2} />
              All caught up
            </div>
          )}
        </>
      )}
    </div>
  )
}
