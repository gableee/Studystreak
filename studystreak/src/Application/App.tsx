
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

/**
 * Router configuration using React Router v6's createBrowserRouter
 * Defines all application routes with their corresponding components
 */
const router = createBrowserRouter([
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
          <PageTransition>
            <Dashboard />
          </PageTransition>
        )
      },
      {
        path: "profile", 
        element: (
          <PageTransition>
            <Profile />
          </PageTransition>
        )
      },
      {
        path: "pomodoro",
        element: (
          <PageTransition>
            <Pomodoro />
          </PageTransition>
        )
      },
      {
        path: "courses",
        element: (
          <PageTransition>
            <Courses />
          </PageTransition>
        )
      },
      {
        path: "todo",
        element: (
          <PageTransition>
            <Todo />
          </PageTransition>
        )
      },
      {
        path: "*",
        element: (
          <PageTransition>
            <div className="text-foreground">Not Found</div>
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
