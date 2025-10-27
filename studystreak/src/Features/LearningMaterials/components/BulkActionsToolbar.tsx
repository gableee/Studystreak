import { Trash2, X } from 'lucide-react'

type BulkActionsToolbarProps = {
  count: number
  onClear: () => void
  onBulkDelete: () => void
  disabled?: boolean
}

export function BulkActionsToolbar({ count, onClear, onBulkDelete, disabled = false }: BulkActionsToolbarProps) {
  if (count === 0) return null

  return (
    <div className="sticky top-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-blue-600/90 px-2 text-xs font-semibold text-white">
          {count}
        </span>
        <span className="hidden sm:inline">materials selected</span>
        <span className="sm:hidden">selected</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBulkDelete}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete selected</span>
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm text-slate-600 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <X className="h-4 w-4" />
          <span>Clear</span>
        </button>
      </div>
    </div>
  )
}

export default BulkActionsToolbar
