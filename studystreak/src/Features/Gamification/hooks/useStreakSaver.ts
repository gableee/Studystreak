import { useState } from 'react'
import { useAuth } from '@/Auth/hooks/useAuth'
import { gamificationService } from '../services/gamificationService'
import { triggerGamificationProfileRefresh, updateGamificationProfile } from './useGamificationProfile'
import type { UseStreakSaverResult } from '../types/gamification'

export const useStreakSaver = () => {
  const { session } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applySaver = async (): Promise<UseStreakSaverResult | null> => {
    if (!session?.access_token) {
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
  const result = await gamificationService.useStreakSaver(session.access_token)
      // If the result includes an updated profile, use it immediately
      if (result.profile) {
        updateGamificationProfile(result.profile)
      }
      // Also trigger a refresh for any other listeners
      triggerGamificationProfileRefresh()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to use streak saver'
      setError(message)
      console.error('[useStreakSaver] failed to use saver', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { applySaver, isLoading, error }
}
