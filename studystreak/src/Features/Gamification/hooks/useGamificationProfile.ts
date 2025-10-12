import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/Auth/hooks/useAuth'
import { gamificationService, initializeUserTimezone } from '../services/gamificationService'
import type { GamificationProfile } from '../types/gamification'

type RefreshListener = () => void
type ProfileUpdateListener = (profile: GamificationProfile) => void

const refreshListeners = new Set<RefreshListener>()
const profileUpdateListeners = new Set<ProfileUpdateListener>()

const subscribeToRefresh = (listener: RefreshListener) => {
  refreshListeners.add(listener)
  return () => {
    refreshListeners.delete(listener)
  }
}

const subscribeToProfileUpdate = (listener: ProfileUpdateListener) => {
  profileUpdateListeners.add(listener)
  return () => {
    profileUpdateListeners.delete(listener)
  }
}

const broadcastRefresh = () => {
  refreshListeners.forEach((listener) => {
    try {
      listener()
    } catch (error) {
      console.debug('[useGamificationProfile] refresh listener failed', error)
    }
  })
}

const broadcastProfileUpdate = (profile: GamificationProfile) => {
  profileUpdateListeners.forEach((listener) => {
    try {
      listener(profile)
    } catch (error) {
      console.debug('[useGamificationProfile] profile update listener failed', error)
    }
  })
}

export const triggerGamificationProfileRefresh = () => {
  broadcastRefresh()
}

export const updateGamificationProfile = (profile: GamificationProfile) => {
  broadcastProfileUpdate(profile)
}

export const useGamificationProfile = () => {
  const { session } = useAuth()
  const [profile, setProfile] = useState<GamificationProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const refresh = useCallback(() => {
    broadcastRefresh()
  }, [])

  useEffect(() => {
    const unsubscribeRefresh = subscribeToRefresh(() => {
      setRefreshNonce((nonce) => nonce + 1)
    })
    const unsubscribeUpdate = subscribeToProfileUpdate((profile) => {
      setProfile(profile)
    })
    return () => {
      unsubscribeRefresh()
      unsubscribeUpdate()
    }
  }, [])

  // Refresh profile when a service worker activation finishes (new app version)
  useEffect(() => {
    const handler = () => {
      try {
        broadcastRefresh()
      } catch (e) {
        console.debug('[useGamificationProfile] sw-activated handler failed', e)
      }
    }
    window.addEventListener('sw-activated', handler)
    return () => window.removeEventListener('sw-activated', handler)
  }, [])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const loadProfile = async () => {
      if (!session?.access_token) {
        console.debug('[useGamificationProfile] no session or token')
        if (isMounted) {
          setProfile(null)
          setError(null)
          setLoading(false)
        }
        return
      }

      if (isMounted) {
        setLoading(true)
        setError(null)
      }

      try {
        await initializeUserTimezone(session.access_token, controller.signal)
        console.debug('[useGamificationProfile] loading profile', { hasToken: Boolean(session.access_token) })
        const data = await gamificationService.getProfile(session.access_token, controller.signal)
        if (isMounted) {
          setProfile(data)
        }
      } catch (err) {
        console.debug('[useGamificationProfile] load error', { err })
        if (!isMounted) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load gamification profile')
        setProfile(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [session?.access_token, refreshNonce])

  return { profile, loading, error, refresh }
}
