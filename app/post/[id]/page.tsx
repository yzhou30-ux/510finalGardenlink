// app/post/[id]/page.tsx — My Post detail (Server Component)
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { IconArrowLeft } from '@tabler/icons-react'
import { getRecordById, getPotById, getCommentsByRecord, getRecordsByPot } from '@/lib/queries'
import { getServerUser } from '@/lib/auth'
import { CommentForm } from '@/components/CommentForm'
import { PostInteractions } from './PostInteractions'
import { PotHistory } from './PotHistory'

interface PageProps {
  params: { id: string }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function formatCommentTime(iso: string): string {
  const d   = new Date(iso)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 1)  return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Shared style helpers ───────────────────────────────────────────────────────

const TAG_STYLE: React.CSSProperties = {
  fontSize: 10, padding: '3px 9px', borderRadius: 12,
  background: 'var(--glass-sage-light)', color: 'var(--sage-500)',
  fontFamily: 'var(--font-sans)',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PostDetailPage({ params }: PageProps) {
  const record = await getRecordById(params.id)
  if (!record) notFound()

  const [pot, comments, user, potRecords] = await Promise.all([
    getPotById(record.pot_id),
    getCommentsByRecord(record.id),
    getServerUser(),
    getRecordsByPot(record.pot_id).catch(() => []),
  ])
  const isAuthenticated = !!user

  const potName = pot?.name ?? 'Unknown pot'

  // Sibling records for the history strip — newest first, current post excluded, max 6
  const historyRecords = potRecords
    .filter(r => r.id !== record.id)
    .slice(0, 6)

  // Show help banner when the post is categorised as 'help'
  const isHelpPost = record.post_category === 'help'

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--bg-base)',
      fontFamily: 'var(--font-sans)',
      paddingBottom: 100,
      overflow: 'hidden',   // prevent image from leaking outside the 480px boundary
    }}>
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px',
        background: 'var(--glass-cream-medium)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '0.5px solid var(--border-default)',
      }}>
        <Link
          href="/posts"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--glass-sage-light)',
            border: '0.5px solid var(--border-default)',
            color: 'var(--sage-700)', textDecoration: 'none', flexShrink: 0,
          }}
          aria-label="Back to My Posts"
        >
          <IconArrowLeft size={16} strokeWidth={1.7} />
        </Link>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--sage-900)', flex: 1 }}>
          Post
        </span>
        <span style={{
          fontSize: 10, padding: '3px 10px', borderRadius: 12,
          background: 'var(--glass-sage-light)', color: 'var(--sage-500)',
        }}>
          🌱 {potName}
        </span>
      </div>

      {/* ── Help banner (only shown for 'help' category posts) ─────────────── */}
      {isHelpPost && (
        <div style={{
          margin: '10px 16px 0',
          padding: '9px 14px',
          background: 'var(--warning-bg)',
          border: '0.5px solid rgba(196,147,90,0.25)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'var(--font-sans)',
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
          <span style={{ fontSize: 12, color: 'var(--warning)', lineHeight: 1.4 }}>
            Asking for help — check the plant&apos;s history below for context
          </span>
        </div>
      )}

      {/* ── Cover photo ────────────────────────────────────────────────────── */}
      {record.image_url && (
        // Wrapper div prevents the img from ever overflowing on tablet/iPad:
        // 'overflow: hidden' clips the image; max-width: 100% ensures it never
        // escapes its parent's maxWidth: 480 boundary.
        <div style={{ overflow: 'hidden', maxHeight: 340, width: '100%', maxWidth: '100%', display: 'block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.image_url}
            alt={record.caption ?? `${potName} on ${record.record_date}`}
            style={{
              width: '100%',
              maxWidth: '100%',
              height: 340,
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* ── Main card ──────────────────────────────────────────────────────── */}
      {/* position: relative + zIndex: 1 ensures the card stacks above the image
          on all viewport widths (the -20px marginTop creates intentional overlap) */}
      <div style={{
        margin: '0 16px',
        marginTop: record.image_url ? -20 : 16,
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 14,
        padding: '16px',
        boxShadow: 'var(--shadow-card-focus)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Pot name + date row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 12,
        }}>
          <span style={TAG_STYLE}>🌱 {potName}</span>
          <span style={{ fontSize: 12, color: 'var(--sage-400)' }}>
            {formatDate(record.record_date)}
          </span>
        </div>

        {/* Caption */}
        {record.caption && (
          <p style={{
            fontSize: 14,
            color: 'var(--sage-700)',
            lineHeight: 1.6,
            margin: '0 0 12px',
          }}>
            {record.caption}
          </p>
        )}

        {/* Tags */}
        {record.tags && record.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
            {record.tags.map((tag) => (
              <span key={tag} style={TAG_STYLE}>{tag}</span>
            ))}
          </div>
        )}

        {/* Interaction row — client component handles auth gate */}
        <PostInteractions
          recordId={record.id}
          likeCount={3 + ((record.id.charCodeAt(0) ?? 0) % 9)}
          commentCount={comments.length}
          isAuthenticated={isAuthenticated}
        />
      </div>

      {/* ── Comments section ───────────────────────────────────────────────── */}
      <div style={{
        margin: '12px 16px 0',
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 14,
        padding: '16px',
        position: 'relative',
        zIndex: 1,
      }}>
        <h2 style={{
          fontSize: 14, fontWeight: 600,
          color: 'var(--sage-900)', margin: '0 0 14px',
        }}>
          {comments.length === 0
            ? 'Be the first to comment'
            : `${comments.length} Comment${comments.length === 1 ? '' : 's'}`}
        </h2>

        {comments.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {comments.map((c) => (
              <li key={c.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--glass-sage-medium)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  🌱
                </div>
                {/* Content */}
                <div style={{
                  flex: 1, background: 'var(--bg-base)',
                  borderRadius: 10, padding: '8px 12px',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', marginBottom: 4,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage-900)' }}>
                      {c.user_name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--sage-300)' }}>
                      {formatCommentTime(c.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--sage-700)', margin: 0, lineHeight: 1.5 }}>
                    {c.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Comment input — passes isAuthenticated so PostInteractions can gate it */}
        <div style={{ marginTop: comments.length > 0 ? 12 : 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--glass-sage-medium)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0, marginTop: 2,
            }}>
              🏡
            </div>
            <div style={{ flex: 1 }}>
              <CommentForm recordId={record.id} isAuthenticated={isAuthenticated} />
            </div>
          </div>
        </div>
      </div>
      {/* ── Pot history strip ──────────────────────────────────────────────── */}
      {/* Renders nothing when historyRecords is empty */}
      <PotHistory
        currentRecord={record}
        historyRecords={historyRecords}
        potName={potName}
      />
    </div>
  )
}
