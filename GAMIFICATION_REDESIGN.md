# Gamification Module - UI Redesign

## Overview
Complete redesign of the header and sidebar with minimal gamification stats, TikTok-style streak animation, responsive burger menu functionality, and a timezone-aware daily streak activation flow connected to the Pomodoro feature.

## Features Implemented

### 1. **Minimal Gamification Header**
   - **Level Badge**: Always visible with blue theme
   - **XP Badge**: Hidden on mobile (`hidden md:flex`), visible on tablets and desktop
   - **Streak Badge**: TikTok-inspired with tier-based colors and animations
   
### 2. **TikTok-Style Streak System**
   The streak indicator changes color and animation based on milestone tiers:
   
   | Tier | Days | Color | Animation | Glow Effect |
   |------|------|-------|-----------|-------------|
   | 0-9 | Gray | `text-gray-400` | None | Subtle |
   | 10-29 | Orange | `text-orange-500` | Pulse | Medium |
   | 30-49 | Rose | `text-rose-500` | Pulse | Strong |
   | 50-99 | Purple | `text-purple-500` | Pulse | Stronger |
   | 100+ | Gold | `text-yellow-400` | Pulse | Intense |
   
   - **Active Streak** (studied today): Full color, gradient background, animated flame icon
   - **Inactive Streak** (not studied today): Gray, no animation, dimmed flame

### 3. **Responsive Burger Menu**
   - **Mobile** (`<lg`): Sidebar hidden by default, toggled via burger button
   - **Desktop** (`lg+`): Sidebar auto-collapses to icons only, expands on hover
   - **All modes**: Full sidebar control with "Pin sidebar" toggle
   
### 4. **Collapsible Sidebar**
   - **Minimal Mode** (default on desktop):
     - Shows only icons (20px width per icon container)
     - Expands to full width on hover
     - Smooth transition animations
   
   - **Expanded Mode**:
     - Full navigation labels and subtitles
     - User profile with avatar
     - Sign out button at bottom
   
   - **Mobile Mode**:
     - Slides in from left with overlay
     - Close button (X) at top
     - Full navigation visible
   
### 5. **User Profile in Sidebar**
   - Moved from header to sidebar bottom
   - Shows:
     - Avatar (first letter of username/email)
     - Username or email
     - Sign out button with icon
   
### 6. **Design Improvements**
   - **Header**: Sticky positioning, minimal padding on mobile
   - **Stats**: Compact badges with icon + value only
   - **Sidebar**: Auto-hide feature to maximize focus
   - **Animations**: Smooth transitions (300ms ease-in-out)

### 7. **Daily Streak Activation Workflow**
   - Backend now returns `streak_last_active_at`, `streak_timezone`, and `streak_longest` alongside the existing stats
   - New endpoint `POST /api/gamification/streak/activate` increments or resets streaks using IANA timezones and UTC timestamps
   - Pomodoro sessions automatically call the activation endpoint after a successful Supabase insert (including offline retries)
   - Header flame state is now calculated by comparing the last activation timestamp to "today" in the user’s preferred timezone
   - Additional study minutes are accumulated in `total_study_time` when available

## File Changes

### Modified Files
1. **`AppInterface.tsx`**
   - Added `Header({ onToggleSidebar })` with burger menu trigger
   - Added `SideBar({ isOpen, onClose })` with collapsible behavior
   - Implemented streak tier system with `getStreakTier()` and `hasStudiedToday()`
   - Removed notification bell and moved sign out to sidebar

2. **`RootLayout.tsx`**
   - Added `useState` for sidebar open/close state
   - Passed `toggleSidebar` and `closeSidebar` to Header and SideBar
   - Adjusted layout to handle sidebar overlay on mobile

### State Management
```tsx
const [isSidebarOpen, setIsSidebarOpen] = useState(false)
const [isHovered, setIsHovered] = useState(false)
const [isMinimal, setIsMinimal] = useState(true)
```

## Responsive Breakpoints

| Breakpoint | Header | Sidebar | Stats Visibility |
|------------|--------|---------|------------------|
| Mobile (`<md`) | Burger + Logo + Level + Streak + Theme | Hidden (toggle) | Level + Streak only |
| Tablet (`md-lg`) | Burger + Logo + Level + XP + Streak + Theme | Hidden (toggle) | All stats |
| Desktop (`lg+`) | Logo + All Stats + Theme | Minimal (hover) | All stats |

## Usage

### Starting the App
```powershell
# Backend (Docker)
cd docker
docker-compose up -d

# Frontend
cd studystreak
npm run dev
```

### Testing Streak Tiers
To test different streak tiers, modify the `streak_count` in your Supabase `profiles` table or trigger a Pomodoro completion (with an active Supabase session) to let the backend handle the update:
- Set to `5` → Gray (inactive look)
- Set to `15` → Orange with pulse
- Set to `35` → Rose with pulse
- Set to `60` → Purple with pulse
- Set to `120` → Gold with intense pulse

### Toggling Sidebar
- **Mobile**: Click burger menu icon in header
- **Desktop**: Hover over sidebar to expand, or click "Pin sidebar" to keep it open

## Future Enhancements
1. **Cross-Feature Activity Hooks**: Trigger `streak/activate` from courses, dashboard widgets, and future study modes
2. **Streak Celebrations**: Add confetti/animation when reaching milestone tiers (10, 30, 50, 100)
3. **Streak Recovery**: Grace period if user misses a day
4. **Sidebar Preferences**: Save user's preferred sidebar state (pinned/minimal) to local storage
5. **Mobile Bottom Nav**: Consider bottom navigation bar for mobile devices
6. **Gamification Tooltips**: Show XP progress to next level on hover

## API Summary
- `GET /api/gamification/profile` → returns username, level, XP, streak stats, total minutes, and last activation metadata (all normalized to ISO strings)
- `POST /api/gamification/streak/activate` → accepts optional `occurred_at`, `timezone`, and `study_minutes`, ensuring streak increments occur only once per day and are reset after gaps

Both routes require a Supabase JWT and should send an allowed Origin header (e.g., `http://localhost:5173`) during local testing.

## Key Design Decisions

1. **Minimal by Default**: Gamification stats are compact and non-intrusive
2. **TikTok Inspiration**: Streak uses familiar pattern (lit/unlit flame, tier colors)
3. **Focus Mode**: Auto-collapsing sidebar helps users concentrate
4. **Mobile-First**: Burger menu ensures consistency across all device sizes
5. **User Profile at Bottom**: Common UX pattern, freeing header space

## Accessibility
- All interactive elements have `:hover` and `:focus` states
- Burger menu has `aria-label="Toggle sidebar"`
- Color contrast meets WCAG AA standards
- Keyboard navigation supported (Tab, Enter, Escape)

## Browser Compatibility
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

**Last Updated**: October 12, 2025  
**Branch**: `GamificationModule`  
**Status**: ✅ Ready for Testing
