// SignupPage component - user registration page
import React, { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ChangeEvent, FormEvent } from 'react'
import { authService } from '../services/authService'
import { profileService } from '../services/profileService'
import { ApiError } from '@/lib/apiClient'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken'

type SignupFormState = {
  first_name: string
  last_name: string
  birthday: string
  username: string
  email: string
  password: string
  confirmPassword: string
}

const defaultFormState: SignupFormState = {
  first_name: '',
  last_name: '',
  birthday: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const requiredFields: Array<keyof SignupFormState> = [
  'first_name',
  'last_name',
  'birthday',
  'username',
  'email',
  'password',
  'confirmPassword',
]

const SignupPage: React.FC = () => {
  const [form, setForm] = useState<SignupFormState>(defaultFormState)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isSubmitDisabled = useMemo(() => {
    if (isSubmitting) return true
    return requiredFields.some((field) => !form[field])
  }, [form, isSubmitting])

  const resetMessages = useCallback(() => {
    setError(null)
    setMessage(null)
  }, [])

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    resetMessages()
    setForm((previous) => ({ ...previous, [name]: value }))
    if (name === 'username') {
      setUsernameStatus('idle')
    }
  }, [resetMessages])

  const calculateAge = useCallback((birthday: string) => {
    const birthDate = new Date(birthday)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1
    }

    return age
  }, [])

  const verifyUsernameAvailability = useCallback(async () => {
    if (!form.username) {
      setUsernameStatus('idle')
      return true
    }

    setUsernameStatus('checking')

    try {
      const { available } = await profileService.isUsernameAvailable(form.username)
      setUsernameStatus(available ? 'available' : 'taken')
      return available
    } catch (err) {
      console.error('Username availability check failed:', err)
      setUsernameStatus('idle')
      setError('Unable to check username availability right now. Please try again later.')
      return false
    }
  }, [form.username])

  const checkUsername = useCallback(async () => {
    if (!form.username) return
    await verifyUsernameAvailability()
  }, [form.username, verifyUsernameAvailability])

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetMessages()

    const hasEmptyFields = requiredFields.some((field) => !form[field])
    if (hasEmptyFields) {
      setError('Please fill in all fields.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const usernameAvailable = await verifyUsernameAvailability()
      if (!usernameAvailable) {
        setError('Username is already taken.')
        return
      }

      const age = calculateAge(form.birthday)

      await authService.signUp(form.email, form.password, {
        first_name: form.first_name,
        last_name: form.last_name,
        username: form.username,
        birthday: form.birthday,
        age,
        email: form.email,
      })

      setMessage('Check your email to confirm your account. You can now sign in.')
      setForm(defaultFormState)
      setUsernameStatus('idle')
    } catch (err) {
      console.error('Unexpected signup error:', err)
      if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [calculateAge, form, resetMessages, verifyUsernameAvailability])

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background text-foreground p-4">
      <div className="backdrop-blur-2xl bg-white/10 dark:bg-white/5 border border-white/10 shadow-2xl rounded-3xl p-6 md:p-10 w-full max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center text-blue-500 drop-shadow">StudyStreak</h1>
        <h1 className="text-3xl font-bold mb-2 text-center text-white drop-shadow">Create your account</h1>
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
            <div className="flex flex-col gap-2">
              <label htmlFor="birthday" className="text-sm text-white/70">Birthday</label>
              <input
                id="birthday"
                name="birthday"
                type="date"
                autoComplete="bday"
                value={form.birthday}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-2xl bg-white/20 dark:bg-white/10 outline-none placeholder:text-white/40 text-white border border-white/10 focus:ring-2 focus:ring-emerald-400 transition"
                placeholder="Birthday"
              />
            </div>
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
            disabled={isSubmitDisabled}
            className="w-full px-5 py-3 rounded-full bg-gradient-to-b from-emerald-400 to-green-600 text-white font-medium shadow-lg hover:scale-[1.02] transition disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-white/60">
          <Link to="/signin" className="hover:text-white transition-colors">Have an account? Sign in</Link>
        </div>
      </div>
    </div>
  )
}

export default SignupPage