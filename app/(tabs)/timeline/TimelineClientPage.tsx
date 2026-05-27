// app/(tabs)/timeline/TimelineClientPage.tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { IconList, IconStack2, IconCamera } from '@tabler/icons-react'
import { CardDeck, type CardData } from '@/components/CardDeck'
import { PotSelector, type PotOption } from '@/components/PotSelector'
import { ViewToggle } from '@/components/ViewToggle'
import { PostPublishModal } from '@/components/PostPublishModal'
import type { Pot, DailyRecord } from '@/lib/types'

// ── Group records by date → CardData[] ───────────────────────────────────────
// Each unique record_date becomes one CardData for the CardDeck.
// Within a day, records are sorted newest-first; the first one provides the
// cover image.  All records for the day are stashed in `allRecords`.
function groupRecordsByDate(records: DailyRecord[]): CardData[] {
  // Build a map: dateString → DailyRecord[]
  const byDate = new Map<string, DailyRecord[]>()
  for (const r of records) {
    const existing = byDate.get(r.record_date)
    if (existing) {
      existing.push(r)
    } else {
      byDate.set(r.record_date, [r])
    }
  }

  // Convert each group to a CardData, then sort ascending by date.
  // Oldest record = index 0 (top of deck); newest = last index (bottom of deck).
  // The CardDeck starts focused on the last card so the user sees today first
  // and scrolls UP to revisit growth history — like reading a diary.
  return Array.from(byDate.entries())
    .map(([dateStr, group]) => {
      // Sort within the group: newest created_at first
      const sorted = [...group].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const latest = sorted[0]
      return {
        id:           latest.id,
        date:         new Date(dateStr + 'T12:00:00'),  // noon local time avoids TZ off-by-one
        potId:        latest.pot_id,
        coverImageUrl: latest.image_url ?? undefined,
        caption:      latest.caption ?? undefined,
        tags:         latest.tags ?? undefined,
        detectedTags: latest.tags ?? undefined,   // same source; ML pipeline will split these later
        hasPost:      sorted.some(r => r.has_post),
        allRecords:   sorted.map(r => ({
          id:        r.id,
          image_url: r.image_url,
          caption:   r.caption,
          has_post:  r.has_post,
          created_at: r.created_at,
        })),
      } satisfies CardData
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())  // ascending: oldest → newest
}

// ── Feed list ─────────────────────────────────────────────────────────────────
// Shows every individual DailyRecord as its own row (newest first).
// This means multiple uploads on the same day each appear separately.
function FeedList({ records }: { records: DailyRecord[] }) {
  if (records.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '60px 0', gap: 8,
        color: 'var(--sage-300)', fontSize: 12, fontFamily: 'var(--font-sans)',
      }}>
        <IconCamera size={28} strokeWidth={1.25} />
        <span>No records yet — take your first photo!</span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
      {records.map((record) => (
        <div key={record.id} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: 10,
          background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 12,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 8,
            background: 'var(--glass-sage-light)', flexShrink: 0,
            backgroundImage: record.image_url ? `url(${record.image_url})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: record.image_url ? undefined : 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 24,
          }}>
            {!record.image_url && '🪴'}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--sage-900)', fontFamily: 'var(--font-sans)' }}>
              {format(new Date(record.record_date + 'T12:00:00'), 'MMM d')}
            </span>
            <span style={{ fontSize: 11, color: 'var(--sage-300)', fontFamily: 'var(--font-sans)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {record.caption ?? 'No caption'}
            </span>
            {record.tags && record.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {record.tags.map((tag) => (
                  <span key={tag} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10,
                    background: 'var(--glass-sage-light)', color: 'var(--sage-500)', fontFamily: 'var(--font-sans)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {record.has_post && (
            <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 8,
              background: 'var(--success-bg)', color: 'var(--success)',
              fontFamily: 'var(--font-sans)', flexShrink: 0 }}>
              Post
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  pots: Pot[]
  records: DailyRecord[]
  selectedPotId: string
}

// ── Client component ─────────────────────────────────────────────────────────
export function TimelineClientPage({ pots, records, selectedPotId }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'card' | 'list'>('card')
  const [postCard, setPostCard] = useState<CardData | null>(null)   // opened PostPublishModal

  const viewOptions = useMemo(() => [
    { value: 'card', label: 'Cards', icon: <IconStack2 size={12} strokeWidth={1.75} /> },
    { value: 'list', label: 'List',  icon: <IconList   size={12} strokeWidth={1.75} /> },
  ], [])

  const potOptions: PotOption[] = pots.map(p => ({ id: p.id, name: p.name, daysOwned: p.days_owned }))

  // Group DailyRecords by date → one CardData per day for the CardDeck.
  // Multiple uploads on the same day share one card; the latest record
  // becomes the cover image.  All records for the day are stored in
  // `allRecords` for future multi-photo display.
  const cards: CardData[] = useMemo(() => groupRecordsByDate(records), [records])

  function handlePotChange(newPotId: string) {
    router.push(`/timeline?pot=${encodeURIComponent(newPotId)}`)
  }

  function handleMarkPost(card: CardData) {
    setPostCard(card)
  }

  function handlePublished() {
    // Reload the page so server fetches fresh has_post state
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--sage-900)' }}>Timeline</span>
        <ViewToggle options={viewOptions} value={view} onChange={(v) => setView(v as 'card' | 'list')} />
      </div>

      {/* Pot selector */}
      {potOptions.length > 0 ? (
        <PotSelector pots={potOptions} selectedId={selectedPotId} onChange={handlePotChange} />
      ) : (
        <div style={{
          padding: '14px 16px', background: 'var(--bg-card)',
          border: '0.5px solid var(--border-default)', borderRadius: 12,
          fontSize: 13, color: 'var(--sage-400)', marginBottom: 8,
        }}>
          No pots yet — head to My Garden and add one 🪴
        </div>
      )}

      {/* Content */}
      {view === 'card' ? (
        cards.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <CardDeck
              cards={cards}
              initialIndex={Math.max(0, cards.length - 1)}
              onActiveChange={() => {}}
              onMarkPost={handleMarkPost}
              onTagClick={() => {}}
            />
          </div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 0', gap: 10,
            color: 'var(--sage-300)', fontFamily: 'var(--font-sans)',
          }}>
            <IconCamera size={32} strokeWidth={1.25} />
            <span style={{ fontSize: 13 }}>No records for this pot yet.</span>
            <button
              onClick={() => router.push(`/camera?pot=${encodeURIComponent(selectedPotId)}`)}
              style={{
                marginTop: 4, padding: '8px 18px', borderRadius: 10, border: 'none',
                background: 'var(--glass-sage-medium)', cursor: 'pointer',
                fontSize: 12, fontWeight: 500, color: 'var(--sage-700)',
                fontFamily: 'var(--font-sans)',
              }}>
              Record today →
            </button>
          </div>
        )
      ) : (
        <FeedList records={records} />
      )}

      {/* Post publish modal */}
      <PostPublishModal
        card={postCard}
        onClose={() => setPostCard(null)}
        onPublished={handlePublished}
      />
    </div>
  )
}
