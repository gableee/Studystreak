
/**
 * Progress & Analytics
 * Purpose: “How have I grown over time?”
 * Key patterns inspired by GitHub analytics: stacked charts, contribution grid, milestone timelines.
 */

import {
  Activity,
  Award,
  BarChart3,
  Calendar,
  Clock,
  Download,
  GitBranch,
  Target,
  Zap,
} from 'lucide-react'

const timeFilters = ['Daily view', 'Weekly trend', 'Monthly trend', 'Year in review']

const summaryStats = [
  {
    title: 'Total focus hours',
    value: '92.5h',
    delta: '+12% vs last month',
    caption: 'Sessions logged across StudyStreak services',
    accent: 'from-blue-500/80 to-indigo-600/80',
    icon: Clock,
  },
  {
    title: 'Average per day',
    value: '3.3h',
    delta: '+18 minutes',
    caption: 'Blended asynchronous plus mentor-led time',
    accent: 'from-emerald-500/80 to-teal-600/80',
    icon: Target,
  },
  {
    title: 'Sessions completed',
    value: '148',
    delta: '+17 this month',
    caption: 'Focus blocks with reflection notes',
    accent: 'from-purple-500/80 to-fuchsia-500/80',
    icon: Zap,
  },
  {
    title: 'Badges earned',
    value: '24',
    delta: '+3 cross cohort',
    caption: 'Health, design, and data pathways',
    accent: 'from-amber-400/80 to-rose-500/80',
    icon: Award,
  },
]


const activityMatrix = [
  { week: 'W1', days: [0, 1, 2, 3, 1, 0, 2] },
  { week: 'W2', days: [0, 2, 3, 4, 2, 1, 1] },
  { week: 'W3', days: [1, 1, 2, 3, 2, 0, 1] },
  { week: 'W4', days: [0, 1, 1, 2, 3, 2, 2] },
  { week: 'W5', days: [1, 2, 3, 4, 3, 1, 0] },
  { week: 'W6', days: [0, 0, 1, 2, 2, 1, 0] },
  { week: 'W7', days: [1, 2, 3, 2, 3, 2, 1] },
  { week: 'W8', days: [2, 3, 4, 3, 4, 2, 3] },
  { week: 'W9', days: [1, 2, 2, 3, 2, 1, 1] },
  { week: 'W10', days: [0, 1, 2, 3, 2, 0, 0] },
  { week: 'W11', days: [1, 3, 4, 4, 3, 2, 2] },
  { week: 'W12', days: [2, 2, 3, 2, 3, 2, 1] },
  { week: 'W13', days: [1, 1, 2, 3, 2, 2, 1] },
  { week: 'W14', days: [0, 2, 3, 3, 4, 3, 2] },
  { week: 'W15', days: [1, 2, 2, 1, 2, 1, 0] },
  { week: 'W16', days: [0, 1, 2, 3, 4, 4, 3] },
]

const comparisonSeries = [
  {
    name: 'Focus quality',
    caption: 'Composite of deep work and reflection scores',
    accent: 'from-sky-500 to-blue-600',
    points: [72, 78, 81, 76, 88, 84, 90, 85],
  },
  {
    name: 'Session time',
    caption: 'Average minutes per recorded session',
    accent: 'from-purple-500 to-pink-500',
    points: [48, 52, 54, 50, 57, 61, 63, 60],
  },
  {
    name: 'Task completion',
    caption: 'Percentage of planned tasks completed weekly',
    accent: 'from-emerald-500 to-teal-500',
    points: [68, 72, 74, 73, 79, 83, 86, 82],
  },
]

const skillTimelines = [
  {
    title: 'Clinical communication',
    discipline: 'Health sciences',
    level: 'Advanced',
    checkpoints: [
      { label: 'Foundations', done: true },
      { label: 'Interdisciplinary rounds', done: true },
      { label: 'Mentor simulations', done: true },
      { label: 'Community teaching', done: false },
    ],
  },
  {
    title: 'Sustainable studio systems',
    discipline: 'Built environment',
    level: 'Intermediate',
    checkpoints: [
      { label: 'Concept research', done: true },
      { label: 'Inclusive prototyping', done: true },
      { label: 'Cross-cohort critique', done: false },
      { label: 'Field testing', done: false },
    ],
  },
  {
    title: 'Ethical data practice',
    discipline: 'Data and analytics',
    level: 'Intermediate',
    checkpoints: [
      { label: 'Bias audits', done: true },
      { label: 'Stakeholder mapping', done: true },
      { label: 'Responsible release', done: false },
      { label: 'Community reporting', done: false },
    ],
  },
  {
    title: 'Restorative scheduling',
    discipline: 'Wellbeing',
    level: 'Developing',
    checkpoints: [
      { label: 'Sleep cadence', done: true },
      { label: 'Energy journaling', done: false },
      { label: 'Mentor pairing', done: false },
      { label: 'Recovery showcase', done: false },
    ],
  },
]

export default function ProgressAnalytics() {
  const maxComparison = Math.max(
    ...comparisonSeries.flatMap((series) => series.points)
  )

  const intensityClass = (value: number) => {
    if (value === 0) return 'bg-white/50 dark:bg-white/10'
    if (value === 1) return 'bg-emerald-200 dark:bg-emerald-500/30'
    if (value === 2) return 'bg-emerald-400 dark:bg-emerald-500/50'
    if (value === 3) return 'bg-emerald-600 dark:bg-emerald-500/70'
    return 'bg-emerald-800 dark:bg-emerald-500/90'
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-8 pb-12">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-blue-500/20 via-transparent to-transparent blur-3xl" aria-hidden />

      <header className="surface-section relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-transparent to-purple-500/15" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <span className="badge badge-info uppercase tracking-wide">Progress lens</span>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Progress and analytics across your StudyStreak journey
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              Explore focus habits the way GitHub visualises commits: contribution grids, spike charts, and milestone timelines ready for mentors and advisors.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="pill-tab inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button className="pill-tab-active inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export summary
            </button>
          </div>
        </div>
      </header>

      <section className="surface-section space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {timeFilters.map((filter, index) => (
            <button
              key={filter}
              className={`${index === 0 ? 'pill-tab-active' : 'pill-tab'} inline-flex items-center gap-2`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="surface-section space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Summary metrics</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Derived from focus sessions, streak logs, and cross-cohort achievements.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryStats.map((stat) => {
            const Icon = stat.icon
            return (
              <article key={stat.title} className="stat-tile">
                <div className="stat-header">
                  <span className={`stat-icon bg-gradient-to-br ${stat.accent} text-white`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-100">
                    {stat.delta}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-300">{stat.title}</p>
                  <p className="text-3xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">{stat.caption}</p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="surface-section space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500 dark:text-purple-300" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Comparison analytics</h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-300">Spike graph comparing focus quality, session time, and task completion.</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {comparisonSeries.map((series) => (
            <article key={series.name} className="surface-card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{series.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300">{series.caption}</p>
                </div>
                <GitBranch className="h-4 w-4 text-slate-400 dark:text-slate-300" />
              </div>
              <div className="flex h-24 items-end gap-1">
                {series.points.map((point, index) => (
                  <div key={`${series.name}-${index}`} className="flex-1">
                    <div
                      className={`h-full w-full rounded-full bg-gradient-to-t ${series.accent}`}
                      style={{ height: `${(point / maxComparison) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                <span>Earlier</span>
                <span>Recent</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-section space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Full streak history (GitHub style)</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
            <span>Fewer</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((value) => (
                <div key={value} className={`h-3 w-3 rounded-sm ${intensityClass(value)}`} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
        <div className="overflow-x-auto pb-3">
          <div className="flex gap-1">
            {activityMatrix.map((week) => (
              <div key={week.week} className="grid grid-rows-7 gap-1">
                {week.days.map((value, index) => (
                  <div
                    key={`${week.week}-${index}`}
                    className={`h-3 w-3 rounded-sm ${intensityClass(value)}`}
                    title={`${value} hour focus`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/80 p-4 text-sm font-medium text-emerald-900 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          Current streak holds at eighteen days; longest stands at twenty-eight. Contribution peaks map to collaborative studio weeks.
        </div>
      </section>

      <section className="surface-section space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500 dark:text-orange-300" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Skill progression timelines</h2>
          </div>
          <button className="pill-tab inline-flex items-center gap-2">
            View timeline report
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {skillTimelines.map((skill) => {
            const completed = skill.checkpoints.filter((checkpoint) => checkpoint.done).length
            const completionPercent = Math.round((completed / skill.checkpoints.length) * 100)

            return (
              <article key={skill.title} className="surface-card space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{skill.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300">{skill.discipline}</p>
                  </div>
                  <span className="rounded-full bg-white/60 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-100">
                    {skill.level}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/40 dark:bg-white/10">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <div className="grid gap-2 text-xs text-slate-500 dark:text-slate-300">
                  {skill.checkpoints.map((checkpoint) => (
                    <div key={checkpoint.label} className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                          checkpoint.done
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-slate-400 bg-white/40 text-slate-500 dark:border-white/20 dark:bg-white/5 dark:text-slate-300'
                        }`}
                      >
                        {checkpoint.done ? '✓' : ''}
                      </span>
                      <span>{checkpoint.label}</span>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}



