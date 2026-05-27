export interface CardData {
  id: string              // daily_record UUID of the latest record for this date
  date: Date
  potId?: string          // parent pot UUID — used for navigating to /camera?pot=...
  coverImageUrl?: string  // image_url from the latest record for this date
  caption?: string        // caption from the latest record, pre-fills the Post modal
  tags?: string[]         // kept for onTagClick callbacks
  /**
   * Auto-detected plant labels (e.g. "Leaf", "Flower", "Bud").
   * Currently mapped from `daily_records.tags`; will be populated by an ML
   * pipeline in a future iteration. Capped at 3 in the card display.
   */
  detectedTags?: string[]
  hasPost?: boolean       // true if any record on this date has has_post=true
  /** All individual records for this date, newest first. Used for multi-photo display. */
  allRecords?: Array<{
    id: string
    image_url: string | null
    caption: string | null
    has_post: boolean
    created_at: string
  }>
}

export interface CardDeckProps {
  cards: CardData[]
  initialIndex?: number
  onActiveChange?: (index: number) => void
  onMarkPost?: (card: CardData) => void
  onTagClick?: (card: CardData, tag: string) => void
}
