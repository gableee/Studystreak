import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  filter: string
  onUpload: () => void
}

export function EmptyState({ filter, onUpload }: EmptyStateProps) {
  return (
    <div className="surface-card flex min-h-[18rem] flex-col items-center justify-center gap-4 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <Inbox className="h-8 w-8" />
      </span>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No materials found</h3>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-300">
          {filter === 'my'
            ? 'Upload your first resource to populate your personal desk.'
            : 'Try adjusting the search query or upload a new resource to get started.'}
        </p>
      </div>
      <button
        type="button"
        onClick={onUpload}
        className="pill-tab inline-flex items-center gap-2 bg-gradient-to-r from-blue-800 to-indigo-700 text-white shadow-lg shadow-blue-700/30 hover:from-blue-900 hover:to-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        Upload material
      </button>
    </div>
  )
}

export default EmptyState
