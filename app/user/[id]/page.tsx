// app/user/[id]/page.tsx — Another user's public profile page.
// Accessed by tapping an author avatar on a community post.
//
// [id] routing:
//   • Short alphanumeric IDs (length < 20) → community tile data (demo)
//   • Full UUID (36 chars)                 → real user from DB
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { IconArrowLeft, IconMessageCircle, IconUserPlus, IconCalendar, IconHeart, IconMessageCircle as IconComment } from '@tabler/icons-react'
import { COMMUNITY_TILE_MAP } from '@/lib/communityDemoData'
import { getProfileByUserId, getPotsByUserId, getPublicPostsByUserId } from '@/lib/queries'
import type { Profile, Pot, DailyRecord } from '@/lib/types'

// ── Helper ────────────────────────────────────────────────────────────────────
function potEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('rose'))      return '🌹'
  if (n.includes('basil'))     return '🌿'
  if (n.includes('succulent')) return '🌵'
  if (n.includes('jasmine'))   return '🌸'
  if (n.includes('mint'))      return '🌱'
  if (n.includes('sunflower')) return '🌻'
  if (n.includes('lavender'))  return '💜'
  if (n.includes('tomato'))    return '🍅'
  return '🪴'
}

// ── Community demo profile ────────────────────────────────────────────────────
function CommunityUserPage({ id }: { id: string }) {
  const tile = COMMUNITY_TILE_MAP[id]
  if (!tile) return notFound()

  const DEMO_POTS = ['🌹', '🌻', '🪴', '🌸', '🌵'].map((em, i) => ({
    id: `${id}-pot-${i}`, emoji: em, name: ['Rose', 'Sunflower', 'Succulent', 'Jasmine', 'Cactus'][i],
    day: [256, 45, 180, 320, 90][i],
  }))

  const DEMO_POSTS = tile.latestPost ? [{
    id: `${id}-post-0`,
    date: 'May 24',
    plant: tile.userName + "'s garden",
    text: tile.latestPost.text,
    likes: Math.floor(Math.random() * 50) + 10,
    comments: Math.floor(Math.random() * 10) + 1,
    multi: false,
  }] : []

  return (
    <div style={{
      maxWidth: 420, margin: '0 auto', background: 'var(--bg-base)',
      minHeight: '100vh', fontFamily: 'var(--font-sans)',
    }}>
      {/* Top */}
      <div style={{ padding: '16px 20px 0', position: 'relative' }}>
        <Link href="/garden" style={{
          position: 'absolute', top: 16, left: 16,
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(253,251,247,0.85)',
          border: '0.5px solid rgba(200,209,198,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--sage-700)', textDecoration: 'none',
        }}>
          <IconArrowLeft size={16} strokeWidth={1.75} />
        </Link>

        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 14px' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(253,251,247,0.9)',
            border: '2px solid rgba(200,209,198,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 38, marginBottom: 10,
          }}>
            {tile.emoji}
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--sage-900)' }}>{tile.userName}</div>
          <div style={{ fontSize: 12, color: 'var(--sage-400)', marginTop: 3, textAlign: 'center', lineHeight: 1.4 }}>
            {tile.tags.map(t => t.label).join(' · ')}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', justifyContent: 'center' }}>
        <button style={btnStyle('primary')}>
          <IconUserPlus size={13} strokeWidth={1.75} style={{ marginRight: 4 }} />
          Follow
        </button>
        <button style={btnStyle('secondary')}>
          <IconMessageCircle size={13} strokeWidth={1.75} style={{ marginRight: 4 }} />
          Message
        </button>
      </div>

      {/* Pots strip */}
      <div style={{ padding: '0 20px 8px' }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--sage-900)', marginBottom: 10 }}>
          🌱 Their pots
        </p>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
          {DEMO_POTS.map(p => (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(253,251,247,0.85)',
                border: '0.5px solid rgba(200,209,198,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>{p.emoji}</div>
              <span style={{ fontSize: 9, color: 'var(--sage-700)', marginTop: 4, maxWidth: 56, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <span style={{ fontSize: 8, color: 'var(--sage-400)' }}>Day {p.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(74,93,73,0.08)', margin: '0 20px' }} />

      {/* Feed */}
      <div>
        <p style={{ padding: '12px 20px 10px', fontSize: 13, fontWeight: 500, color: 'var(--sage-900)', borderBottom: '0.5px solid rgba(74,93,73,0.08)', margin: 0 }}>
          📸 Posts
        </p>
        {DEMO_POSTS.map(post => (
          <div key={post.id} style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(74,93,73,0.06)' }}>
            <div style={{ fontSize: 11, color: 'var(--sage-400)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconCalendar size={13} /> {post.date} · {post.plant}
            </div>
            <div style={{
              width: '100%', aspectRatio: '4/3',
              borderRadius: 10, background: 'var(--glass-sage-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, marginBottom: 10, color: 'var(--sage-400)',
            }}>
              {tile.emoji}
            </div>
            <p style={{ fontSize: 13, color: 'var(--sage-700)', lineHeight: 1.5, marginBottom: 8 }}>{post.text}</p>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--sage-400)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                <IconHeart size={14} /> {post.likes}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                <IconComment size={14} /> {post.comments}
              </span>
            </div>
          </div>
        ))}
        {DEMO_POSTS.length === 0 && (
          <p style={{ padding: '24px 20px', fontSize: 12, color: 'var(--sage-300)', textAlign: 'center' }}>
            No posts yet
          </p>
        )}
      </div>
    </div>
  )
}

// ── Button styles (shared) ───────────────────────────────────────────────────
function btnStyle(variant: 'primary' | 'secondary'): React.CSSProperties {
  const base: React.CSSProperties = {
    flex: 1, maxWidth: 140, padding: '8px 0', textAlign: 'center',
    borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.2s', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: 'var(--font-sans)',
  }
  return variant === 'primary'
    ? { ...base, background: 'rgba(74,93,73,0.12)', color: 'var(--sage-900)', border: '0.5px solid rgba(74,93,73,0.2)' }
    : { ...base, background: 'transparent', color: 'var(--sage-700)', border: '0.5px solid rgba(74,93,73,0.12)' }
}

// ── Real user profile ────────────────────────────────────────────────────────
function RealUserPage({
  profile, pots, posts,
}: {
  profile: Profile
  pots: Pot[]
  posts: DailyRecord[]
}) {
  return (
    <div style={{
      maxWidth: 420, margin: '0 auto', background: 'var(--bg-base)',
      minHeight: '100vh', fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ padding: '16px 20px 0', position: 'relative' }}>
        <Link href="/garden" style={{
          position: 'absolute', top: 16, left: 16,
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(253,251,247,0.85)',
          border: '0.5px solid rgba(200,209,198,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--sage-700)', textDecoration: 'none',
        }}>
          <IconArrowLeft size={16} strokeWidth={1.75} />
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 14px' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(253,251,247,0.9)',
            border: '2px solid rgba(200,209,198,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 38, marginBottom: 10,
          }}>
            {profile.avatar_emoji}
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--sage-900)' }}>{profile.display_name}</div>
          {profile.bio && (
            <div style={{ fontSize: 12, color: 'var(--sage-400)', marginTop: 3, textAlign: 'center', lineHeight: 1.4, maxWidth: 260 }}>
              {profile.bio}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', justifyContent: 'center' }}>
        <button style={btnStyle('primary')}>
          <IconUserPlus size={13} strokeWidth={1.75} style={{ marginRight: 4 }} />
          Follow
        </button>
        <button style={btnStyle('secondary')}>
          <IconMessageCircle size={13} strokeWidth={1.75} style={{ marginRight: 4 }} />
          Message
        </button>
      </div>

      {/* Pots strip */}
      {pots.length > 0 && (
        <div style={{ padding: '0 20px 8px' }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--sage-900)', marginBottom: 10 }}>🌱 Their pots</p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
            {pots.map(pot => (
              <div key={pot.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(253,251,247,0.85)',
                  border: '0.5px solid rgba(200,209,198,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>{potEmoji(pot.name)}</div>
                <span style={{ fontSize: 9, color: 'var(--sage-700)', marginTop: 4, maxWidth: 56, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pot.name}</span>
                <span style={{ fontSize: 8, color: 'var(--sage-400)' }}>Day {pot.days_owned}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 1, background: 'rgba(74,93,73,0.08)', margin: '0 20px' }} />

      {/* Feed */}
      <div>
        <p style={{ padding: '12px 20px 10px', fontSize: 13, fontWeight: 500, color: 'var(--sage-900)', borderBottom: '0.5px solid rgba(74,93,73,0.08)', margin: 0 }}>
          📸 Posts
        </p>
        {posts.map(post => (
          <Link key={post.id} href={`/post/${post.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(74,93,73,0.06)' }}>
              <div style={{ fontSize: 11, color: 'var(--sage-400)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconCalendar size={13} /> {format(new Date(post.record_date), 'MMM d')}
              </div>
              {post.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.image_url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, marginBottom: 10, display: 'block' }} />
              )}
              {post.caption && (
                <p style={{ fontSize: 13, color: 'var(--sage-700)', lineHeight: 1.5, marginBottom: 8 }}>{post.caption}</p>
              )}
              {post.tags && post.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {post.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: 'var(--glass-sage-light)', color: 'var(--sage-500)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
        {posts.length === 0 && (
          <p style={{ padding: '24px 20px', fontSize: 12, color: 'var(--sage-300)', textAlign: 'center' }}>
            No posts yet
          </p>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export const dynamic = 'force-dynamic'

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const { id } = params

  // Short/non-UUID IDs → community demo user
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  if (!isUUID) {
    return <CommunityUserPage id={id} />
  }

  // Real user → fetch from DB
  const [profile, pots, posts] = await Promise.all([
    getProfileByUserId(id),
    getPotsByUserId(id),
    getPublicPostsByUserId(id),
  ])

  if (!profile) return notFound()
  return <RealUserPage profile={profile} pots={pots} posts={posts} />
}
