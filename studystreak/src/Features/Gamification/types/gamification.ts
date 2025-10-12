export type GamificationProfile = {
  username: string | null
  streakCount: number
  streakLongest: number
  streakLastActiveAt: string | null
  streakTimezone: string | null
  totalStudyTimeMinutes: number
  level: number
  experiencePoints: number
  createdAt: string | null
}

export type GamificationApiResponse = {
  username?: string | null
  streak_count?: number | null
  streak_longest?: number | null
  streak_last_active_at?: string | null
  streak_timezone?: string | null
  total_study_time?: number | null
  level?: number | null
  experience_points?: number | null
  created_at?: string | null
}

export type StreakActivationPayload = {
  occurredAt?: string
  timezone?: string
  studyMinutes?: number
  durationMinutes?: number
}

export type StreakActivationResult = {
  profile: GamificationProfile
  streakWasIncremented: boolean
  streakWasReset: boolean
  studyMinutesApplied: number
}
