import type {
  GamificationApiResponse,
  GamificationProfile,
  StreakActivationPayload,
  StreakActivationResult,
  UseStreakSaverResult,
} from '../types/gamification'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const buildUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export const initializeUserTimezone = async (accessToken: string, signal?: AbortSignal) => {
  try {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const url = buildUrl('/api/gamification/set-timezone')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ timezone: userTimeZone }),
      signal,
    })

    if (!response.ok) {
      throw new Error('Failed to set timezone')
    }

    return (await response.json()) as unknown
  } catch (error) {
    console.error('Error setting user timezone:', error)
    throw error
  }
}

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

const normalizeTimestamp = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const isoCandidate = !trimmed.includes('T') && trimmed.includes(' ') ? trimmed.replace(' ', 'T') : trimmed
  const parsed = new Date(isoCandidate)
  return Number.isNaN(parsed.getTime()) ? null : isoCandidate
}

const normalizeTimezone = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const toPositiveInt = (value: unknown): number => {
  const numeric = toNumber(value, 0)
  return numeric > 0 ? Math.trunc(numeric) : 0
}

const getDateKey = (date: Date, timeZone: string): string => {
  try {
    return date.toLocaleDateString('en-CA', { timeZone })
  } catch (error) {
    console.debug('[gamificationService] Failed to format date key', { error, timeZone })
    return date.toISOString().split('T')[0]
  }
}

const computeIsStreakActive = (timestamp: string | null, timeZone: string | null): boolean => {
  if (!timestamp) return false

  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return false

  const effectiveTimeZone = timeZone && timeZone.trim() ? timeZone : 'UTC'
  const today = new Date()
  const todayKey = getDateKey(today, effectiveTimeZone)
  const lastActiveKey = getDateKey(parsed, effectiveTimeZone)

  return todayKey === lastActiveKey
}

const normalizeProfile = (payload: GamificationApiResponse | null): GamificationProfile => {
  const streakTimezone = normalizeTimezone(payload?.streak_timezone) ?? 'UTC'
  const streakLastActiveAt = normalizeTimestamp(payload?.streak_last_active_at)
  const isStreakActiveFromApi = typeof payload?.is_streak_active === 'boolean' ? payload.is_streak_active : null
  const isStreakActive = isStreakActiveFromApi ?? computeIsStreakActive(streakLastActiveAt, streakTimezone)

  return {
    username: payload?.username ?? null,
    level: Math.max(0, Math.trunc(toNumber(payload?.level))),
    experiencePoints: Math.max(0, Math.round(toNumber(payload?.experience_points))),
    streakCount: toPositiveInt(payload?.streak_count),
    streakLongest: toPositiveInt(payload?.streak_longest),
    totalStudyTimeMinutes: toPositiveInt(payload?.total_study_time),
    streakLastActiveAt,
    streakTimezone,
    isStreakActive,
    streakSaversAvailable: toPositiveInt(payload?.streak_savers_available),
    streakSaversUsed: toPositiveInt(payload?.streak_savers_used),
    streakSaversMaxPerMonth: toPositiveInt(payload?.streak_savers_max_per_month ?? 3),
    streakSaversLastReset: normalizeTimestamp(payload?.streak_savers_last_reset),
  }
}

const extractErrorMessage = async (response: Response): Promise<{ message: string; bodyText: string }> => {
  let message = `Request failed (status ${response.status})`
  let bodyText = ''
  try {
    bodyText = await response.text()
    const errorPayload = bodyText ? JSON.parse(bodyText) : null
    if (errorPayload && typeof errorPayload === 'object' && 'error' in errorPayload) {
      message = String(errorPayload.error)
    }
  } catch {
    // swallow
  }

  return { message, bodyText }
}

export const gamificationService = {
  async getProfile(accessToken: string, signal?: AbortSignal): Promise<GamificationProfile> {
    const url = buildUrl('/api/gamification/profile')
    console.debug('[gamificationService] fetching profile', { url, hasToken: Boolean(accessToken) })

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal,
    })

    if (!response.ok) {
      const { message, bodyText } = await extractErrorMessage(response)
      console.debug('[gamificationService] fetch failed', { status: response.status, bodyText })
      throw new Error(message)
    }

    const payload = (await response.json()) as GamificationApiResponse | GamificationApiResponse[] | null
    console.debug('[gamificationService] fetch OK', { payload })
    const normalized = Array.isArray(payload) ? payload[0] ?? null : payload ?? null

    if (!normalized) {
      throw new Error('Profile data is empty')
    }

    return normalizeProfile(normalized)
  },

  async activateStreak(
    accessToken: string,
    payload: StreakActivationPayload = {},
    signal?: AbortSignal,
  ): Promise<StreakActivationResult> {
    const url = buildUrl('/api/gamification/streak/activate')
    console.debug('[gamificationService] activating streak', {
      url,
      hasToken: Boolean(accessToken),
      hasPayload: Object.keys(payload).length > 0,
    })

    const body: Record<string, unknown> = {}
    if (payload.occurredAt) body.occurred_at = payload.occurredAt
    if (payload.timezone) body.timezone = payload.timezone

    const minutesCandidate =
      typeof payload.studyMinutes === 'number'
        ? payload.studyMinutes
        : typeof payload.durationMinutes === 'number'
          ? payload.durationMinutes
          : undefined

    if (typeof minutesCandidate === 'number' && Number.isFinite(minutesCandidate)) {
      body.study_minutes = Math.max(0, Math.round(minutesCandidate))
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      signal,
    })

    if (!response.ok) {
      const { message, bodyText } = await extractErrorMessage(response)
      console.debug('[gamificationService] streak activation failed', {
        status: response.status,
        bodyText,
      })
      throw new Error(message)
    }

    const raw = (await response.json()) as {
      profile?: GamificationApiResponse | null
      streak_was_incremented?: unknown
      streak_was_reset?: unknown
      study_minutes_applied?: unknown
      streak_saver_was_used?: unknown
    }

    const normalizedProfile = normalizeProfile(raw.profile ?? null)

    return {
      profile: normalizedProfile,
      streakWasIncremented: Boolean(raw.streak_was_incremented),
      streakWasReset: Boolean(raw.streak_was_reset),
      studyMinutesApplied: toNumber(raw.study_minutes_applied),
      streakSaverWasUsed: Boolean(raw.streak_saver_was_used),
    }
  },

  async useStreakSaver(accessToken: string, signal?: AbortSignal): Promise<UseStreakSaverResult> {
    const url = buildUrl('/api/gamification/streak/use-saver')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal,
    })

    if (!response.ok) {
      const { message } = await extractErrorMessage(response)
      throw new Error(message)
    }

    const raw = (await response.json()) as {
      success?: unknown
      payload?: {
        success?: unknown
        message?: unknown
        savers_remaining?: unknown
      } | null
      profile?: GamificationApiResponse | null
    }

    const payload = raw.payload ?? {}
    const message = typeof payload?.message === 'string' ? payload.message : 'Streak saver processed'
    const saversRemainingCandidate = toNumber(payload?.savers_remaining, Number.NaN)
    const saversRemaining = Number.isFinite(saversRemainingCandidate) ? Math.max(0, Math.trunc(saversRemainingCandidate)) : undefined

    const profile = raw.profile ? normalizeProfile(raw.profile) : undefined

    const successFromPayload = typeof payload?.success === 'boolean' ? payload.success : undefined

    return {
      success: typeof raw.success === 'boolean' ? raw.success : Boolean(successFromPayload),
      message,
      saversRemaining,
      profile,
    }
  },
}
