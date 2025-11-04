/**
 * Root Layout Component
 * 
 * This component provides the main layout structure for the entire application:
 * - Background styling and gradient effects
 * - Sidebar navigation with toggle state
 * - Header with app branding and user controls
 * - Main content area with Outlet for child routes
 * 
 * Uses React Router's Outlet to render child components based on the current route.
 * This approach keeps the layout persistent while only the main content changes.
 * 
 * @module Application/RouteLayout/RootLayout
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header, SideBar } from '../AppInterface'
import { PomodoroProvider } from '../../Features/FocusSession/context/PomodoroContext'
import PomodoroModal from '../../Features/FocusSession/components/PomodoroModal'
import PwaInstallToast from '@/PWA/components/PwaInstallToast'

/**
 * RootLayout Component - The main layout wrapper for all pages
 * Provides consistent layout structure with navigation and styling
 */
function RootLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="min-h-screen bg-background dark:bg-[#0A1220] overflow-x-hidden transition-colors duration-200">
      <div className="min-h-screen bg-transparent dark:bg-gradient-to-br dark:from-blue-900/20 dark:via-transparent dark:to-purple-900/30">
        <div className="flex h-screen">
          <SideBar isOpen={isSidebarOpen} onClose={closeSidebar} />
          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onToggleSidebar={toggleSidebar} />
            <main className="flex-1 overflow-y-auto">
              {/* This is where child routes will be rendered */}
              <PomodoroProvider>
                <Outlet />
                <PomodoroModal />
                <PwaInstallToast />
              </PomodoroProvider>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RootLayout