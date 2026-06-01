// app/(tabs)/timeline/TimelineListView.tsx
'use client'

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import {
  IconChevronLeft, IconChevronRight, IconCamera, IconCalendar,
} from '@tabler/icons-react'
import type { CardData } from '@/components/CardDeck'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MonthGroup {
  key: string      // "2026-05"
  label: string    // "May 2026"
  year: number
  month: number    // 1-12
  cards: CardData[]
}

// ── Group cards by month (newest-first) ───────────────────────────────────────

function groupByMonth(cards: CardData[]): MonthGroup[] {
  const map = new Map<string, CardData[]>()
  for (const card of cards) {
    const key = format(card.date, 'yyyy-MM')
    const existing = map.get(key)
    if (existing) existing.push(card)
    else map.set(key, [card])
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))   // newest month first
    .map(([key, monthCards]) => ({
      key,
      label: format(new Date(key + '-15'), 'MMMM yyyy'),  // day 15 avoids TZ edge cases
      year: parseInt(key.slice(0, 4)),
      month: parseInt(key.slice(5, 7)),
      cards: [...monthCards].sort((a, b) => b.date.getTime() - a.date.getTime()),
    }))
}

// ── RecordCard ────────────────────────────────────────────────────────────────

function RecordCard({
  card,
  onMarkPost,
}: {
  card: CardData
  onMarkPost?: (card: CardData) => void
}) {
  const dateLabel = format(card.date, 'EEEE, MMM d')
  const hasPhoto = !!card.coverImageUrl

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border-default)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card-focus)',
    }}>
      {/* Photo area — 16:10 aspect ratio */}
      <div style={{
        width: '100%',
        aspectRatio: '16 / 10',
        background: 'var(--glass-sage-light)',
        backgroundImage: hasPhoto ? `url(${card.coverImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* No-photo placeholder: big date */}
        {!hasPhoto && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: 48, fontWeight: 600, color: 'var(--sage-300)',
              lineHeight: 1, fontFamily: 'var(--font-sans)',
            }}>
              {format(card.date, 'd')}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 500, color: 'var(--sage-300)',
              letterSpacing: '0.1em', fontFamily: 'var(--font-sans)',
            }}>
              {format(card.date, 'MMM').toUpperCase()}
            </span>
          </div>
        )}

        {/* Photo overlay gradient */}
        {hasPhoto && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.30) 100%)',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Info area */}
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {/* Date + Post pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{
            fontSize: 12, fontWeight: 500, color: 'var(--sage-900)',
            fontFamily: 'var(--font-sans)',
          }}>
            {dateLabel}
          </span>
          {onMarkPost && (
            <button
              onClick={() => onMarkPost(card)}
              style={{
                padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: card.hasPost ? 'var(--success-bg)' : 'var(--glass-sage-medium)',
                color: card.hasPost ? 'var(--success)' : 'var(--sage-700)',
                fontSize: 10, fontWeight: 500, fontFamily: 'var(--font-sans)',
                flexShrink: 0, lineHeight: 1.6,
              }}
            >
              {card.hasPost ? 'Edit post' : 'Post'}
            </button>
          )}
        </div>

        {/* Caption — 2-line clamp */}
        {card.caption && (
          <p style={{
            margin: 0, fontSize: 12, color: 'var(--sage-700)', lineHeight: 1.55,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            fontFamily: 'var(--font-sans)',
          } as React.CSSProperties}>
            {card.caption}
          </p>
        )}

        {/* Tag pills */}
        {card.tags && card.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {card.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 10,
                background: 'var(--glass-sage-light)', color: 'var(--sage-500)',
                fontFamily: 'var(--font-sans)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── MonthPickerOverlay ────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function MonthPickerOverlay({
  groups,
  currentKey,
  onSelect,
  onClose,
}: {
  groups: MonthGroup[]
  currentKey: string
  onSelect: (key: string) => void
  onClose: () => void
}) {
  const availableKeys = useMemo(() => new Set(groups.map(g => g.key)), [groups])

  const years = useMemo(() => {
    const ys = new Set(groups.map(g => g.year))
    return Array.from(ys).sort((a, b) => a - b)
  }, [groups])

  const [pickerYear, setPickerYear] = useState(() => parseInt(currentKey.slice(0, 4)))

  const canPrevYear = years.length > 0 && pickerYear > years[0]
  const canNextYear = years.length > 0 && pickerYear < years[years.length - 1]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(61,79,60,0.22)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, zIndex: 101,
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        padding: '16px 20px 48px',
        boxShadow: '0 -4px 28px rgba(61,79,60,0.14)',
        fontFamily: 'var(--font-sans)',
      }}>
        {/* Drag handle */}
        <div style={{
          width: 32, height: 4, borderRadius: 2,
          background: 'var(--glass-sage-strong)',
          margin: '0 auto 18px',
        }} />

        {/* Year navigation */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 18,
        }}>
          <button
            onClick={() => canPrevYear && setPickerYear(y => y - 1)}
            disabled={!canPrevYear}
            aria-label="Previous year"
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: canPrevYear ? 'var(--glass-sage-light)' : 'transparent',
              color: canPrevYear ? 'var(--sage-700)' : 'var(--sage-300)',
              cursor: canPrevYear ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconChevronLeft size={16} strokeWidth={1.75} />
          </button>

          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--sage-900)' }}>
            {pickerYear}
          </span>

          <button
            onClick={() => canNextYear && setPickerYear(y => y + 1)}
            disabled={!canNextYear}
            aria-label="Next year"
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: canNextYear ? 'var(--glass-sage-light)' : 'transparent',
              color: canNextYear ? 'var(--sage-700)' : 'var(--sage-300)',
              cursor: canNextYear ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* 4×3 month grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {MONTH_NAMES.map((name, i) => {
            const month = i + 1
            const key = `${pickerYear}-${String(month).padStart(2, '0')}`
            const isAvailable = availableKeys.has(key)
            const isCurrent = key === currentKey

            return (
              <button
                key={key}
                disabled={!isAvailable}
                onClick={() => { onSelect(key); onClose() }}
                style={{
                  padding: '10px 4px', borderRadius: 10, border: 'none',
                  cursor: isAvailable ? 'pointer' : 'default',
                  background: isCurrent
                    ? 'var(--glass-sage-strong)'
                    : isAvailable
                    ? 'var(--glass-sage-light)'
                    : 'transparent',
                  color: isCurrent
                    ? 'var(--sage-900)'
                    : isAvailable
                    ? 'var(--sage-700)'
                    : 'var(--sage-300)',
                  fontSize: 12,
                  fontWeight: isCurrent ? 600 : 400,
                  fontFamily: 'var(--font-sans)',
                  opacity: isAvailable ? 1 : 0.38,
                  outline: isCurrent ? '1.5px solid var(--border-default)' : 'none',
                }}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── TimelineListView ──────────────────────────────────────────────────────────

interface TimelineListViewProps {
  cards: CardData[]
  onMarkPost?: (card: CardData) => void
}

export function TimelineListView({ cards, onMarkPost }: TimelineListViewProps) {
  const groups = useMemo(() => groupByMonth(cards), [cards])

  // currentMonthKey: updated by IntersectionObserver as user scrolls
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(() => groups[0]?.key ?? '')
  const [showPicker, setShowPicker] = useState(false)

  // One ref per month section sentinel element
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Keep currentMonthKey in sync when groups change (e.g. pot switch)
  useEffect(() => {
    if (groups.length > 0 && !groups.find(g => g.key === currentMonthKey)) {
      setCurrentMonthKey(groups[0].key)
    }
  }, [groups, currentMonthKey])

  // IntersectionObserver: update currentMonthKey as sections scroll into view
  useEffect(() => {
    if (groups.length === 0) return

    const observers: IntersectionObserver[] = []

    for (const group of groups) {
      const el = sectionRefs.current.get(group.key)
      if (!el) continue
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setCurrentMonthKey(group.key)
          }
        },
        {
          threshold: 0,
          // Fire when the top of a section enters the upper half of the viewport
          rootMargin: '-60px 0px -50% 0px',
        },
      )
      obs.observe(el)
      observers.push(obs)
    }

    return () => observers.forEach(o => o.disconnect())
  }, [groups])

  // Scroll a month section into view
  const scrollToMonth = useCallback((key: string) => {
    const el = sectionRefs.current.get(key)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Navigate via ◀ ▶ arrows
  const currentIdx = groups.findIndex(g => g.key === currentMonthKey)
  // groups is newest-first → "older" = higher index, "newer" = lower index
  const canGoOlder  = currentIdx < groups.length - 1
  const canGoNewer  = currentIdx > 0

  const goOlder = useCallback(() => {
    if (canGoOlder) scrollToMonth(groups[currentIdx + 1].key)
  }, [canGoOlder, groups, currentIdx, scrollToMonth])

  const goNewer = useCallback(() => {
    if (canGoNewer) scrollToMonth(groups[currentIdx - 1].key)
  }, [canGoNewer, groups, currentIdx, scrollToMonth])

  // ── Empty state ────────────────────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '60px 0', gap: 10,
        color: 'var(--sage-300)', fontFamily: 'var(--font-sans)',
      }}>
        <IconCamera size={32} strokeWidth={1.25} />
        <span style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
          No records yet. Tap 📷 to start your plant diary.
        </span>
      </div>
    )
  }

  const currentGroup = groups[currentIdx]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Sticky month navigation bar ──────────────────────────────────── */}
      {/* Negative horizontal margins + matching padding break out of the 16px
          page padding so the bar spans the full 480px content column.         */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8,
        padding: '8px 16px',
        marginLeft: -16, marginRight: -16,
        background: 'var(--glass-cream-medium)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '0.5px solid var(--border-default)',
        fontFamily: 'var(--font-sans)',
      }}>
        {/* ◀ older */}
        <button
          onClick={goOlder}
          disabled={!canGoOlder}
          aria-label="Go to older month"
          style={{
            width: 28, height: 28, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: canGoOlder ? 'var(--glass-sage-light)' : 'transparent',
            color: canGoOlder ? 'var(--sage-700)' : 'var(--sage-300)',
            cursor: canGoOlder ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IconChevronLeft size={14} strokeWidth={1.75} />
        </button>

        {/* Month label */}
        <span style={{
          fontSize: 13, fontWeight: 600, color: 'var(--sage-900)', flex: 1, textAlign: 'center',
        }}>
          {currentGroup?.label ?? ''}
        </span>

        {/* ▶ newer + 📅 Jump */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={goNewer}
            disabled={!canGoNewer}
            aria-label="Go to newer month"
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: canGoNewer ? 'var(--glass-sage-light)' : 'transparent',
              color: canGoNewer ? 'var(--sage-700)' : 'var(--sage-300)',
              cursor: canGoNewer ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconChevronRight size={14} strokeWidth={1.75} />
          </button>

          <button
            onClick={() => setShowPicker(true)}
            aria-label="Jump to month"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 12, border: 'none',
              background: 'var(--glass-sage-light)',
              color: 'var(--sage-700)', cursor: 'pointer',
              fontSize: 10, fontWeight: 500, fontFamily: 'var(--font-sans)',
              lineHeight: 1.6,
            }}
          >
            <IconCalendar size={11} strokeWidth={1.75} />
            Jump
          </button>
        </div>
      </div>

      {/* ── Month sections ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
        {groups.map(group => (
          <div
            key={group.key}
            ref={el => {
              if (el) sectionRefs.current.set(group.key, el)
              else sectionRefs.current.delete(group.key)
            }}
            style={{ marginBottom: 28 }}
          >
            {/* ── Month divider ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            }}>
              <div style={{ flex: 1, height: '0.5px', background: 'var(--border-default)' }} />
              <span style={{
                fontSize: 11, fontWeight: 500, color: 'var(--sage-400)',
                letterSpacing: '0.07em', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-sans)',
              }}>
                {group.label}
              </span>
              <div style={{ flex: 1, height: '0.5px', background: 'var(--border-default)' }} />
            </div>

            {/* ── Cards for this month ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {group.cards.map(card => (
                <RecordCard key={card.id} card={card} onMarkPost={onMarkPost} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Month picker overlay ──────────────────────────────────────────── */}
      {showPicker && (
        <MonthPickerOverlay
          groups={groups}
          currentKey={currentMonthKey}
          onSelect={(key) => {
            setCurrentMonthKey(key)
            scrollToMonth(key)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
