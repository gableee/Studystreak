/**
 * Dashboard Component
 * 
 * The Dashboard is the main landing page of the StudyStreak application.
 * It displays:
 * - A summary of current courses and their progress
 * - Quick statistics about the user's learning
 * - Recent activity and upcoming deadlines
 * - Interface to quickly add or access existing courses
 * 
 * The dashboard provides an at-a-glance view of the user's study progress and statistics
 * 

📊 Dashboard

Purpose: “How am I doing RIGHT NOW?”

Key Features:

Today’s Study Time vs Goal → progress ring or bar showing “2h / 3h completed”

Current Streak Status → fire icon 🔥 and number counter (e.g., “Day 7 Streak”)

Recent Session Summary → last 3 focus sessions with durations and scores

Quick Stats → compact cards for sessions completed, average focus, total study hours

Study Heat Map → 7-day grid (GitHub-style calendar with darker shades for longer sessions)

Upcoming Deadlines → minimal timeline or scrollable list with subject icons

(Design: clean layout with light gradients, rounded stat cards, and subtle motivational quotes.)
 * 
 * @module Features/Dashboard
 */

import { Activity, Briefcase, Calendar, CheckCircle2, Clock, Flame, HeartPulse, Palette, Target, TrendingUp } from 'lucide-react'

const quickStats = [
  {
    label: 'Focus Time',
    value: '2h 30m',
    caption: 'Goal: 4 hours',
    change: '+18% vs yesterday',
    icon: <Clock className="h-6 w-6" />, 
    tone: 'from-sky-400/80 to-sky-600/90',
  },
  {
    label: 'Active Streak',
    value: '15 days',
    caption: 'Longest streak: 28 days',
    change: 'Keep momentum!',
    icon: <Flame className="h-6 w-6" />, 
    tone: 'from-orange-400/80 to-rose-500/80',
  },
  {
    label: 'Sessions Completed',
    value: '5 today',
    caption: '3 focus • 2 review',
    change: '+1 session vs Friday',
    icon: <CheckCircle2 className="h-6 w-6" />, 
    tone: 'from-emerald-400/80 to-teal-500/80',
  },
  {
    label: 'Wellbeing Score',
    value: '87%',
    caption: 'Balanced effort & rest',
    change: '+5% vs last week',
    icon: <HeartPulse className="h-6 w-6" />, 
    tone: 'from-purple-400/80 to-indigo-500/80',
  },
]

const sessionLog = [
  {
    title: 'Neuroanatomy Lab Prep',
    context: 'Health Sciences',
    duration: '40 min • Focus Blocks',
    time: '08:15',
    status: 'Completed',
  },
  {
    title: 'Structural Analysis Workshop',
    context: 'Civil Engineering cohort',
    duration: '55 min • Study Group',
    time: '10:20',
    status: 'Completed',
  },
  {
    title: 'Visual Storytelling Critique',
    context: 'Media Arts studio',
    duration: '30 min • Reflection',
    time: 'Yesterday',
    status: 'Shared notes',
  },
]

const deadlines = [
  {
    title: 'Pharmacology dosage quiz',
    due: 'Due tomorrow',
    accent: 'border-rose-400 bg-rose-50/80 dark:bg-rose-500/10',
  },
  {
    title: 'Bridge design presentation',
    due: 'Teams review in 3 days',
    accent: 'border-amber-400 bg-amber-50/80 dark:bg-amber-500/10',
  },
  {
    title: 'UX journey map submission',
    due: 'Due Friday',
    accent: 'border-sky-400 bg-sky-50/80 dark:bg-sky-500/10',
  },
  {
    title: 'Organic chem problem set',
    due: 'Due next Monday',
    accent: 'border-emerald-400 bg-emerald-50/80 dark:bg-emerald-500/10',
  },
]

export default function Dashboard() {
  return (
    <div className="relative max-w-6xl mx-auto space-y-8 pb-12">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent blur-3xl" aria-hidden />

      <header className="surface-section relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10" aria-hidden />
        <div className="relative space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-slate-200">
            Personalized pulse
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Welcome back, keep your streak thriving today
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Review progress across clinical labs, studio critiques, and problem sets. Your stats adapt to the way you learn.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickStats.map((stat) => (
          <article key={stat.label} className="stat-tile">
            <div className="stat-header">
              <div className="stat-icon">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.tone} text-white shadow-lg`}>
                  {stat.icon}
                </span>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                {stat.label}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-300">{stat.caption}</p>
            </div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-300">{stat.change}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <article className="surface-section lg:h-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent sessions</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Capturing effort across disciplines</p>
            </div>
            <button className="pill-tab">View all</button>
          </div>

          <div className="space-y-3">
            {sessionLog.map((session) => (
              <div key={session.title} className="surface-card flex flex-wrap items-start gap-4 rounded-2xl">
                <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-3 text-blue-600 dark:text-blue-200">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-[12rem] space-y-1">
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{session.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-300">{session.context}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-400">{session.duration}</p>
                </div>
                <div className="space-y-1 text-right text-sm">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{session.time}</p>
                  <span className="badge badge-info">{session.status}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="surface-section space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming checkpoints</h2>
            <Calendar className="h-5 w-5 text-slate-500 dark:text-slate-300" />
          </div>
          <ul className="space-y-3">
            {deadlines.map((item) => (
              <li key={item.title} className={`surface-card border-l-4 ${item.accent}`}>
                <p className="text-sm font-medium text-slate-800 dark:text-white">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-300">{item.due}</p>
              </li>
            ))}
          </ul>
          <button className="pill-tab-active flex items-center justify-center gap-2">
            <Target className="h-4 w-4" />
            Plan next study block
          </button>
        </aside>
      </section>

      <section className="surface-section space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Weekly rhythm</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Tap a day to log reflections</p>
          </div>
          <TrendingUp className="h-5 w-5 text-emerald-500" />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-300">
          <span>Less</span>
          <div className="flex gap-1">
            {["bg-slate-200", "bg-emerald-200", "bg-emerald-400", "bg-emerald-500", "bg-emerald-700"].map((tone) => (
              <span key={tone} className={`h-3 w-6 rounded-full ${tone} dark:opacity-80`} />
            ))}
          </div>
          <span>More</span>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {[
            { day: 'Mon', hours: '3.0h', intensity: 'bg-emerald-700 text-white' },
            { day: 'Tue', hours: '2.5h', intensity: 'bg-emerald-500 text-white' },
            { day: 'Wed', hours: '3.2h', intensity: 'bg-emerald-600 text-white' },
            { day: 'Thu', hours: '1.8h', intensity: 'bg-emerald-300 text-slate-700' },
            { day: 'Fri', hours: '2.7h', intensity: 'bg-emerald-500 text-white' },
            { day: 'Sat', hours: '1.4h', intensity: 'bg-emerald-200 text-slate-700' },
            { day: 'Sun', hours: '0.6h', intensity: 'bg-slate-200 text-slate-700' },
          ].map((day) => (
            <button
              key={day.day}
              className="group space-y-2 rounded-2xl border border-white/20 bg-white/70 p-4 text-center transition hover:border-blue-400 hover:shadow-lg dark:bg-white/5"
            >
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-300">{day.day}</span>
              <span className={`block rounded-xl py-3 text-sm font-semibold ${day.intensity}`}>{day.hours}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: 'Focus session',
            description: 'Launch a 25-minute Pomodoro with mindful breaks.',
            icon: <Clock className="h-5 w-5" />, 
            tint: 'from-sky-400/80 to-sky-500/80',
            action: 'Start timer',
          },
          {
            title: 'Update study plan',
            description: 'Re-balance coursework across med, studio, and engineering tracks.',
            icon: <Briefcase className="h-5 w-5" />, 
            tint: 'from-emerald-400/80 to-teal-500/80',
            action: 'Open planner',
          },
          {
            title: 'Reflect & celebrate',
            description: 'Capture a quick win to unlock the weekly encouragement badge.',
            icon: <Palette className="h-5 w-5" />, 
            tint: 'from-purple-400/80 to-pink-500/80',
            action: 'Log reflection',
          },
        ].map((card) => (
          <button
            key={card.title}
            className="surface-card flex h-full flex-col items-start gap-3 rounded-3xl border border-white/10 bg-white/80 p-6 text-left transition hover:border-blue-300 hover:shadow-lg dark:bg-white/5"
          >
            <span className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${card.tint} p-3 text-white shadow-lg`}>
              {card.icon}
            </span>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{card.title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-300">{card.description}</p>
            </div>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">{card.action} →</span>
          </button>
        ))}
      </section>
    </div>
  )
}