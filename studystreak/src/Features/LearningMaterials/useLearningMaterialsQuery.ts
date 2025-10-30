import { useEffect, useMemo, useState } from 'react'
import { fetchLearningMaterials, getCachedLearningMaterials } from './api'
import type { LearningMaterial, MaterialsFilter, SortOption, LearningMaterialsResponse } from './types'

const epochIso = new Date(0).toISOString()

const toOptionalString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  return null
}

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return ['true', '1', 'yes', 'y', 'on'].includes(normalized)
  }
  return false
}

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '')).trim())
      .filter((item) => item !== '')
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return []

    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed.replace(/^{/, '[').replace(/}$/, ']'))
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '')).trim())
            .filter((item) => item !== '')
        }
      } catch (error) {
        console.warn('[useLearningMaterialsQuery] failed to parse tags string', error)
      }
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '')
  }

  return []
}

export const normalizeMaterialRecord = (record: unknown): LearningMaterial | null => {
  if (!record || typeof record !== 'object') {
    return null
  }

  const raw = record as Record<string, unknown>

  const id = typeof raw.id === 'string' && raw.id !== ''
    ? raw.id
    : (typeof raw.material_id === 'string' && raw.material_id !== '' ? raw.material_id : null)

  if (!id) {
    return null
  }

  const likesCount = toNumberOrNull(raw.likes_count) ?? 0
  const downloadsCount = toNumberOrNull(raw.downloads_count ?? raw.download_count) ?? 0

  const description = toOptionalString(raw.description)
  const fileName = toOptionalString(raw.file_name)
  const mime = toOptionalString(raw.mime)
  const uploaderIdCandidate =
    toOptionalString(raw.uploader_id) ??
    toOptionalString(raw.user_id)

  const storagePath = toOptionalString(raw.storage_path)
  const directUrl = toOptionalString(raw.resolved_url) ?? toOptionalString(raw.file_url)

  const createdAt = typeof raw.created_at === 'string' && raw.created_at !== '' ? raw.created_at : epochIso
  const updatedAt = typeof raw.updated_at === 'string' && raw.updated_at !== '' ? raw.updated_at : createdAt

  const normalized: LearningMaterial = {
    id,
    title: typeof raw.title === 'string' ? raw.title : 'Untitled material',
    description,
    file_name: fileName,
    mime,
    size: toNumberOrNull(raw.size),
    is_public: toBoolean(raw.is_public),
    uploader_id: uploaderIdCandidate,
    uploader_name: toOptionalString(raw.uploader_name),
    uploader_email: toOptionalString(raw.uploader_email),
    storage_path: storagePath,
    tags: toStringArray(raw.tags ?? raw.tags_jsonb ?? []),
    likes_count: likesCount,
    downloads_count: downloadsCount,
    created_at: createdAt,
    updated_at: updatedAt,
    resolved_url: directUrl,
    user_liked: toBoolean(raw.user_liked ?? false),
  }

  return normalized
}

export const normalizeMaterials = (records: unknown[]): LearningMaterial[] => {
  const normalized: LearningMaterial[] = []
  for (const record of records) {
    const material = normalizeMaterialRecord(record)
    if (material) {
      normalized.push(material)
    }
  }
  return normalized
}

type QueryState = {
  materials: LearningMaterial[]
  total: number
  page: number
  perPage: number
  loading: boolean
  error: string | null
}

type UseLearningMaterialsParams = {
  filter: MaterialsFilter
  search: string
  page: number
  perPage: number
  sort: SortOption
  refreshKey: number
  enabled?: boolean
}

const INITIAL_STATE: QueryState = {
  materials: [],
  total: 0,
  page: 1,
  perPage: 12,
  loading: false,
  error: null,
}

export function useLearningMaterialsQuery(params: UseLearningMaterialsParams) {
  const [state, setState] = useState<QueryState>(INITIAL_STATE)
  const [internalRefresh, setInternalRefresh] = useState(0)

  useEffect(() => {
    if (params.enabled === false) {
      setState((prev) => ({
        ...prev,
        loading: false,
      }))
      return
    }

    const controller = new AbortController()

    // Try to read a fresh cached response first. If present, show it immediately
    // and avoid toggling the global loading state to prevent visual flicker when
    // switching filters quickly. We still kick off a background fetch to refresh
    // the cache and update the UI if newer data arrives.
    const cached = getCachedLearningMaterials({
      filter: params.filter,
      search: params.search,
      page: params.page,
      perPage: params.perPage,
      sort: params.sort,
      signal: undefined as unknown as AbortSignal,
    })

    if (cached) {
      // Normalize cached value: support either the new { data, meta } shape or
      // legacy raw-array responses. Use a small helper to keep the logic clear
      // and avoid `any` casts scattered through the code.
      const extractDataAndMeta = (value: unknown): { data: unknown[]; meta: LearningMaterialsResponse['meta'] | null } => {
        if (Array.isArray(value)) return { data: value, meta: null }
        if (value && typeof value === 'object') {
          const obj = value as Record<string, unknown>
          if (Array.isArray(obj.data)) {
            const m = obj.meta && typeof obj.meta === 'object' ? (obj.meta as LearningMaterialsResponse['meta']) : null
            return { data: obj.data as unknown[], meta: m }
          }
        }
        return { data: [], meta: null }
      }

      const { data: rawData, meta } = extractDataAndMeta(cached)
      const normalized = normalizeMaterials(rawData)

      setState({
        materials: normalized,
        total: meta?.total ?? 0,
        page: meta?.page ?? params.page,
        perPage: meta?.per_page ?? params.perPage,
        loading: false,
        error: null,
      })

      // Still refresh in background (will be coalesced by api.ts if already inflight)
      fetchLearningMaterials({
        filter: params.filter,
        search: params.search,
        page: params.page,
        perPage: params.perPage,
        sort: params.sort,
        signal: controller.signal,
      })
        .then((response: LearningMaterialsResponse | unknown) => {
          if (controller.signal.aborted) return

          // If the background response differs, update the UI. Accept both the
          // legacy raw-array shape and the normalized response object.
          if (Array.isArray(response)) {
            const normalized = normalizeMaterials(response)
            setState((prev) => ({
              ...prev,
              materials: normalized,
              loading: false,
              error: null,
            }))
            return
          }

          const payload = (response && typeof response === 'object') ? (response as Partial<LearningMaterialsResponse>) : null
          const rawData = Array.isArray(payload?.data) ? payload?.data : []
          const normalized2 = normalizeMaterials(rawData)
          const meta2 = payload?.meta ?? null

          setState((prev) => ({
            ...prev,
            materials: normalized2,
            total: meta2?.total ?? prev.total,
            page: meta2?.page ?? prev.page,
            perPage: meta2?.per_page ?? prev.perPage,
            loading: false,
            error: null,
          }))
        })
        .catch((error) => {
          if (controller.signal.aborted) return
          // Only surface an error if we don't already have data to display.
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load learning materials',
          }))
        })

      return () => {
        controller.abort()
      }
    }

    // No fresh cache: show loading state and fetch normally.
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }))

    fetchLearningMaterials({
      filter: params.filter,
      search: params.search,
      page: params.page,
      perPage: params.perPage,
      sort: params.sort,
      signal: controller.signal,
    })
      .then((response: LearningMaterialsResponse | unknown) => {
        // If the backend returned a raw array (legacy or proxied response),
        // treat that as the data payload and fall back to default meta.
        if (Array.isArray(response)) {
          const normalized = normalizeMaterials(response)
          console.warn('[useLearningMaterialsQuery] backend returned raw array; treating as data', response)
          setState({
            materials: normalized,
            total: 0,
            page: params.page,
            perPage: params.perPage,
            loading: false,
            error: null,
          })
          return
        }

        // Defensive: treat the incoming value as unknown and narrow to the
        // expected shape. This prevents the UI from throwing when an
        // unexpected payload (HTML error page, proxy response, etc.) is
        // returned.
        const payload = (response && typeof response === 'object') ? (response as Partial<LearningMaterialsResponse>) : null
        const rawData = Array.isArray(payload?.data) ? payload?.data : []
        const normalized = normalizeMaterials(rawData)
        const meta = payload?.meta ?? null
        if (meta === null) {
          // Keep the UI stable and report what we received for investigation.
          console.warn('[useLearningMaterialsQuery] response.meta missing or response shape unexpected', response)
        }

        setState({
          materials: normalized,
          total: meta?.total ?? 0,
          page: meta?.page ?? params.page,
          perPage: meta?.per_page ?? params.perPage,
          loading: false,
          error: null,
        })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load learning materials',
        }))
      })

    return () => {
      controller.abort()
    }
  }, [
    params.filter,
    params.search,
    params.page,
    params.perPage,
    params.sort,
    params.refreshKey,
    params.enabled,
    internalRefresh,
  ])

  const refetch = () => setInternalRefresh((value) => value + 1)

  const pagination = useMemo(() => ({
    total: state.total,
    page: state.page,
    perPage: state.perPage,
  }), [state.total, state.page, state.perPage])

  return {
    materials: state.materials,
    loading: state.loading,
    error: state.error,
    pagination,
    refetch,
  }
}
