export function ListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="surface-card h-40 animate-pulse rounded-2xl border border-slate-200/60 bg-white/60 dark:border-slate-700/60 dark:bg-slate-900/60"
        >
          <div className="flex h-full flex-col gap-3 p-4">
            <div className="h-6 w-1/2 rounded-full bg-slate-200/60 dark:bg-slate-700/60" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-full rounded-full bg-slate-200/60 dark:bg-slate-700/60" />
              <div className="h-4 w-3/4 rounded-full bg-slate-200/60 dark:bg-slate-700/60" />
            </div>
            <div className="flex gap-2">
              <span className="h-8 w-20 rounded-full bg-slate-200/60 dark:bg-slate-700/60" />
              <span className="h-8 w-20 rounded-full bg-slate-200/60 dark:bg-slate-700/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ListSkeleton
