// SignupPage component - user registration page
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/Auth/services/authService'

const SignupPage: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)
    const { data, error } = await authService.signUp(email, password)
    setIsSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data.user && !data.session) {
      setMessage('Check your email to confirm your account.')
      return
    }
    // In case email confirmations are disabled and a session is created immediately
    if (data.session) {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background text-foreground p-6">
      <div className="backdrop-blur-xl bg-white/5 dark:bg-white/5 border border-white/10 shadow-2xl rounded-3xl p-6 md:p-8 w-80 md:w-[28rem] mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Create your account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm text-white/70">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-2xl bg-transparent outline-none placeholder:text-white/40 text-white border border-white/10" placeholder="you@example.com" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm text-white/70">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-2xl bg-transparent outline-none placeholder:text-white/40 text-white border border-white/10" placeholder="••••••••" />
          </div>
          {error && <div className="text-red-400 text-sm rounded-xl bg-red-500/10 border border-red-400/20 px-3 py-2">{error}</div>}
          {message && <div className="text-green-400 text-sm rounded-xl bg-green-500/10 border border-green-400/20 px-3 py-2">{message}</div>}
          <button type="submit" disabled={isSubmitting} className="w-full px-5 py-3 rounded-full bg-gradient-to-b from-emerald-400 to-green-600 text-white font-medium disabled:opacity-60">
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