
/**
 * Main Application Component
 * 
 * This component defines the routing configuration for the StudyStreak application.
 * It uses React Router's modern approach with createBrowserRouter and RouterProvider
 * to handle navigation between different pages.
 * 
 * The layout structure is handled by RootLayout component, keeping this file
 * focused solely on route definitions and making it easier to add new routes.
 * 
 * @module Application/App
 */

import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { PageTransition } from './components/PageTransition'
import RootLayout from './RouteLayout/RootLayout'
import Dashboard from '../Features/Dashboard/Dashboard'
import Profile from '../Features/Profile/Profile'
import LearningMaterials from '../Features/LearningMaterials'
import FocusSession from '../Features/FocusSession/FocusSession'
import MyStudyPlan from '../Features/MyStudyPlan/MyStudyPlan'
import ProgressAnalytics from '../Features/ProgressAnalytics/ProgressAnalytics'
import AchievementsRewards from '../Features/AchievementsRewards/AchievementsRewards'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from '@/Auth/guards/ProtectedRoute'
import PublicOnlyRoute from '@/Auth/guards/PublicOnlyRoute'
import SignInPage from '@/Auth/pages/SignInPage'
import SignupPage from '@/Auth/pages/SignupPage'
import ForgotPasswordPage from '@/Auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/Auth/pages/ResetPasswordPage'
import NotFoundPage from './components/NotFoundPage'

/**
 * Router configuration using React Router v6's createBrowserRouter
 * Defines all application routes with their corresponding components
 */
const router = createBrowserRouter([
  // Auth pages (standalone, no RootLayout)
  
  {
    path: "/signin",
    element: (
      <PublicOnlyRoute>
        <PageTransition>
          <SignInPage />
        </PageTransition>
      </PublicOnlyRoute>
    )
  },
  {
    path: "/signup",
    element: (
      <PublicOnlyRoute>
        <PageTransition>
          <SignupPage />
        </PageTransition>
      </PublicOnlyRoute>
    )
  },
  {
    path: "/forgot-password",
    element: (
      <PublicOnlyRoute>
        <PageTransition>
          <ForgotPasswordPage />
        </PageTransition>
      </PublicOnlyRoute>
    )
  },
  {
    path: "/reset-password",
    element: (
      <PublicOnlyRoute>
        <PageTransition>
          <ResetPasswordPage />
        </PageTransition>
      </PublicOnlyRoute>
    )
  },


  //Main app routes (with RootLayout)
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <PageTransition>
              <Dashboard />
            </PageTransition>
          </ProtectedRoute>
        )
      },
      {
        path: "my-study-plan",
        element: (
          <ProtectedRoute>
            <PageTransition>
              <MyStudyPlan />
            </PageTransition>
          </ProtectedRoute>
        )
      },
      {
        path: "learning-materials",
        element: (
          <ProtectedRoute>
            <PageTransition>
              <LearningMaterials />
            </PageTransition>
          </ProtectedRoute>
        )
      },
      {
        path: "focus-session",
        element: (
          <ProtectedRoute>
            <PageTransition>
              <ErrorBoundary>
                <FocusSession />
              </ErrorBoundary>
            </PageTransition>
          </ProtectedRoute>
        )
      },
      {
        path: "progress-analytics",
        element: (
          <ProtectedRoute>
            <PageTransition>
              <ProgressAnalytics />
            </PageTransition>
          </ProtectedRoute>
        )
      },
      {
        path: "achievements-rewards",
        element: (
          <ProtectedRoute>
            <PageTransition>
              <AchievementsRewards />
            </PageTransition>
          </ProtectedRoute>
        )
      },
      {
        path: "profile", 
        element: (
          <ProtectedRoute>
            <PageTransition>
              <Profile />
            </PageTransition>
          </ProtectedRoute>
        )
      },
      {
        path: "pomodoro",
        element: <Navigate to="/focus-session" replace />
      },
      {
        path: "courses",
        element: <Navigate to="/learning-materials" replace />
      },
      {
        path: "learn",
        element: <Navigate to="/learning-materials" replace />
      },
      {
        path: "todo",
        element: <Navigate to="/my-study-plan" replace />
      },
      {
        path: "study-plan",
        element: <Navigate to="/my-study-plan" replace />
      },
      {
        path: "progress",
        element: <Navigate to="/progress-analytics" replace />
      },
      {
        path: "progress-achievements",
        element: <Navigate to="/progress-analytics" replace />
      },
      {
        path: "*",
        element: (
          <PageTransition>
            <NotFoundPage />
          </PageTransition>
        )
      }
    ]
  }
])

/**
 * App Component - The root component that provides the router
 * Uses RouterProvider to enable routing throughout the application
 */
function App() {
  return <RouterProvider router={router} />
}

export default App
