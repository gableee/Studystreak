# StudyStreak Development Guide

This document provides detailed information for developers working on the StudyStreak application.

## Code Organization

### Feature-Based Structure

The application is organized by features rather than by file types. Each feature has its own folder with all the relevant components, styles, and logic:

```
Features/
├── Dashboard/          # Main dashboard feature
│   ├── Dashboard.tsx   # Main component
│   └── components/     # Dashboard-specific components
├── Courses/            # External courses feature
│   └── Courses.tsx     # Main component
```

### Component Documentation

Each component has JSDoc-style documentation that explains:
- What the component does
- How it should be used
- Any props it accepts
- Any state it manages
- How it interacts with other components

Example:
```tsx
/**
 * Dashboard Component
 * 
 * The Dashboard is the main landing page of the StudyStreak application.
 * It displays:
 * - A summary of current courses and their progress
 * - Quick statistics about the user's learning
 * ...
 */
```

## UI Component System

### Button Component

The button system is split into two files:
- `button-variants.ts`: Defines all the styling variants
- `button.tsx`: Implements the actual React component

This separation allows for:
- Better optimization with React's Fast Refresh
- Reusing button styles in non-button components
- Cleaner component code

Example usage:
```tsx
// Regular button
<Button>Click me</Button>

// Variant
<Button variant="outline" size="sm">Small outline</Button>

// Using styles on another element
<Link className={buttonVariants({ variant: "ghost" })}>Ghost link</Link>
```

### Page Transitions

The `PageTransition` component wraps each route to provide smooth transitions between pages. It uses CSS animations defined in `index.css`.

To add a new route with transitions:
```tsx
<Route path="/new-feature" element={
  <PageTransition>
    <NewFeature />
  </PageTransition>
} />
```

## Styling Approach

The application uses Tailwind CSS with a few patterns:

1. **Component-based styles**: Most styles are applied directly to components using Tailwind classes
2. **Consistent color schemes**: Dark mode theme with blue accents
3. **CSS variables**: For theme colors and shared values
4. **Animations**: CSS transitions for interactions, with classes like `transition-all`
5. **Responsive design**: Mobile-first with breakpoints (sm, md, lg)

## State Management

Currently, the application uses React's built-in state management:
- `useState` for component-level state
- Props for passing data between parent and child components

As the application grows, we may implement:
- Context API for shared state (theme, user data)
- Custom hooks for reusable logic

## Adding New Features

When adding a new feature:

1. Create a new folder in `Features/` with your feature name
2. Create the main component with proper documentation
3. Add the route in `App.tsx` with a `PageTransition` wrapper
4. Add a navigation link in `AppInterface.tsx` if needed
5. Use existing UI components from `components/ui/` for consistency

## Image Loading Pattern

The `Courses` component demonstrates a pattern for handling image loading with a spinner:

1. Track loaded state in a Record: `loadedImages: Record<string, boolean>`
2. Set image to `opacity-0` until loaded
3. Show a spinner overlay until the image loads
4. When the image loads via `onLoad`, update the state
5. Apply a transition to fade in the image

This pattern can be reused for any image-heavy features.

## Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI](https://ui.shadcn.com/)