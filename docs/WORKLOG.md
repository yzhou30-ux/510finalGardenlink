
### 2026-05-24 — Supabase 数据库接入

**Prompt / Task:**
> 接入旧版 Garden Stream 项目的 Supabase 数据库。创建 v2 所需的新表结构（pots、daily_records、tasks、comments、messages），配置客户端连接，并把花园页和 Profile 页的 hardcoded demo 数据替换为真实 Supabase 查询。

**What was implemented:**
- 创建 `.env.local`：复用 legacy 项目的 Supabase URL + anon key（同一个项目）
- 创建 `lib/supabase.ts`：`createClient` 封装，支持 Server Components 和客户端
- 创建 `lib/types.ts`：v2 数据类型定义（Pot、DailyRecord、Task、Comment、Message）
- 创建 `lib/queries.ts`：所有 Supabase 查询函数（getPots、getTasksByUser、getRecordsCount、getUnreadCount 等）
- 创建 `supabase/schema.sql`：v2 新表 DDL + RLS policies（与旧版 4 张表共存于同一 Supabase 项目）
- 创建 `supabase/seed.sql`：包含 5 个花盆、14 条每日记录、6 个任务、4 条评论、3 条消息的 demo 数据
- 重构 `app/(tabs)/garden/page.tsx` → async Server Component，获取真实 pots + tasks
- 新建 `app/(tabs)/garden/GardenClientPage.tsx`：提取客户端交互逻辑（state + event handlers）
- 更新 `app/(tabs)/profile/page.tsx` → async Server Component，实时获取花盆数/动态数/未读消息数

**Status:** Done

**Notes:**
- 旧版表（gardens, photos, highlights, comments）保持不变，v2 新表并行共存
- Storage bucket `photos` 无需改动，上传路径改为 `{pot_id}/{YYYY-MM-DD}_{filename}`
- 运行 schema.sql 之前需先在 Supabase SQL Editor 执行（尚未执行，需手动操作）
- `getTasksByUser` 使用两步查询避免 foreign-table filter 问题

---

### 2026-05-25 — SQL fix, English translation, secondary pages & MyGarden bubble layout

**Prompt / Task:**
> (1) Fix `ERROR: 42703: column "record_id" does not exist` when running seed.sql.
> (2) Translate all UI text to English for demo.
> (3) Remove "Favorites" from Profile; build "My Posts" and "Messages" secondary pages.
> (4) Replace the My Garden tab (PlantGrid + TaskList) with a freeform bubble scatter layout.

**What was implemented:**

**SQL fix:**
- Renamed v2 comments table from `comments` → `daily_comments` in `supabase/schema.sql` and `supabase/seed.sql`
- Updated `lib/types.ts`: `Comment` → `DailyComment` with correct `record_id` field
- Updated `lib/queries.ts`: `getCommentsByRecord`, `addComment` now query `daily_comments` table
- Removed `comments` from `TRUNCATE` in seed.sql to preserve legacy table data

**English translation (all UI strings):**
- `app/layout.tsx` — `lang="en"`, English description
- `components/FloatingTabBar.tsx` — Garden / Timeline / Profile labels; English aria-labels
- `components/SegmentedControl.tsx`, `ViewToggle.tsx`, `MessageCard.tsx` — English
- `components/DiamondGrid.tsx`, `PlantGrid.tsx`, `TaskList.tsx`, `PotSelector.tsx` — English
- `components/CardDeck/CardDeck.tsx`, `CardItem.tsx` — "Post" button; English aria-labels
- `components/PublicGarden/*` — Community Garden, Visit Garden, Message, Feed labels
- `app/(tabs)/timeline/page.tsx` — Pot names, tag names, date format to `'MMM d'`
- `app/(tabs)/profile/page.tsx` — Stats (Pots / Posts / Likes), menu items in English

**Secondary pages:**
- `app/messages/page.tsx` (new server component) — message list with sender avatar, unread tint, "All caught up" empty state; back → /profile
- `app/posts/page.tsx` (new server component) — daily_records where has_post=true, cover image, pot tag, date, caption; empty state; back → /profile
- Removed `IconBookmark` + "Favorites" row from profile page

**MyGarden freeform bubble layout — `components/MyGarden/`:**
- `types.ts` — `PlantPot` (id, name, emoji, daysSinceStart, recordedToday, isArchived?) + `MyGardenProps`
- `useFreeformLayout.ts` — golden-angle phyllotaxis spiral, deterministic LCG hash for per-pot jitter, iterative collision push, ResizeObserver; all sizes relative to `min(w,h)*0.12`
- `PlantBubble.tsx` — entry animation (scale 0→1, `bubble-enter`), breathe animation on inner circle (`bubble-breathe`), 500 ms long-press, camera badge for unrecorded pots (`badge-pulse`), `onContextMenu` suppressed
- `PlantContextMenu.tsx` — Edit / Rename / Archive items; smart edge-flip positioning; `context-menu-enter` keyframe; outside-click dismiss with 50 ms delay
- `MyGarden.tsx` — orchestrates layout + bubbles + ADD_BUTTON_ID sentinel; header with pot count
- `index.ts` — re-exports `MyGarden` and `PlantPot`
- `app/globals.css` — added `bubble-enter`, `bubble-breathe`, `badge-pulse` keyframe animations
- `app/(tabs)/garden/GardenClientPage.tsx` — replaced PlantGrid + TaskList + ViewToggle with `<MyGarden>`; added `todayRecordedIds` prop; `potEmoji` helper
- `app/(tabs)/garden/page.tsx` — fetches `getTodayRecordedPotIds` in parallel; passes to client
- `lib/queries.ts` — added `getTodayRecordedPotIds(userName)` query

**TypeScript:** `npx tsc --noEmit` — 0 errors

**Status:** Done

---

### 2026-05-25 — Garden page layout unified to match Timeline

**Prompt / Task:**
> Unify Garden page layout with Timeline: Row 1 = "Garden" title (left) + ViewToggle (right), Row 2 = full-width SegmentedControl, Row 3+ = content. ViewToggle options switch contextually ([Map][Feed] for Community, [Grid][List] for My Garden). Do not touch Timeline, FloatingTabBar, or canvas/bubble internal logic.

**What was implemented:**

**`components/PublicGarden/types.ts`:**
- Added optional `viewMode?: 'map' | 'feed'` to `PublicGardenProps` (controlled by parent)

**`components/PublicGarden/PublicGarden.tsx`:**
- Removed internal `[viewMode, setViewMode]` state
- Removed the internal top bar (absolute-positioned div with "Community Garden" title + Map/Feed toggle)
- Now accepts `viewMode` as a prop (defaults to `'map'`)
- Feed view: fixed `top: 50` → `top: 0` (no longer needs to clear a now-deleted internal bar)
- Canvas/drag/tile logic: untouched

**`app/(tabs)/garden/GardenClientPage.tsx`:**
- Full rewrite matching Timeline's 3-row pattern:
  - Row 1: `"Garden"` title (18px/600 sage-900) + context-aware `ViewToggle`
  - Row 2: `SegmentedControl` full width
  - Row 3+: `flex: 1; minHeight: 0; position: relative` content area
- `communityView` state (`'map'|'feed'`) lifted from PublicGarden; passed as prop
- `gardenView` state (`'grid'|'list'`) new; drives My Garden sub-view
- New `PotListView` inline component: tap-to-navigate list of pots with emoji, name, days, unrecorded dot
- All three content variants use `position: absolute; inset: 0` inside the content area for reliable full-height fills
- `tasks` prop renamed `_tasks` (currently unused after TaskList removal)

**TypeScript:** `npx tsc --noEmit` — 0 errors

**Status:** Done

---

### 2026-05-25 — Public Garden tap fix + Post & Chat detail pages

**Prompt / Task:**
> (1) Fix community garden defaulting to map-drag instead of tap-to-select.
> (2) Build post detail pages for My Posts and Community Garden.
> (3) Build message chat detail (secondary page) when tapping a conversation.

**What was implemented:**

**Tap-to-select fix (`useGardenDrag.ts`):**
- Root cause: `snapToNearest` found the tile nearest to camera center, not the tap point. With SNAP_THRESHOLD=0.9 (≈77px radius), all tiles started outside that range so tapping did nothing.
- Fix: in `onPointerUp`, if `!wasDragging`, hit-test the tap coordinates against all tiles. Find closest tile within `base × 1.6` hit radius → snap directly to it. Drag-then-release path unchanged.

**Shared demo data (`lib/communityDemoData.ts`):**
- Extracted DEMO_COMMUNITY_TILES + MY_TILE to a shared module
- Added `COMMUNITY_TILE_MAP` (keyed by id) and `COMMUNITY_DEMO_COMMENTS` (per-tile hardcoded comments)
- `GardenClientPage.tsx` now imports from here

**My Post detail (`app/post/[id]/page.tsx`):**
- Server component; fetches `daily_record` + `pot` + `daily_comments` in parallel
- Full-width cover photo; card overlapping photo; pot name chip, date, caption, tags
- Interaction row: like count (demo), comment count
- Comments list + `CommentForm` client component
- Back → `/posts`

**Community post detail (`app/post/community/[id]/page.tsx`):**
- Server component; reads demo tile data from `communityDemoData.ts` by URL param id
- Emoji cover block, author card (avatar, name, relation tags, timestamp), post text
- Hardcoded demo comments from `COMMUNITY_DEMO_COMMENTS`
- `CommunityCommentInput` client sub-component: optimistic local-state replies (no DB)
- Back → `/garden`

**Shared comment form (`components/CommentForm.tsx`):**
- Client component; writes to `daily_comments` via supabase client; send button activates on text entry; reloads on success

**Chat page (`app/messages/[id]/`):**
- `page.tsx` (server): fetches message + full thread via `getConversationWith`; marks read; passes to client
- `ChatClient.tsx` (client): received bubbles (left, sage bg) + sent bubbles (right, green tint); sticky input bar at `bottom: 76px` above tab bar; Enter-to-send; auto-scroll to bottom
- Back → `/messages`

**New queries (`lib/queries.ts`):** `getMessageById`, `getConversationWith`

**Links wired up:**
- `app/posts/page.tsx` — post cards → `/post/[id]` (Link wraps card)
- `app/messages/page.tsx` — message rows → `/messages/[id]` (Link + chevron)
- `components/PublicGarden/GardenFeed.tsx` — feed items → `/post/community/[id]` (Link)

**TypeScript:** `npx tsc --noEmit` — 0 errors

**Status:** Done

**Notes:**
- `onAddPot`, `onEditPot`, `onRenamePot`, `onArchivePot` are `console.log` stubs; real modals TBD
- `tasks` prop in `GardenClientPage` is no longer consumed (TaskList removed from My Garden); harmless
- Supabase schema.sql + seed.sql still need to be manually run in Supabase SQL Editor

---

### 2026-05-25 — My Garden bubble layout tightening

**Prompt / Task:**
> 气泡排布太分散太规整，需要更有机自然。允许 10-15% 重叠、更大尺寸变化(最大 1.5× 最小)、更紧凑聚类、"+" 按钮从算法移出改为固定右下角，角标 z-index 要高于被遮挡的圆形。

**What was implemented:**

**`components/MyGarden/useFreeformLayout.ts`** (algorithm rewrite):
- `baseR = min(w,h) * 0.145` (was 0.12) — bigger base so bubbles read well
- Cluster center: `cy = containerH * 0.37` — leaves room below for + button
- Size variation range `[0.88, 1.32]` → max/min ratio 1.5×  (was constant 1.0)
- Tighter spiral: `spiralR = baseR * 1.55 * √i` (was 2.55) → initial placement much closer
- Overlap allowed: `minDist = (r + p.r) * 0.87` — edges can interpenetrate ~13%
- Angle jitter reduced: `±0.175 rad` (was ±0.3) → less scattering
- Collision iterations: 60 (was 50), push strength 0.55
- Bottom clearance: `vPadBottom = r * 1.85 + 80` — reserves 80 px for fixed + button

**`components/MyGarden/MyGarden.tsx`**:
- Removed `ADD_BUTTON_ID` sentinel constant entirely
- `layoutItems` now contains only real pots — `+` button no longer participates in algorithm
- Empty state: `visiblePots.length === 0` (was `positions.has(ADD_BUTTON_ID)`)
- Removed old add-button IIFE rendering block
- Added fixed `<button>` at `position: absolute; bottom: 20px; right: 16px; width: 56px; height: 56px` (dashed border, frosted glass, `zIndex: 200`)
- Bubble `zIndex`: recorded pots → `i + 1`; unrecorded pots → `visiblePots.length + i + 10` (badge-bearing bubbles always on top)

**`components/MyGarden/PlantBubble.tsx`**:
- Added optional `zIndex?: number` prop
- Applied to `outerStyle.zIndex` (defaults to `index + 1` if not provided)

**TypeScript:** `npx tsc --noEmit` — 0 errors

**Status:** Done

---

### 2026-05-25 — Auth (Option A), Camera Upload, User Profile, Post Button

**Prompt / Task:**
> (1) Implement Option A auth so each user can only modify/manage their own garden, pots, posts.
> (2) Build the other-user profile page accessible by tapping an avatar from a post.
> (3) Wire up camera + image upload flow; connect Timeline "Post" button to publish a record.

**What was implemented:**

**Auth infrastructure:**
- Installed `@supabase/ssr` — SSR-compatible cookie-based auth
- `lib/supabase-server.ts` — server-side Supabase client using `cookies()` from next/headers
- `lib/supabase-browser.ts` — singleton browser client for `'use client'` components
- `lib/auth.ts` — `getServerUser()` + `getServerDisplayName()` helpers for Server Components
- `middleware.ts` — protects `/camera` route (redirects to `/auth/login?next=/camera`); refreshes session cookie on every request; redirects logged-in users away from auth pages
- `app/auth/login/page.tsx` + `LoginForm.tsx` — email/password sign-in with show/hide password toggle and error handling
- `app/auth/signup/page.tsx` + `SignupForm.tsx` — email/password signup with display_name + emoji avatar picker; email confirmation flow
- `app/auth/callback/route.ts` — exchanges Supabase code for session after email confirmation
- `app/auth/signout/route.ts` — POST handler that signs out + redirects to login

**SQL migration `supabase/auth_rls.sql`** (run in Supabase SQL Editor):
- `profiles` table (user_id PK, display_name, avatar_emoji, bio)
- Trigger `on_auth_user_created` — auto-creates profile from signup metadata
- `user_id UUID` column added to `pots` and `daily_records` (nullable for seed data compat)
- Dropped old "public write" policies; replaced with auth-based ownership policies:
  - `pots`: INSERT/UPDATE/DELETE require `auth.uid() = user_id`
  - `daily_records`: same pattern
  - `tasks`: write requires authenticated user owns the parent pot
- Storage RLS snippets included (commented, enable if needed)

**Type updates:**
- `lib/types.ts` — added `Profile` interface; added `user_id: string | null` to `Pot` + `DailyRecord`
- `components/CardDeck/types.ts` — added `potId?`, `caption?` to `CardData`

**New query functions in `lib/queries.ts`:**
- `getPotsForUser(userId)` — fetches by user_id, falls back to 'Guest' demo
- `getTodayRecordedPotIdsForUser(userId)` — same pattern
- `createPot(userId, name, emoji)`
- `upsertDailyRecord(params)` — upserts by pot_id+record_date unique constraint
- `markRecordAsPost(recordId, caption?)` — sets has_post=true
- `getProfileByUserId`, `getPotsByUserId`, `getPublicPostsByUserId`
- `getRecordsCountForUser(userId)`

**Camera page `app/camera/page.tsx`:**
- Pot selector (horizontal scrollable circles, pre-selects `?pot=` param)
- Two-button photo input: "Take Photo" (`capture="environment"`) + "Choose" (gallery)
- Canvas-based `resizeImage()` (max 1200px, 0.85 JPEG quality) — ported from legacy
- Supabase Storage upload to `{potId}/{YYYY-MM-DD}_{filename}` path
- `upsertDailyRecord` — creates or updates today's record for the selected pot
- "Publish as post" toggle (sets `has_post=true`)
- On success → redirects to `/timeline?pot={potId}`

**User profile page `app/user/[id]/page.tsx`:**
- Short/non-UUID IDs → demo community user (uses `COMMUNITY_TILE_MAP`)
- Full UUID (36 chars) → real user profile from `profiles` + `pots` + `daily_records`
- Avatar, display_name, bio; Follow + Message buttons (stubbed)
- Horizontal pots strip; scrollable post feed with image thumbnails

**PostPublishModal `components/PostPublishModal.tsx`:**
- Bottom sheet (slideUp animation) triggered by "Post" button on focused card
- Caption textarea, "Publish" / "Save changes" button, loading + done states
- Calls `markRecordAsPost(recordId, caption)` via browser Supabase client
- Auth guard: shows error if user not logged in
- Demo card guard: shows error for short-ID (non-DB) cards
- On success → calls `onPublished()` + closes; parent calls `router.refresh()`

**Timeline page rewrite:**
- `app/(tabs)/timeline/page.tsx` — Server Component; uses `getServerUser()` to fetch pots/records for auth user (falls back to Guest)
- `app/(tabs)/timeline/TimelineClientPage.tsx` — Client component with PotSelector, CardDeck, ViewToggle, empty states, PostPublishModal integration
- Pot selection updates URL param → server re-renders with new records
- Empty state prompts user to take a photo via direct link to `/camera?pot=...`

**Garden + Profile pages:**
- Updated to call `getPotsForUser(userId)` and `getRecordsCountForUser(userId)`
- Profile shows auth user's avatar_emoji + display_name; "Sign in" prompt when logged out; "Sign out" button when logged in

**FloatingTabBar:**
- Hidden on `/auth/*` and `/camera` routes (these have their own headers)
- Camera center button now navigates to `/camera` (middleware handles auth redirect)

**TypeScript:** `npx tsc --noEmit` — 0 errors

**Status:** Done

**Notes:**
- `supabase/auth_rls.sql` must be run manually in Supabase SQL Editor AFTER `schema.sql`
- Supabase Email Confirmation must be enabled in Supabase Auth settings (or disable for local dev)
- Add `NEXT_PUBLIC_SITE_URL=https://your-domain.com` to `.env.local` for production redirects
- Follow/Message buttons on user profile page are stubs (no real follow/message DB logic yet)

---
