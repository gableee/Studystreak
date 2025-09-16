/**
 * PageTransition Component
 * 
 * This component provides smooth transitions between pages in the application.
 * It uses CSS animations to create a subtle fade-in effect when navigating 
 * between different routes.
 * 
 * The component tracks location changes via React Router's useLocation hook
 * and applies transition classes accordingly. This creates a more polished user
 * experience compared to abrupt page changes.
 * 
 * @module Application/components/PageTransition
 */

import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Props for the PageTransition component
 * @interface PageTransitionProps
 * @property {ReactNode} children - The page content to be rendered with transition effects
 */
interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Applies a smooth transition effect to page content when routes change
 * 
 * @param {PageTransitionProps} props - Component properties
 * @returns {JSX.Element} The wrapped children with transition effects applied
 */
export function PageTransition({ children }: PageTransitionProps) {
  /**
   * Get the current location from React Router
   * This is used to detect route changes and trigger animations
   */
  const location = useLocation();
  
  return (
    <div 
      key={location.pathname} // Key changes trigger component remount on route change
      className="page-transition" // CSS class for animation (defined in index.css)
    >
      {children}
    </div>
  );
}