import { useCallback } from 'react'
import { useAuth } from '@/Auth/hooks/useAuth'
import { gamificationService } from '../services/gamificationService'
import { triggerGamificationProfileRefresh, updateGamificationProfile } from './useGamificationProfile'
import { ensureUserTimezone } from '@/lib/timezone'

type ActivateOptions = {
  occurredAt?: string
  studyMinutes?: number
  timezoneOverride?: string
}

const deriveTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  } catch (error) {
    console.debug('[useStreakActivation] Unable to resolve timezone, defaulting to UTC', error)
    return 'UTC'
  }
}

export const useStreakActivation = () => {
  const { session } = useAuth()

  const activate = useCallback(
    async ({ occurredAt, studyMinutes, timezoneOverride }: ActivateOptions = {}) => {
      if (!session?.access_token) {
        console.debug('[useStreakActivation] Skipping activation – no access token')
        return { ok: false as const, error: new Error('missing_token') }
      }

      const timezone = timezoneOverride ?? deriveTimezone()

      try {
        await ensureUserTimezone()
        const result = await gamificationService.activateStreak(session.access_token, {
          occurredAt,
          timezone,
          studyMinutes,
        })
        // Immediately update the profile with the fresh data from the response
        updateGamificationProfile(result.profile)
        // Also trigger a refresh for any other listeners
        triggerGamificationProfileRefresh()
        return { ok: true as const, result }
      } catch (error) {
        console.error('[useStreakActivation] Activation failed', error)
        return { ok: false as const, error }
      }
    },
    [session?.access_token],
  )

  return { activate }
}
