# StudyStreak: Technical Debt, Hardcoded Elements & Development Roadmap

**Generated:** November 22, 2025  
**Purpose:** Comprehensive analysis of current implementation, hardcoded data, technical debt, and actionable roadmap for production-ready deployment.

---

## 📋 Executive Summary

### System Architecture Overview
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** PHP 8.2 (Supabase-connected REST API)
- **AI Service:** Python 3.11 + FastAPI + Ollama + HuggingFace
- **Database:** Supabase (PostgreSQL + Storage + Auth)
- **Deployment:** Local dev (frontend: Vite dev server, backend: PHP built-in/Apache, AI: FastAPI uvicorn)

### Critical Issues Identified
1. **🔴 HIGH PRIORITY:** Dashboard and Analytics pages use 100% hardcoded mock data
2. **🟡 MEDIUM PRIORITY:** Study Plan and Achievements pages contain placeholder content
3. **🟢 LOW PRIORITY:** Profile page has fallback data but integrates with real Supabase auth
4. **✅ PRODUCTION READY:** Learning Materials, Focus Session, Gamification features are fully functional

---

## 🎯 Feature Analysis by Module

### 1. **Dashboard** (`src/Features/Dashboard/Dashboard.tsx`)

#### **WHAT**: Landing page showing study statistics, recent sessions, and upcoming deadlines

#### **WHERE**: 
- File: `studystreak/src/Features/Dashboard/Dashboard.tsx` (294 lines)
- Route: `/dashboard`
- Component: Default landing page for authenticated users

#### **PURPOSE**: 
Provide at-a-glance overview of user's current study status, streak, recent activity, and upcoming tasks.

#### **WHY IT EXISTS**:
Core UX requirement for learning management platform - users need immediate visibility into their progress and next actions.

#### **CURRENT STATE**: 🔴 **100% HARDCODED**

**Hardcoded Data Sources:**
```typescript
// Lines 36-66: quickStats array
const quickStats = [
  {
    label: 'Focus Time',
    value: '2h 30m',           // HARDCODED
    caption: 'Goal: 4 hours',  // HARDCODED
    change: '+18% vs yesterday', // HARDCODED
    ...
  },
  // ... 3 more stat cards
]

// Lines 68-88: sessionLog array
const sessionLog = [
  {
    title: 'Neuroanatomy Lab Prep',  // HARDCODED
    duration: '40 min • Focus Blocks', // HARDCODED
    time: '08:15',                     // HARDCODED
    ...
  },
  // ... 2 more sessions
]

// Lines 90-108: deadlines array
const deadlines = [
  {
    title: 'Pharmacology dosage quiz',  // HARDCODED
    due: 'Due tomorrow',                 // HARDCODED
    ...
  },
  // ... 3 more deadlines
]
```

**Weekly Rhythm Heatmap (Lines 233-247):**
```typescript
// 7 days of hardcoded study hours
{ day: 'Mon', hours: '3.0h', intensity: 'bg-emerald-700 text-white' }, // HARDCODED
{ day: 'Tue', hours: '2.5h', intensity: 'bg-emerald-500 text-white' }, // HARDCODED
// ... etc
```

#### **HOW TO FIX**:

**Data Sources Needed:**
1. **Focus Time Stats** → `studysession` table
   - Aggregate `duration` field filtered by `user_id` and date range
   - Calculate daily/weekly totals and comparisons

2. **Streak Data** → Already available via `useGamificationProfile()` hook
   - `streakCount`, `streakLongest`, `isStreakActive` already working
   - Just needs to be integrated into quickStats

3. **Recent Sessions** → `studysession` table
   - Query latest 3-5 records by `time_end DESC`
   - Display title (needs new field or derive from context), duration, timestamp

4. **Upcoming Deadlines** → New feature required
   - Option A: Add `user_tasks` or `deadlines` table to Supabase
   - Option B: Integrate with Google Calendar API
   - Option C: Manual task list in Study Plan feature

5. **Weekly Heatmap** → `studysession` table
   - GROUP BY date, SUM(duration)
   - Last 7 days aggregation

**Implementation Steps:**
```typescript
// 1. Create custom hook
import { useGamificationProfile } from '@/Features/Gamification/hooks/useGamificationProfile'
import { supabase } from '@/lib/supabaseClient'

const useDashboardStats = () => {
  const { profile } = useGamificationProfile() // Existing streak data
  const [sessions, setSessions] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  
  useEffect(() => {
    // Fetch recent sessions
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('studysession')
        .select('*')
        .eq('user_id', userId)
        .order('time_end', { ascending: false })
        .limit(5)
      setSessions(data)
    }
    
    // Fetch weekly aggregation
    const fetchWeeklyData = async () => {
      // SQL query for last 7 days grouped by date
    }
  }, [userId])
  
  return { profile, sessions, weeklyData }
}
```

**Estimated Effort:** 
- Backend: 2-3 hours (SQL queries, endpoint testing)
- Frontend: 4-6 hours (hook creation, component refactor, error handling)
- Testing: 2 hours

---

### 2. **Progress Analytics** (`src/Features/ProgressAnalytics/ProgressAnalytics.tsx`)

#### **WHAT**: GitHub-style analytics dashboard with contribution grids, spike charts, and milestone tracking

#### **WHERE**:
- File: `studystreak/src/Features/ProgressAnalytics/ProgressAnalytics.tsx` (262 lines)
- Route: `/progress-analytics`

#### **PURPOSE**:
Provide long-term visualization of study habits, focus quality trends, and achievement patterns.

#### **WHY IT EXISTS**:
Users need historical perspective and trend analysis to understand learning patterns and optimize study strategies.

#### **CURRENT STATE**: 🔴 **100% HARDCODED**

**Hardcoded Data Sources:**

```typescript
// Lines 21-56: summaryStats
const summaryStats = [
  {
    title: 'Total focus hours',
    value: '92.5h',              // HARDCODED
    delta: '+12% vs last month', // HARDCODED
    ...
  },
  // ... 3 more summary cards
]

// Lines 57-74: activityMatrix (GitHub-style heatmap)
const activityMatrix = [
  { week: 'W1', days: [0, 1, 2, 3, 1, 0, 2] }, // HARDCODED 16 weeks
  { week: 'W2', days: [0, 2, 3, 4, 2, 1, 1] }, // HARDCODED
  // ... 14 more weeks
]

// Lines 76-96: comparisonSeries (trend lines)
const comparisonSeries = [
  {
    name: 'Focus quality',
    points: [72, 78, 81, 76, 88, 84, 90, 85], // HARDCODED 8 data points
  },
  // ... 2 more trend series
]
```

#### **HOW TO FIX**:

**Data Sources Needed:**

1. **Total Focus Hours** → `studysession` table
   ```sql
   SELECT SUM(duration) as total_minutes 
   FROM studysession 
   WHERE user_id = ? AND time_started >= NOW() - INTERVAL '30 days'
   ```

2. **Activity Matrix (GitHub Heatmap)** → `studysession` table
   ```sql
   SELECT DATE(time_started) as date, SUM(duration) as minutes
   FROM studysession
   WHERE user_id = ? AND time_started >= NOW() - INTERVAL '112 days'
   GROUP BY DATE(time_started)
   ORDER BY date ASC
   ```

3. **Focus Quality Trend** → New `session_quality` field needed
   - Add `quality_score` INT (0-100) to `studysession` table
   - Capture via post-session reflection form
   - Alternative: Calculate from completion rate + cycle count

4. **Task Completion Trend** → Requires task tracking feature
   - Add `user_tasks` table with completion tracking
   - Track weekly completion percentage

**Schema Changes Required:**
```sql
-- Add quality tracking to study sessions
ALTER TABLE studysession 
ADD COLUMN quality_score INT CHECK (quality_score >= 0 AND quality_score <= 100),
ADD COLUMN reflection_notes TEXT;

-- Create tasks table for completion tracking
CREATE TABLE user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Implementation Steps:**
1. Add database migrations for new fields/tables
2. Create `useProgressAnalytics()` hook
3. Build aggregation queries (consider caching for performance)
4. Replace hardcoded arrays with real data
5. Add CSV export functionality (already mocked in UI)

**Estimated Effort:**
- Database: 1-2 hours (migrations, RLS policies)
- Backend: 3-4 hours (aggregation queries, caching)
- Frontend: 6-8 hours (hook, component refactor, error states)
- Testing: 3 hours

---

### 3. **My Study Plan** (`src/Features/MyStudyPlan/MyStudyPlan.tsx`)

#### **WHAT**: Goal tracking, task organization, calendar view, and notification center

#### **WHERE**:
- File: `studystreak/src/Features/MyStudyPlan/MyStudyPlan.tsx` (271 lines)
- Route: `/my-study-plan`

#### **PURPOSE**:
Unified planning interface for goal setting, task management, and deadline tracking.

#### **WHY IT EXISTS**:
Students need integrated planning tools to manage multiple courses, assignments, and study goals in one place.

#### **CURRENT STATE**: 🔴 **100% HARDCODED**

**Hardcoded Data Sources:**

```typescript
// Lines 17-40: goalSummaries
const goalSummaries = [
  {
    label: 'Daily rounds',
    metric: '3.0 / 4 hrs',  // HARDCODED
    progress: 75,           // HARDCODED
    ...
  },
  // ... 2 more goals
]

// Lines 41-78: planTasks
const planTasks = [
  {
    title: 'Simulate emergency response drill', // HARDCODED
    priority: 'Essential today',                 // HARDCODED
    due: 'Due in 4h',                            // HARDCODED
    status: 'open',                              // HARDCODED
  },
  // ... 3 more tasks
]

// Lines 80-96: reminders
const reminders = [
  {
    title: 'Check-in with mentor about residency preference list', // HARDCODED
    time: 'in 2 hours',                                             // HARDCODED
  },
  // ... 2 more reminders
]
```

#### **HOW TO FIX**:

**Database Schema Needed:**

```sql
-- Goals table
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT, -- 'hours', 'sessions', 'pages', etc.
  period TEXT CHECK (period IN ('daily', 'weekly', 'monthly')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table (extends previous schema)
CREATE TABLE user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reminders table
CREATE TABLE user_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES user_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**API Endpoints Needed:**
- `GET /api/goals` - Fetch user goals
- `POST /api/goals` - Create new goal
- `PATCH /api/goals/:id` - Update goal progress
- `GET /api/tasks` - Fetch tasks (filterable by status, priority)
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/reminders` - Fetch upcoming reminders

**Implementation Steps:**
1. Create database tables and RLS policies
2. Build PHP controllers for CRUD operations
3. Create frontend hooks: `useGoals()`, `useTasks()`, `useReminders()`
4. Replace hardcoded arrays with API data
5. Add drag-and-drop for task reordering (react-beautiful-dnd)
6. Integrate browser notifications for reminders

**Estimated Effort:**
- Database: 2-3 hours
- Backend: 6-8 hours (controllers, validation, endpoints)
- Frontend: 8-12 hours (hooks, forms, drag-drop, notifications)
- Testing: 4 hours

---

### 4. **Achievements & Rewards** (`src/Features/AchievementsRewards/AchievementsRewards.tsx`)

#### **WHAT**: Gamification dashboard showing badges, streaks, community kudos, and reward tokens

#### **WHERE**:
- File: `studystreak/src/Features/AchievementsRewards/AchievementsRewards.tsx` (320 lines)
- Route: `/achievements-rewards`

#### **PURPOSE**:
Motivation system celebrating milestones, interdisciplinary collaboration, and sustained effort.

#### **WHY IT EXISTS**:
Gamification drives engagement and provides positive reinforcement for consistent study habits.

#### **CURRENT STATE**: 🟡 **PARTIALLY HARDCODED**

**Integration Status:**
- ✅ **Active Streak**: Already connected via `useGamificationProfile()`
- 🔴 **Badges**: Hardcoded (no backend implementation)
- 🔴 **Community Kudos**: Hardcoded (no social feature)
- 🔴 **Reward Tokens**: Hardcoded (no reward system)

**Hardcoded Data:**

```typescript
// Lines 13-46: statHighlights
const statHighlights = [
  {
    title: 'Active streak',
    value: '18 days',    // CAN USE: profile.streakCount
    ...
  },
  {
    title: 'Badges unlocked',
    value: '24 of 42',   // HARDCODED - no backend
    ...
  },
  {
    title: 'Community kudos',
    value: '312',        // HARDCODED - no social system
    ...
  },
  {
    title: 'Reward tokens',
    value: '8 perks',    // HARDCODED - no reward system
    ...
  }
]

// Lines 48-70: recentCelebrations (badge notifications)
const recentCelebrations = [/* HARDCODED badges */]

// Lines 72-96: progressionTracks (achievement progress)
const progressionTracks = [/* HARDCODED progression */]
```

#### **HOW TO FIX**:

**Phase 1: Badge System**

```sql
-- Badge definitions
CREATE TABLE badge_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name or URL
  category TEXT, -- 'streak', 'social', 'academic', 'wellness'
  criteria JSONB, -- Unlock conditions
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User badges (earned)
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INT DEFAULT 100, -- Percentage complete
  UNIQUE(user_id, badge_id)
);
```

**Sample Badge Criteria:**
```json
{
  "type": "streak_milestone",
  "threshold": 7,
  "field": "streak_count"
}

{
  "type": "total_sessions",
  "threshold": 50,
  "table": "studysession"
}

{
  "type": "study_hours",
  "threshold": 100,
  "field": "total_study_time"
}
```

**Phase 2: Social Features (Community Kudos)**

```sql
-- User interactions
CREATE TABLE user_kudos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES auth.users(id),
  to_user_id UUID REFERENCES auth.users(id),
  material_id UUID REFERENCES learning_materials(material_id),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Phase 3: Reward System**

```sql
-- Reward definitions
CREATE TABLE reward_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cost_tokens INT NOT NULL,
  category TEXT, -- 'mentor', 'feature', 'cosmetic'
  availability_start DATE,
  availability_end DATE,
  is_active BOOLEAN DEFAULT TRUE
);

-- User reward tokens
CREATE TABLE user_reward_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  tokens INT DEFAULT 0,
  lifetime_earned INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Redeemed rewards
CREATE TABLE user_rewards_redeemed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  reward_id UUID REFERENCES reward_definitions(id),
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Token Earning Logic:**
- +1 token per completed study session (> 25 min)
- +5 tokens per streak milestone (7, 14, 30 days)
- +10 tokens per badge earned
- +3 tokens per community kudos received

**Estimated Effort:**
- Database: 4-5 hours (tables, policies, triggers)
- Backend: 10-12 hours (badge checking logic, reward endpoints)
- Frontend: 12-15 hours (badge gallery, social features, redemption UI)
- Testing: 6 hours

---

### 5. **Profile** (`src/Features/Profile/Profile.tsx`)

#### **WHAT**: User profile management with personal info editing

#### **WHERE**:
- File: `studystreak/src/Features/Profile/Profile.tsx` (183 lines)
- Route: `/profile`

#### **CURRENT STATE**: 🟢 **MOSTLY FUNCTIONAL**

**What Works:**
- ✅ Real Supabase authentication integration
- ✅ User metadata (name, email) from `auth.users`
- ✅ Profile updates via `supabase.auth.updateUser()`
- ✅ Syncs `preferred_name` to `profiles` table

**Hardcoded Fallbacks:**

```typescript
// Lines 9-16: blankProfile (fallback when no user data)
const blankProfile = {
  initials: 'JD',                      // FALLBACK
  name: 'Jordan Daniels',              // FALLBACK
  email: 'jordan.daniels@studystreak.org', // FALLBACK
  membership: 'Premium member',        // HARDCODED - no membership system
  joined: 'Member since August 2024',  // HARDCODED - should use created_at
  focus: 'Building sustainable rhythms...', // FALLBACK
}
```

**Minor Issues:**
1. "Premium member" badge is hardcoded (no membership tiers)
2. "Member since" should derive from `profiles.created_at`
3. Avatar upload button is non-functional

**Quick Fixes:**

```typescript
// Fix "Member since" display
const joinedDate = useMemo(() => {
  const created = profile?.created_at || user?.created_at
  if (!created) return 'Member since 2024'
  const date = new Date(created)
  return `Member since ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
}, [profile, user])

// Add avatar upload (using Supabase Storage)
const handleAvatarUpload = async (file: File) => {
  const filePath = `avatars/${user.id}/${Date.now()}-${file.name}`
  const { data, error } = await supabase.storage
    .from('user-avatars')
    .upload(filePath, file)
  
  if (!error) {
    await supabase.auth.updateUser({
      data: { avatar_url: data.path }
    })
  }
}
```

**Estimated Effort:** 2-3 hours

---

### 6. **Learning Materials** (`src/Features/LearningMaterials/`)

#### **CURRENT STATE**: ✅ **PRODUCTION READY**

**What Works:**
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ File upload to Supabase Storage (PDF, PPT, PPTX)
- ✅ Signed URL generation for secure downloads
- ✅ Public/private visibility controls
- ✅ Like/unlike functionality
- ✅ Search and filtering
- ✅ Pagination (12, 24, 48 items per page)
- ✅ AI study tools integration

**Files:**
- `LearningMaterialsDashboard.tsx` - Main list view
- `MaterialsProvider.tsx` - Context provider
- `api.ts` - API client
- `StudyTools/` - AI generation features

**Backend Integration:**
- PHP Controller: `LearningMaterialsController.php`
- Repository: `LearningMaterialRepository.php`
- AI Service: FastAPI `/generate/*` endpoints

**No Technical Debt** - This module is fully functional and ready for production.

---

### 7. **Focus Session (Pomodoro)** (`src/Features/FocusSession/FocusSession.tsx`)

#### **CURRENT STATE**: ✅ **PRODUCTION READY**

**What Works:**
- ✅ Pomodoro timer (25 min work, 5 min break)
- ✅ Customizable session lengths
- ✅ Cycle tracking
- ✅ Saves to `studysession` table
- ✅ Streak activation on session completion
- ✅ Offline queue for failed saves
- ✅ Background timer support

**Backend Integration:**
- Direct Supabase client insert to `studysession` table
- Calls `GamificationController::activateStreak()` API

**Minor Enhancement Opportunity:**
- Add session quality rating form (0-100 scale)
- This would enable Progress Analytics "Focus Quality" trend

---

### 8. **Gamification** (`src/Features/Gamification/`)

#### **CURRENT STATE**: ✅ **PRODUCTION READY**

**What Works:**
- ✅ Streak tracking (current, longest)
- ✅ Timezone-aware streak logic
- ✅ Streak savers (monthly allowance)
- ✅ XP and level system
- ✅ Total study time tracking
- ✅ Real-time profile updates

**Files:**
- `hooks/useGamificationProfile.ts` - Main data hook
- `hooks/useStreakActivation.ts` - Streak update logic
- `services/gamificationService.ts` - API client
- `components/StreakDisplay.tsx` - UI components

**Backend:**
- `GamificationController.php` - PHP endpoints
- `profiles` table in Supabase

**No Technical Debt** - Core gamification is fully functional.

---

## 🗄️ Database Schema Status

### ✅ **Existing Tables (Production Ready)**

```sql
-- User profiles
profiles (
  id UUID PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  preferred_name TEXT,
  streak_count INT,
  streak_longest INT,
  streak_last_active_at TIMESTAMP,
  streak_timezone TEXT,
  total_study_time INT,
  level INT,
  experience_points INT,
  streak_savers_available INT,
  streak_savers_used INT,
  streak_savers_max_per_month INT,
  streak_savers_last_reset DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Study sessions
studysession (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  date DATE,
  time_started TIMESTAMP,
  time_end TIMESTAMP,
  duration INT, -- minutes
  cycles INT
)

-- Learning materials
learning_materials (
  material_id UUID PRIMARY KEY,
  user_id UUID,
  title TEXT,
  description TEXT,
  content_type TEXT, -- 'pdf', 'ppt', 'video', 'article'
  storage_path TEXT,
  file_name TEXT,
  mime TEXT,
  size BIGINT,
  is_public BOOLEAN,
  ai_toggle_enabled BOOLEAN,
  tags_jsonb JSONB,
  likes_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
)

-- Material likes
material_likes (
  user_id UUID REFERENCES auth.users(id),
  material_id UUID REFERENCES learning_materials(material_id),
  created_at TIMESTAMP,
  PRIMARY KEY (user_id, material_id)
)

-- AI-generated study tools
material_ai_versions (
  id UUID PRIMARY KEY,
  material_id UUID REFERENCES learning_materials(material_id),
  version INT,
  summary TEXT,
  keypoints JSONB,
  quiz JSONB,
  flashcards JSONB,
  generated_at TIMESTAMP
)

-- Quiz attempts
quiz_attempts (
  id UUID PRIMARY KEY,
  material_id UUID,
  user_id UUID,
  score NUMERIC,
  total_questions INT,
  time_taken INT,
  answers JSONB,
  created_at TIMESTAMP
)
```

### 🔴 **Missing Tables (Required for Full Functionality)**

```sql
-- User goals (for Study Plan)
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  period TEXT CHECK (period IN ('daily', 'weekly', 'monthly')),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User tasks (for Study Plan & Dashboard)
CREATE TABLE user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User reminders
CREATE TABLE user_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES user_tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Badge system
CREATE TABLE badge_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  criteria JSONB,
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INT DEFAULT 100,
  UNIQUE(user_id, badge_id)
);

-- Reward system
CREATE TABLE reward_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cost_tokens INT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_reward_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens INT DEFAULT 0,
  lifetime_earned INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_rewards_redeemed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES reward_definitions(id),
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social features
CREATE TABLE user_kudos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID REFERENCES learning_materials(material_id) ON DELETE SET NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session quality tracking
ALTER TABLE studysession
ADD COLUMN quality_score INT CHECK (quality_score >= 0 AND quality_score <= 100),
ADD COLUMN reflection_notes TEXT;
```

---

## 🔧 Backend API Status

### ✅ **Implemented Endpoints**

```php
// Authentication
POST /api/auth/signin
POST /api/auth/signup
POST /api/auth/forgot-password
POST /api/auth/reset-password

// Gamification
GET /api/gamification/profile
POST /api/gamification/streak/activate
POST /api/gamification/set-timezone
POST /api/gamification/streak/use-saver

// Learning Materials
GET /api/learning-materials
POST /api/learning-materials
GET /api/learning-materials/:id
PATCH /api/learning-materials/:id
DELETE /api/learning-materials/:id
GET /api/learning-materials/:id/signed-url
POST /api/learning-materials/:id/like
POST /api/learning-materials/:id/unlike

// AI Study Tools (Python FastAPI)
POST /api/ai/generate/summary
POST /api/ai/generate/keypoints
POST /api/ai/generate/quiz
POST /api/ai/generate/flashcards
POST /api/ai/generate/all
```

### 🔴 **Missing Endpoints**

```php
// Goals
GET /api/goals
POST /api/goals
PATCH /api/goals/:id
DELETE /api/goals/:id

// Tasks
GET /api/tasks
POST /api/tasks
PATCH /api/tasks/:id
DELETE /api/tasks/:id

// Reminders
GET /api/reminders
POST /api/reminders
PATCH /api/reminders/:id/dismiss
DELETE /api/reminders/:id

// Badges
GET /api/badges/definitions
GET /api/badges/user/:userId
POST /api/badges/check-unlock -- Background job or trigger

// Rewards
GET /api/rewards/catalog
GET /api/rewards/user-tokens
POST /api/rewards/redeem

// Kudos
GET /api/kudos/received
POST /api/kudos/send

// Analytics
GET /api/analytics/dashboard -- Aggregated dashboard stats
GET /api/analytics/progress  -- Progress analytics data
GET /api/analytics/heatmap   -- Activity heatmap data
```

---

## 🤖 AI Service Status

### ✅ **Functional Features**

**Models Used:**
- `qwen3-vl:8b` (Ollama) - Main text generation LLM
- `phi3:mini` (Ollama) - JSON-structured output
- `t5-base` (HuggingFace) - Question generation for flashcards
- `facebook/bart-large-cnn` (HF) - Summarization
- `sentence-transformers/all-MiniLM-L6-v2` - Semantic embeddings
- `ViT-B/32` (CLIP) - Optional visual extraction

**Working Endpoints:**
- ✅ `/generate/summary` - Concise 3-5 paragraph summaries
- ✅ `/generate/keypoints` - Bullet-point key concepts
- ✅ `/generate/quiz` - Multiple-choice questions with explanations
- ✅ `/generate/flashcards` - Q&A pairs with semantic deduplication
- ✅ `/generate/all` - Combined generation (efficient single call)

**Document Processing:**
- ✅ PDF extraction (pypdf, pdfplumber, pdfminer.six)
- ✅ DOCX extraction (python-docx)
- ✅ PPTX extraction (python-pptx)
- ✅ OCR support (pytesseract for images in PDFs)
- ✅ TF-IDF ranking for important sentences
- ✅ Semantic similarity for flashcard deduplication

### 🟡 **Potential Enhancements**

1. **Caching Layer**
   - Cache AI responses by content hash
   - Avoid regenerating identical content
   - Redis or file-based cache

2. **Quality Metrics**
   - Track generation success rates
   - Log response times
   - Monitor model performance

3. **Batch Processing**
   - Queue system for large documents
   - Progress tracking for long-running jobs
   - Celery or RQ integration

4. **Model Switching**
   - Dynamic model selection based on doc length
   - Fallback models if primary fails
   - Cost optimization for API-based models

---

## 📊 Priority Roadmap

### 🔴 **Phase 1: Critical Fixes (Week 1-2)**

**Goal:** Make Dashboard and Analytics functional with real data

1. **Dashboard Real Data Integration**
   - Create `useDashboardStats()` hook
   - Fetch recent sessions from `studysession`
   - Integrate existing gamification streak data
   - Calculate weekly heatmap from session history
   - **Estimated:** 8-10 hours

2. **Progress Analytics Data Pipeline**
   - Create `useProgressAnalytics()` hook
   - Build aggregation queries for activity heatmap
   - Calculate total focus hours and trends
   - **Estimated:** 6-8 hours

3. **Add Session Quality Field**
   - Migrate `studysession` table (add `quality_score`)
   - Add post-session rating form to Focus Session
   - Enable "Focus Quality" trend in Analytics
   - **Estimated:** 4-5 hours

**Total Phase 1:** ~20-25 hours

---

### 🟡 **Phase 2: Task Management (Week 3-4)**

**Goal:** Build task/goal tracking for Study Plan

1. **Database Schema**
   - Create `user_goals`, `user_tasks`, `user_reminders` tables
   - Set up RLS policies
   - **Estimated:** 3-4 hours

2. **Backend API**
   - PHP controllers for goals/tasks/reminders
   - CRUD endpoints with validation
   - **Estimated:** 10-12 hours

3. **Frontend Integration**
   - `useGoals()`, `useTasks()`, `useReminders()` hooks
   - Replace hardcoded Study Plan data
   - Add task creation/editing forms
   - **Estimated:** 12-15 hours

**Total Phase 2:** ~25-30 hours

---

### 🟢 **Phase 3: Gamification Enhancement (Week 5-6)**

**Goal:** Badge system and reward tokens

1. **Badge System**
   - Database schema for badges
   - Badge checking logic (triggers or cron job)
   - Badge gallery UI
   - **Estimated:** 15-18 hours

2. **Reward System**
   - Reward catalog and token tracking
   - Token earning automation
   - Redemption UI and flow
   - **Estimated:** 12-15 hours

3. **Social Features (Optional)**
   - Community kudos system
   - Public profile pages
   - Leaderboards
   - **Estimated:** 15-20 hours

**Total Phase 3:** ~27-35 hours (or 42-53 hours with social)

---

### 🔵 **Phase 4: Polish & Performance (Week 7-8)**

1. **AI Service Optimization**
   - Add Redis caching layer
   - Implement batch processing queue
   - Monitor and log performance metrics
   - **Estimated:** 8-10 hours

2. **Mobile Responsiveness**
   - Audit all pages on mobile devices
   - Fix layout issues
   - Optimize touch interactions
   - **Estimated:** 6-8 hours

3. **Accessibility Audit**
   - ARIA labels for screen readers
   - Keyboard navigation
   - Color contrast improvements
   - **Estimated:** 5-6 hours

4. **Error Handling & Loading States**
   - Skeleton loaders for all data fetching
   - Graceful error messages
   - Offline mode indicators
   - **Estimated:** 4-5 hours

**Total Phase 4:** ~23-29 hours

---

## 🚀 Total Development Effort Estimate

| Phase | Focus Area | Estimated Hours |
|-------|------------|-----------------|
| Phase 1 | Dashboard & Analytics Real Data | 20-25 hours |
| Phase 2 | Task Management System | 25-30 hours |
| Phase 3 | Badges & Rewards (Core) | 27-35 hours |
| Phase 3+ | Social Features (Optional) | +15-18 hours |
| Phase 4 | Polish & Performance | 23-29 hours |
| **Total (Core)** | | **95-119 hours** |
| **Total (with Social)** | | **110-137 hours** |

**Timeline:** 6-8 weeks for core functionality (assuming 15-20 hours/week)

---

## 🎓 Key Learnings & Architectural Decisions

### **Why These Features Exist:**

1. **Dashboard** - Users need immediate visibility into current state (today's focus, active streaks)
2. **Progress Analytics** - Long-term trend analysis helps users understand patterns and optimize behavior
3. **Study Plan** - Integrated task management prevents context-switching between multiple tools
4. **Achievements** - Gamification drives engagement and provides positive reinforcement
5. **Learning Materials** - Centralized knowledge repository enables AI-powered study aids
6. **Focus Session** - Structured time blocking (Pomodoro) improves productivity and tracks effort
7. **Gamification** - Streaks and XP create habit formation through operant conditioning

### **Current Architecture Strengths:**

✅ **Separation of Concerns:**
- PHP backend handles auth, storage, CRUD
- Python AI service isolated for model inference
- React frontend purely presentational

✅ **Scalability:**
- Supabase handles auth and storage
- FastAPI can scale horizontally
- Frontend is statically buildable

✅ **Developer Experience:**
- TypeScript for type safety
- Hot reload in all environments
- Well-documented API contracts (OpenAPI spec)

### **Technical Debt Origins:**

- **Dashboard/Analytics mock data:** Rapid prototyping phase prioritized UI/UX design before backend implementation
- **Study Plan hardcoded tasks:** Feature scope expansion beyond MVP - task management was not in original spec
- **Achievements placeholders:** Badge logic requires complex trigger system - deferred for Phase 3

---

## 📝 Immediate Next Steps (This Week)

1. **Create database migration script** for Phase 1 schema changes:
   ```sql
   -- migrations/001_add_session_quality.sql
   ALTER TABLE studysession 
   ADD COLUMN quality_score INT CHECK (quality_score >= 0 AND quality_score <= 100),
   ADD COLUMN reflection_notes TEXT;
   ```

2. **Build `useDashboardStats()` hook** in `src/Features/Dashboard/hooks/useDashboardStats.ts`

3. **Create aggregation endpoint** `GET /api/analytics/dashboard` in PHP backend

4. **Replace hardcoded `quickStats` array** with real data from hook

5. **Test streak integration** - verify existing gamification data displays correctly

---

## 🔍 Code Review Checklist

Before deploying any real data integrations:

- [ ] All API endpoints have authentication middleware
- [ ] RLS policies enforce user-level data isolation
- [ ] Error states have user-friendly messages
- [ ] Loading states show skeleton loaders
- [ ] Offline data is queued for retry
- [ ] Timestamps are timezone-aware
- [ ] SQL queries use parameterized statements (no injection)
- [ ] File uploads validate size and type
- [ ] Rate limiting on AI generation endpoints
- [ ] Caching headers for static assets

---

**Document Version:** 1.0  
**Last Updated:** November 22, 2025  
**Maintained By:** Senior Engineering Team

