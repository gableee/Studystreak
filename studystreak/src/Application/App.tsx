
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
import Pomodoro from '../Features/Pomodoro/Pomodoro'
import Courses from '../Features/Courses/Courses'
import Todo from '../Features/Todo/Todo'
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
        element: (
          <ProtectedRoute>
            <PageTransition>
              <Pomodoro />
            </PageTransition>
          </ProtectedRoute>
        )
      },
      {
        path: "courses",
        element: (
          <ProtectedRoute>
            <PageTransition>
              <Courses />
            </PageTransition>
          </ProtectedRoute>
        )
      },
      {
        path: "todo",
        element: (
          <ProtectedRoute>
            <PageTransition>
              <Todo />
            </PageTransition>
          </ProtectedRoute>
        )
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
