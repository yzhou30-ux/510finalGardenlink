// lib/communityDemoData.ts
// Single source of truth for community demo tiles.
// Imported by both GardenClientPage (canvas) and /post/community/[id] (detail page).

import type { GardenTile } from '@/components/PublicGarden/types'
import { getTileIllustrationUrl, getMeIllustrationUrl } from '@/lib/tileIllustrations'

export const MY_TILE: GardenTile = {
  id: 'me',
  dx: 0, dy: 0,
  userName: 'Me',
  emoji: '🏡',
  tags: [],
  isMe: true,
  illustrationUrl: getMeIllustrationUrl(),
}

export const DEMO_COMMUNITY_TILES: GardenTile[] = [
  {
    id: '1', dx: -1.8, dy: -1.8,
    userName: 'Flora', emoji: '🌹',
    tags: [{ type: 'social', label: 'Following' }, { type: 'plant', label: 'Rose' }],
    latestPost: { text: 'My first rose bloom of the season — so thrilled!', timeAgo: '3h ago' },
    illustrationUrl: getTileIllustrationUrl('Rose'),
    statusBubble: { type: 'bloom', label: 'Bloom' },
  },
  {
    id: '2', dx: 1.8, dy: -1.8,
    userName: 'GreenThumb', emoji: '🌿',
    tags: [{ type: 'geo', label: 'Nearby' }, { type: 'plant', label: 'Pothos' }],
    latestPost: { text: 'Pothos is so low-maintenance — perfect for beginners', timeAgo: '1d ago' },
    illustrationUrl: getTileIllustrationUrl('Pothos'),
  },
  {
    id: '3', dx: 0, dy: -2.8,
    userName: 'SuccyCat', emoji: '🌵',
    tags: [{ type: 'plant', label: 'Succulent' }],
    latestPost: { text: 'New succulent haul — the whole windowsill is full now', timeAgo: '2d ago' },
    illustrationUrl: getTileIllustrationUrl('Succulent'),
  },
  {
    id: '4', dx: -2.8, dy: 0,
    userName: 'JasmineG', emoji: '🌸',
    tags: [{ type: 'geo', label: 'Same block' }, { type: 'plant', label: 'Jasmine' }],
    latestPost: { text: 'Jasmine is in full bloom — the scent drifts all the way outside', timeAgo: '2h ago' },
    illustrationUrl: getTileIllustrationUrl('Jasmine'),
    statusBubble: { type: 'new', label: 'New' },
  },
  {
    id: '5', dx: 2.8, dy: 0,
    userName: 'CactusKing', emoji: '🎋',
    tags: [{ type: 'plant', label: 'Cactus' }],
    statusBubble: { type: 'newPot', label: 'New pot' },
  },
  {
    id: '6', dx: 0, dy: 2.8,
    userName: 'FernLover', emoji: '🌿',
    tags: [{ type: 'social', label: 'Featured' }],
    latestPost: { text: 'Boston fern keeps getting bigger — hanging it up looks amazing', timeAgo: '5h ago' },
  },
  {
    id: '7', dx: -1.8, dy: 1.8,
    userName: 'GardenPro', emoji: '🌼',
    tags: [{ type: 'geo', label: 'Same district' }],
    latestPost: { text: 'Sharing my planting plan for this year', timeAgo: '3d ago' },
    statusBubble: { type: 'help', label: 'Help' },
  },
  {
    id: '8', dx: 1.8, dy: 1.8,
    userName: 'Sunny', emoji: '🌻',
    tags: [{ type: 'plant', label: 'Sunflower' }],
    latestPost: { text: 'Sunflower is finally 2 metres tall!', timeAgo: '1d ago' },
    illustrationUrl: getTileIllustrationUrl('Sunflower'),
  },
  {
    id: 'event-1', dx: 3.6, dy: -1.8,
    userName: 'Spring Fair', emoji: '🎉',
    tags: [{ type: 'social', label: 'Event' }],
    isEvent: true, size: 1.4,
    latestPost: { text: '2026 Spring Flower Fair — opens May 28', timeAgo: 'just now' },
  },
]

// Keyed map for O(1) lookup in the detail page
export const COMMUNITY_TILE_MAP: Record<string, GardenTile> = Object.fromEntries(
  DEMO_COMMUNITY_TILES.map(t => [t.id, t]),
)

// Per-tile hardcoded demo comments (adds richness to detail pages)
export const COMMUNITY_DEMO_COMMENTS: Record<string, Array<{ author: string; emoji: string; text: string; timeAgo: string }>> = {
  '1': [
    { author: 'GardenPro', emoji: '🌼', text: 'Beautiful bloom! What variety is it?', timeAgo: '2h ago' },
    { author: 'SuccyCat',  emoji: '🌵', text: 'Stunning colour — love it 😍', timeAgo: '1h ago' },
  ],
  '2': [
    { author: 'JasmineG',  emoji: '🌸', text: 'Totally agree, pothos is my starter plant too!', timeAgo: '20h ago' },
    { author: 'Flora',     emoji: '🌹', text: 'Mine has survived 3 re-pots already 🌱', timeAgo: '18h ago' },
  ],
  '3': [
    { author: 'CactusKing', emoji: '🎋', text: 'Which varieties did you pick up?', timeAgo: '1d ago' },
  ],
  '4': [
    { author: 'GreenThumb', emoji: '🌿', text: 'I can almost smell it through the screen!', timeAgo: '1h ago' },
    { author: 'Sunny',      emoji: '🌻', text: 'Mine is about to bloom too — fingers crossed!', timeAgo: '45m ago' },
  ],
  '5': [],
  '6': [
    { author: 'Flora',     emoji: '🌹', text: 'That looks incredible on the wall!', timeAgo: '4h ago' },
    { author: 'GardenPro', emoji: '🌼', text: 'Ferns love humidity — try misting it daily.', timeAgo: '3h ago' },
  ],
  '7': [
    { author: 'GreenThumb', emoji: '🌿', text: 'Would love to see the full plan!', timeAgo: '2d ago' },
  ],
  '8': [
    { author: 'JasmineG',  emoji: '🌸', text: 'Wow, 2m?! Mine is barely at 80cm 😅', timeAgo: '22h ago' },
    { author: 'FernLover',  emoji: '🌿', text: 'Give it more sun and it will tower over everything!', timeAgo: '20h ago' },
  ],
  'event-1': [
    { author: 'Flora',     emoji: '🌹', text: 'Cannot wait!! Already marked my calendar 🗓️', timeAgo: 'just now' },
    { author: 'GardenPro', emoji: '🌼', text: 'Will there be a seed-swap corner?', timeAgo: 'just now' },
    { author: 'SuccyCat',  emoji: '🌵', text: 'This is my favourite event of the year 🎉', timeAgo: 'just now' },
  ],
}
