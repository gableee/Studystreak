// AuthForm component - reusable form component for auth pages

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
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
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setIsSubmitting(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    if (data.session) {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="flex w-full items-center justify-center text-foreground">
      <div className="backdrop-blur-xl bg-white/5 dark:bg-white/5 border border-white/10 shadow-2xl rounded-3xl p-6 md:p-8 w-80 md:w-[28rem] mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Welcome back</span>
          </h1>
          <p className="mt-2 text-sm text-white/60">Sign in to continue your streak</p>
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

