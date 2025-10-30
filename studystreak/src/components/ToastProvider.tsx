import React, { useEffect, useState } from 'react'
import { subscribe } from './toastService'
import type { ToastPayload } from './toastService'

type ToastInternal = ToastPayload & { id: string }

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([])

  useEffect(() => {
    const unsubscribe = subscribe((t) => {
      setToasts((prev) => [...prev, t])
      // auto remove after ttl or 4000ms
      const ttl = t.ttl ?? 4000
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id))
      }, ttl)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <>
      {children}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-sm rounded-xl px-4 py-3 shadow-lg text-sm ${t.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : t.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-slate-50 text-slate-900 border border-slate-200'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </>
  )
}
