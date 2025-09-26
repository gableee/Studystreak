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
import { useEffect, useState } from 'react'
import { IconContainer } from './components/IconContainer';
import { ThemeToggle } from './components/LightMode';
import { useAuth } from '@/Auth/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { profileService, type UserProfile } from '@/Auth/services/profileService';

/**
 * Header Component
 * 
 * Displays the application's top navigation bar with:
 * - App logo and name
 * - Theme toggle for light/dark modes
 * - Notification bell
 * - User profile menu
 * 
 * The header remains visible across all pages and provides
 * access to global app functions.
 * 
 * @returns {JSX.Element} The header component
 */
export function Header() {
  const { session } = useAuth()
  const email = session?.user?.email
  const userId = session?.user?.id
  const [profile, setProfile] = useState<UserProfile | null>(null)

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
        setProfile(data)
      } else {
        setProfile(null)
      }
    })()
    return () => {
      active = false
    }
  }, [userId])

  
  // Prefer username, then first+last, then email
    let displayName = email
    if (profile) {
      if (profile.username) {
        displayName = profile.username
      } else if (profile.first_name || profile.last_name) {
        displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
      }
    }
  

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }
  return (
    <header className="w-full bg-background dark:bg-[#0A1220] backdrop-blur-xl text-foreground dark:text-white p-4 mb-4 shadow-sm dark:shadow-none transition-colors duration-200 border-b border-white/5 z-999">
      <div className="container mx-auto flex justify-between items-center px-4">
        
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 
              3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 
              1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> 
            </svg>
          </div>
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-semibold text-foreground dark:text-white">
              StudyStreak
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle (Dark Mode / Light Mode) */}
          <ThemeToggle />
          
          {/* Notification Bell */}
          <button className="btn-ghost p-2 relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground dark:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 
              6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full text-xs flex items-center justify-center font-medium">2</span>
          </button>
          
          {/* User Profile */}
          <div className="flex items-center gap-3">
            {(displayName || email) && (
              <span className="text-sm text-muted-foreground dark:text-white/70 hidden sm:inline">{displayName ?? email}</span>
            )}
            <button onClick={handleSignOut} className="btn-ghost px-3 py-2 rounded-lg">
              Sign out
            </button>
          </div>
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
 * - Category grouping of related features
 * 
 * The sidebar is responsive, hiding on smaller screens and
 * showing on medium and larger viewports.
 * 
 * @returns {JSX.Element} The sidebar navigation component
 */
export function SideBar() {
  return (
    <aside className="w-72 hidden md:block bg-background dark:bg-[#0A1220]/80 backdrop-blur-xl text-foreground dark:text-white h-full border-r border-border dark:border-white/5 transition-colors duration-200">
      <nav className="h-full py-8 px-5">
        <div className="mb-8 px-4">
          <div className="text-xs font-medium text-muted-foreground dark:text-white/50 uppercase tracking-wider">
            Main Menu
          </div>
        </div>
        {/* Main navigation links */}
        <ul className="space-y-2">
          {/* Navigation item */}
          <li>
            <NavLink to="/dashboard" 
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive 
                  ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                  : 'text-muted-foreground dark:text-white/70 hover:bg-muted dark:hover:bg-white/5'}
              `}
            >
              <IconContainer>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground dark:text-white/70 group-[.active]:text-blue-500 dark:group-[.active]:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" />
                </svg>
              </IconContainer>
              <div className="flex flex-col">
                <span className="font-medium">Dashboard</span>
                <span className="text-xs text-muted-foreground dark:text-white/50">Overview & Stats</span>
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" 
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive 
                  ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' 
                  : 'text-muted-foreground dark:text-white/70 hover:bg-muted dark:hover:bg-white/5'}
              `}
            >
              <IconContainer>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground dark:text-white/70 group-[.active]:text-green-500 dark:group-[.active]:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </IconContainer>
              <div className="flex flex-col">
                <span className="font-medium">Profile</span>
                <span className="text-xs text-muted-foreground dark:text-white/50">Your Progress</span>
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink to="/pomodoro" 
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive 
                  ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' 
                  : 'text-muted-foreground dark:text-white/70 hover:bg-muted dark:hover:bg-white/5'}
              `}
            >
              <IconContainer>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground dark:text-white/70 group-[.active]:text-red-500 dark:group-[.active]:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </IconContainer>
              <div className="flex flex-col">
                <span className="font-medium">Pomodoro</span>
                <span className="text-xs text-muted-foreground dark:text-white/50">Focus Timer</span>
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink to="/courses" 
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive 
                  ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                  : 'text-muted-foreground dark:text-white/70 hover:bg-muted dark:hover:bg-white/5'}
              `}
            >
              <IconContainer>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground dark:text-white/70 group-[.active]:text-purple-500 dark:group-[.active]:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </IconContainer>
              <div className="flex flex-col">
                <span className="font-medium">Courses</span>
                <span className="text-xs text-muted-foreground dark:text-white/50">Your Learning</span>
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink to="/todo" 
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive 
                  ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                  : 'text-muted-foreground dark:text-white/70 hover:bg-muted dark:hover:bg-white/5'}
              `}
            >
              <IconContainer>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground dark:text-white/70 group-[.active]:text-indigo-500 dark:group-[.active]:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </IconContainer>
              <div className="flex flex-col">
                <span className="font-medium">Todo List</span>
                <span className="text-xs text-muted-foreground dark:text-white/50">Track Tasks</span>
              </div>
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
