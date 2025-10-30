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
    <header className="surface-section relative overflow-hidden rounded-[2rem]">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10" aria-hidden />
      <div className="relative space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-md">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Learning Hub
            </span>
            <h1 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-white dark:to-slate-300 sm:text-4xl">
              Discover learning materials
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              Upload notes, share course packs, and organize your study materials with deferred signing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/30 transition-all duration-200 hover:from-teal-700 hover:to-emerald-700 hover:shadow-xl hover:shadow-teal-600/40 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={onUpload}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
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
            placeholder="Search by title, description, or filename..."
            className="w-full rounded-2xl border border-slate-200/60 bg-white/90 py-3.5 pl-12 pr-4 text-sm text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700/60 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-600 dark:focus:ring-blue-900/30"
            disabled={disabled}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold">Sort by</span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as SortOption)}
              disabled={disabled}
              className="rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-blue-600 dark:focus:ring-blue-900/30"
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
