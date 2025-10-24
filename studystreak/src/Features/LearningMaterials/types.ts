export type SectionKey = 'all' | 'my' | 'community' | 'official'

export interface LearningMaterial {
	material_id: string
	title: string
	description?: string | null
	file_url?: string | null
	content_type?: string | null
	content_type_label?: string | null
	created_at?: string | null
	user_name?: string | null
	user_id?: string | null
	created_by?: string | null
	is_public?: boolean
	category?: string | null
	tags?: string[] | null
	like_count?: number | null
	download_count?: number | null
	storage_path?: string | null
	estimated_duration?: string | null
	ai_quiz_generated?: boolean | null
}

export type CachedLearningMaterial = LearningMaterial & {
	resolved_url?: string | null
}

export interface SignedUrlResponse {
	signed_url?: string
}
