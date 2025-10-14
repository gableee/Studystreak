/**
🎯 My Study Plan
Purpose: Goal management & task organization
Key Features:
- To-Do List with Deadlines → checkbox list with date labels and priority colors
- Weekly/Monthly Goal Setting → bar graph comparing planned vs actual study hours
- Study Schedule / Calendar View → full-width calendar with color-coded subjects
- Notification Center → bell icon 🔔 with grouped reminders (e.g., “Math: 2 hrs left today”)
- Priority System → drag-and-drop task sorting or tiered priority badges (Low–High)
(Design: minimalist dashboard with tabs for “Week View” and “Month View,” pastel tones for priorities.)

 * @module Features/MyStudyPlan
 */

import { Bell, Calendar, CheckCircle2, ChevronDown, Circle, Clock, Filter, Plus, Target } from 'lucide-react'

const goalSummaries = [
  {
    label: 'Daily rounds',
    summary: 'Clinical hours logged',
    metric: '3.0 / 4 hrs',
    progress: 75,
    accent: 'from-sky-400/90 to-blue-500/90',
  },
  {
    label: 'Studio build',
    summary: 'Design iterations shipped',
    metric: '5 / 7 sprints',
    progress: 71,
    accent: 'from-purple-400/90 to-rose-500/90',
  },
  {
    label: 'Research block',
    summary: 'Hours for lab analysis',
    metric: '12 / 18 hrs',
    progress: 66,
    accent: 'from-emerald-400/90 to-teal-500/90',
  },
]

const planTasks = [
  {
    title: 'Simulate emergency response drill',
    focus: 'Paramedicine practicum',
    priority: 'Essential today',
    tone: 'border-rose-500/70 bg-rose-500/10 text-rose-600 dark:text-rose-300',
    due: 'Due in 4h',
    schedule: 'Wed • 14:00 lab wing',
    status: 'open',
  },
  {
    title: 'Storyboard community campaign',
    focus: 'Visual communications brief',
    priority: 'Tomorrow focus',
    tone: 'border-amber-500/70 bg-amber-500/10 text-amber-600 dark:text-amber-300',
    due: 'Due tomorrow',
    schedule: 'Thu • async review',
    status: 'open',
  },
  {
    title: 'Model shear force diagram',
    focus: 'Bridge deck analysis cohort',
    priority: 'On-track',
    tone: 'border-sky-500/70 bg-sky-500/10 text-sky-600 dark:text-sky-300',
    due: 'Due in 5 days',
    schedule: 'Fri • 09:00 workshop',
    status: 'open',
  },
  {
    title: 'Reflect on patient interviews',
    focus: 'Health equity case study',
    priority: 'Completed',
    tone: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    due: 'Logged yesterday',
    schedule: 'Sun • personal notes',
    status: 'done',
  },
]

const reminders = [
  {
    title: 'Check-in with mentor about residency preference list',
    time: 'in 2 hours',
    accent: 'border-l-4 border-sky-400',
  },
  {
    title: 'Upload architecture portfolio renders for cohort critique',
    time: 'tonight 21:00',
    accent: 'border-l-4 border-purple-400',
  },
  {
    title: 'Log meal & rest break to keep wellbeing tracker balanced',
    time: 'remind before midnight',
    accent: 'border-l-4 border-emerald-400',
  },
]

const calendarLegend = [
  { day: 'Mon', note: 'Clinical', tint: 'bg-sky-500 text-white' },
  { day: 'Tue', note: 'Studio', tint: 'bg-purple-500 text-white' },
  { day: 'Wed', note: 'Engineering', tint: 'bg-emerald-500 text-white' },
  { day: 'Thu', note: 'Writing', tint: 'bg-amber-400 text-slate-800' },
  { day: 'Fri', note: 'Analytics', tint: 'bg-blue-500 text-white' },
  { day: 'Sat', note: 'Rest', tint: 'bg-slate-200 text-slate-700' },
  { day: 'Sun', note: 'Reflection', tint: 'bg-slate-300 text-slate-800' },
]

export default function MyStudyPlan() {
  return (
    <div className="relative mx-auto max-w-6xl space-y-8 pb-12">
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-indigo-500/20 via-transparent to-transparent blur-3xl" aria-hidden />

      <header className="surface-section relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-400/15 via-transparent to-purple-400/15" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <span className="badge badge-info uppercase tracking-wide">Plan smarter</span>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Align your clinical, studio, and engineering milestones
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              You are balancing placements, creative briefs, and structural analyses. This plan keeps each track visible with time for rest and reflection.
            </p>
          </div>
          <button className="pill-tab-active flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New task
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {goalSummaries.map((goal) => (
          <article key={goal.label} className="stat-tile">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{goal.label}</span>
                <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{goal.summary}</h2>
              </div>
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${goal.accent} text-white shadow-lg`}>
                <Target className="h-5 w-5" />
              </span>
            </div>
            <div className="space-y-3">
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{goal.metric}</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/60 dark:bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${goal.progress}%` }} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-300">Reset every Sunday 20:00 local time</p>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <article className="surface-section space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Active tasks</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Reordered by energy level and deadlines</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="pill-tab flex items-center gap-1">
                <Filter className="h-4 w-4" />
                Filter
              </button>
              <button className="pill-tab flex items-center gap-1">
                Focus view
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {planTasks.map((task) => (
              <div
                key={task.title}
                className={`surface-card flex flex-wrap items-start gap-4 border-l-4 ${task.tone} transition hover:border-blue-400/80`}
              >
                <button className="rounded-2xl border border-white/10 bg-white/40 p-3 text-slate-600 transition hover:border-blue-300 hover:text-blue-500 dark:bg-white/5">
                  {task.status === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </button>
                <div className="flex-1 min-w-[14rem] space-y-1">
                  <p className={`text-base font-semibold ${task.status === 'done' ? 'text-slate-500 line-through dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {task.title}
                  </p>
                  <p className={`text-sm ${task.status === 'done' ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-500 dark:text-slate-300'}`}>
                    {task.focus}
                  </p>
                </div>
                <div className="flex min-w-[10rem] flex-col gap-1 text-sm text-slate-500 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    <Clock className="h-3.5 w-3.5" />
                    {task.due}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
                    <Calendar className="h-3.5 w-3.5" />
                    {task.schedule}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button className="pill-tab-active w-full justify-center">
            <Plus className="h-4 w-4" />
            Capture a new milestone
          </button>
        </article>

        <aside className="space-y-6">
          <section className="surface-section space-y-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Schedule radar</h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">Tap a day to open detailed timetable</p>
              </div>
              <Calendar className="h-5 w-5 text-slate-400" />
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-300">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarLegend.map(({ day, tint }) => (
                <button
                  key={day}
                  className={`rounded-2xl px-2 py-4 text-center text-xs font-semibold transition hover:border hover:border-blue-300 hover:shadow-lg ${tint}`}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-white/60 p-4 text-left shadow-inner dark:bg-white/10">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Today • Wed</p>
              <ul className="mt-2 space-y-2 text-xs text-slate-500 dark:text-slate-300">
                <li>07:00 — cardio warm-up</li>
                <li>09:00 — City hospital rounds</li>
                <li>13:30 — Studio ideation lab</li>
                <li>19:00 — Peer feedback circle</li>
              </ul>
            </div>
          </section>

          <section className="surface-section space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Focus reminders</h2>
              <Bell className="h-5 w-5 text-slate-400" />
            </div>
            <ul className="space-y-3">
              {reminders.map((item) => (
                <li key={item.title} className={`surface-card ${item.accent}`}>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{item.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">{item.time}</p>
                </li>
              ))}
            </ul>
            <button className="pill-tab flex items-center justify-center gap-2">
              <Target className="h-4 w-4" />
              Edit focus labels
            </button>
          </section>
        </aside>
      </section>
    </div>
  )
}