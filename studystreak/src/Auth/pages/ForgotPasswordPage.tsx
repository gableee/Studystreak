// ForgotPasswordPage component - password reset request page
import React, { useState } from 'react'
import { authService } from '@/Auth/services/authService'

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)
    const redirectTo = window.location.origin + '/reset-password'
    const { error } = await authService.requestPasswordReset(email, redirectTo)
    setIsSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setMessage('If that email exists, a reset link has been sent.')
  }

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background text-foreground p-6">
      <div className="backdrop-blur-xl bg-white/5 dark:bg-white/5 border border-white/10 shadow-2xl rounded-3xl p-6 md:p-8 w-80 md:w-[28rem] mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Reset your password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm text-white/70">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-2xl bg-transparent outline-none placeholder:text-white/40 text-white border border-white/10" placeholder="you@example.com" />
          </div>
          {error && <div className="text-red-400 text-sm rounded-xl bg-red-500/10 border border-red-400/20 px-3 py-2">{error}</div>}
          {message && <div className="text-green-400 text-sm rounded-xl bg-green-500/10 border border-green-400/20 px-3 py-2">{message}</div>}
          <button type="submit" disabled={isSubmitting} className="w-full px-5 py-3 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 text-white font-medium disabled:opacity-60">
            {isSubmitting ? 'Sending link…' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ForgotPasswordPage