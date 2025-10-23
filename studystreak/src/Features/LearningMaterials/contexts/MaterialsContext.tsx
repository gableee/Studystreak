/* eslint-disable react-refresh/only-export-components */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { apiClient } from '@/lib/apiClient'
import { useAuth } from '@/Auth/hooks/useAuth'

import type { CachedLearningMaterial, LearningMaterial, SignedUrlResponse } from '../types'

interface MaterialsContextValue {
  materials: CachedLearningMaterial[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refreshMaterials: () => Promise<void>
  applyMaterialUpdate: (
    materialId: string,
    updater: (material: CachedLearningMaterial) => CachedLearningMaterial,
  ) => void
}

const MaterialsContext = createContext<MaterialsContextValue | undefined>(undefined)

const normalizeMaterial = (raw: LearningMaterial): CachedLearningMaterial => ({
  ...raw,
  like_count: typeof raw.like_count === 'number' ? raw.like_count : 0,
  download_count: typeof raw.download_count === 'number' ? raw.download_count : 0,
  tags: Array.isArray(raw.tags) ? raw.tags : [],
  resolved_url: (raw as CachedLearningMaterial).resolved_url ?? null,
})

export const MaterialsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [materials, setMaterials] = useState<CachedLearningMaterial[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const { user, session, loading: authLoading } = useAuth()

  const applyMaterialUpdate = useCallback(
    (materialId: string, updater: (material: CachedLearningMaterial) => CachedLearningMaterial) => {
      setMaterials((prev) => {
        let changed = false
        const next = prev.map((item) => {
          if (item.material_id !== materialId) {
            return item
          }

          const updated = updater(item)
          if (updated !== item) {
            changed = true
          }
          return updated
        })

        return changed ? next : prev
      })
    },
    [],
  )

  const prefetchSignedUrls = useCallback(async (materialsToPrefetch: CachedLearningMaterial[]) => {
    const targets = materialsToPrefetch.filter((material) => !material.file_url && !material.resolved_url)
    if (targets.length === 0) {
      return
    }

    try {
      const promises = targets.map(async (material) => {
        try {
          const signed = await apiClient.get<SignedUrlResponse>(
            `/api/learning-materials/${material.material_id}/signed-url`,
          )
          if (signed && typeof signed.signed_url === 'string') {
            return { material_id: material.material_id, resolved_url: signed.signed_url }
          }
        } catch (prefetchError) {
          console.warn('Prefetch signed URL failed for', material.material_id, prefetchError)
        }
        return null
      })

      const results = await Promise.allSettled(promises)
      const resolvedMap = new Map<string, string>()

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value && result.value.resolved_url) {
          resolvedMap.set(result.value.material_id, result.value.resolved_url)
        }
      }

      if (resolvedMap.size > 0) {
        setMaterials((prev) =>
          prev.map((item) =>
            resolvedMap.has(item.material_id)
              ? { ...item, resolved_url: resolvedMap.get(item.material_id) ?? item.resolved_url ?? null }
              : item,
          ),
        )
      }
    } catch (error) {
      console.warn('Background signed URL prefetch failed', error)
    }
  }, [])

  const fetchAllMaterials = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<LearningMaterial[]>('/api/learning-materials')
      const allMaterials = Array.isArray(response) ? response.map(normalizeMaterial) : []

      if (import.meta.env.DEV) {
        try {
          // Log a compact view of received materials to help debug missing uploader fields
          console.debug('[MATERIALS DEBUG] fetched materials sample:', allMaterials.slice(0, 6).map(m => {
            const raw = m as unknown as Record<string, unknown>
            return {
              id: m.material_id,
              title: m.title,
              user_name: m.user_name,
              uploader_name: typeof raw['uploader_name'] === 'string' ? raw['uploader_name'] : null,
              uploader_email: typeof raw['uploader_email'] === 'string' ? raw['uploader_email'] : null,
              provider: typeof raw['provider'] === 'string' ? raw['provider'] : null,
            }
          }))
        } catch (e) {
          // swallow debug errors
          console.warn('[MATERIALS DEBUG] logging failed', e)
        }
      }

      setMaterials(allMaterials)
      setLastUpdated(new Date())

      void prefetchSignedUrls(allMaterials)
    } catch (err) {
      console.error('Failed to fetch materials', err)
      setError(err instanceof Error ? err.message : 'Failed to load materials')
    } finally {
      setLoading(false)
    }
  }, [prefetchSignedUrls])

  const refreshMaterials = useCallback(async () => {
    await fetchAllMaterials()
  }, [fetchAllMaterials])

  useEffect(() => {
    // Wait until auth has finished loading. The learning materials endpoint requires
    // an authenticated session; calling fetchAllMaterials before the Supabase session
    // is restored will result in 401 responses and a noisy UX.
    if (authLoading) {
      // auth still initializing, wait
      return
    }

    // Require an active Supabase session and user before attempting to fetch.
    // In some edge cases the user object may be set while the session token is
    // not yet available to the Supabase client; ensure both are present so the
    // apiClient can attach an Authorization header.
    if (!user || !session) {
      // No authenticated user - clear list and skip fetching.
      setMaterials([])
      setLastUpdated(null)
      if (import.meta.env.DEV) console.debug('[MATERIALS DEBUG] skipping fetch: auth ready but no session/user')
      return
    }

    void fetchAllMaterials()
  }, [fetchAllMaterials, authLoading, user, session])

  return (
    <MaterialsContext.Provider
      value={{
        materials,
        loading,
        error,
        lastUpdated,
        refreshMaterials,
        applyMaterialUpdate,
      }}
    >
      {children}
    </MaterialsContext.Provider>
  )
}

export const useMaterials = (): MaterialsContextValue => {
  const context = useContext(MaterialsContext)
  if (context === undefined) {
    throw new Error('useMaterials must be used within a MaterialsProvider')
  }
  return context
}