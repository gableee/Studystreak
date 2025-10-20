import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/Auth/hooks/useAuth'
import { apiClient, ApiError } from '@/lib/apiClient'
import {
  Clock,
  Download,
  FileText,
  Heart,
  Users,
  Video,
  Wand2,
  Filter,
  Plus,
} from 'lucide-react'

interface LearningMaterial {
  material_id: string;
  title: string;
  description: string;
  file_url: string;
  content_type: string;
  content_type_label?: string;
  estimated_duration: number;
  created_at: string;
  extracted_content: string;
  word_count: number;
  ai_quiz_generated: boolean;
  user_id: string;
  is_public: boolean;
  category: string;
  tags: string[];
  user_name?: string;
  like_count?: number;
  download_count?: number;
  storage_path?: string;
}

interface MaterialsListProps {
  filter: 'all' | 'my' | 'community' | 'official'
  searchQuery: string
  onUploadClick: () => void
  refreshKey?: number
}

const CATEGORY_OPTIONS: { label: string; value: string }[] = [
  { label: 'All categories', value: 'all' },
  { label: 'Health sciences', value: 'Health sciences' },
  { label: 'Built environment', value: 'Built environment' },
  { label: 'Creative studios', value: 'Creative studios' },
  { label: 'Data & analytics', value: 'Data & analytics' },
  { label: 'Computer science', value: 'Computer science' },
  { label: 'Nursing', value: 'Nursing' },
  { label: 'Calculus', value: 'Calculus' },
  { label: 'Architecture', value: 'Architecture' },
]

const extractApiErrorDetail = (payload: unknown): string | null => {
  if (payload === null || payload === undefined) {
    return null
  }

  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    return trimmed !== '' ? trimmed : null
  }

  if (typeof payload !== 'object') {
    return null
  }

  const record = payload as Record<string, unknown>
  const directKeys = ['message', 'detail', 'hint']
  for (const key of directKeys) {
    const value = record[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed !== '') {
        return trimmed
      }
    }
  }

  const detailsValue = record['details']
  if (typeof detailsValue === 'string') {
    const trimmed = detailsValue.trim()
    return trimmed !== '' ? trimmed : null
  }

  if (detailsValue && typeof detailsValue === 'object') {
    const detailsRecord = detailsValue as Record<string, unknown>
    const nestedKeys = ['message', 'error', 'detail', 'hint']
    for (const key of nestedKeys) {
      const value = detailsRecord[key]
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (trimmed !== '') {
          return trimmed
        }
      }
    }

    const entries = Object.entries(detailsRecord)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${String(value)}`)

    if (entries.length > 0) {
      return entries.join(', ')
    }
  }

  return null
}

const MaterialsList: React.FC<MaterialsListProps> = ({ filter, searchQuery, onUploadClick, refreshKey = 0 }) => {
  const [allMaterials, setAllMaterials] = useState<LearningMaterial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const { user, session, loading: authLoading } = useAuth()

  const fetchMaterials = useCallback(async () => {
    // Wait for auth provider to initialize
    if (authLoading) return

    if (!session?.access_token) {
      setAllMaterials([])
      setIsLoading(false)
      setError('You need to be signed in to view materials.')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const data = await apiClient.get<LearningMaterial[]>('/api/learning-materials?filter=all')
      setAllMaterials(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching materials:', err)
      setAllMaterials([])

      if (err instanceof ApiError) {
        const baseMessage = err.message?.trim() !== '' ? err.message : 'We could not load learning materials. Please try again.'
        const detail = extractApiErrorDetail(err.payload)
        const finalMessage = detail && detail.toLowerCase() !== baseMessage.toLowerCase()
          ? `${baseMessage} (${detail})`
          : baseMessage
        setError(finalMessage)
      } else if (err instanceof Error && err.message.trim() !== '') {
        setError(err.message)
      } else {
        setError('We could not load learning materials. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [session?.access_token, authLoading])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials, refreshKey, user?.id])

  const filteredMaterials = useMemo(() => {
    let dataset = [...allMaterials]

    if (filter === 'my') {
      if (!user?.id) {
        return []
      }
      dataset = dataset.filter((item) => item.user_id === user.id)
    } else if (filter === 'community') {
      dataset = dataset.filter((item) => item.is_public)
    } else if (filter === 'official') {
      dataset = dataset.filter((item) => item.is_public && item.category)
    }

    if (categoryFilter !== 'all') {
      dataset = dataset.filter((item) =>
        item.category && item.category.toLowerCase() === categoryFilter.toLowerCase()
      )
    }

    const term = searchQuery.trim().toLowerCase()
    if (term !== '') {
      dataset = dataset.filter((item) => {
        const title = item.title?.toLowerCase() ?? ''
        const description = item.description?.toLowerCase() ?? ''
        const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : ''
        return title.includes(term) || description.includes(term) || tags.includes(term)
      })
    }

    return dataset
  }, [allMaterials, categoryFilter, filter, searchQuery, user?.id])



  const formatDuration = (minutes: number): string => {
    if (!minutes) return 'Duration not set';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('video/')) return Video;
    return FileText;
  };

  const getAccentGradient = (index: number) => {
    const gradients = [
      'from-sky-500 to-blue-500',
      'from-purple-500 to-pink-500',
      'from-emerald-500 to-teal-500',
      'from-orange-500 to-amber-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-emerald-500'
    ];
    return gradients[index % gradients.length];
  };

  if (isLoading) {
    return (
      <div className="surface-section space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="surface-card p-6 rounded-2xl">
              <div className="flex gap-4">
                <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-section space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category.value}
              onClick={() => setCategoryFilter(category.value)}
              className={`pill-tab ${categoryFilter === category.value ? 'pill-tab-active' : ''}`}
            >
              {category.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={onUploadClick}
          className="pill-tab-active inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Upload material
        </button>
      </div>

      {/* Materials Grid */}
      {filter === 'community' || filter === 'all' ? (
        /* Community Style Layout */
        <div className="space-y-4">
          {filteredMaterials.map((material, index) => {
            const FileIcon = getFileIcon(material.content_type)
            const canDownload = Boolean(material.file_url)
            return (
              <article key={material.material_id} className="surface-card flex flex-wrap items-start gap-4 p-6 rounded-2xl hover:shadow-md transition-shadow">
                <span className={`inline-flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br ${getAccentGradient(index)} text-white shadow-md`}>
                  <FileIcon className="h-7 w-7" />
                </span>
                <div className="flex-1 min-w-[16rem] space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {material.title}
                    </h3>
                    {material.ai_quiz_generated && (
                      <span className="badge badge-info gap-1">
                        <Wand2 className="h-3.5 w-3.5" />
                        AI quiz ready
                      </span>
                    )}
                    {material.category && (
                      <span className="badge badge-outline">{material.category}</span>
                    )}
                    <span className={`badge ${material.is_public ? 'badge-success' : 'badge-warning'}`}>
                      {material.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                  
                  {material.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {material.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {material.user_name && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        @{material.user_name}
                      </span>
                    )}
                    {material.estimated_duration && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(material.estimated_duration)}
                      </span>
                    )}
                    {material.word_count > 0 && (
                      <span>{material.word_count} words</span>
                    )}
                    {material.like_count !== undefined && (
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        {material.like_count}
                      </span>
                    )}
                    {material.download_count !== undefined && (
                      <span className="inline-flex items-center gap-1">
                        <Download className="h-3.5 w-3.5" />
                        {material.download_count}
                      </span>
                    )}
                  </div>

                    {material.tags && material.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {material.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                            #{tag}
                          </span>
                        ))}
                        {material.tags.length > 3 && (
                          <span className="px-2 py-1 text-slate-500 dark:text-slate-400 text-xs">
                            +{material.tags.length - 3} more
                          </span>
                        )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {canDownload ? (
                    <a
                      href={material.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill-tab-active inline-flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  ) : (
                    <span className="pill-tab inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Download className="h-4 w-4" />
                      Download unavailable
                    </span>
                  )}
                  {material.ai_quiz_generated && (
                    <button className="pill-tab inline-flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      Take Quiz
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Grid Layout for Personal/Official */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((material, index) => {
            const FileIcon = getFileIcon(material.content_type)
            const canDownload = Boolean(material.file_url)
            return (
              <article key={material.material_id} className="surface-card flex flex-col gap-4 p-5 rounded-2xl hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${getAccentGradient(index)} text-white shadow-lg`}>
                    <FileIcon className="h-5 w-5" />
                  </span>
                  <div className="flex items-center gap-1">
                    {material.ai_quiz_generated && (
                      <Wand2 className="h-4 w-4 text-green-500" />
                    )}
                    <span className={`badge ${material.is_public ? 'badge-success' : 'badge-warning'} text-xs`}>
                      {material.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                    {material.title}
                  </h3>
                  {material.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                      {material.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {material.estimated_duration && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(material.estimated_duration)}
                    </span>
                  )}
                  {material.word_count > 0 && (
                    <span>{material.word_count} words</span>
                  )}
                </div>

                {material.tags && material.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {material.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {canDownload ? (
                    <a
                      href={material.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 pill-tab-active inline-flex items-center justify-center gap-2 text-center"
                    >
                      <Download className="h-4 w-4" />
                      Open
                    </a>
                  ) : (
                    <span className="flex-1 pill-tab inline-flex items-center justify-center gap-2 text-center text-slate-500 dark:text-slate-400">
                      <Download className="h-4 w-4" />
                      Link unavailable
                    </span>
                  )}
                  {material.ai_quiz_generated && (
                    <button className="px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-200 dark:hover:bg-green-800 transition-colors">
                      <Wand2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No materials found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {filter === 'my' 
              ? "You haven't uploaded any materials yet." 
              : filter === 'community'
              ? "No public materials available in the community library."
              : "No materials match your current filters."}
          </p>
          {filter === 'my' && (
            <button 
              onClick={onUploadClick}
              className="pill-tab-active inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Upload your first material
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default MaterialsList
