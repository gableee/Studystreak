import { Shield } from 'lucide-react'
import { useMemo } from 'react'
import { useStreakSaver } from '../hooks/useStreakSaver'
import type { GamificationProfile } from '../types/gamification'

interface StreakSaverDisplayProps {
  profile: GamificationProfile
}

export function StreakSaverDisplay({ profile }: StreakSaverDisplayProps) {
  const { applySaver, isLoading } = useStreakSaver()

  const { needsSaver, canUseSaver, requiredSavers } = useMemo(() => {
    const streakGreaterThanZero = profile.streakCount > 0
    const required = profile.streakCount >= 30 ? 5 : 1
    const available = profile.streakSaversAvailable >= required
    const activeToday = profile.isStreakActive

    return {
      needsSaver: streakGreaterThanZero && !activeToday,
      canUseSaver: available,
      requiredSavers: required,
    }
  }, [profile.isStreakActive, profile.streakCount, profile.streakSaversAvailable])

  const handleUseSaver = async () => {
    if (!canUseSaver) return

    try {
  const result = await applySaver()
      if (result?.message) {
        console.info('[StreakSaverDisplay] streak saver response', result)
      }
    } catch (error) {
      console.error('[StreakSaverDisplay] failed to use streak saver', error)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 text-xs md:text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        <Shield className="h-4 w-4 text-blue-500" aria-hidden="true" />
        <span>
          {profile.streakSaversAvailable}/{profile.streakSaversMaxPerMonth} streak savers left
        </span>
      </div>

      {needsSaver && (
        <button
          onClick={handleUseSaver}
          disabled={isLoading || !canUseSaver}
          className="px-3 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Using…' : `Use ${requiredSavers} saver${requiredSavers > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}
