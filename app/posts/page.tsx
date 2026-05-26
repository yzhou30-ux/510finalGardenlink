// app/posts/page.tsx — My Posts list (server component)
// Queries by user_id so auth users see their own posts.
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { IconArrowLeft, IconChevronRight } from '@tabler/icons-react'
import { getServerUser } from '@/lib/auth'
import { getMyPostsWithPotName } from '@/lib/queries'
import type { PostCategory } from '@/lib/types'

// ── Category badge ────────────────────────────────────────────────────────────

const CATEGORY_META: Record<PostCategory, { emoji: string; label: string; color: string }> = {
  bloom:   { emoji: '🌸', label: 'Bloom',   color: 'rgba(225,130,180,0.15)' },
  harvest: { emoji: '🍅', label: 'Harvest', color: 'rgba(196,147,90,0.15)'  },
  growth:  { emoji: '🌱', label: 'Growth',  color: 'rgba(107,158,107,0.15)' },
  help:    { emoji: '🆘', label: 'Help',    color: 'rgba(91,143,185,0.15)'  },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── All categories (for the filter strip) ────────────────────────────────────
const ALL_CATEGORIES = Object.entries(CATEGORY_META) as [PostCategory, typeof CATEGORY_META[PostCategory]][]

export default async function PostsPage({
  searchParams,
}: {
  searchParams?: { category?: string }
}) {
  const user   = await getServerUser()
  const userId = user?.id ?? null

  const activeCategory = (searchParams?.category ?? '') as PostCategory | ''

  // ── Fetch — only the logged-in user's published posts, by user_id ─────────
  const allPosts = userId
    ? await getMyPostsWithPotName(userId).catch(() => [])
    : []

  // ── Server-side category filter ───────────────────────────────────────────
  const posts = activeCategory
    ? allPosts.filter(p => p.post_category === activeCategory)
    : allPosts

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      minHeight: '100vh',
      fontFamily: 'var(--font-sans)',
      background: 'var(--bg-base)',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '0.5px solid var(--border-default)',
        background: 'var(--bg-base)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '16px 16px 12px',
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
            My Posts
          </h1>
          <span style={{ fontSize: 10, color: 'var(--sage-300)' }}>
            {posts.length}{activeCategory ? ` / ${allPosts.length}` : ''} {allPosts.length === 1 ? 'post' : 'posts'}
          </span>
        </div>

        {/* ── Category filter chips ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          padding: '0 16px 12px',
        }}>
          {/* "All" chip */}
          <Link
            href="/posts"
            style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 11, padding: '4px 12px', borderRadius: 14,
              background: !activeCategory ? 'var(--glass-sage-strong)' : 'var(--glass-sage-light)',
              color: !activeCategory ? 'var(--sage-900)' : 'var(--sage-400)',
              border: !activeCategory ? '0.5px solid var(--glass-sage-border)' : '0.5px solid transparent',
              fontWeight: !activeCategory ? 500 : 400,
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            All
          </Link>

          {/* Per-category chips */}
          {ALL_CATEGORIES.map(([key, meta]) => {
            const isActive = activeCategory === key
            return (
              <Link
                key={key}
                href={isActive ? '/posts' : `/posts?category=${key}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, padding: '4px 12px', borderRadius: 14,
                  background: isActive ? meta.color : 'var(--glass-sage-light)',
                  color: isActive ? 'var(--sage-700)' : 'var(--sage-400)',
                  border: isActive ? '0.5px solid var(--glass-sage-border)' : '0.5px solid transparent',
                  fontWeight: isActive ? 500 : 400,
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
              >
                <span>{meta.emoji}</span>
                {meta.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Post list */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Not signed in */}
        {!userId && (
          <div style={{
            padding: '48px 16px',
            textAlign: 'center',
            color: 'var(--sage-300)',
            fontSize: 13,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🪴</div>
            <p style={{ margin: '0 0 14px', lineHeight: 1.6 }}>
              Sign in to see your published posts.
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

        {/* Signed in but no posts (all / filtered) */}
        {userId && posts.length === 0 && (
          <div style={{
            padding: '48px 16px',
            textAlign: 'center',
            color: 'var(--sage-300)',
            fontSize: 13,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              {activeCategory ? CATEGORY_META[activeCategory].emoji : '📷'}
            </div>
            {activeCategory
              ? <>No <strong>{CATEGORY_META[activeCategory].label}</strong> posts yet</>
              : <>No posts yet — tap <strong>Post</strong> on a daily card to share a moment</>
            }
          </div>
        )}

        {/* Post cards */}
        {posts.map((post) => {
          const category = post.post_category
          const catMeta = category ? CATEGORY_META[category] : null

          return (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              style={{
                display: 'block',
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border-default)',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card-focus)',
                textDecoration: 'none',
              }}
            >
              {/* Cover image */}
              {post.image_url && (
                <div
                  style={{
                    height: 160,
                    background: 'var(--glass-sage-light)',
                    backgroundImage: `url(${post.image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  aria-hidden
                />
              )}

              {/* Content */}
              <div style={{ padding: '12px 14px' }}>
                {/* Pot + category badge + date */}
                <div style={{
                  display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                  justifyContent: 'space-between', gap: 6, marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 10, padding: '3px 10px', borderRadius: 12,
                      background: 'var(--glass-sage-light)',
                      color: 'var(--sage-500)', fontFamily: 'var(--font-sans)',
                    }}>
                      {post.pot_icon} {post.pot_name}
                    </span>
                    {catMeta && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 10, padding: '3px 10px', borderRadius: 12,
                        background: catMeta.color,
                        color: 'var(--sage-700)', fontFamily: 'var(--font-sans)',
                      }}>
                        {catMeta.emoji} {catMeta.label}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--sage-300)', flexShrink: 0 }}>
                    {formatDate(post.record_date)}
                  </span>
                </div>

                {/* Caption */}
                {post.caption && (
                  <p style={{
                    fontSize: 13,
                    color: 'var(--sage-700)',
                    margin: '0 0 8px',
                    lineHeight: 1.55,
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {post.caption}
                  </p>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 10,
                          background: 'var(--glass-sage-light)',
                          color: 'var(--sage-500)', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Chevron hint */}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end',
                  marginTop: 6, color: 'var(--sage-300)',
                }}>
                  <IconChevronRight size={14} strokeWidth={1.6} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
