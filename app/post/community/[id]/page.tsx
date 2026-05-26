// app/post/community/[id]/page.tsx — Community post detail (demo data, no DB)
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { IconArrowLeft, IconHeart, IconMessageCircle, IconMapPin } from '@tabler/icons-react'
import { COMMUNITY_TILE_MAP, COMMUNITY_DEMO_COMMENTS } from '@/lib/communityDemoData'
import { CommunityCommentInput } from './CommunityCommentInput'

interface PageProps {
  params: { id: string }
}

// Tag colour mapping matches GardenClientPage
const TAG_COLOURS: Record<string, { bg: string; text: string }> = {
  social: { bg: 'rgba(91,143,185,0.12)',  text: 'var(--info)' },
  geo:    { bg: 'rgba(107,158,107,0.15)', text: 'var(--success)' },
  plant:  { bg: 'var(--glass-sage-light)', text: 'var(--sage-500)' },
}

export default function CommunityPostDetailPage({ params }: PageProps) {
  const tile = COMMUNITY_TILE_MAP[params.id]
  if (!tile || !tile.latestPost) notFound()

  const post     = tile.latestPost
  const comments = COMMUNITY_DEMO_COMMENTS[params.id] ?? []

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--bg-base)',
      fontFamily: 'var(--font-sans)',
      paddingBottom: 100,
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
          href="/garden"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--glass-sage-light)',
            border: '0.5px solid var(--border-default)',
            color: 'var(--sage-700)', textDecoration: 'none', flexShrink: 0,
          }}
          aria-label="Back to Community Garden"
        >
          <IconArrowLeft size={16} strokeWidth={1.7} />
        </Link>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--sage-900)', flex: 1 }}>
          Community Post
        </span>
      </div>

      {/* ── Post image placeholder / emoji cover ───────────────────────────── */}
      <div style={{
        width: '100%',
        height: 200,
        background: 'var(--glass-sage-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 72,
        userSelect: 'none',
      }}>
        {tile.emoji}
      </div>

      {/* ── Author card (overlaps cover) ───────────────────────────────────── */}
      <div style={{
        margin: '0 16px',
        marginTop: -20,
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 14,
        padding: '16px',
        boxShadow: 'var(--shadow-card-focus)',
      }}>
        {/* Author row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--glass-sage-medium)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>
            {tile.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sage-900)', marginBottom: 4 }}>
              {tile.userName}
            </div>
            {/* Relation tags */}
            {tile.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {tile.tags.map((tag) => {
                  const colours = TAG_COLOURS[tag.type] ?? TAG_COLOURS.plant
                  return (
                    <span key={tag.label} style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 10,
                      background: colours.bg, color: colours.text,
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      {tag.type === 'geo' && <IconMapPin size={9} strokeWidth={1.8} />}
                      {tag.label}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
          <span style={{ fontSize: 10, color: 'var(--sage-300)', flexShrink: 0 }}>
            {post.timeAgo}
          </span>
        </div>

        {/* Post text */}
        <p style={{
          fontSize: 14,
          color: 'var(--sage-700)',
          lineHeight: 1.65,
          margin: '0 0 14px',
        }}>
          {post.text}
        </p>

        {/* Interaction row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          paddingTop: 12,
          borderTop: '0.5px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--sage-400)' }}>
            <IconHeart size={15} strokeWidth={1.6} />
            <span style={{ fontSize: 12 }}>
              {/* Deterministic demo like count from tile id */}
              {(tile.id.charCodeAt(0) % 18) + 4}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--sage-400)' }}>
            <IconMessageCircle size={15} strokeWidth={1.6} />
            <span style={{ fontSize: 12 }}>{comments.length}</span>
          </div>
        </div>
      </div>

      {/* ── Comments ───────────────────────────────────────────────────────── */}
      <div style={{
        margin: '12px 16px 0',
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 14,
        padding: '16px',
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--sage-900)', margin: '0 0 14px' }}>
          {comments.length === 0 ? 'No comments yet' : `${comments.length} Comment${comments.length === 1 ? '' : 's'}`}
        </h2>

        {comments.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {comments.map((c, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--glass-sage-medium)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {c.emoji}
                </div>
                <div style={{
                  flex: 1, background: 'var(--bg-base)',
                  borderRadius: 10, padding: '8px 12px',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', marginBottom: 4,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage-900)' }}>
                      {c.author}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--sage-300)' }}>{c.timeAgo}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--sage-700)', margin: 0, lineHeight: 1.5 }}>
                    {c.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Reply input — client component for optimistic local replies */}
        <CommunityCommentInput viewerEmoji="🏡" viewerName="Me" />
      </div>
    </div>
  )
}
