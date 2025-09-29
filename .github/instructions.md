# Instructions for StudyStreak

## Project Overview
StudyStreak is a modern learning management application for tracking educational progress across platforms and courses. The frontend is built with React (TypeScript), Vite, and Tailwind CSS. The backend integrates Supabase for authentication and data storage.

## Architecture & Key Patterns
- **Frontend Structure:**
  - Main entry: `src/Application/main.tsx`
  - Root component: `src/Application/App.tsx` (sets up routing/layout)
  - Features are modularized under `src/Features/` (e.g., Pomodoro, Courses, Dashboard, Profile, Todo)
  - Shared UI components: `src/components/ui/`
  - Auth flows: `src/Auth/` (with context, guards, hooks, services)
  - Supabase client: `src/lib/supabaseClient.ts`
- **Routing:**
  - Centralized in `App.tsx` and `RouteLayout/RootLayout.tsx`
  - Page transitions via `PageTransition.tsx`
- **State Management:**
  - Context API for auth (`Auth/context/AuthProvider.tsx`)
  - Custom hooks for features (e.g., `usePomodoro.tsx`)
- **Styling:**
  - Tailwind CSS via `tailwind.config.js` and `postcss.config.js`
  - Component variants in `components/ui/button-variants.ts`

## Developer Workflows
- **Install dependencies:**
  - `npm install` (run in `studystreak/`)
- **Start development server:**
  - `npm run dev` (access at `http://localhost:5173`)
- **Linting:**
  - ESLint config: `eslint.config.js` (uses TypeScript and React plugins)
  - Recommended: `eslint-plugin-react-x`, `eslint-plugin-react-dom`
- **Build:**
  - `npm run build` (outputs to `dist/`)
- **Supabase Integration:**
  - Config in `backend/Supabase/config.toml`
  - Functions in `backend/Supabase/Functions/`
  - Client in `src/lib/supabaseClient.ts`

## Conventions & Patterns
- **Feature-first organization:**
  - Each feature (Pomodoro, Courses, etc.) has its own folder with components, hooks, types, and utils
- **JSDoc comments:**
  - Major components and features are documented at the top of files
- **TypeScript:**
  - Strict typing enforced via `tsconfig.json` and feature-level type files
- **Auth:**
  - Use context and guards for route protection (`ProtectedRoute.tsx`, `PublicOnlyRoute.tsx`)
- **Reusable UI:**
  - Prefer components in `src/components/ui/` for buttons, cards, progress bars

  ## Technology Stack

- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **React Router**: Navigation and routing
- **Tailwind CSS**: Utility-first styling
- **Shadcn UI**: Component design system foundation
- **Vite**: Build tool and development server


## Integration Points
- **Supabase:**
  - Used for authentication and profile management (`authService.ts`, `profileService.ts`)
- **External course platforms:**
  - Course logos/assets in `src/assets/images/`

## Examples
- To add a new feature:
  - Create a folder in `src/Features/`
  - Add components, hooks, types, and utils as needed
- To add a new route:
  - Update `App.tsx` and `RouteLayout/RootLayout.tsx`

## References
- Main documentation: `studystreak/README.md`
- Developer guide: `studystreak/README_DEVELOPER_GUIDE.md`

---
For questions or unclear conventions, review the referenced files or ask for clarification.
