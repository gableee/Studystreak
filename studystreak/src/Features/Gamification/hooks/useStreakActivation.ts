import { useCallback } from 'react'
import { useAuth } from '@/Auth/hooks/useAuth'
import { gamificationService } from '../services/gamificationService'
import { triggerGamificationProfileRefresh, updateGamificationProfile } from './useGamificationProfile'
import type { GamificationProfile } from '../types/gamification'
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
        if (result.profile) {
          updateGamificationProfile(result.profile)
          // Also trigger a refresh for any other listeners
          triggerGamificationProfileRefresh()
        } else {
          // Backend didn't return an updated profile; attempt to fetch it directly with retries.
          const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))
          const MAX_RETRIES = 3
          const RETRY_DELAY_MS = 500
          let fetched: GamificationProfile | null = null
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              // Try to fetch the latest profile from the server.
              // This helps when the activation endpoint doesn't return the new profile immediately
              // but the profile becomes available shortly after.
              // Note: gamificationService is imported above.
              fetched = await gamificationService.getProfile(session.access_token)
              if (fetched) {
                updateGamificationProfile(fetched)
                triggerGamificationProfileRefresh()
                break
              }
            } catch {
              // swallow and retry after delay
            }
            // wait before retrying
            await sleep(RETRY_DELAY_MS)
          }
        }
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
