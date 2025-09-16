
/**
 * Main Application Component
 * 
 * This is the root component of the StudyStreak application that sets up:
 * - The overall layout structure (sidebar, header, main content)
 * - Routing configuration for all main features
 * - Page transitions between routes
 * - Background styling and gradient effects
 * 
 * The component uses React Router for navigation and applies the PageTransition
 * component to create smooth transitions between different pages.
 * 
 * @module Application/App
 */

import { Header, SideBar } from './AppInterface.tsx'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PageTransition } from './components/PageTransition'
import Dashboard from '../Features/Dashboard/Dashboard'
import Profile from '../Features/Profile/Profile'
import Settings from '../Features/Settings/Settings'
import Pomodoro from '../Features/Pomodoro/Pomodoro'
import Courses from '../Features/Courses/Courses'
import Todo from '../Features/Todo/Todo'

/**
 * App Component - The root component of the application
 * Defines the main layout and routing structure
 */
function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#070B13] overflow-x-hidden transition-colors duration-200">
      <div className="min-h-screen bg-transparent dark:bg-gradient-to-br dark:from-blue-900/20 dark:via-transparent dark:to-purple-900/30">
        <div className="flex h-screen">
          <SideBar />
          {/* Main content area */}
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={
                  <PageTransition>
                    <Dashboard />
                  </PageTransition>
                } />
                <Route path="/profile" element={
                  <PageTransition>
                    <Profile />
                  </PageTransition>
                } />
                <Route path="/settings" element={
                  <PageTransition>
                    <Settings />
                  </PageTransition>
                } />
                <Route path="/pomodoro" element={
                  <PageTransition>
                    <Pomodoro />
                  </PageTransition>
                } />
                <Route path="/courses" element={
                  <PageTransition>
                    <Courses />
                  </PageTransition>
                } />
                <Route path="/todo" element={
                  <PageTransition>
                    <Todo />
                  </PageTransition>
                } />
                <Route path="*" element={
                  <PageTransition>
                    <div className="text-slate-300">Not Found</div>
                  </PageTransition>
                } />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
                } 

export default App
