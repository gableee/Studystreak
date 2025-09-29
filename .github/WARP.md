# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### TypeScript
```bash
# Run TypeScript compiler check
npx tsc -b

# Check specific tsconfig
npx tsc -b tsconfig.app.json
npx tsc -b tsconfig.node.json
```

### Shadcn UI Components
```bash
# Add new UI components
npx shadcn@latest add <component-name>

# Example: Add a new dialog component
npx shadcn@latest add dialog
```

## Application Architecture

### Project Structure
This is a React application with a feature-based architecture:

```
src/
├── Application/          # Core app structure
│   ├── App.tsx           # Route definitions and router setup
│   ├── AppInterface.tsx  # Header and Sidebar navigation
│   ├── RouteLayout/      # Layout components
│   └── components/       # App-level shared components
├── Features/             # Feature modules (Dashboard, Courses, Pomodoro, Todo, Profile)
├── Auth/                 # Authentication system with Supabase
├── components/           # Reusable UI components
└── lib/                  # Utilities and external service clients
```

### Key Architectural Patterns

**Feature-Based Organization**: Each major feature (Dashboard, Courses, Pomodoro, Todo, Profile) is self-contained in its own directory under `Features/`.

**Route Protection**: The app uses `ProtectedRoute` and `PublicOnlyRoute` guards to control access based on authentication state.

**Authentication Flow**: Uses Supabase for authentication with:
- Email/password authentication
- Password reset functionality
- Session persistence and auto-refresh
- Route guards for protected pages

**UI System**: Built on Shadcn UI with:
- Custom theme using CSS variables
- Tailwind CSS for styling
- Dark mode support via class-based switching
- Component variants using `class-variance-authority`

### Router Configuration
The app uses React Router v6's `createBrowserRouter` with:
- Standalone auth pages (signin, signup, forgot-password, reset-password)
- Protected main app routes under `RootLayout`
- Page transitions using Framer Motion
- Default redirect from `/` to `/dashboard`

### State Management
- Authentication state managed through React Context (`AuthProvider`)
- Local component state for feature-specific data
- Supabase client for data persistence

### Styling System
- **Tailwind CSS**: Primary styling framework
- **CSS Variables**: Theme customization through `index.css`
- **Dark Mode**: Class-based dark mode switching
- **Design System**: Consistent color scheme with blue/indigo accent colors
- **Responsive Design**: Mobile-first approach with responsive grid layouts

## Environment Setup

### Required Environment Variables
Create a `.env.local` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Path Aliases
The project uses TypeScript path aliases configured in `tsconfig.json`:
- `@/*` → `./src/*`

## PWA Configuration
The application is configured as a Progressive Web App with:
- Service worker registration
- Manifest for installability
- Offline caching strategies for images and external learning platform logos
- Custom icons and branding

## Development Guidelines

### Component Structure
- Feature components go in `src/Features/[FeatureName]/`
- Reusable UI components go in `src/components/ui/`
- App-level components go in `src/Application/components/`

### Authentication
- All main app routes require authentication
- Auth state is available via `useAuth()` hook
- Supabase client is exposed on `window.supabase` in development for debugging

### Styling Conventions
- Use Tailwind utility classes
- Leverage CSS variables for theme consistency
- Follow the established dark mode patterns
- Use gradient effects and subtle animations for enhanced UI

### External Learning Platforms
The app integrates with external learning platforms including:
- Khan Academy (cdn.kastatic.org)
- Scrimba (scrimba.com)
- Udemy (www.udemy.com)
- freeCodeCamp (cdn.freecodecamp.org)
- edX (www.edx.org)

These are cached in the service worker for offline functionality.