# Auth & Security Chain Template

## Overview

Reusable security architecture for any Next.js + Supabase project.
Drop this file into your project root as CLAUDE.md or reference it in prompts.
Replace [ENTITY] with your app's main data type (e.g. orders, documents, tasks).

---

## The 7-Link Security Chain

Every link must be implemented. If any link breaks, data leaks.

```
① Sign-up → ② Sign-in → ③ Session → ④ Protected Route
→ ⑤ Ownership/Role → ⑥ RLS Policy → ⑦ 0 Rows on cross-user query
```

---

## Choose Your Access Model

### Option A: Simple (single role, user owns their data)

Use when: personal apps, note-taking, bookmarks, todo lists.
Every table has `user_id`, every RLS policy checks `auth.uid() = user_id`.

### Option B: Role-based (admin + limited users)

Use when: one admin manages data, other users have scoped access.
Requires `profiles` table with `role` field + helper functions.

### Option C: Team-based (multiple users share data within a team)

Use when: collaborative apps, team dashboards.
Requires `teams` table + `team_members` join table + team-scoped RLS.

---

## Option A: Simple User Ownership

### Database

```sql
CREATE TABLE [ENTITY] (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  -- your fields here --
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE [ENTITY] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON [ENTITY]
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON [ENTITY]
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON [ENTITY]
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON [ENTITY]
  FOR DELETE USING (auth.uid() = user_id);
```

### CRUD Rules

```
Create: set user_id from supabase.auth.getUser(), NEVER from form input
Read:   just query — RLS filters automatically
Update: .update(data).eq('id', id) — RLS blocks other users' rows
Delete: .delete().eq('id', id) — RLS blocks other users' rows
```

---

## Option B: Role-Based Access

### Profiles Table

```sql
CREATE TABLE profiles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  linked_entity_id uuid,  -- optional: link user to a specific parent record
  display_name text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can always read their own profile (NO dependency on get_my_role)
CREATE POLICY "read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_read_profiles" ON profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "insert_own_profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_update_profiles" ON profiles
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );
```

### Helper Functions

```sql
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_linked_id()
RETURNS uuid AS $$
  SELECT linked_entity_id FROM profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Entity RLS Pattern

```sql
ALTER TABLE [ENTITY] ENABLE ROW LEVEL SECURITY;

-- Admin sees all
CREATE POLICY "admin_select" ON [ENTITY]
  FOR SELECT USING (get_my_role() = 'admin');

-- User sees only linked records
CREATE POLICY "user_select" ON [ENTITY]
  FOR SELECT USING (id = get_my_linked_id());
  -- or for child tables: parent_id = get_my_linked_id()

-- Only admin can write
CREATE POLICY "admin_insert" ON [ENTITY]
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "admin_update" ON [ENTITY]
  FOR UPDATE USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "admin_delete" ON [ENTITY]
  FOR DELETE USING (get_my_role() = 'admin');
```

---

## Option C: Team-Based Access

### Tables

```sql
CREATE TABLE teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE team_members (
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE [ENTITY] (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  -- your fields here --
  created_at timestamptz DEFAULT now() NOT NULL
);
```

### RLS

```sql
ALTER TABLE [ENTITY] ENABLE ROW LEVEL SECURITY;

-- Team members can read their team's data
CREATE POLICY "team_select" ON [ENTITY]
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = [ENTITY].team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Team members can create within their team
CREATE POLICY "team_insert" ON [ENTITY]
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = [ENTITY].team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Only creator or team admin can update/delete
CREATE POLICY "team_update" ON [ENTITY]
  FOR UPDATE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = [ENTITY].team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );
```

---

## Auth Setup (all options)

### Supabase Client

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Sign-up with Profile Creation

```typescript
const { data, error } = await supabase.auth.signUp({ email, password })
if (data.user) {
  await supabase.from('profiles').insert({
    user_id: data.user.id,
    role: 'user',  // default role
  })
}
```

### Middleware Route Protection

```typescript
// middleware.ts (project root, NOT inside src/)
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* cookie handling */ } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*']
}
```

### Login with Redirect

```typescript
const { error } = await supabase.auth.signInWithPassword({ email, password })
if (!error) {
  const next = searchParams.get('next') || '/dashboard'
  window.location.href = next  // hard navigation, not router.push
}
```

---

## Input Validation Template

```typescript
// src/lib/validation.ts

export function sanitizeHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

export function validateRequired(value: string, field: string): string | null {
  return value.trim() ? null : `${field} is required`
}

export function validateMaxLength(value: string, max: number, field: string): string | null {
  return value.length <= max ? null : `${field} must be ${max} characters or fewer`
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
```

---

## Security Checklist (copy into every project README)

- [ ] RLS enabled on ALL tables with user data
- [ ] Service-role key NEVER in client code
- [ ] user_id / created_by always from session, never from form input
- [ ] `grep -r "supabase.co" src/` returns zero results
- [ ] `.env.local` is in `.gitignore`
- [ ] Every `supabase.from()` call checks for `error`
- [ ] Every `supabase.auth` call has error handling
- [ ] No `console.log` of passwords, tokens, or user data
- [ ] Required fields validated before database calls
- [ ] Text inputs sanitized (HTML tags stripped)
- [ ] Length limits enforced on all text fields
- [ ] Email format validated when applicable
- [ ] Loading state shown during async operations
- [ ] Delete actions require confirmation

---

## Known Pitfalls (from real debugging)

1. **`.single()` vs `.maybeSingle()`**: Use `.maybeSingle()` when the row
   might not exist. `.single()` throws 406 on 0 rows.

2. **`router.push` + `router.refresh` race**: After login, use
   `window.location.href` instead. Hard navigation ensures the auth
   cookie is included in the next request.

3. **Circular RLS dependency**: If `get_my_role()` reads from `profiles`,
   the `profiles` table's own RLS must NOT call `get_my_role()`. Use
   `auth.uid() = user_id` directly for the `read_own_profile` policy.

4. **Profile not created on signup**: Always add fallback logic — if
   `.maybeSingle()` returns null for the profile, auto-insert a default
   row. Signup-time inserts can silently fail.

5. **RLS enabled without policies = total lockout**: After
   `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, ALL access is blocked
   until you create explicit policies. This is correct (deny-by-default)
   but looks like a bug if you forget.

6. **Storage RLS is separate**: Supabase Storage has its own policies on
   `storage.objects`. Database RLS does not protect files. You need both.
