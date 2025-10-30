export type ToastType = 'success' | 'error' | 'info'

export type ToastPayload = {
  type: ToastType
  text: string
  ttl?: number // milliseconds
}

type InternalToast = ToastPayload & { id: string }

const listeners = new Set<(t: InternalToast) => void>()

export function subscribe(fn: (t: InternalToast) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function showToast(payload: ToastPayload) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const toast: InternalToast = { id, ...payload }
  for (const fn of listeners) {
    try { fn(toast) } catch (e) { /* swallow listener errors */ }
  }
  return id
}

export function clearAllToasts() {
  // notify listeners with a special empty id? Simpler: listeners can ignore
}
