import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { LearningMaterial, LearningMaterialsResponse } from './types'
import { fetchLearningMaterials } from './api'
import { normalizeMaterials } from './useLearningMaterialsQuery'

import { MaterialsContext } from './MaterialsContext'
import type { MaterialsContextType } from './MaterialsContextTypes'

type Props = {
  children: React.ReactNode
  perPage?: number
  cap?: number // maximum number of items to fetch in full-load
  concurrency?: number
}

export function MaterialsProvider({ children, perPage = 48, cap = 500, concurrency = 4 }: Props) {
  const [allMaterials, setAllMaterials] = useState<LearningMaterial[]>([])
  const [loading, setLoading] = useState(false)
  const [isFullyLoaded, setIsFullyLoaded] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    loadInitial().catch(() => {})
    return () => {
      mounted.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadInitial = useCallback(async () => {
    setLoading(true)
    try {
      const first = (await fetchLearningMaterials({ filter: 'all', page: 1, perPage, sort: 'created_at.desc' })) as LearningMaterialsResponse
      const firstPageData = Array.isArray(first?.data) ? first.data : []
      const normalized = normalizeMaterials(firstPageData as unknown[])

      const isMounted = mounted.current
      if (isMounted) {
        setAllMaterials(normalized)
        const totalCount = first?.meta?.total ?? null
        setTotal(typeof totalCount === 'number' ? totalCount : normalized.length)

        // Determine pages to fetch
        const effectiveTotal = typeof totalCount === 'number' ? totalCount : normalized.length
        const maxItems = Math.min(effectiveTotal, cap)
        if (maxItems <= normalized.length) {
          setIsFullyLoaded(true)
        } else {
          const pages = Math.ceil(maxItems / perPage)
          if (pages <= 1) {
            setIsFullyLoaded(true)
          } else {
            // Prefetch remaining pages with limited concurrency
            let nextPage = 2
            const workers: Promise<void>[] = Array.from({ length: Math.max(1, Math.min(concurrency, pages - 1)) }).map(async () => {
              while (nextPage <= pages) {
                const pageToFetch = nextPage
                nextPage += 1
                try {
                  if (!mounted.current) break
                  const resp = (await fetchLearningMaterials({ filter: 'all', page: pageToFetch, perPage, sort: 'created_at.desc' })) as LearningMaterialsResponse
                  const pageData = Array.isArray(resp?.data) ? resp.data : []
                  const normalizedPage = normalizeMaterials(pageData as unknown[])
                  if (!mounted.current) break
                  setAllMaterials((prev) => {
                    // Avoid duplicates based on id
                    const existing = new Set(prev.map((p) => p.id))
                    const merged = [...prev]
                    for (const item of normalizedPage) {
                      if (!existing.has(item.id)) merged.push(item)
                    }
                    return merged
                  })
                } catch {
                  // swallow individual page errors; continue
                }
              }
            })

            await Promise.all(workers)
            if (mounted.current) setIsFullyLoaded(true)
          }
        }
      }
    } catch {
      // initial load failed; leave state as-is
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [perPage, cap, concurrency])

  const refresh = useCallback(async () => {
    setIsFullyLoaded(false)
    setAllMaterials([])
    await loadInitial()
  }, [loadInitial])

  const value: MaterialsContextType = {
    allMaterials,
    loading,
    isFullyLoaded,
    total,
    refresh,
  }

  return <MaterialsContext.Provider value={value}>{children}</MaterialsContext.Provider>
}

// useMaterialsStore moved to `useMaterialsStore.ts` to keep this file focused on the provider component.
