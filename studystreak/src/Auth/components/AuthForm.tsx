// AuthForm component - reusable form component for auth pages

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import SocialLoginButton from './SocialLoginButton'

const AuthForm: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const session = await authService.signInWithPassword(email, password)
      setIsSubmitting(false)
      if (!session) {
        setError('Unable to start session')
        return
      }
      navigate('/dashboard', { replace: true })
    } catch (signInErr: unknown) {
      setIsSubmitting(false)
      const message = signInErr instanceof Error ? signInErr.message : 'Failed to sign in'
      setError(message)
    }
  }

  return (
    <div className="flex w-full items-center justify-center text-foreground ">
      <div className="backdrop-blur-xl bg-white/5 dark:bg-white/5 border border-white/10 shadow-2xl rounded-3xl p-6 md:p-8 w-80 md:w-[28rem] mx-auto">
        <div className="text-center mb-6 space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 
                3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 
                1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> 
              </svg>
            </div>
            <span
                className="text-4xl font-semibold bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 
                bg-[length:200%_200%] bg-clip-text text-transparent animate-gradient-x"
              >
                Study Streak
              </span>
            </div>
          <div>
            <h1 className="flex flex-col font-semibold tracking-tight">
              <span className="text-2xl bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Welcome back</span>
            </h1>
            <p className="text-sm text-white/60">Sign in to continue your streak</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 w-full">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm text-white/70">Email</label>
            <div className="rounded-2xl border border-white/10 bg-white/5 focus-within:border-white/20 transition-colors">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-transparent outline-none placeholder:text-white/40 text-white"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm text-white/70">Password</label>
            <div className="rounded-2xl border border-white/10 bg-white/5 focus-within:border-white/20 transition-colors">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-transparent outline-none placeholder:text-white/40 text-white"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm rounded-xl bg-red-500/10 border border-red-400/20 px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-5 py-3 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 text-white font-medium shadow-[0_10px_30px_-10px_rgba(59,130,246,0.6)] hover:brightness-110 active:brightness-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px bg-white/15 flex-1" />
          <span className="text-xs text-white/50">Sign in with</span>
          <div className="h-px bg-white/15 flex-1" />
        </div>

        <div className="flex flex-row md:flex-col gap-3">
          <SocialLoginButton
            provider="google"
            label={
              <>
                <span className="hidden md:inline">Continue with Google</span>
                <span className="inline md:hidden">Google</span>
              </>
            }
          />
          <SocialLoginButton
            provider="facebook"
            label={
              <>
                <span className="hidden md:inline">Continue with Facebook</span>
                <span className="inline md:hidden">Facebook</span>
              </>
            }
          />
        </div>

        <div className="mt-6 text-center text-sm text-white/60">
          <a href="/forgot-password" className="hover:text-white transition-colors">Forgot password?</a>
          <span className="mx-2">|</span>
          <a href="/signup" className="hover:text-white transition-colors">Create account</a>
        </div>
      </div>
    </div>
  )
}

export default AuthForm

