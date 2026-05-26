'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { IconPlant2, IconCalendar, IconCamera, IconUser } from '@tabler/icons-react'

export function FloatingTabBar({ hasUnread = true }: { hasUnread?: boolean }) {
  const pathname = usePathname()
  const router   = useRouter()

  // Hide on auth pages and the camera page (which has its own back button)
  if (pathname.startsWith('/auth') || pathname === '/camera') return null

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 36,
    borderRadius: 18,
    gap: 2,
    textDecoration: 'none',
    background: active ? 'var(--glass-sage-strong)' : 'transparent',
    color: active ? 'var(--sage-900)' : 'var(--sage-300)',
    transition: 'background 0.15s ease, color 0.15s ease',
    cursor: 'pointer',
    border: 'none',
    padding: 0,
    position: 'relative',
  })

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 500,
    lineHeight: 1,
    fontFamily: 'var(--font-sans)',
  }

  return (
    <nav
        style={{
          position: 'fixed',
          bottom: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--glass-cream-medium)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '0.5px solid rgba(200,209,198,0.5)',
          boxShadow: 'var(--shadow-tab-bar)',
          borderRadius: 22,
          paddingTop: '5px',
          paddingLeft: '8px',
          paddingRight: '8px',
          paddingBottom: 'calc(5px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          zIndex: 1000,
        }}
        aria-label="Main navigation"
      >
        {/* Garden tab */}
        <Link href="/garden" style={tabStyle(isActive('/garden'))} aria-current={isActive('/garden') ? 'page' : undefined}>
          <IconPlant2 size={20} strokeWidth={1.7} />
          <span style={labelStyle}>Garden</span>
        </Link>

        {/* Timeline tab */}
        <Link href="/timeline" style={tabStyle(isActive('/timeline'))} aria-current={isActive('/timeline') ? 'page' : undefined}>
          <IconCalendar size={20} strokeWidth={1.7} />
          <span style={labelStyle}>Timeline</span>
        </Link>

        {/* Camera button (center) — navigates to /camera; middleware redirects to login if needed */}
        <button
          onClick={() => router.push('/camera')}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--glass-sage-subtle)',
            border: '0.5px solid var(--glass-sage-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--sage-700)',
            padding: 0,
            flexShrink: 0,
          }}
          aria-label="Take photo"
        >
          <IconCamera size={18} strokeWidth={1.7} />
        </button>

        {/* Profile tab */}
        <Link
          href="/profile"
          style={tabStyle(isActive('/profile'))}
          aria-current={isActive('/profile') ? 'page' : undefined}
        >
          <IconUser size={20} strokeWidth={1.7} />
          <span style={labelStyle}>Profile</span>
          {/* Unread dot */}
          {hasUnread && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--danger)',
              }}
              aria-label="Unread messages"
              role="status"
            />
          )}
        </Link>
      </nav>
  )
}
