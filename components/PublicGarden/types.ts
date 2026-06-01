// components/PublicGarden/types.ts

/** Activity / status indicators floating above garden tiles. */
export type StatusBubbleType = 'help' | 'bloom' | 'new' | 'newPot'

export interface StatusBubble {
  type: StatusBubbleType
  label: string
}

export interface RelationTag {
  type: 'geo' | 'plant' | 'social'
  label: string
}

export interface LatestPost {
  imageUrl?: string
  text: string
  timeAgo: string
  /** DB record id — enables "tap preview → /post/[id]" navigation. Absent for demo tiles. */
  latestPostId?: string
  /** Approximate like count displayed in the preview meta line. Absent = not shown. */
  likeCount?: number
}

export interface GardenTile {
  id: string
  dx: number           // display X (already multiplied by SPREAD)
  dy: number           // display Y
  userName: string
  emoji: string        // fallback when no illustration
  illustrationUrl?: string
  tags: RelationTag[]
  latestPost?: LatestPost
  isMe?: boolean
  isEvent?: boolean
  size?: number        // size multiplier, default 1, event tiles 1.4
  /** Override the navigation link in the community feed (default: /post/community/[id]) */
  href?: string
  /**
   * Pot / plant name shown after the author name in feed cards (e.g. "· Rose Pot").
   * When set, the feed card renders "UserName · potName" instead of just "UserName".
   * Demo tiles leave this unset and use a plant RelationTag instead.
   */
  potName?: string
  /** Floating activity bubble drawn above the tile illustration. */
  statusBubble?: StatusBubble
}

export interface PublicGardenProps {
  tiles: GardenTile[]
  myTile: GardenTile
  /** Controlled from the parent page header — 'map' (default) or 'feed'. */
  viewMode?: 'map' | 'feed'
  onTileSelect?: (tile: GardenTile) => void
  onVisitGarden?: (tile: GardenTile) => void
  onMessage?: (tile: GardenTile) => void
}

export type GardenCanvasHandle = {
  redraw: (offset: { x: number; y: number }) => void
  nativeElement: HTMLCanvasElement | null
}
