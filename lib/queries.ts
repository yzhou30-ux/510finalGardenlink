// lib/queries.ts — Supabase query helpers（Server Components 用）
import { supabase } from './supabase'
import type { Pot, DailyRecord, Task, DailyComment, Message, Profile } from './types'

// A published post joined with its pot's display info
export type PostWithPot = DailyRecord & { pot_name: string; pot_icon: string }

// ─── Pots ─────────────────────────────────────────────────────────────────

export async function getPots(userName = 'Guest'): Promise<Pot[]> {
  const { data, error } = await supabase
    .from('pots')
    .select('*')
    .eq('user_name', userName)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getPotById(id: string): Promise<Pot | null> {
  const { data, error } = await supabase
    .from('pots')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

// ─── Daily Records ────────────────────────────────────────────────────────

/** 获取某个花盆的所有记录，按日期降序 */
export async function getRecordsByPot(potId: string): Promise<DailyRecord[]> {
  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .eq('pot_id', potId)
    .order('record_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** 获取某个花盆某天的记录（可能不存在） */
export async function getRecordByDate(
  potId: string,
  date: string, // "YYYY-MM-DD"
): Promise<DailyRecord | null> {
  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .eq('pot_id', potId)
    .eq('record_date', date)
    .single()
  if (error) return null
  return data
}

/** 获取 Post 详情页需要的记录 */
export async function getRecordById(id: string): Promise<DailyRecord | null> {
  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

/** Returns the set of pot IDs that already have a daily_record for today. */
export async function getTodayRecordedPotIds(userName = 'Guest'): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0]  // YYYY-MM-DD
  const { data, error } = await supabase
    .from('daily_records')
    .select('pot_id')
    .eq('user_name', userName)
    .eq('record_date', today)
  if (error) return []
  return (data ?? []).map((r: { pot_id: string }) => r.pot_id)
}

// ─── Tasks ────────────────────────────────────────────────────────────────

/** 获取某用户所有花盆的任务（两步查询，可靠避免 foreign-table filter 问题） */
export async function getTasksByUser(userName = 'Guest'): Promise<Task[]> {
  const pots = await getPots(userName)
  if (pots.length === 0) return []
  const potIds = pots.map(p => p.id)
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .in('pot_id', potIds)
    .order('type', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** 获取用户的动态（daily_records）总数 */
export async function getRecordsCount(userName = 'Guest'): Promise<number> {
  const { count, error } = await supabase
    .from('daily_records')
    .select('id', { count: 'exact', head: true })
    .eq('user_name', userName)
  if (error) return 0
  return count ?? 0
}

export async function getTasksByPot(potId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('pot_id', potId)
    .order('type', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** 标记任务为今天已完成 */
export async function completeTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ completed_today: true })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
}

// ─── Daily Comments (v2) ──────────────────────────────────────────────────
// NOTE: Uses `daily_comments` table. Legacy `comments` table (highlight_id) is separate.

export async function getCommentsByRecord(recordId: string): Promise<DailyComment[]> {
  const { data, error } = await supabase
    .from('daily_comments')
    .select('*')
    .eq('record_id', recordId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function addComment(recordId: string, userName: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('daily_comments')
    .insert({ record_id: recordId, user_name: userName, body })
  if (error) throw new Error(error.message)
}

// ─── Messages ─────────────────────────────────────────────────────────────

export async function getMessages(userName = 'Guest'): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_name', userName)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getUnreadCount(userName = 'Guest'): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_name', userName)
    .eq('is_read', false)
  if (error) return 0
  return count ?? 0
}

export async function markMessageRead(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('id', messageId)
  if (error) throw new Error(error.message)
}

export async function getMessageById(id: string): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

/** Fetch all messages received from a specific sender, oldest-first (for thread view). */
export async function getConversationWith(userName: string, senderName: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_name', userName)
    .eq('sender_name', senderName)
    .order('created_at', { ascending: true })
  if (error) return []
  return data ?? []
}

/**
 * Fetch the full two-sided conversation between two users.
 * Returns all messages where (user_name=me AND sender_name=other)
 * OR (user_name=other AND sender_name=me), sorted oldest-first.
 * Used for the chat thread view so sent replies are shown alongside received.
 */
export async function getFullConversation(
  myUserName: string,
  otherUserName: string,
): Promise<Message[]> {
  const [received, sent] = await Promise.all([
    // Messages received by me from the other person
    supabase
      .from('messages')
      .select('*')
      .eq('user_name', myUserName)
      .eq('sender_name', otherUserName),
    // Messages I sent to the other person (sit in their inbox)
    supabase
      .from('messages')
      .select('*')
      .eq('user_name', otherUserName)
      .eq('sender_name', myUserName),
  ])
  const all: Message[] = [
    ...((received.data as Message[]) ?? []),
    ...((sent.data as Message[]) ?? []),
  ]
  // Sort by created_at ascending
  all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  return all
}

// ─── Auth-aware mutations (require real user_id from auth) ────────────────────

/**
 * Fetch pots for an authenticated user (by user_id).
 * Falls back to the demo 'Guest' pots if userId is null.
 */
export async function getPotsForUser(userId: string | null): Promise<Pot[]> {
  if (!userId) return getPots('Guest')
  const { data, error } = await supabase
    .from('pots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) return []
  return data ?? []
}

/**
 * Get today's recorded pot IDs for an authenticated user.
 * Falls back to the 'Guest' check if userId is null.
 */
export async function getTodayRecordedPotIdsForUser(userId: string | null): Promise<string[]> {
  if (!userId) return getTodayRecordedPotIds('Guest')
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('daily_records')
    .select('pot_id')
    .eq('user_id', userId)
    .eq('record_date', today)
  if (error) return []
  return (data ?? []).map((r: { pot_id: string }) => r.pot_id)
}

/**
 * Get all daily records for a pot, ordered newest-first.
 * Works with both demo (user_name) and real (user_id) data.
 */
export async function getRecordsByPotForUser(
  potId: string,
): Promise<DailyRecord[]> {
  return getRecordsByPot(potId)   // RLS + pot ownership already enforced
}

/**
 * Create a new pot for an authenticated user.
 * daysOwned is computed from the chosen start date (0 = today).
 */
export async function createPot(
  userId: string,
  name: string,
  emoji: string,
  daysOwned = 0,
): Promise<Pot> {
  const { data, error } = await supabase
    .from('pots')
    .insert({
      user_id: userId,
      user_name: userId,   // keep user_name for backward compat queries
      name,
      icon: emoji,
      days_owned: daysOwned,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Upsert a daily record (one record per pot per day).
 * Creates a new record or updates the existing one for today.
 *
 * ⚠️  SERVER-SIDE ONLY — uses the singleton Supabase client which carries no
 * browser auth token.  Calling this from a Client Component will always fail
 * the RLS INSERT policy (auth.uid() = user_id).
 * Client-side uploads must use createSupabaseBrowserClient() and call
 * supabase.auth.getUser() to obtain user.id at write time (see camera/page.tsx).
 */
export async function upsertDailyRecord(params: {
  userId: string
  potId: string
  recordDate: string       // "YYYY-MM-DD"
  imageUrl?: string | null
  thumbUrl?: string | null
  caption?: string | null
  tags?: string[]
  hasPost?: boolean
}): Promise<DailyRecord> {
  const { userId, potId, recordDate, imageUrl, thumbUrl, caption, tags, hasPost } = params
  const { data, error } = await supabase
    .from('daily_records')
    .upsert(
      {
        user_id: userId,
        user_name: userId,
        pot_id: potId,
        record_date: recordDate,
        ...(imageUrl !== undefined  && { image_url: imageUrl }),
        ...(thumbUrl !== undefined  && { thumb_url: thumbUrl }),
        ...(caption  !== undefined  && { caption }),
        ...(tags     !== undefined  && { tags }),
        ...(hasPost  !== undefined  && { has_post: hasPost }),
      },
      { onConflict: 'pot_id,record_date' }
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Mark an existing daily record as a published post, optionally updating its caption.
 * Security link ⑤: only the owner's record can be updated (enforced by RLS).
 */
export async function markRecordAsPost(
  recordId: string,
  caption?: string,
): Promise<void> {
  const update: Record<string, unknown> = { has_post: true }
  if (caption !== undefined) update.caption = caption
  const { error } = await supabase
    .from('daily_records')
    .update(update)
    .eq('id', recordId)
  if (error) throw new Error(error.message)
}

/**
 * Fetch the user's own profile.
 */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

/**
 * Fetch all public posts (has_post=true) by a given user_id — for their profile page.
 */
export async function getPublicPostsByUserId(userId: string): Promise<DailyRecord[]> {
  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .eq('user_id', userId)
    .eq('has_post', true)
    .order('record_date', { ascending: false })
  if (error) return []
  return data ?? []
}

/**
 * Fetch all pots owned by a given user_id — for their public profile page.
 */
export async function getPotsByUserId(userId: string): Promise<Pot[]> {
  const { data, error } = await supabase
    .from('pots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) return []
  return data ?? []
}

/**
 * Fetch the records count for an authenticated user.
 */
export async function getRecordsCountForUser(userId: string | null): Promise<number> {
  if (!userId) return getRecordsCount('Guest')
  const { count, error } = await supabase
    .from('daily_records')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) return 0
  return count ?? 0
}

/**
 * Count of published posts (has_post=true) for an authenticated user.
 */
export async function getPostsCountForUser(userId: string | null): Promise<number> {
  if (!userId) return 0
  const { count, error } = await supabase
    .from('daily_records')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('has_post', true)
  if (error) return 0
  return count ?? 0
}

/**
 * Fetch the current user's published posts, joined with pot name and icon.
 * Queries by user_id (not user_name) — correct for auth users.
 */
export async function getMyPostsWithPotName(userId: string | null): Promise<PostWithPot[]> {
  if (!userId) return []
  const { data, error } = await supabase
    .from('daily_records')
    .select('*, pots(name, icon)')
    .eq('user_id', userId)
    .eq('has_post', true)
    .order('record_date', { ascending: false })
  if (error) return []
  return (data ?? []).map((row: DailyRecord & { pots: { name: string; icon: string } | null }) => ({
    ...row,
    pot_name: row.pots?.name ?? 'Unknown',
    pot_icon: row.pots?.icon ?? '🪴',
  }))
}

/**
 * Fetch recent community posts (has_post=true, all users), joined with pot info.
 * Used to populate the community feed in the garden page.
 */
export async function getCommunityPosts(limit = 30): Promise<PostWithPot[]> {
  const { data, error } = await supabase
    .from('daily_records')
    .select('*, pots(name, icon)')
    .eq('has_post', true)
    .order('record_date', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []).map((row: DailyRecord & { pots: { name: string; icon: string } | null }) => ({
    ...row,
    pot_name: row.pots?.name ?? 'Unknown',
    pot_icon: row.pots?.icon ?? '🪴',
  }))
}
