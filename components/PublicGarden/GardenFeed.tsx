import Link from 'next/link'
import type { GardenTile } from './types'

interface GardenFeedProps {
  tiles: GardenTile[]
}

export function GardenFeed({ tiles }: GardenFeedProps) {
  const tilesWithPosts = tiles.filter(t => t.latestPost)

  return (
    <div style={{
      overflowY: 'auto',
      padding: '0 16px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {tilesWithPosts.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--sage-300)', fontSize: 13, padding: '40px 0' }}>
          No activity yet
        </p>
      )}
      {tilesWithPosts.map(tile => {
        const post = tile.latestPost!  // safe: tilesWithPosts filters to tiles with latestPost
        return (
          <Link
            key={tile.id}
            href={tile.href ?? `/post/community/${tile.id}`}
            style={{
              display: 'flex',
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border-default)',
              borderRadius: 14, padding: '12px 14px',
              gap: 12, alignItems: 'flex-start',
              textDecoration: 'none',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: 'var(--glass-sage-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              {tile.emoji ?? '🌱'}
            </div>
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 500, color: 'var(--sage-900)', marginBottom: 4,
              }}>
                {tile.userName}
              </div>
              <p style={{
                fontSize: 12, color: 'var(--sage-700)', margin: '0 0 6px',
                lineHeight: 1.5,
              }}>
                {post.text}
              </p>
              <span style={{ fontSize: 10, color: 'var(--sage-300)' }}>
                {post.timeAgo}
              </span>
            </div>
            {/* Post image thumbnail */}
            {post.imageUrl && (
              <div style={{
                width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                background: 'var(--glass-sage-light)',  // fallback (must come before backgroundImage)
                backgroundImage: `url(${post.imageUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
            )}
          </Link>
        )
      })}
    </div>
  )
}
