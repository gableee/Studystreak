export interface StreakTier {
  min: number
  max: number
  label: string
  color: string
  textColor: string
  bgGradient: string
  glowClass: string
}

export const STREAK_TIER_CONFIG: StreakTier[] = [
  {
    min: 0,
    max: 0,
    label: 'No Streak',
    color: 'gray',
    textColor: 'text-gray-500',
    bgGradient: 'from-gray-300 to-gray-500',
    glowClass: 'shadow-gray-400/20',
  },
  {
    min: 1,
    max: 9,
    label: 'Beginner',
    color: 'red-light',
    textColor: 'text-red-400',
    bgGradient: 'from-red-300 to-red-500',
    glowClass: 'shadow-red-400/30',
  },
  {
    min: 10,
    max: 29,
    label: 'Consistent',
    color: 'red',
    textColor: 'text-red-500',
    bgGradient: 'from-red-400 to-red-600',
    glowClass: 'shadow-red-500/40',
  },
  {
    min: 30,
    max: 49,
    label: 'Dedicated',
    color: 'red-deep',
    textColor: 'text-red-600',
    bgGradient: 'from-red-500 to-red-700',
    glowClass: 'shadow-red-600/50',
  },
  {
    min: 50,
    max: 99,
    label: 'Elite',
    color: 'red-dark',
    textColor: 'text-red-700',
    bgGradient: 'from-red-600 to-red-800',
    glowClass: 'shadow-red-700/60',
  },
  {
    min: 100,
    max: Infinity,
    label: 'Legendary',
    color: 'orange',
    textColor: 'text-orange-500',
    bgGradient: 'from-orange-400 to-orange-600',
    glowClass: 'shadow-orange-500/70',
  },
]
