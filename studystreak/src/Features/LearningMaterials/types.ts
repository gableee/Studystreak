export type MaterialsFilter = 'all' | 'my' | 'community' | 'official' | 'liked'

export type SortOption =
  | 'created_at.desc'
  | 'created_at.asc'
  | 'title.asc'
  | 'title.desc'
  | 'likes_count.desc'
  | 'likes_count.asc'
  | 'downloads_count.desc'
  | 'downloads_count.asc'

export type LearningMaterial = {
  id: string
  title: string
  description: string | null
  file_name: string | null
  mime: string | null
  size: number | null
  is_public: boolean
  uploader_id: string | null
  uploader_name: string | null
  uploader_email: string | null
  storage_path: string | null
  tags: string[]
  likes_count: number
  downloads_count: number
  created_at: string
  updated_at: string
  resolved_url: string | null
  user_liked: boolean
}

export type LearningMaterialsResponse = {
  data: LearningMaterial[]
  meta: {
    total: number
    page: number
    per_page: number
  }
}

export type SignedUrlResponse = {
  signed_url: string
  expires_at: number
}

export type UploadMaterialPayload = {
  title: string
  description?: string | null
  tags?: string[]
  isPublic: boolean
  aiToggleEnabled?: boolean
  file?: File | null
}
