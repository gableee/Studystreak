import type { ReactNode } from 'react'
import { Trophy, TrendingUp, CalendarDays, Share2 } from 'lucide-react'

/**
 * Progress & Achievements Component
 *
 * Provides a summary of study performance with visual callouts that will later
 * be powered by real analytics. For now it renders representative cards so the
 * route has a meaningful shell while the data layer is still under construction.
 */
export default function ProgressAchievements() {
  return (
    <div className="space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Progress &amp; Achievements</h1>
        <p className="text-muted-foreground dark:text-slate-300 max-w-2xl">
          Track your study streak, celebrate milestones, and understand how your habits are evolving. Detailed analytics and reports will live here soon.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AchievementCard
          icon={<TrendingUp className="h-6 w-6" />}
          title="Study Momentum"
          description="Daily, weekly, and 30-day study metrics help you stay on pace with your goals."
        />
        <AchievementCard
          icon={<Trophy className="h-6 w-6" />}
          title="Milestones"
          description="Earning badges and hitting streaks keeps motivation high and progress visible."
        />
        <AchievementCard
          icon={<CalendarDays className="h-6 w-6" />}
          title="Streak History"
          description="Review your calendar to spot consistency wins and identify improvement windows."
        />
        <AchievementCard
          icon={<Share2 className="h-6 w-6" />}
          title="Export & Share"
          description="Generate reports to share progress with mentors, accountability partners, or teams."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm dark:border-white/5 dark:bg-[#0A1220]/80">
          <h2 className="text-xl font-semibold text-foreground dark:text-white">Upcoming Enhancements</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Personalized insights that highlight peak focus hours and study cadence.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Breakdown of progress by goal category with AI-generated recommendations.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Exportable summaries and integrations with accountability partners.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm dark:border-white/5 dark:bg-[#0A1220]/80">
          <h2 className="text-xl font-semibold text-foreground dark:text-white">Stay Motivated</h2>
          <p className="mt-4 text-sm text-muted-foreground dark:text-slate-300">
            Use this space to celebrate progress, reflect on what worked, and set the tone for the next study session. As features roll out, you&apos;ll see deeper analytics, visualizations, and collaborative tools designed to keep you on track.
          </p>
        </div>
      </section>
    </div>
  )
}

interface AchievementCardProps {
  icon: ReactNode
  title: string
  description: string
}

function AchievementCard({ icon, title, description }: AchievementCardProps) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card/60 p-5 shadow-sm transition-colors hover:border-indigo-400/60 dark:border-white/5 dark:bg-[#0A1220]/80">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground dark:text-white">{title}</h3>
      <p className="text-sm text-muted-foreground dark:text-slate-300">{description}</p>
    </article>
  )
}
