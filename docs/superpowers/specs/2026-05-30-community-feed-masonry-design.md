# Community Feed Masonry Grid — Design Spec

**Date:** 2026-05-30
**Status:** Approved

---

## Goal

Replace the current text-heavy vertical list in the Community Garden's Feed view with a photo-first 2-column masonry grid, similar to Pinterest. Interaction and data-fetching logic are unchanged; only the presentation layer (`GardenFeed.tsx`) is rewritten.

---

## Scope

**In scope:**
- Rewrite `components/PublicGarden/GardenFeed.tsx`
- Sub-tabs (Discover active, Following deferred placeholder)
- Photo-only card grid with natural aspect ratios
- Infinite scroll (client-side, from the existing 30-post fetch)
- Empty state

**Out of scope:**
- Server-side pagination beyond the existing 30-post fetch
- Following tab functionality (deferred — data model work needed)
- Search bar
- Map view changes
- Any file other than `GardenFeed.tsx`

---

## Architecture

### Files changed

| File | Change |
|------|--------|
| `components/PublicGarden/GardenFeed.tsx` | **Replace entirely** with masonry grid |

No other files change. The `GardenTile` type, `PublicGarden.tsx`, `GardenClientPage.tsx`, and all data-fetching code stay untouched.

### Props contract (unchanged)

```typescript
interface GardenFeedProps {
  tiles: GardenTile[]
}
```

`GardenFeed` continues to receive `GardenTile[]`. Photo-only filtering (exclude tiles where `tile.latestPost?.imageUrl` is falsy) happens inside the component, not at the call site.

---

## Layout

### Masonry grid

Uses native CSS `column-count: 2` with `column-gap: 8px`. Each card has `break-inside: avoid` to prevent mid-card column breaks. No masonry library is added.

```css
column-count: 2;
column-gap: 8px;
padding: 0 16px 80px;   /* 80px bottom = tab bar clearance */
```

Card height is unconstrained — the photo's natural aspect ratio drives it. Tall portrait photos create tall cards; landscape photos create short cards. This produces the characteristic "waterfall" effect automatically.

The page already caps at `maxWidth: 480px`, so the grid is always 2 columns in practice.

### Infinite scroll

The existing server fetch returns up to 30 posts. The component shows **12 at a time**, using a sentinel `<div>` at the bottom observed by `IntersectionObserver`. When the sentinel enters the viewport, the visible count increments by 12 (capped at the total available). No network call is made — all 30 items are already in memory.

---

## Sub-tabs

A minimal tab bar renders above the grid:

```
[Discover]  [Following]
```

- **Tab bar style**: plain text, no pill buttons. Active tab has a `2px solid --sage-900` bottom border and `--sage-900` text color. Inactive follows tab: `--sage-300` color, `cursor: default`, no underline.
- **Discover**: active by default. Shows photo posts from all community members.
- **Following**: always disabled (data model work deferred). Shows tooltip text "Coming soon" on hover/focus.
- The tab bar sits at `padding: 10px 16px 0`, `font-size: 13px`, `font-weight: 500`, using `var(--font-sans)`.

---

## Card Design

Each card is a `<Link href={tile.href ?? '/post/community/[id]'}>` element:

### Structure

```
┌──────────────────────────┐
│  [photo]                 │  ← full card width, height = natural aspect ratio
│                          │     loading="lazy", object-fit: cover
│                          │     placeholder: var(--glass-sage-light) bg + min-height
├──────────────────────────┤
│  Caption text (2-line)   │  ← font-size: 12px, color: --sage-700
│  🌹 Flora · Rose         │  ← 20px emoji + username 11px --sage-500 + tag pill
└──────────────────────────┘
```

### Visual properties

| Property | Value |
|----------|-------|
| Card border-radius | `14px` |
| Card background | `var(--bg-card)` |
| Card border | `0.5px solid var(--border-default)` |
| Card shadow | `var(--shadow-card-focus)` |
| Card overflow | `hidden` (clips photo to rounded corners) |
| Photo width | `100%` |
| Photo height | `auto` (natural ratio, unconstrained) |
| Photo placeholder | `var(--glass-sage-light)` background, `min-height: 80px` |
| Caption font | `12px`, `--sage-700`, `-webkit-line-clamp: 2`, `overflow: hidden` |
| User row font | `11px`, `--sage-500` |
| User avatar | `20×20px` emoji circle, `border-radius: 50%`, `var(--glass-sage-medium)` bg |
| Species/pot tag | `9px` pill, `var(--glass-sage-light)` bg, `var(--sage-500)` text, optional |
| Hover feedback | `transform: scale(1.02)`, `transition: transform 0.12s ease` |
| Column spacing | `margin-bottom: 8px` |

### Photo loading

Images use `loading="lazy"` (native browser lazy loading). While loading, the image container shows `var(--glass-sage-light)` background with `min-height: 80px`. No dominant-color extraction — keeping it simple for MVP.

### Photo-only filter

Posts without `imageUrl` are **silently excluded** from the grid. The feed is exclusively photo-driven.

---

## Empty State

When no photo posts are available (after filtering):

```
🌿
No posts with photos yet.
```

Rendered as a centered block with `font-size: 13px`, `color: var(--sage-300)`, `padding-top: 60px`.

---

## Constraints (from CLAUDE.md)

- No new npm dependencies
- TypeScript strict, inline styles only (no separate CSS files)
- All transparent layers use sage or cream tinting — no `rgba(0,0,0,α)` or `rgba(255,255,255,α)`
- All shadows use sage tinting — `var(--shadow-card-focus)` only
- Icons from `@tabler/icons-react` only
- `'use client'` marker required (component uses `useState` + `IntersectionObserver`)

---

## Out-of-scope (future iterations)

- Following tab with real follow-relationship filtering
- Search bar
- Pull-to-refresh
- Like / reaction counts on grid cards
- Dominant-color image placeholders
- Server-side pagination
