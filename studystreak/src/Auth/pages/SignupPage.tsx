// SignupPage component - user registration page
import React, { useState } from 'react'
import { authService } from '../services/authService'
import { profileService } from '../services/profileService'

const SignupPage: React.FC = () => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'taken' | 'available'>('idle')

  // Username uniqueness check (onBlur)
  const checkUsername = async () => {
    if (!form.username) return
    setUsernameStatus('checking')
    const { available } = await profileService.isUsernameAvailable(form.username)
    setUsernameStatus(available ? 'available' : 'taken')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (e.target.name === 'username') setUsernameStatus('idle')
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    // Basic validation
    if (!form.first_name || !form.last_name || !form.username || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)

    // Username check
    const { available } = await profileService.isUsernameAvailable(form.username)
    if (!available) {
      setError('Username is already taken.')
      setIsSubmitting(false)
      return
    }

    // Create user in Supabase Auth
    const { data, error: signUpError } = await authService.signUp(form.email, form.password)
    if (signUpError) {
      setError(signUpError.message)
      setIsSubmitting(false)
      return
    }

    // Insert profile
    if (data.user) {
      const { error: profileError } = await profileService.createProfile({
        id: data.user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        username: form.username,
        email: form.email,
      })
      if (profileError) {
        setError('Account created, but failed to save profile info.')
        setIsSubmitting(false)
        return
      }
    }

    setIsSubmitting(false)
    setMessage('Check your email to confirm your account.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-4">
      <div className="backdrop-blur-2xl bg-white/10 dark:bg-white/10 border border-white/10 shadow-2xl rounded-3xl p-6 md:p-10 w-full max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center text-white drop-shadow">Create your StudyStreak account</h1>
        <p className="mb-6 text-center text-white/60">Join and start your streak!</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-2">
              <label htmlFor="first_name" className="text-sm text-white/70">First name</label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                autoComplete="given-name"
                value={form.first_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-2xl bg-white/20 dark:bg-white/10 outline-none placeholder:text-white/40 text-white border border-white/10 focus:ring-2 focus:ring-emerald-400 transition"
                placeholder="First name"
              />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <label htmlFor="last_name" className="text-sm text-white/70">Last name</label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                autoComplete="family-name"
                value={form.last_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-2xl bg-white/20 dark:bg-white/10 outline-none placeholder:text-white/40 text-white border border-white/10 focus:ring-2 focus:ring-emerald-400 transition"
                placeholder="Last name"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-sm text-white/70">Username</label>
            <div className="relative">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                onBlur={checkUsername}
                required
                className={`w-full px-4 py-3 rounded-2xl bg-white/20 dark:bg-white/10 outline-none placeholder:text-white/40 text-white border border-white/10 focus:ring-2 transition
                  ${usernameStatus === 'taken' ? 'border-red-400 ring-red-400' : usernameStatus === 'available' ? 'border-emerald-400 ring-emerald-400' : ''}
                `}
                placeholder="Choose a unique username"
              />
              {usernameStatus === 'checking' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60 animate-pulse">Checking…</span>
              )}
              {usernameStatus === 'taken' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-400">Taken</span>
              )}
              {usernameStatus === 'available' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400">Available</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm text-white/70">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-2xl bg-white/20 dark:bg-white/10 outline-none placeholder:text-white/40 text-white border border-white/10 focus:ring-2 focus:ring-emerald-400 transition"
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm text-white/70">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-2xl bg-white/20 dark:bg-white/10 outline-none placeholder:text-white/40 text-white border border-white/10 focus:ring-2 focus:ring-emerald-400 transition"
              placeholder="••••••••"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="confirmPassword" className="text-sm text-white/70">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-2xl bg-white/20 dark:bg-white/10 outline-none placeholder:text-white/40 text-white border border-white/10 focus:ring-2 focus:ring-emerald-400 transition"
              placeholder="••••••••"
            />
          </div>
          {error && <div className="text-red-400 text-sm rounded-xl bg-red-500/10 border border-red-400/20 px-3 py-2">{error}</div>}
          {message && <div className="text-emerald-400 text-sm rounded-xl bg-emerald-500/10 border border-emerald-400/20 px-3 py-2">{message}</div>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-5 py-3 rounded-full bg-gradient-to-b from-emerald-400 to-green-600 text-white font-medium shadow-lg hover:scale-[1.02] transition disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-white/60">
          <a href="/signin" className="hover:text-white transition-colors">Have an account? Sign in</a>
        </div>
      </div>
    </div>
  )
}

export default SignupPage