# GardenLink v2

**[🌿 Live Demo → 510final-gardenlink.vercel.app](https://510final-gardenlink.vercel.app/)**

A plant social diary app. Photograph your plants every day, organise records by pot and timeline, and share moments with a neighbourhood community.

---

## Try It Out

A test account is available for immediate exploration — no sign-up required:

| Field | Value |
|---|---|
| Email | `yzhou30@uw.edu` |
| Password | `mim7609@` |

The account has pre-populated pots, daily records, and community connections so every feature is visible on first load.

---

## Features

### My Garden
- **Pot management** — create named pots with emoji icons and daily care tasks
- **Daily records** — upload a photo for each pot every day; multiple uploads on the same day are all kept
- **Timeline / CardDeck** — a physics-driven vertical card deck grouped by date with smooth spring-snap scroll
- **List view** — simple chronological feed as an alternative to the card deck
- **My Posts** — published posts filterable by category (Bloom · Harvest · Growth · Help)
- **Post detail** — cover photo, caption, tags, comments, and a pot history thumbnail strip

### Community Garden
- **Affinity-based map** — other gardeners are positioned on a 2-D canvas by affinity score (follow relationship, shared city, overlapping plants, mutual follows, recent activity); real users blend with demo members so the map is never empty
- **Feed view** — chronological feed of published community posts with a "Help only" filter
- **Bottom sheet** — tap any tile to see the user's latest post preview (16:10 photo, 2-line caption, like count); tapping the preview navigates to the full post; action buttons open Visit Garden or Message
- **Visit Garden page** — `/user/[id]/garden` shows a user's profile (avatar, bio, city, years active), their pots in a horizontal strip, and all published photos in a 2-column infinite-scroll grid (date label, Bloom/Help badge, caption overlay)
- **Follow / Unfollow** — optimistic toggle with API-backed persistence; affects affinity scores for future map positions
- **Demo tiles** — eight pre-seeded community members (Flora, GardenPro, SuccyCat …) and a Spring Fair event tile provide a rich map even before real users join

### Auth & Sharing
- **Authentication** — email/password sign-up via Supabase Auth; row-level security on every table
- **Messages** — in-app inbox and chat thread

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Next.js 14 App Router (Server Components by default)            │
│                                                                  │
│  app/(tabs)/garden/                                              │
│    page.tsx           Server Component — fetches pots, community │
│                       members, computes affinity layout          │
│    GardenClientPage   Client Component — segment/view toggles,  │
│                       tile blending (demo + real users)          │
│                                                                  │
│  app/user/[id]/garden/                                           │
│    page.tsx           Server Component — profile, pots, posts,  │
│                       follow status (UUID → real; short → demo) │
│    UserGardenClient   Client Component — follow toggle,          │
│                       pots strip, infinite-scroll photo grid     │
│                                                                  │
│  app/(tabs)/timeline/                                            │
│    page.tsx           Server Component — records per pot        │
│    TimelineClientPage Client Component — CardDeck (Framer Motion)│
└──────────────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐      ┌──────────────────────────────────┐
│  lib/queries.ts │      │  components/PublicGarden/        │
│  All Supabase   │      │    GardenCanvas (HTML Canvas,    │
│  read helpers   │      │      drag + pan + zoom)          │
│                 │      │    GardenBottomSheet             │
│  lib/gardenLayout│      │      (preview card, Link → post) │
│  Affinity score │      │    GardenFeed (feed mode)        │
│  + polar-coord  │──────│    useGardenDrag, useGardenTiles │
│  tile placement │      └──────────────────────────────────┘
└─────────────────┘
         │
         ▼
┌───────────────────────────┐
│  Supabase (PostgreSQL)    │
│  pots · daily_records     │
│  tasks · daily_comments   │
│  messages · profiles      │
│  follows                  │
│  + Storage bucket "photos"│
└───────────────────────────┘
```

### Key design decisions

| Decision | Rationale |
|---|---|
| Server Components by default | DB queries stay on the server; `'use client'` only for canvas, drag, and interactive state |
| Affinity layout as a pure function | `computeGardenLayout()` in `lib/gardenLayout.ts` takes data in and returns positioned tiles — no side effects, easy to test |
| Demo tiles always present | Map is never empty; real users blend on top of eight seeded demo members so newcomers see a lively community immediately |
| `MotionValue` for card scroll offset | Avoids re-renders on every animation frame; only the DOM transform updates |
| Graceful degradation on `follows` table | All follow-related queries are wrapped in try/catch — the app works fully even if the `follows` migration hasn't been run yet |
| CSS variables for all design tokens | Sage & cream palette, glass layers, shadows — all defined in `globals.css`; no hard-coded colours in component files |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database & Storage | Supabase (PostgreSQL + Storage) |
| Auth | Supabase Auth + `@supabase/ssr` |
| Animations | Framer Motion |
| Icons | `@tabler/icons-react` |
| Date formatting | `date-fns` |
| Global state | Zustand |
| Styling | Tailwind CSS + CSS custom properties |
| Testing | Jest + React Testing Library + ts-jest |

---

## Prerequisites

- Node.js 18 or later
- A [Supabase](https://supabase.com) project (free tier works fine)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key-here
```

Both values are found in **Supabase Dashboard → Project Settings → API**.

### 3. Apply the database schema

Run the following SQL files **in order** in the Supabase SQL Editor:

| File | Purpose |
|---|---|
| `supabase/schema.sql` | Base tables: `pots`, `daily_records`, `tasks`, `daily_comments`, `messages` |
| `supabase/add_post_category.sql` | Adds `post_category` column to `daily_records` |
| `supabase/auth_rls.sql` | `profiles` table, signup trigger, ownership RLS policies |
| `supabase/auth_rls_patch.sql` | Public read policies for `pots` and `daily_records` |
| `supabase/migrations/001_remove_unique_constraint.sql` | Removes the per-day unique constraint so multiple uploads are allowed |
| `supabase/migrations/002_security_fixes.sql` | Storage bucket policies + RLS for `daily_comments` |
| `supabase/migrations/003_community_layout.sql` | `follows` table + `profiles.city` column for affinity-based community garden layout |
| `supabase/migrations/004_plantnet_botanical.sql` | `genus` / `family` botanical columns on `pots` and `daily_records` for PlantNet identification |

> **Seed data (optional):** Run `supabase/seed.sql` to populate demo pots, records, tasks, and comments.
> For community demo tiles (map view), also run `supabase/seed_community.sql`.

### 4. Create the storage bucket

In the Supabase Dashboard:
1. Go to **Storage → New bucket**
2. Name it `photos`
3. Set it to **Public**

Photo upload paths follow the pattern `{pot_id}/{YYYY-MM-DD}_{filename}`.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | ESLint check |
| `npm test` | Run the full test suite (once) |
| `npm run test:watch` | Run tests in watch mode |

---

## Project Structure

```
app/
  (tabs)/
    garden/          # Community garden (map + feed) + My garden (pot grid + tasks)
    timeline/        # CardDeck timeline per pot
    profile/         # User profile, stats, messages entry
  camera/            # Photo capture and upload flow
  post/[id]/         # My post detail with pot history strip
  post/community/[id]/ # Community post detail
  posts/             # My Posts list with category filter
  messages/          # Inbox + chat thread
  auth/              # Sign-in / sign-up pages
  user/[id]/
    page.tsx         # Public profile page
    garden/          # Visit Garden page (pots + photo grid)
  api/
    follow/          # POST /api/follow — follow-toggle endpoint
    identify-plant/  # POST /api/identify-plant — PlantNet integration
components/
  CardDeck/          # Physics-driven card scroll (core interaction)
  PublicGarden/      # Canvas map, bottom sheet, feed, drag hook
  FloatingTabBar.tsx
  SegmentedControl.tsx
  PotSelector.tsx
  CommentForm.tsx
  PostPublishModal.tsx
  AddPot/
lib/
  supabase.ts        # Singleton client + exported env constants
  supabase-server.ts # SSR server client
  supabase-browser.ts # SSR browser client
  auth.ts            # getServerUser helper
  queries.ts         # All Supabase read queries
  gardenLayout.ts    # Affinity score → polar coordinate tile placement
  communityDemoData.ts # Demo tiles (Flora, GardenPro, …)
  tileIllustrations.ts # Illustration URL mapping per plant name
  types.ts           # Shared TypeScript types
  store.ts           # Zustand store
supabase/
  schema.sql
  migrations/
```

---

## Authentication

Routes under `/camera` require authentication — the middleware in `middleware.ts` redirects unauthenticated users to `/auth/login`.

All other routes are public; authenticated users see their own data via `user_id` RLS policies.

---

## Testing

```bash
npm test
```

The test suite covers:
- **`lib/__tests__/env-safety.test.ts`** — env var safety (no `!` assertions outside `legacy/`)
- **`lib/__tests__/queries.test.ts`** — Supabase query helpers (mocked client)
- **`components/__tests__/FloatingTabBar.test.tsx`** — navigation rendering and auth gating
- **`components/__tests__/SegmentedControl.test.tsx`** — option rendering and selection callbacks

---

## Deployment

The app is designed for [Vercel](https://vercel.com):

1. Push to GitHub
2. Import the repo in Vercel
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in **Project Settings → Environment Variables**
4. Deploy

---

## Design Principles

- **Mobile-first** — designed for 375 px; desktop content is centred at `max-width: 480px`
- **Sage & cream palette** — all transparent layers use tinted sage or cream overlays; no pure white/black semi-transparents; all shadows are sage-toned
- **No dark mode** — intentional for MVP
- **Server Components by default** — `'use client'` only where interactivity is strictly required
