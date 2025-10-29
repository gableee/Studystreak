import { BookOpen, Download, Eye, Heart, Lock, Globe, Trash2, User } from 'lucide-react'
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
}

const formatFileSize = (size: number | null) => {
  if (size === null || Number.isNaN(size)) return 'Unknown size'
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
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {materials.map((material) => {
        const isSelected = selectedIds.has(material.id)
        const deletable = canDelete ? canDelete(material) : false
        const busy = actionIsBusy(material.id)
        const isPublic = Boolean(material.is_public)
        const tags = Array.isArray(material.tags) ? material.tags : []

        return (
          <article
            key={material.id}
            className={`surface-card relative flex h-full flex-col gap-4 rounded-2xl border border-slate-200/60 p-5 transition hover:border-slate-300 hover:shadow-lg dark:border-slate-700/60 dark:hover:border-slate-500/70 ${
              isSelected ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onToggleSelect(material)}
                className={`mt-1 flex h-5 w-5 items-center justify-center rounded border ${
                  isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent'
                } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
                aria-pressed={isSelected}
              >
                <span className="sr-only">Select material</span>
                ✓
              </button>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-2">
                    {material.title}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      isPublic
                        ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200'
                        : 'bg-slate-500/15 text-slate-600 dark:bg-slate-500/20 dark:text-slate-200'
                    }`}
                  >
                    {isPublic ? (
                      <Shield className="h-3.5 w-3.5" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                    {isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                {material.description ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{material.description}</p>
                ) : (
                  <p className="text-sm italic text-slate-400 dark:text-slate-500">No description provided</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-400/10 dark:text-blue-200"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div>
                <dt className="font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">File</dt>
                <dd className="truncate">
                  {material.file_name ?? 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Uploaded</dt>
                <dd>{formatDate(material.created_at)}</dd>
              </div>
              <div>
                <dt className="font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Size</dt>
                <dd>{formatFileSize(material.size ?? null)}</dd>
              </div>
              <div>
                <dt className="font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Likes</dt>
                <dd>{material.likes_count ?? 0}</dd>
              </div>
            </dl>

            <div className="mt-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onPreview(material)}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button
                type="button"
                onClick={() => onDownload(material)}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                type="button"
                onClick={() => onLike(material)}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-950/40"
              >
                <Heart className="h-4 w-4" />
                <span className="hidden md:inline">Like</span>
              </button>
              {deletable && filter === 'my' && (
                <button
                  type="button"
                  onClick={() => onDelete(material)}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-transparent bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden md:inline">Delete</span>
                </button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default MaterialsList
