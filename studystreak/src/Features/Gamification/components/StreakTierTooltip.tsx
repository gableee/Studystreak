import { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { STREAK_TIER_CONFIG } from '../constants/streakTiers'

interface StreakTierTooltipProps {
  currentStreak: number
  isActive: boolean
}

export function StreakTierTooltip({ currentStreak, isActive }: StreakTierTooltipProps) {
  const currentTierIndex = useMemo(() => {
    return STREAK_TIER_CONFIG.findIndex((tier) => currentStreak >= tier.min && currentStreak <= tier.max)
  }, [currentStreak])

  return (
    <div className="fixed md:absolute top-16 md:top-full left-4 right-4 md:left-auto md:right-0 md:mt-2 w-auto md:w-80 max-w-sm md:max-w-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh] overflow-y-auto">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Streak Tiers</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Your current streak: <span className="font-bold">{currentStreak} day{currentStreak !== 1 ? 's' : ''}</span>
          {!isActive && currentStreak > 0 && (
            <span className="ml-1 text-orange-600 dark:text-orange-400">(inactive today)</span>
          )}
        </p>
      </div>

      <div className="space-y-2">
        {STREAK_TIER_CONFIG.map((tier, index) => {
          const isCurrent = index === currentTierIndex
          const isCompleted = currentStreak > tier.max
          const rangeText = tier.max === Infinity ? `${tier.min}+` : `${tier.min}-${tier.max}`

          return (
            <div
              key={tier.label}
              className={`relative flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-400 dark:border-blue-600'
                  : isCompleted
                    ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Flame Icon */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${tier.bgGradient} ${tier.glowClass} shadow-lg flex-shrink-0`}
              >
                <Flame
                  size={20}
                  className={`text-white ${isCompleted || isCurrent ? 'drop-shadow-lg' : 'opacity-60'}`}
                />
              </div>

              {/* Tier Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h4
                    className={`text-sm font-bold ${
                      isCurrent ? 'text-blue-700 dark:text-blue-400' : tier.textColor
                    }`}
                  >
                    {tier.label}
                  </h4>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 tabular-nums">
                    {rangeText} {rangeText === '0' ? 'day' : 'days'}
                  </span>
                </div>

                {/* Progress Bar (only for current tier) */}
                {isCurrent && tier.max !== Infinity && tier.max > tier.min && (
                  <div className="mt-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          ((currentStreak - tier.min) / (tier.max - tier.min)) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                )}

                {isCurrent && tier.max !== Infinity && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {tier.max - currentStreak} more day{tier.max - currentStreak !== 1 ? 's' : ''} to next tier
                  </p>
                )}
              </div>

              {/* Status Badge */}
              {isCurrent && (
                <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-lg">
                  Current
                </div>
              )}
              {isCompleted && !isCurrent && (
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          Keep your streak alive by studying every day!
        </p>
      </div>
    </div>
  )
}
