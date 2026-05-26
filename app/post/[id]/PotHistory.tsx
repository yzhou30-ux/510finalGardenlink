// app/post/[id]/PotHistory.tsx
// Horizontal thumbnail strip showing recent records from the same pot.
// Read-only, no auth required — guests can see it too.
'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { IconClockHour4 } from '@tabler/icons-react'
import type { DailyRecord } from '@/lib/types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface PotHistoryProps {
  currentRecord: DailyRecord   // the post currently being viewed
  historyRecords: DailyRecord[] // sibling records, newest first, current excluded
  potName: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function thumbDate(dateStr: string): string {
  // "2026-05-20" → "May 20"  (noon local time prevents TZ off-by-one)
  return format(new Date(dateStr + 'T12:00:00'), 'MMM d')
}

// ── Main component ────────────────────────────────────────────────────────────

export function PotHistory({ currentRecord, historyRecords, potName }: PotHistoryProps) {
  const router = useRouter()

  // Don't render the section at all when there's nothing to show
  if (historyRecords.length === 0) return null

  return (
    <>
      {/* Inline style to hide webkit scrollbar — can't be done with inline styles alone */}
      <style>{`.ph-scroll::-webkit-scrollbar{display:none}`}</style>

      <div style={{
        margin: '12px 16px 0',
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 14,
        padding: '14px 16px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 500, color: 'var(--sage-700)',
            fontFamily: 'var(--font-sans)',
          }}>
            <IconClockHour4 size={14} strokeWidth={1.75} />
            More from {potName}
          </span>
          <span style={{
            fontSize: 10, color: 'var(--sage-400)',
            fontFamily: 'var(--font-sans)',
          }}>
            Tap to view
          </span>
        </div>

        {/* Horizontal scroll strip */}
        <div
          className="ph-scroll"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 2,
            // Firefox scrollbar hide
            scrollbarWidth: 'none',
            // Smooth momentum scroll on iOS
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}
        >
          {/* Current record — highlighted, "you are here", not clickable */}
          <HistoryThumb record={currentRecord} isCurrent />

          {/* Sibling records */}
          {historyRecords.map((r) => (
            <HistoryThumb
              key={r.id}
              record={r}
              onClick={r.has_post ? () => router.push(`/post/${r.id}`) : undefined}
            />
          ))}
        </div>
      </div>
    </>
  )
}

// ── Thumbnail sub-component ───────────────────────────────────────────────────

interface ThumbProps {
  record: DailyRecord
  isCurrent?: boolean
  onClick?: () => void
}

function HistoryThumb({ record, isCurrent = false, onClick }: ThumbProps) {
  const isClickable = !isCurrent && record.has_post && !!onClick
  const dateLabel   = thumbDate(record.record_date) + (isCurrent ? ' · now' : '')

  // Visual state logic:
  //   current   → thicker border, "now" suffix, green dot, not clickable
  //   has_post  → solid border, full opacity, clickable
  //   no post   → dashed border, 0.45 opacity, not clickable
  const borderStyle = isCurrent
    ? '1.5px solid var(--glass-sage-border)'
    : record.has_post
      ? '0.5px solid var(--border-default)'
      : '1px dashed var(--border-default)'

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      style={{
        width: 90,
        flexShrink: 0,
        cursor: isClickable ? 'pointer' : 'default',
        pointerEvents: isCurrent ? 'none' : undefined,
        opacity: !isCurrent && !record.has_post ? 0.45 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {/* Image box */}
      <div style={{
        width: 90, height: 68,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--glass-sage-light)',
        border: borderStyle,
        boxSizing: 'border-box',
        boxShadow: isCurrent ? 'var(--shadow-card-focus)' : 'none',
      }}>
        {record.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={record.image_url}
            alt={record.caption ?? dateLabel}
            loading="eager"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
            }}
          />
        ) : (
          /* Placeholder when no photo uploaded */
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            🪴
          </div>
        )}

        {/* "You are here" indicator dot for the current record */}
        {isCurrent && (
          <span
            aria-hidden
            style={{
              position: 'absolute', top: 4, right: 4,
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 0 1.5px var(--bg-card)',
            }}
          />
        )}
      </div>

      {/* Date label */}
      <div style={{
        marginTop: 4,
        fontSize: 9,
        fontFamily: 'var(--font-sans)',
        textAlign: 'center',
        color: isCurrent ? 'var(--sage-700)' : 'var(--sage-300)',
        fontWeight: isCurrent ? 500 : 400,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {dateLabel}
      </div>
    </div>
  )
}
