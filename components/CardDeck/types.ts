export interface CardData {
  id: string              // daily_record UUID (or demo key)
  date: Date
  potId?: string          // parent pot UUID — used for navigating to /camera?pot=...
  coverImageUrl?: string
  caption?: string        // existing caption, pre-fills the Post modal
  tags?: string[]
  hasPost?: boolean       // whether this record has already been marked as a post
}

export interface CardDeckProps {
  cards: CardData[]
  initialIndex?: number
  onActiveChange?: (index: number) => void
  onMarkPost?: (card: CardData) => void
  onTagClick?: (card: CardData, tag: string) => void
}
