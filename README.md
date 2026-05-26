# GardenLink v2

A plant social diary app. Photograph your plants every day, organise records by pot and timeline, and share moments with the community.

---

## Features

- **Daily records** — upload a photo for each pot every day; multiple uploads on the same day are all kept
- **Timeline / CardDeck** — a physics-driven vertical card deck grouped by date with smooth spring-snap scroll
- **My Posts** — published posts filterable by category (Bloom · Harvest · Growth · Help)
- **Post detail** — cover photo, caption, tags, comments, and a pot history thumbnail strip
- **Community garden** — a diamond-grid view of public posts with comment support
- **Pot management** — create named pots with emoji icons and daily care tasks
- **Authentication** — email/password sign-up via Supabase Auth; row-level security on every table

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

> **Seed data (optional):** Run `supabase/seed.sql` to populate demo pots and records.

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
    garden/          # Public garden (diamond grid) + My garden (pot grid + tasks)
    timeline/        # CardDeck timeline per pot
    profile/         # User profile, stats, messages entry
  camera/            # Photo capture and upload flow
  post/[id]/         # My post detail with pot history strip
  post/community/[id]/ # Community post detail
  posts/             # My Posts list with category filter
  messages/          # Inbox + chat thread
  auth/              # Sign-in / sign-up pages
components/
  CardDeck/          # Physics-driven card scroll (core interaction)
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
