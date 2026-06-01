'use client'

import type { DailyRecord } from '@/lib/types'

interface PotItem {
  id: string
  name: string
  emoji: string
  days: number
}

interface UserGardenClientProps {
  userId: string
  pots: PotItem[]
  posts: DailyRecord[]
  initialFollowing: boolean
  isOwnGarden: boolean
  isDemoUser: boolean
}

export function UserGardenClient(_props: UserGardenClientProps) {
  return null
}
