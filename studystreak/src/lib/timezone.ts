import { supabase } from './supabaseClient'

let lastAppliedTimezone: string | null = null
let inflightRequest: Promise<void> | null = null

const getBrowserTimezone = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz && tz.trim() ? tz : 'UTC'
  } catch (error) {
    console.debug('[timezone] Unable to resolve browser timezone, defaulting to UTC', error)
    return 'UTC'
  }
}

const applyTimezone = async (timezone: string, force = false): Promise<void> => {
  if (!force && lastAppliedTimezone === timezone) return

  // Reuse in-flight RPC if the same timezone update is already running
  if (inflightRequest) return inflightRequest

  const promise = supabase
    .rpc('set_user_timezone', { user_timezone: timezone })
    .then(({ error }) => {
      if (error) throw error
      lastAppliedTimezone = timezone
    })

  inflightRequest = promise as unknown as Promise<void>

  try {
    await promise
  } catch (error) {
    console.warn('[timezone] Failed to update user timezone', error)
    lastAppliedTimezone = null
  } finally {
    inflightRequest = null
  }
}

export const ensureUserTimezone = async ({ force = false }: { force?: boolean } = {}): Promise<void> => {
  const timezone = getBrowserTimezone()
  await applyTimezone(timezone, force)
}

export const resetTimezoneCache = () => {
  lastAppliedTimezone = null
}
