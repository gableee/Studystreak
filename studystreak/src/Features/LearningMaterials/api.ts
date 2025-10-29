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

export async function fetchLearningMaterials(params: FetchMaterialsParams): Promise<LearningMaterialsResponse> {
  const query = buildQueryString(params)
  return apiClient.get<LearningMaterialsResponse>(`/api/learning-materials?${query}`, {
    signal: params.signal,
  })
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

export async function likeLearningMaterial(id: string): Promise<LearningMaterial> {
  return apiClient.post<LearningMaterial>(`/api/learning-materials/${id}/like`)
}

export async function unlikeLearningMaterial(id: string): Promise<LearningMaterial> {
  return apiClient.post<LearningMaterial>(`/api/learning-materials/${id}/unlike`)
}
