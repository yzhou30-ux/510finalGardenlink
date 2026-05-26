// Mock supabase before importing queries
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockLimit = jest.fn()
const mockSingle = jest.fn()
const mockMaybeSingle = jest.fn()
const mockIn = jest.fn()

const mockChain = {
  select: mockSelect,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
  in: mockIn,
}

// Each method returns the chain so calls can be chained
Object.values(mockChain).forEach(fn => fn.mockReturnValue(mockChain))

const mockFrom = jest.fn().mockReturnValue(mockChain)

jest.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-key',
}))

import {
  getRecordsByPot,
  getMyPostsWithPotName,
  getCommunityPosts,
  getCommentsByRecord,
} from '@/lib/queries'

beforeEach(() => {
  jest.clearAllMocks()
  // Reset chain returns after clearAllMocks
  Object.values(mockChain).forEach(fn => fn.mockReturnValue(mockChain))
})

describe('getMyPostsWithPotName', () => {
  it('returns empty array when userId is null', async () => {
    const result = await getMyPostsWithPotName(null)
    expect(result).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('queries daily_records with has_post=true for given userId', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 'r1', pot_id: 'p1', user_id: 'u1', has_post: true,
          record_date: '2026-03-01', image_url: null, caption: null,
          tags: null, post_category: null, created_at: '', user_name: 'u1',
          thumb_url: null,
          pots: { name: 'Rose', icon: '🌹' },
        },
      ],
      error: null,
    })

    const result = await getMyPostsWithPotName('u1')
    expect(mockFrom).toHaveBeenCalledWith('daily_records')
    expect(mockSelect).toHaveBeenCalledWith('*, pots(name, icon)')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1')
    expect(mockEq).toHaveBeenCalledWith('has_post', true)
    expect(result).toHaveLength(1)
    expect(result[0].pot_name).toBe('Rose')
  })

  it('returns empty array on supabase error', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'fail' } })
    const result = await getMyPostsWithPotName('u1')
    expect(result).toEqual([])
  })
})

describe('getRecordsByPot', () => {
  it('queries by pot_id and orders by record_date desc', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null })

    await getRecordsByPot('pot-123')
    expect(mockFrom).toHaveBeenCalledWith('daily_records')
    expect(mockEq).toHaveBeenCalledWith('pot_id', 'pot-123')
    expect(mockOrder).toHaveBeenCalledWith('record_date', { ascending: false })
  })

  it('throws on supabase error', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'DB down' } })
    await expect(getRecordsByPot('pot-123')).rejects.toThrow('DB down')
  })
})

describe('getCommunityPosts', () => {
  it('queries has_post=true with limit', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    await getCommunityPosts(10)
    expect(mockFrom).toHaveBeenCalledWith('daily_records')
    expect(mockEq).toHaveBeenCalledWith('has_post', true)
    expect(mockLimit).toHaveBeenCalledWith(10)
  })
})

describe('getCommentsByRecord', () => {
  it('queries daily_comments by record_id', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null })

    await getCommentsByRecord('rec-1')
    expect(mockFrom).toHaveBeenCalledWith('daily_comments')
    expect(mockEq).toHaveBeenCalledWith('record_id', 'rec-1')
  })

  it('returns empty array when no comments exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null })
    const result = await getCommentsByRecord('rec-empty')
    expect(result).toEqual([])
  })
})
