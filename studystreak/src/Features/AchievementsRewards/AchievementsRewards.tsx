
/**
 * Achievements and rewards
 * Purpose: motivation and progress recognition across disciplines
 * Key points:
 * - Celebrates streaks, interdisciplinary badges, and reward tokens
 * - Highlights inclusive milestones from health, design, and data cohorts
 * - Surfaces upcoming challenges and community perks for momentum
 */

import { Crown, Flame, Gift, Heart, Medal, Star, Target, Trophy, Users } from 'lucide-react'

const statHighlights = [
  {
    title: 'Active streak',
    value: '18 days',
    delta: '+3 vs best',
    caption: 'Longest streak: 28 days',
    accent: 'from-orange-400/80 to-rose-500/80',
    icon: Flame,
  },
  {
    title: 'Badges unlocked',
    value: '24 of 42',
    delta: '+2 this week',
    caption: 'Systems collaborator unlocked',
    accent: 'from-amber-400/80 to-blue-500/80',
    icon: Trophy,
  },
  {
    title: 'Community kudos',
    value: '312',
    delta: '+28 this month',
    caption: 'Peer feedback across cohorts',
    accent: 'from-emerald-400/80 to-teal-500/80',
    icon: Users,
  },
  {
    title: 'Reward tokens',
    value: '8 perks',
    delta: '2 to next upgrade',
    caption: 'Mentor office hours unlock at 10',
    accent: 'from-purple-400/80 to-indigo-500/80',
    icon: Gift,
  },
]

const recentCelebrations = [
  {
    title: 'Interdisciplinary collaborator',
    summary: 'Shared case notes between nursing, architecture, and data cohorts with actionable insights.',
    time: 'Earned 2 hours ago',
    tag: 'Community milestone',
    accent: 'from-sky-500 to-indigo-500',
    icon: Star,
  },
  {
    title: 'Empathy in action',
    summary: 'Facilitated trauma aware reflections for hospital partners and logged follow up plans.',
    time: 'Earned 1 day ago',
    tag: 'Health sciences',
    accent: 'from-emerald-500 to-teal-500',
    icon: Heart,
  },
  {
    title: 'Design studio steward',
    summary: 'Hosted accessible critique with inclusive rubrics shared to the cohort library.',
    time: 'Earned 4 days ago',
    tag: 'Built environment',
    accent: 'from-purple-500 to-pink-500',
    icon: Trophy,
  },
]

const progressionTracks = [
  {
    title: 'Reflective practice tour',
    description: 'Complete three journal prompts that connect health, design, and civic data labs.',
    progress: 68,
    milestone: 'Next badge unlocks at 75%',
    accent: 'from-sky-500/80 to-blue-600/80',
    icon: Target,
  },
  {
    title: 'Mentor circle facilitator',
    description: 'Host combined study circle with two disciplines and publish shared summary notes.',
    progress: 54,
    milestone: 'Invite confirmed with civic mentors',
    accent: 'from-emerald-500/80 to-teal-600/80',
    icon: Users,
  },
  {
    title: 'Wellness guardian',
    description: 'Log five restorative breaks in Focus Sessions and reflect on energy trends weekly.',
    progress: 42,
    milestone: 'Calm cadence badge appears at 60%',
    accent: 'from-orange-400/80 to-rose-500/80',
    icon: Flame,
  },
]

const rewardMoments = [
  {
    title: 'Mentor office hours',
    detail: 'Reserved thirty minute session with inclusive design coach.',
    time: 'Unlocked 3 days ago',
    accent: 'from-purple-400 to-indigo-500',
    icon: Crown,
  },
  {
    title: 'Community showcase slot',
    detail: 'Presentation scheduled for campus innovation festival.',
    time: 'Unlocked 1 week ago',
    accent: 'from-blue-500 to-cyan-500',
    icon: Medal,
  },
  {
    title: 'Wellness resource bundle',
    detail: 'Access to mindfulness audio and stretch routines for thirty days.',
    time: 'Unlocked 2 weeks ago',
    accent: 'from-emerald-500 to-teal-500',
    icon: Gift,
  },
]

const focusChips = [
  'Trauma aware patient dialogues',
  'Adaptive studio lighting plans',
  'Data storytelling sprints',
  'Community feedback kits',
  'Mindful recovery plans',
  'Mentor exchanges',
]

export default function AchievementsRewards() {
  return (
    <div className="relative mx-auto max-w-6xl space-y-8 pb-12">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-amber-400/15 via-transparent to-transparent blur-3xl" aria-hidden />

      <header className="surface-section relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10" aria-hidden />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="badge badge-info uppercase tracking-wide">Momentum hub</span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Achievements and rewards rooted in collaborative learning
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
                Celebrate streaks, interdisciplinary badges, and wellbeing milestones. Each card connects to a real cohort story so teams can see how progress travels across disciplines.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="pill-tab-active inline-flex items-center gap-2">
                Review milestones
              </button>
              <button className="pill-tab inline-flex items-center gap-2">
                Share progress
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="surface-section space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Highlights at a glance</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Aggregated metrics from the achievements and rewards services.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statHighlights.map((stat) => {
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
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent celebrations</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Moments that earned badges in the last week.</p>
          </div>
          <button className="pill-tab inline-flex items-center gap-2">View history</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recentCelebrations.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="surface-card flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-white shadow-md`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="badge badge-info">{item.tag}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-300">{item.summary}</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-300">{item.time}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="surface-section space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Progress toward next badges</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Trackers tie into streak data, focus sessions, and community events.</p>
          </div>
          <button className="pill-tab inline-flex items-center gap-2">See requirements</button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {progressionTracks.map((track) => {
            const Icon = track.icon
            return (
              <article key={track.title} className="surface-card space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${track.accent} text-white`}> 
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{track.title}</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-300">{track.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                    <span>Progress</span>
                    <span>{track.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/40 dark:bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{ width: `${track.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300">{track.milestone}</p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="surface-section space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Reward timeline</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Unlocked perks linked to StudyStreak reward tokens.</p>
          </div>
        </div>
        <div className="space-y-4">
          {rewardMoments.map((reward) => {
            const Icon = reward.icon
            return (
              <article key={reward.title} className="surface-card flex items-start gap-4">
                <span className={`inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${reward.accent} text-white`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1 space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{reward.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-300">{reward.detail}</p>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-300">{reward.time}</span>
              </article>
            )
          })}
        </div>
      </section>

      <section className="surface-section space-y-4">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Focus areas in rotation</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {focusChips.map((topic) => (
            <span key={topic} className="pill-tab inline-flex items-center gap-2">
              {topic}
            </span>
          ))}
        </div>
      </section>

      <section className="surface-section space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming challenge</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Earn the community catalyst badge by partnering with another cohort on a shared study sprint.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="pill-tab-active inline-flex items-center gap-2">Join challenge</button>
            <button className="pill-tab inline-flex items-center gap-2">View criteria</button>
          </div>
        </div>
      </section>
    </div>
  )
}

