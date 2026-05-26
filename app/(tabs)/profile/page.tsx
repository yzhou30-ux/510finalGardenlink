import Link from 'next/link'
import { IconPhoto, IconSettings, IconChevronRight } from '@tabler/icons-react'
import { SignOutButton } from '@/components/SignOutButton'
import { MessageCard } from '@/components/MessageCard'
import { getServerUser, getServerDisplayName } from '@/lib/auth'
import {
  getPotsForUser,
  getRecordsCountForUser,
  getPostsCountForUser,
  getUnreadCount,
  getProfileByUserId,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user   = await getServerUser()
  const userId = user?.id ?? null

  // Profile data
  const [pots, recordCount, postsCount, unreadCount, profile] = await Promise.all([
    getPotsForUser(userId).catch(() => []),
    getRecordsCountForUser(userId).catch(() => 0),
    getPostsCountForUser(userId).catch(() => 0),
    userId ? getUnreadCount(userId).catch(() => 0) : getUnreadCount('Guest').catch(() => 0),
    userId ? getProfileByUserId(userId).catch(() => null) : Promise.resolve(null),
  ])

  // Fallback chain for display name:
  //   1. user_metadata.display_name — set directly at signup, always accurate
  //   2. profiles table — may have default 'Plant Lover' if trigger ran before metadata
  //   3. email prefix
  //   4. hard default
  const metaName    = (user?.user_metadata?.display_name as string | undefined)?.trim() || undefined
  const displayName = user
    ? (metaName ?? profile?.display_name ?? user.email?.split('@')[0] ?? 'Plant Lover')
    : 'Garden Guest'

  // Same chain for avatar: prefer profile table (can be updated) → signup metadata → default
  const avatarEmoji = profile?.avatar_emoji
    ?? (user?.user_metadata?.avatar_emoji as string | undefined)
    ?? '🪴'

  const stats = [
    { value: pots.length,    label: 'Pots'    },
    { value: recordCount,    label: 'Records' },  // all daily uploads
    { value: postsCount,     label: 'Posts'   },  // published (has_post=true)
  ]

  const menuItems = [
    { icon: <IconPhoto size={20} strokeWidth={1.7} />, label: 'My Posts', href: '/posts' },
    { icon: <IconSettings size={20} strokeWidth={1.7} />, label: 'Settings', href: '/settings' },
  ]

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', fontFamily: 'var(--font-sans)' }}>
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--sage-900)', margin: 0, lineHeight: 1.2 }}>
          Profile
        </h1>
        {user && <SignOutButton />}
      </div>

      {/* Avatar + Name + Bio */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--glass-sage-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34, flexShrink: 0,
        }}>
          {avatarEmoji}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--sage-900)', lineHeight: 1.2 }}>
          {displayName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--sage-300)', lineHeight: 1.4 }}>
          {user ? user.email : 'Sign in to save your garden'}
        </div>
        {!user && (
          <Link href="/auth/login" style={{
            marginTop: 4, padding: '7px 16px', borderRadius: 10,
            background: 'var(--glass-sage-medium)',
            color: 'var(--sage-700)', fontSize: 12, fontWeight: 500,
            textDecoration: 'none',
          }}>
            Sign in →
          </Link>
        )}
      </div>

      {/* MessageCard */}
      <div style={{ marginBottom: 16 }}>
        <MessageCard
          unreadCount={unreadCount}
          preview={unreadCount > 0
            ? `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
            : 'No new messages'}
        />
      </div>

      {/* Stats row */}
      <div style={{
        background: 'var(--bg-card)', border: '0.5px solid var(--border-default)',
        borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'row',
        alignItems: 'center', marginBottom: 16,
      }}>
        {stats.map((stat, index) => (
          <div key={stat.label} style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
            {index > 0 && (
              <div style={{ width: 1, height: 32, background: 'var(--border-default)', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--sage-900)', lineHeight: 1.2 }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 10, color: 'var(--sage-300)', lineHeight: 1.3 }}>
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Menu list */}
      <div style={{
        background: 'var(--bg-card)', border: '0.5px solid var(--border-default)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {menuItems.map((item, index) => (
          <div key={item.label}>
            {index > 0 && <div style={{ height: 1, background: 'var(--border-subtle)', marginLeft: 16 }} />}
            <Link href={item.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <div style={{ color: 'var(--sage-500)', flexShrink: 0, display: 'flex' }}>{item.icon}</div>
                <span style={{ flex: 1, fontSize: 14, color: 'var(--sage-700)', fontFamily: 'var(--font-sans)', lineHeight: 1.3 }}>
                  {item.label}
                </span>
                <IconChevronRight size={16} color="var(--sage-400)" strokeWidth={1.7} />
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
