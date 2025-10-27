/**
 * PageTransition Component
 *
 * This component provides smooth transitions between pages in the application.
 * It uses CSS transitions to create a subtle fade-in effect when navigating
 * between different routes without causing component remounting.
 *
 * The component tracks location changes via React Router's useLocation hook
 * and applies transition classes accordingly. This creates a more polished user
 * experience compared to abrupt page changes.
 *
 * @module Application/components/PageTransition
 */

import type { ReactNode } from 'react';
import { useLayoutEffect, useRef } from 'react';
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
 * Applies smooth transition effects to page content when routes change
 * Uses CSS transitions without component remounting for better performance
 *
 * @param {PageTransitionProps} props - Component properties
 * @returns {JSX.Element} The wrapped children with transition effects applied
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Start transition out
    container.classList.add('page-transition-exit');

    // After a brief delay, transition back in
    const timeoutId = setTimeout(() => {
      container.classList.remove('page-transition-exit');
      container.classList.add('page-transition-enter');

      // Clean up enter class after animation completes
      setTimeout(() => {
        container.classList.remove('page-transition-enter');
      }, 200);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  return (
    <div
      ref={containerRef}
      className="page-transition"
    >
      {children}
    </div>
  );
}