/**
 * AppInterface Components
 * 
 * This file contains the primary layout components used across the application:
 * - Header: The top navigation bar with app branding and user controls
 * - SideBar: The left sidebar with main navigation links
 * 
 * These components provide consistent navigation and branding across all pages.
 * 
 * @module Application/AppInterface
 */

import { NavLink } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Flame, Sparkles, Star, Menu, X, LogOut } from 'lucide-react'
import { IconContainer } from './components/IconContainer';
import { ThemeToggle } from './components/LightMode';
import { useAuth } from '@/Auth/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { profileService, type UserProfile } from '@/Auth/services/profileService';
import { useGamificationProfile } from '@/Features/Gamification/hooks/useGamificationProfile'

type StreakTier = {
  min: number
  max: number
  color: string
  glow: string
  animation: string
}

const STREAK_TIERS: StreakTier[] = [
  { min: 0, max: 9, color: 'text-gray-400', glow: 'shadow-gray-400/20', animation: '' },
  { min: 10, max: 29, color: 'text-orange-500', glow: 'shadow-orange-500/40', animation: 'animate-pulse' },
  { min: 30, max: 49, color: 'text-rose-500', glow: 'shadow-rose-500/50', animation: 'animate-pulse' },
  { min: 50, max: 99, color: 'text-purple-500', glow: 'shadow-purple-500/60', animation: 'animate-pulse' },
  { min: 100, max: Infinity, color: 'text-yellow-400', glow: 'shadow-yellow-400/70', animation: 'animate-pulse' },
]

const SYSTEM_TIMEZONE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  } catch (error) {
    console.debug('[AppInterface] Unable to derive system timezone', error)
    return 'UTC'
  }
})()

function getStreakTier(streak: number): StreakTier {
  return STREAK_TIERS.find((tier) => streak >= tier.min && streak <= tier.max) ?? STREAK_TIERS[0]
}

function normalizeTimezone(candidate?: string | null): string {
  if (!candidate) return SYSTEM_TIMEZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate })
    return candidate
  } catch {
    return SYSTEM_TIMEZONE
  }
}

function parseTimestamp(value?: string | null): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const isoCandidate = !trimmed.includes('T') && trimmed.includes(' ') ? trimmed.replace(' ', 'T') : trimmed
  const parsed = new Date(isoCandidate)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getDateKey(date: Date, timeZone: string): string | null {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(date)
    const year = parts.find((part) => part.type === 'year')?.value
    const month = parts.find((part) => part.type === 'month')?.value
    const day = parts.find((part) => part.type === 'day')?.value
    if (!year || !month || !day) return null
    return `${year}-${month}-${day}`
  } catch (error) {
    console.debug('[AppInterface] Failed to derive date key', { error, timeZone })
    return null
  }
}

function hasStudiedToday(profile: ReturnType<typeof useGamificationProfile>['profile']): boolean {
  if (!profile) return false
  const lastActiveAt = parseTimestamp(profile.streakLastActiveAt)
  if (!lastActiveAt) return false

  const timeZone = normalizeTimezone(profile.streakTimezone)
  const todayKey = getDateKey(new Date(), timeZone)
  const lastActiveKey = getDateKey(lastActiveAt, timeZone)

  if (!todayKey || !lastActiveKey) return false

  return todayKey === lastActiveKey
}


/**
 * Header Component
 * 
 * Displays the application's top navigation bar with:
 * - App logo and name
 * - Minimal gamification stats (Level, XP, Streak with TikTok-style animation)
 * - Theme toggle for light/dark modes
 * - Burger menu to toggle sidebar
 * 
 * The header remains visible across all pages and provides
 * access to global app functions.
 * 
 * @returns {JSX.Element} The header component
 */
export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { session } = useAuth()
  const { profile: gamificationProfile, loading: gamificationLoading } = useGamificationProfile()
  const isAuthenticated = Boolean(session)
  const numberFormatter = useMemo(() => new Intl.NumberFormat(), [])

  const gamificationStats = useMemo(() => {
    if (!isAuthenticated || !gamificationProfile) return null

    const level = Math.max(0, gamificationProfile?.level ?? 0)
    const XP = Math.max(0, gamificationProfile?.experiencePoints ?? 0)
    const streak = Math.max(0, gamificationProfile?.streakCount ?? 0)
    
    const streakTier = getStreakTier(streak)
    const isStreakActive = hasStudiedToday(gamificationProfile)

    return {
      level,
      xp: numberFormatter.format(XP),
      streak,
      streakTier,
      isStreakActive,
    }
  }, [gamificationProfile, isAuthenticated, numberFormatter])

  return (
    <header className="w-full bg-background/95 dark:bg-[#0A1220]/95 backdrop-blur-xl text-foreground dark:text-white p-3 md:p-4 shadow-sm dark:shadow-none transition-colors duration-200 border-b border-white/5 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center gap-4">
        
        {/* Left: Logo + Burger Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-muted dark:hover:bg-white/5 transition-colors lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} className="text-muted-foreground dark:text-white/70" />
          </button>
          
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 
                3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 
                1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> 
              </svg>
            </div>
            <h1 className="text-base md:text-lg font-semibold text-foreground dark:text-white hidden sm:block">
              StudyStreak
            </h1>
          </div>
        </div>

        {/* Right: Stats + Theme Toggle */}
        <div className="flex items-center gap-2 md:gap-3">
          {gamificationStats && (
            <div className="flex items-center gap-1.5 md:gap-2">
              {/* Level - Always visible */}
              <div className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 dark:border-blue-400/20 dark:bg-blue-500/10 px-2 py-1.5 md:px-3 md:py-2">
                <div className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-md bg-blue-500/10 dark:bg-blue-500/20">
                  <Star size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400">
                  {gamificationLoading ? '...' : gamificationStats.level}
                </span>
              </div>

              {/* XP - Hidden on mobile */}
              <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/5 dark:border-amber-300/20 dark:bg-amber-400/10 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-400/10 dark:bg-amber-400/20">
                  <Sparkles size={14} className="text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {gamificationLoading ? '...' : gamificationStats.xp}
                </span>
              </div>

              {/* Streak - TikTok style with tier colors */}
              <div
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 md:px-3 md:py-2 transition-all duration-300 ${
                  gamificationStats.isStreakActive
                    ? `border-${gamificationStats.streakTier.color.split('-')[1]}-500/30 bg-${gamificationStats.streakTier.color.split('-')[1]}-500/10`
                    : 'border-gray-400/20 bg-gray-400/5 dark:border-gray-600/20 dark:bg-gray-600/10'
                }`}
              >
                <div
                  className={`flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-md transition-all duration-300 ${
                    gamificationStats.isStreakActive
                      ? `bg-gradient-to-br from-${gamificationStats.streakTier.color.split('-')[1]}-400 to-${gamificationStats.streakTier.color.split('-')[1]}-600 shadow-lg ${gamificationStats.streakTier.glow} ${gamificationStats.streakTier.animation}`
                      : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <Flame
                    size={14}
                    className={`${
                      gamificationStats.isStreakActive
                        ? 'text-white drop-shadow-lg'
                        : 'text-gray-500 dark:text-gray-600'
                    } transition-colors duration-300`}
                  />
                </div>
                <span
                  className={`text-xs md:text-sm font-bold transition-colors duration-300 ${
                    gamificationStats.isStreakActive
                      ? gamificationStats.streakTier.color
                      : 'text-gray-500 dark:text-gray-600'
                  }`}
                >
                  {gamificationLoading ? '...' : gamificationStats.streak}
                </span>
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/**
 * SideBar Component
 * 
 * Displays the main navigation sidebar with:
 * - Links to main application sections (Dashboard, Courses, etc.)
 * - Visual indicators for the current active route
 * - Collapsible/expandable behavior with hover state on desktop
 * - User info and sign out button at the bottom
 * - Category grouping of related features
 * 
 * The sidebar is responsive: hidden on mobile (toggled via burger),
 * minimal on desktop (expands on hover), and fully visible on larger screens.
 * 
 * @returns {JSX.Element} The sidebar navigation component
 */
export function SideBar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { session } = useAuth()
  const email = session?.user?.email
  const userId = session?.user?.id
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const { profile: gamificationProfile } = useGamificationProfile()
  const [isHovered, setIsHovered] = useState(false)
  const [isMinimal, setIsMinimal] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!userId) {
        setProfile(null)
        return
      }
      const { data, error } = await profileService.getProfileByUserId(userId)
      if (!active) return
      if (!error && data) {
        setProfile(data as UserProfile)
      } else {
        setProfile(null)
      }
    })()
    return () => {
      active = false
    }
  }, [userId])

  const displayName = useMemo(() => {
    if (profile?.username) return profile.username
    if (profile?.first_name || profile?.last_name) {
      return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    }
    if (gamificationProfile?.username) return gamificationProfile.username
    return email ?? null
  }, [email, gamificationProfile, profile])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      subtitle: 'Overview & Stats',
      color: 'blue',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" />
        </svg>
      ),
    },
    {
      to: '/profile',
      label: 'Profile',
      subtitle: 'Your Progress',
      color: 'green',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      to: '/pomodoro',
      label: 'Pomodoro',
      subtitle: 'Focus Timer',
      color: 'red',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      to: '/courses',
      label: 'Courses',
      subtitle: 'Your Learning',
      color: 'purple',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      to: '/todo',
      label: 'Todo List',
      subtitle: 'Track Tasks',
      color: 'indigo',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
  ]

  const showExpanded = isOpen || isHovered || !isMinimal

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen
          bg-background/95 dark:bg-[#0A1220]/95 backdrop-blur-xl 
          text-foreground dark:text-white
          border-r border-border dark:border-white/5
          transition-all duration-300 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${showExpanded ? 'w-72' : 'w-20'}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <nav className="h-full flex flex-col py-6">
          {/* Close button on mobile */}
          <div className={`px-4 mb-6 lg:hidden ${showExpanded ? 'block' : 'hidden'}`}>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted dark:hover:bg-white/5"
            >
              <X size={20} className="text-muted-foreground dark:text-white/70" />
            </button>
          </div>

          {/* Toggle minimal mode button (desktop only) */}
          <div className={`px-4 mb-6 hidden lg:block ${showExpanded ? 'block' : 'hidden'}`}>
            <button
              onClick={() => setIsMinimal(!isMinimal)}
              className="text-xs text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white transition-colors"
            >
              {isMinimal ? 'Pin sidebar' : 'Auto-hide sidebar'}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 px-3 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-200 group
                  ${isActive
                    ? `bg-${item.color}-100 dark:bg-${item.color}-500/10 text-${item.color}-600 dark:text-${item.color}-400`
                    : 'text-muted-foreground dark:text-white/70 hover:bg-muted dark:hover:bg-white/5'}
                `}
              >
                <IconContainer>{item.icon}</IconContainer>
                {showExpanded && (
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{item.label}</span>
                    <span className="text-xs text-muted-foreground dark:text-white/50 truncate">
                      {item.subtitle}
                    </span>
                  </div>
                )}
              </NavLink>
            ))}
          </div>

          {/* User Info + Sign Out */}
          <div className="px-3 pt-4 border-t border-border dark:border-white/5">
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-muted/50 dark:bg-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold flex-shrink-0">
                {displayName?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              {showExpanded && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {displayName ?? email ?? 'User'}
                  </p>
                  {displayName && email && (
                    <p className="text-xs text-muted-foreground dark:text-white/50 truncate">
                      {email}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={handleSignOut}
              className={`
                w-full mt-2 flex items-center gap-3 px-3 py-3 rounded-lg
                text-red-600 dark:text-red-400
                hover:bg-red-50 dark:hover:bg-red-500/10
                transition-colors duration-200
                ${showExpanded ? 'justify-start' : 'justify-center'}
              `}
            >
              <LogOut size={20} />
              {showExpanded && <span className="font-medium">Sign Out</span>}
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
