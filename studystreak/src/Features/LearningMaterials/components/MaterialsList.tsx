import { BookOpen, Download, Eye, Heart, Lock, Globe, Trash2, User, Calendar, FileText, HardDrive } from 'lucide-react'
import type { LearningMaterial, MaterialsFilter } from '../types'
import EmptyState from './EmptyState'
import ListSkeleton from './ListSkeleton'

type MaterialsListProps = {
  materials: LearningMaterial[]
  loading: boolean
  error: string | null
  selectedIds: Set<string>
  onToggleSelect: (material: LearningMaterial) => void
  onPreview: (material: LearningMaterial) => void
  onDownload: (material: LearningMaterial) => void
  onDelete: (material: LearningMaterial) => void
  onLike: (material: LearningMaterial) => void
  onUpload: () => void
  filter: MaterialsFilter
  canDelete?: (material: LearningMaterial) => boolean
  busyIds?: Set<string>
  onEdit?: (material: LearningMaterial) => void
}

const formatFileSize = (size: number | null) => {
  if (size === null || Number.isNaN(size)) return 'Unknown'
  if (size < 1024) return `${size} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = size / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function MaterialsList({
  materials,
  loading,
  error,
  selectedIds,
  onToggleSelect,
  onPreview,
  onDownload,
  onDelete,
  onLike,
  onUpload,
  filter,
  canDelete,
  busyIds,
  onEdit,
}: MaterialsListProps) {
  if (loading) {
    return <ListSkeleton />
  }

  if (error) {
    return (
      <div className="surface-card space-y-2 rounded-2xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200">
        <h3 className="text-base font-semibold">Something went wrong</h3>
        <p>{error}</p>
      </div>
    )
  }

  if (materials.length === 0) {
    return <EmptyState filter={filter} onUpload={onUpload} />
  }

  const actionIsBusy = (materialId: string) => busyIds?.has(materialId) ?? false

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {materials.map((material) => {
        const isSelected = selectedIds.has(material.id)
        const deletable = canDelete ? canDelete(material) : false
        const busy = actionIsBusy(material.id)
        const isPublic = Boolean(material.is_public)
        const tags = Array.isArray(material.tags) ? material.tags : []
        const isLiked = material.user_liked

        return (
          <article
            key={material.id}
            className={`group relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-gradient-to-br from-white to-slate-50/80 shadow-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 dark:from-slate-900 dark:to-slate-800/80 ${
              isSelected 
                ? 'border-blue-400 ring-4 ring-blue-400/30 dark:border-blue-500 dark:ring-blue-500/30' 
                : 'border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            {/* Header with checkbox and visibility badge */}
            <div className="relative flex items-start gap-3 border-b border-slate-100/80 bg-gradient-to-r from-slate-50/50 to-transparent px-5 py-4 dark:border-slate-700/50 dark:from-slate-800/50">
              <button
                type="button"
                onClick={() => onToggleSelect(material)}
                className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/50 scale-110' 
                    : 'border-slate-300 bg-white text-transparent hover:border-blue-400 dark:border-slate-600 dark:bg-slate-800'
                }`}
                aria-pressed={isSelected}
              >
                <span className="text-xs font-bold">✓</span>
              </button>
              
              <div className="flex-1 min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                  {material.title}
                </h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <User className="h-3 w-3" />
                  {material.uploader_name || material.uploader_email || 'Unknown'}
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${
                  isPublic
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                }`}
              >
                {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {isPublic ? 'Public' : 'Private'}
              </span>
            </div>

            {/* Main content */}
            <div className="flex-1 space-y-4 px-5 py-4">
              {/* Description */}
              <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                {material.description || 'No description provided'}
              </p>

              {/* File info row */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate font-mono">{material.file_name || 'Unknown file'}</span>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {tags.length > 3 && (
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      +{tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Metadata grid */}
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl bg-slate-50/80 px-3 py-2.5 text-xs dark:bg-slate-800/50">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <dd className="font-medium text-slate-600 dark:text-slate-300">{formatDate(material.created_at)}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                  <dd className="font-medium text-slate-600 dark:text-slate-300">{formatFileSize(material.size)}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-rose-400" />
                  <dd className="font-medium text-slate-600 dark:text-slate-300">
                    {material.likes_count} {material.likes_count === 1 ? 'like' : 'likes'}
                  </dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  <dd className="font-medium text-slate-600 dark:text-slate-300">
                    {material.downloads_count} {material.downloads_count === 1 ? 'download' : 'downloads'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Action buttons */}
            <div className="border-t border-slate-100/80 bg-slate-50/40 px-4 py-3 dark:border-slate-700/50 dark:bg-slate-800/40">
              <div className="flex flex-wrap items-center gap-2">
                {/* Preview button */}
                <button
                  type="button"
                  onClick={() => onPreview(material)}
                  disabled={busy}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview</span>
                </button>

                {/* Download button */}
                <button
                  type="button"
                  onClick={() => onDownload(material)}
                  disabled={busy}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              </div>

              <div className="mt-2 flex items-center gap-2">
                {/* Like button */}
                <button
                  type="button"
                  onClick={() => onLike(material)}
                  disabled={busy}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isLiked
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 hover:from-rose-600 hover:to-pink-600'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span>{isLiked ? 'Liked' : 'Like'}</span>
                </button>

                {/* Quiz button */}
                <button
                  type="button"
                  onClick={() => {
                    // TODO: Implement quiz generation
                    console.log('Quiz button clicked for material:', material.id)
                  }}
                  disabled={busy}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-3 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:from-purple-700 hover:to-violet-700 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Quiz</span>
                </button>

                {/* Edit/Delete buttons (conditionally shown) */}
                {deletable && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit?.(material)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(material)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm transition-all duration-200 hover:bg-red-50 hover:border-red-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default MaterialsList
