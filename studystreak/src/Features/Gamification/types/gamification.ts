export interface GamificationProfile {
  level: number;
  experiencePoints: number;
  streakCount: number;
  streakLongest: number;
  totalStudyTimeMinutes: number;
  streakLastActiveAt: string | null;
  streakTimezone: string | null;
  username: string | null;
  isStreakActive: boolean;
  
  // Streak saver fields
  streakSaversAvailable: number;
  streakSaversUsed: number;
  streakSaversMaxPerMonth: number;
  streakSaversLastReset: string | null;
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
  streak_savers_available?: number | null
  streak_savers_used?: number | null
  streak_savers_max_per_month?: number | null
  streak_savers_last_reset?: string | null
  is_streak_active?: boolean | null
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
  streakSaverWasUsed: boolean
}

export type UseStreakSaverResult = {
  success: boolean
  message: string
  saversRemaining?: number
  profile?: GamificationProfile
}
