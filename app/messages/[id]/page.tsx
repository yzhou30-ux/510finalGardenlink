// app/messages/[id]/page.tsx — Chat thread (Server Component wrapper)
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { IconArrowLeft } from '@tabler/icons-react'
import { getMessageById, getFullConversation } from '@/lib/queries'
import { getServerUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ChatClient } from './ChatClient'

interface PageProps {
  params: { id: string }
}

// Map sender names to a representative emoji for the chat avatar
const SENDER_EMOJI: Record<string, string> = {
  'Flora':       '🌹',
  'GreenThumb':  '🌿',
  'SuccyCat':    '🌵',
  'JasmineG':    '🌸',
  'CactusKing':  '🎋',
  'FernLover':   '🌿',
  'GardenPro':   '🌼',
  'Sunny':       '🌻',
  'Spring Fair': '🎉',
}

export default async function ChatPage({ params }: PageProps) {
  const message = await getMessageById(params.id)
  if (!message) notFound()

  // Current user identity (email prefix, or 'Guest' if not logged in)
  const user         = await getServerUser()
  const currentUserName = user?.email?.split('@')[0] ?? 'Guest'

  // Mark as read + fetch full two-sided conversation in parallel
  const supabase = createSupabaseServerClient()
  const [, thread] = await Promise.all([
    supabase.from('messages').update({ is_read: true }).eq('id', params.id).then(() => {}),
    getFullConversation(currentUserName, message.sender_name),
  ])

  // Ensure at least the opened message appears
  const messages    = thread.length > 0 ? thread : [message]
  const senderEmoji = SENDER_EMOJI[message.sender_name] ?? '🌱'

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      height: '100vh',
      background: 'var(--bg-base)',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px',
        background: 'var(--glass-cream-medium)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '0.5px solid var(--border-default)',
        zIndex: 20,
      }}>
        <Link
          href="/messages"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--glass-sage-light)',
            border: '0.5px solid var(--border-default)',
            color: 'var(--sage-700)', textDecoration: 'none', flexShrink: 0,
          }}
          aria-label="Back to Messages"
        >
          <IconArrowLeft size={16} strokeWidth={1.7} />
        </Link>

        {/* Sender avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--glass-sage-medium)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          {senderEmoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--sage-900)' }}>
            {message.sender_name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--sage-400)' }}>
            Community member
          </div>
        </div>
      </div>

      {/* ── Chat content ───────────────────────────────────────────────── */}
      <ChatClient
        senderName={message.sender_name}
        senderEmoji={senderEmoji}
        currentUserName={currentUserName}
        initialMessages={messages}
      />
    </div>
  )
}
