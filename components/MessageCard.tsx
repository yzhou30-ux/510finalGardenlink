import Link from 'next/link'
import { IconMessageCircle, IconChevronRight } from '@tabler/icons-react'

interface MessageCardProps {
  unreadCount: number
  preview: string
}

export function MessageCard({ unreadCount, preview }: MessageCardProps) {
  return (
    <Link
      href="/messages"
      aria-label={unreadCount > 0 ? `Messages — ${unreadCount} unread` : 'Messages'}
      style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '0.5px solid var(--border-default)',
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Left icon area with optional unread badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(91,143,185,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconMessageCircle
              size={22}
              color="var(--info)"
              strokeWidth={1.7}
            />
          </div>
          {unreadCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-sans)',
                  lineHeight: 1,
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </div>
          )}
        </div>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--sage-900)',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.3,
              marginBottom: 3,
            }}
          >
            Messages
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--sage-300)',
              fontFamily: 'var(--font-sans)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {preview}
          </div>
        </div>

        {/* Right chevron */}
        <div style={{ flexShrink: 0 }}>
          <IconChevronRight size={16} color="var(--sage-400)" strokeWidth={1.7} />
        </div>
      </div>
    </Link>
  )
}
