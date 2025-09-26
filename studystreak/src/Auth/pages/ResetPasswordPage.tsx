// ResetPasswordPage component - password reset form page
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/Auth/services/authService'
import { supabase } from '@/lib/supabaseClient'

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Ensure we are in a password recovery session (link from email)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setMessage('Open this page from the password reset link sent to your email.')
      }
    })
  }, [])

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)
    const { error } = await authService.updatePassword(password)
    setIsSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setMessage('Password updated. Redirecting to sign in…')
    setTimeout(() => navigate('/signin', { replace: true }), 1200)
  }

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background text-foreground p-6">
      <div className="backdrop-blur-xl bg-white/5 dark:bg-white/5 border border-white/10 shadow-2xl rounded-3xl p-6 md:p-8 w-80 md:w-[28rem] mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Set a new password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm text-white/70">New password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-2xl bg-transparent outline-none placeholder:text-white/40 text-white border border-white/10" placeholder="••••••••" />
          </div>
          {error && <div className="text-red-400 text-sm rounded-xl bg-red-500/10 border border-red-400/20 px-3 py-2">{error}</div>}
          {message && <div className="text-green-400 text-sm rounded-xl bg-green-500/10 border border-green-400/20 px-3 py-2">{message}</div>}
          <button type="submit" disabled={isSubmitting} className="w-full px-5 py-3 rounded-full bg-gradient-to-b from-amber-400 to-orange-600 text-white font-medium disabled:opacity-60">
            {isSubmitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage