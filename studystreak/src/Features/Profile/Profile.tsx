import { useEffect, useState } from 'react'
import { Save, User } from 'lucide-react'
import { useAuth } from '@/Auth/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'

const blankProfile = {
  initials: 'JD',
  name: 'Jordan Daniels',
  email: 'jordan.daniels@studystreak.org',
  membership: 'Premium member',
  joined: 'Member since August 2024',
  focus: 'Building sustainable rhythms across studio design, health, and data storytelling cohorts.',
}

export default function Profile() {
  const { user } = useAuth()

  type UserMetadata = { initials?: string; full_name?: string; portfolio?: string; pronouns?: string; focus?: string }
  const meta = (user?.user_metadata as unknown) as UserMetadata
  const profile = {
    initials: meta?.initials ?? (user?.email ? user.email.charAt(0).toUpperCase() : blankProfile.initials),
    name: meta?.full_name ?? user?.email ?? blankProfile.name,
    email: user?.email ?? blankProfile.email,
    membership: blankProfile.membership,
    joined: blankProfile.joined,
    focus: meta?.focus ?? blankProfile.focus,
  }

  // controlled form state
  const [name, setName] = useState<string>(profile.name)
  const [portfolio, setPortfolio] = useState<string>(meta?.portfolio ?? '')
  const [pronouns, setPronouns] = useState<string>(meta?.pronouns ?? '')
  const [focus, setFocus] = useState<string>(profile.focus)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(profile.name)
  setPortfolio(meta?.portfolio ?? '')
  setPronouns(meta?.pronouns ?? '')
    setFocus(profile.focus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const resetToProfile = () => {
    setName(profile.name)
  setPortfolio(meta?.portfolio ?? '')
  setPronouns(meta?.pronouns ?? '')
    setFocus(profile.focus)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const metadata = {
        full_name: name,
        initials: name?.charAt(0)?.toUpperCase() ?? profile.initials,
        portfolio,
        pronouns,
        focus,
      }
      // update supabase user metadata
      const { error } = await supabase.auth.updateUser({ data: metadata })
      if (error) throw error
      alert('Profile saved')
    } catch (err) {
      console.error('Failed to update profile', err)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative mx-auto max-w-5xl space-y-8 pb-12">
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-blue-500/20 via-transparent to-transparent blur-3xl" aria-hidden />

      <header className="surface-section relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-transparent to-purple-500/10" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-semibold text-white">
            {profile.initials}
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-200">Profile settings</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{profile.name}</h1>
            </div>
            <p className="max-w-2xl text-slate-600 dark:text-slate-300">{profile.focus}</p>
            <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-600 dark:text-slate-200">
              <span className="pill-tab-active inline-flex items-center gap-2">{profile.membership}</span>
              <span className="pill-tab inline-flex items-center gap-2">{profile.email}</span>
              <span className="pill-tab inline-flex items-center gap-2">{profile.joined}</span>
            </div>
          </div>
          <button className="pill-tab-active inline-flex items-center gap-2">
            <User className="h-4 w-4" /> Update avatar
          </button>
        </div>
      </header>

      <section className="surface-section space-y-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Personal information</h2>
          <span className="badge badge-info">Visible to mentors only</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="surface-card flex flex-col space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Preferred name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/40"
            />
            <span className="text-xs text-slate-500 dark:text-slate-300">Appears on dashboards, celebratory cards, and shared streaks.</span>
          </label>

          <label className="surface-card flex flex-col space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Email address</span>
            <input
              type="email"
              value={profile.email}
              disabled
              className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm font-medium text-slate-500 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-white/10 dark:text-slate-400 dark:focus:border-blue-500 dark:focus:ring-blue-500/40"
            />
            <span className="text-xs text-slate-500 dark:text-slate-300">Used for sign in and notifications. To change your email, use your auth provider.</span>
          </label>

          <label className="surface-card flex flex-col space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Portfolio handle</span>
            <input
              type="text"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/40"
            />
            <span className="text-xs text-slate-500 dark:text-slate-300">Shared on peer showcases and mentor check-ins.</span>
          </label>

          <label className="surface-card flex flex-col space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Pronouns</span>
            <input
              type="text"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/40"
            />
            <span className="text-xs text-slate-500 dark:text-slate-300">Visible on team boards and accountability prompts.</span>
          </label>
        </div>

        <label className="surface-card flex flex-col space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Learning focus statement</span>
          <textarea
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            rows={3}
            className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/40"
          />
        </label>

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="pill-tab-active inline-flex items-center gap-2">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save personal info'}
          </button>
          <button onClick={resetToProfile} type="button" className="pill-tab inline-flex items-center gap-2">Reset</button>
        </div>
      </section>
    </div>
  )
}
