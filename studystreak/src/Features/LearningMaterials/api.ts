import { apiClient } from '../../lib/apiClient'
import type {
  LearningMaterial,
  LearningMaterialsResponse,
  MaterialsFilter,
  SignedUrlResponse,
  SortOption,
  UploadMaterialPayload,
} from './types'

export type FetchMaterialsParams = {
  filter: MaterialsFilter
  search?: string
  page: number
  perPage: number
  sort: SortOption
  signal?: AbortSignal
}

const buildQueryString = ({ filter, search, page, perPage, sort }: FetchMaterialsParams): string => {
  const params = new URLSearchParams()
  params.set('filter', filter)
  params.set('page', String(page))
  params.set('per_page', String(perPage))
  params.set('sort', sort)
  if (search && search.trim() !== '') {
    params.set('q', search.trim())
  }
  return params.toString()
}

// Simple in-memory cache + in-flight request coalescing
const materialsCache = new Map<string, { fetchedAt: number; data: LearningMaterialsResponse }>()
const inflight = new Map<string, Promise<LearningMaterialsResponse>>()
const CACHE_TTL_MS = 30_000 // 30 seconds cache lifetime; adjust as needed

export function getCachedLearningMaterials(params: FetchMaterialsParams): LearningMaterialsResponse | null {
  const key = buildQueryString(params)
  const cached = materialsCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
    materialsCache.delete(key)
    return null
  }
  return cached.data
}

export async function fetchLearningMaterials(params: FetchMaterialsParams): Promise<LearningMaterialsResponse> {
  const query = buildQueryString(params)

  // Return inflight promise if present to avoid duplicate requests
  if (inflight.has(query)) {
    return inflight.get(query) as Promise<LearningMaterialsResponse>
  }

  // If cached and fresh, return it immediately (resolved promise)
  const cached = materialsCache.get(query)
  if (cached && Date.now() - cached.fetchedAt <= CACHE_TTL_MS) {
    return Promise.resolve(cached.data)
  }

  const promise = apiClient.get<LearningMaterialsResponse>(`/api/learning-materials?${query}`, {
    signal: params.signal,
  })
    .then((res) => {
      // store in cache only on success
      materialsCache.set(query, { fetchedAt: Date.now(), data: res })
      inflight.delete(query)
      return res
    })
    .catch((err) => {
      inflight.delete(query)
      throw err
    })

  inflight.set(query, promise)
  return promise
}

export async function fetchLearningMaterial(id: string): Promise<LearningMaterial> {
  return apiClient.get<LearningMaterial>(`/api/learning-materials/${id}`)
}

export async function requestSignedUrl(materialId: string, purpose: 'download' | 'preview' = 'download') {
  const params = new URLSearchParams()
  params.set('purpose', purpose)
  params.set('expiresIn', '900')
  return apiClient.get<SignedUrlResponse>(`/api/learning-materials/${materialId}/signed-url?${params.toString()}`)
}

export async function uploadLearningMaterial(payload: UploadMaterialPayload): Promise<LearningMaterial> {
  const form = new FormData()
  form.append('title', payload.title)
  form.append('is_public', String(payload.isPublic))
  if (typeof payload.aiToggleEnabled === 'boolean') {
    form.append('ai_toggle_enabled', String(payload.aiToggleEnabled))
  }

  if (payload.description) {
    form.append('description', payload.description)
  }

  if (payload.tags && payload.tags.length > 0) {
    form.append('tags', JSON.stringify(payload.tags))
  }

  if (payload.file) {
    form.append('file', payload.file)
  }

  return apiClient.post<LearningMaterial>('/api/learning-materials', form)
}

export async function deleteLearningMaterial(id: string): Promise<void> {
  await apiClient.delete(`/api/learning-materials/${id}`)
}

export async function updateLearningMaterial(id: string, payload: Partial<{
  title: string
  description?: string | null
  isPublic?: boolean
  aiToggleEnabled?: boolean
  tags?: string[] | null
}>): Promise<LearningMaterial> {
  // For simplicity send as JSON; the backend accepts JSON for PATCH updates
  const body: any = {}
  if (payload.title !== undefined) body.title = payload.title
  if (payload.description !== undefined) body.description = payload.description
  if (payload.isPublic !== undefined) body.is_public = String(payload.isPublic)
  if (payload.aiToggleEnabled !== undefined) body.ai_toggle_enabled = String(payload.aiToggleEnabled)
  if (payload.tags !== undefined) body.tags = payload.tags

  return apiClient.patch<LearningMaterial>(`/api/learning-materials/${id}`, body)
}

export async function likeLearningMaterial(id: string): Promise<LearningMaterial> {
  return apiClient.post<LearningMaterial>(`/api/learning-materials/${id}/like`)
}

export async function unlikeLearningMaterial(id: string): Promise<LearningMaterial> {
  return apiClient.post<LearningMaterial>(`/api/learning-materials/${id}/unlike`)
}
