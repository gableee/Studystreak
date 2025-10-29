import { RefreshCw, Search, Upload } from 'lucide-react'
import type { SortOption } from '../types'

type SearchAndFilterBarProps = {
  search: string
  onSearchChange: (value: string) => void
  sort: SortOption
  onSortChange: (value: SortOption) => void
  onRefresh: () => void
  onUpload: () => void
  disabled?: boolean
}

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'created_at.desc', label: 'Newest first' },
  { value: 'created_at.asc', label: 'Oldest first' },
  { value: 'title.asc', label: 'Title A → Z' },
  { value: 'title.desc', label: 'Title Z → A' },
  { value: 'likes_count.desc', label: 'Most liked' },
  { value: 'downloads_count.desc', label: 'Most downloaded' },
]

export function SearchAndFilterBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  onRefresh,
  onUpload,
  disabled = false,
}: SearchAndFilterBarProps) {
  return (
    <header className="surface-section relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-transparent to-purple-500/15" aria-hidden />
      <div className="relative space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <span className="badge badge-info uppercase tracking-wide">Curated hub</span>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Discover learning materials tailored to every cohort
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              Upload notes, share official course packs, and keep personal study artefacts in sync with deferred signing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={disabled}
              className="pill-tab inline-flex items-center gap-2 bg-gradient-to-r from-teal-700 to-emerald-700 text-white shadow-md shadow-teal-700/25 hover:from-teal-800 hover:to-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={onUpload}
              disabled={disabled}
              className="pill-tab inline-flex items-center gap-2 bg-gradient-to-r from-blue-800 to-indigo-700 text-white shadow-lg shadow-blue-700/30 hover:from-blue-900 hover:to-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              <span className="whitespace-nowrap">Upload material</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by title, description, or filename"
            className="w-full rounded-3xl border border-white/20 bg-white/80 py-3 pl-12 pr-4 text-sm text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
            disabled={disabled}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Sort by</span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as SortOption)}
              disabled={disabled}
              className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  )
}

export default SearchAndFilterBar
