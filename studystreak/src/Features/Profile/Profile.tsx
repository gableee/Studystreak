import { Bell, Globe, Lock, Mail, Palette, Save, Settings, User } from 'lucide-react'

const profileSummary = {
  initials: 'JD',
  name: 'Jordan Daniels',
  email: 'jordan.daniels@studystreak.org',
  membership: 'Premium member',
  joined: 'Member since August 2024',
  focus: 'Building sustainable rhythms across studio design, health, and data storytelling cohorts.',
}

const personalFields = [
  {
    label: 'Preferred name',
    type: 'text',
    value: 'Jordan Daniels',
    helper: 'Appears on dashboards, celebratory cards, and shared streaks.',
  },
  {
    label: 'Email address',
    type: 'email',
    value: 'jordan.daniels@studystreak.org',
    helper: 'Used for sign in, progress exports, and guardian reports.',
  },
  {
    label: 'Portfolio handle',
    type: 'text',
    value: 'jordan-designs',
    helper: 'Shared on peer showcases and mentor check-ins.',
  },
  {
    label: 'Pronouns',
    type: 'text',
    value: 'they/them',
    helper: 'Visible on team boards and accountability prompts.',
  },
]

const bioField = {
  label: 'Learning focus statement',
  value:
    'Designing restorative study habits while mentoring new students in inclusive health and community tech projects.',
}

const notificationOptions = [
  {
    title: 'Weekly rhythm digest',
    description: 'Email summary across focus streaks, wellness notes, and mentor feedback.',
    icon: Mail,
    defaultChecked: true,
  },
  {
    title: 'Daily reminder nudges',
    description: 'Gentle push notifications aligned with chosen quiet hours.',
    icon: Bell,
    defaultChecked: true,
  },
  {
    title: 'Security alerts',
    description: 'Immediate notices whenever sign in happens from a new device.',
    icon: Lock,
    defaultChecked: false,
  },
]

const preferenceOptions = [
  {
    label: 'Theme',
    options: ['Light', 'Dark', 'System blended'],
    helper: 'Pick a palette that supports your current space or sensory needs.',
  },
  {
    label: 'Language',
    options: ['English', 'Español', 'Français', 'Deutsch'],
    helper: 'Switch between supported languages to share progress globally.',
  },
  {
    label: 'Timezone',
    options: ['UTC-8 Pacific', 'UTC-5 Eastern', 'UTC+0 GMT', 'UTC+1 Central European'],
    helper: 'Align sessions with your local rest schedule.',
  },
  {
    label: 'Default focus session',
    options: ['25 minutes', '40 minutes', '55 minutes', 'Custom intervals'],
    helper: 'Applies when launching new focus timers.',
  },
]

const privacySettings = [
  {
    title: 'Share profile within cohort',
    description: 'Let peers celebrate your milestones while respecting quiet mode.',
    defaultChecked: true,
  },
  {
    title: 'Show progress cards on leaderboards',
    description: 'Highlights badges and streaks during showcase weeks.',
    defaultChecked: false,
  },
  {
    title: 'Contribute anonymised analytics',
    description: 'Support future accessibility improvements with aggregate usage data.',
    defaultChecked: true,
  },
]

export default function Profile() {
  return (
    <div className="relative mx-auto max-w-5xl space-y-8 pb-12">
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-blue-500/20 via-transparent to-transparent blur-3xl" aria-hidden />

      <header className="surface-section relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-transparent to-purple-500/10" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-semibold text-white">
            {profileSummary.initials}
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-200">Profile settings</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {profileSummary.name}
              </h1>
            </div>
            <p className="max-w-2xl text-slate-600 dark:text-slate-300">{profileSummary.focus}</p>
            <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-600 dark:text-slate-200">
              <span className="pill-tab-active inline-flex items-center gap-2">{profileSummary.membership}</span>
              <span className="pill-tab inline-flex items-center gap-2">{profileSummary.email}</span>
              <span className="pill-tab inline-flex items-center gap-2">{profileSummary.joined}</span>
            </div>
          </div>
          <button className="pill-tab-active inline-flex items-center gap-2">
            <User className="h-4 w-4" />
            Update avatar
          </button>
        </div>
      </header>

      <section className="surface-section space-y-6">
  <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Personal information</h2>
          <span className="badge badge-info">Visible to mentors only</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {personalFields.map((field) => (
            <label key={field.label} className="surface-card flex flex-col space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{field.label}</span>
              <input
                type={field.type}
                defaultValue={field.value}
                className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/40"
              />
              <span className="text-xs text-slate-500 dark:text-slate-300">{field.helper}</span>
            </label>
          ))}
        </div>
        <label className="surface-card flex flex-col space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{bioField.label}</span>
          <textarea
            defaultValue={bioField.value}
            rows={3}
            className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/40"
          />
        </label>
        <button className="pill-tab-active inline-flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save personal info
        </button>
      </section>

      <section className="surface-section space-y-6">
  <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Notifications and safety</h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-300">Customise reminders across email and push.</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {notificationOptions.map((notice) => {
            const Icon = notice.icon
            return (
              <article key={notice.title} className="surface-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/70 p-2 text-blue-600 shadow-sm dark:bg-white/10 dark:text-blue-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" defaultChecked={notice.defaultChecked} className="peer sr-only" />
                    <span className="block h-6 w-11 rounded-full bg-slate-200 transition-colors duration-200 peer-checked:bg-blue-500 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-200 dark:bg-white/10 dark:peer-checked:bg-blue-500/80" />
                    <span className="absolute left-1 top-1 block h-4 w-4 rounded-full bg-white transition-transform duration-200 peer-checked:translate-x-5 dark:bg-slate-100" />
                  </label>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{notice.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300">{notice.description}</p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="surface-section space-y-6">
  <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Experience preferences</h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-300">Fine tune StudyStreak to suit your daily rhythm.</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {preferenceOptions.map((item) => (
            <article key={item.label} className="surface-card space-y-3">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{item.label}</span>
                <select className="w-full rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-purple-500 dark:focus:ring-purple-500/40">
                  {item.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-300">{item.helper}</p>
            </article>
          ))}
        </div>
        <button className="pill-tab inline-flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save experience settings
        </button>
      </section>

      <section className="surface-section space-y-6">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Privacy and sharing</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {privacySettings.map((setting) => (
            <article key={setting.title} className="surface-card space-y-3">
        <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{setting.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300">{setting.description}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" defaultChecked={setting.defaultChecked} className="peer sr-only" />
                  <span className="block h-6 w-11 rounded-full bg-slate-200 transition-colors duration-200 peer-checked:bg-emerald-500 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-200 dark:bg-white/10 dark:peer-checked:bg-emerald-500/80" />
                  <span className="absolute left-1 top-1 block h-4 w-4 rounded-full bg-white transition-transform duration-200 peer-checked:translate-x-5 dark:bg-slate-100" />
                </label>
              </div>
            </article>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-300">Privacy settings can be updated at any time and apply instantly across StudyStreak surfaces.</p>
      </section>

      <section className="surface-section border-red-200/60 bg-red-50/70 shadow-lg dark:border-red-500/40 dark:bg-red-500/10">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-200">Important safeguards</h2>
            <span className="badge badge-warning">Permanent actions</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <button className="surface-card border-red-200/40 bg-white text-left text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100/60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:border-red-400">
              <div className="space-y-1 p-4">
                <p>Delete study history</p>
                <p className="text-xs font-normal text-red-500 dark:text-red-200/80">Removes focus sessions, streak logs, and mentor notes.</p>
              </div>
            </button>
            <button className="surface-card border-red-200/40 bg-white text-left text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100/60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:border-red-400">
              <div className="space-y-1 p-4">
                <p>Deactivate account</p>
                <p className="text-xs font-normal text-red-500 dark:text-red-200/80">Keeps data for thirty days in case you decide to return.</p>
              </div>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
