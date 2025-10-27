import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthContext } from '../../Auth/context/useAuthContext'
import {
  deleteLearningMaterial,
  likeLearningMaterial,
  requestSignedUrl,
} from './api'
import type { LearningMaterial, MaterialsFilter, SortOption } from './types'
import { useLearningMaterialsQuery } from './useLearningMaterialsQuery'
import BulkActionsToolbar from './components/BulkActionsToolbar'
import FilePreviewModal from './components/FilePreviewModal'
import MaterialsList from './components/MaterialsList'
import SearchAndFilterBar from './components/SearchAndFilterBar'
import SectionFilters from './components/SectionFilters'
import UploadDrawer from './components/UploadDrawer'

const DEFAULT_SORT: SortOption = 'created_at.desc'
const DEFAULT_PER_PAGE = 12
const PER_PAGE_OPTIONS = [12, 24, 48]

type ToastState = {
  type: 'success' | 'error'
  text: string
}

function isAdminUser(user: ReturnType<typeof useAuthContext>['user']): boolean {
  if (!user) return false
  const appRole = user.app_metadata?.role
  if (typeof appRole === 'string' && appRole.toLowerCase() === 'admin') {
    return true
  }
  const userRole = user.user_metadata?.role
  if (typeof userRole === 'string' && userRole.toLowerCase() === 'admin') {
    return true
  }
  const appRoles = user.app_metadata?.roles
  if (Array.isArray(appRoles) && appRoles.some((role) => typeof role === 'string' && role.toLowerCase() === 'admin')) {
    return true
  }
  const userRoles = user.user_metadata?.roles
  if (Array.isArray(userRoles) && userRoles.some((role) => typeof role === 'string' && role.toLowerCase() === 'admin')) {
    return true
  }
  return false
}

const LearningMaterialsDashboard = () => {
  const { user } = useAuthContext()
  const userId = user?.id ?? null
  const admin = isAdminUser(user)

  const [filter, setFilter] = useState<MaterialsFilter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>(DEFAULT_SORT)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [previewMaterial, setPreviewMaterial] = useState<LearningMaterial | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<ToastState | null>(null)

  const { materials, loading, error, pagination, refetch } = useLearningMaterialsQuery({
    filter,
    search,
    page,
    perPage,
    sort,
    refreshKey,
  })

  useEffect(() => {
    setPage(1)
  }, [filter, search, sort, perPage])

  useEffect(() => {
    if (toast === null) return
    const timeout = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev
      const existing = new Set(materials.map((item) => item.id))
      const next = new Set<string>()
      prev.forEach((id) => {
        if (existing.has(id)) next.add(id)
      })
      return next
    })
  }, [materials])

  const totalPages = useMemo(() => {
    if (pagination.total === 0) return 1
    return Math.max(1, Math.ceil(pagination.total / pagination.perPage))
  }, [pagination.total, pagination.perPage])

  const currentRange = useMemo(() => {
    if (pagination.total === 0) {
      return { from: 0, to: 0 }
    }
    const from = (pagination.page - 1) * pagination.perPage + 1
    const to = Math.min(pagination.total, pagination.page * pagination.perPage)
    return { from, to }
  }, [pagination.page, pagination.perPage, pagination.total])

  const toggleSelection = (material: LearningMaterial) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(material.id)) {
        next.delete(material.id)
      } else {
        next.add(material.id)
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const showToast = (type: ToastState['type'], text: string) => {
    setToast({ type, text })
  }

  const markBusy = (id: string, active: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (active) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const refreshData = () => {
    setRefreshKey((value) => value + 1)
  }

  const handleDownload = async (material: LearningMaterial) => {
    try {
      const url = material.resolved_url ? material.resolved_url : (await requestSignedUrl(material.id, 'download')).signed_url
      
      // Create a temporary link element for download
      const link = document.createElement('a')
      link.href = url
      link.download = material.file_name || material.title
      link.target = '_blank'
      link.rel = 'noopener,noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to download file'
      showToast('error', message)
    }
  }

  const handleDelete = async (material: LearningMaterial) => {
    markBusy(material.id, true)
    try {
      await deleteLearningMaterial(material.id)
      showToast('success', 'Material deleted successfully')
      setSelectedIds((prev) => {
        if (!prev.has(material.id)) return prev
        const next = new Set(prev)
        next.delete(material.id)
        return next
      })
      refreshData()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete material'
      showToast('error', message)
    } finally {
      markBusy(material.id, false)
    }
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    ids.forEach((id) => markBusy(id, true))
    try {
      await Promise.all(ids.map((id) => deleteLearningMaterial(id).catch((error) => error)))
      showToast('success', `Deleted ${ids.length} material${ids.length === 1 ? '' : 's'}`)
      clearSelection()
      refreshData()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete selected materials'
      showToast('error', message)
    } finally {
      ids.forEach((id) => markBusy(id, false))
    }
  }

  const handleLike = async (material: LearningMaterial) => {
    markBusy(material.id, true)
    try {
      await likeLearningMaterial(material.id)
      showToast('success', 'Material liked')
      refetch()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to like material'
      showToast('error', message)
    } finally {
      markBusy(material.id, false)
    }
  }

  const canDelete = (material: LearningMaterial) => {
    if (admin) return true
    if (!userId) return false
    return material.uploader_id === userId
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-8 pb-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-purple-500/20 via-transparent to-transparent blur-3xl" aria-hidden />

      {toast && (
        <div
          className={`mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border px-4 py-3 text-sm shadow ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-900/20 dark:text-red-200'
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          <span>{toast.text}</span>
        </div>
      )}

      <SearchAndFilterBar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={(value) => setSort(value)}
        onRefresh={refreshData}
        onUpload={() => setShowUpload(true)}
        disabled={loading}
      />

      <SectionFilters value={filter} onChange={(value) => setFilter(value)} disabled={loading} />

      <BulkActionsToolbar
        count={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onClear={clearSelection}
        disabled={loading}
      />

      <MaterialsList
        materials={materials}
        loading={loading}
        error={error}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelection}
        onPreview={setPreviewMaterial}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onLike={handleLike}
        onUpload={() => setShowUpload(true)}
        filter={filter}
        canDelete={canDelete}
        busyIds={busyIds}
      />

      {pagination.total > 0 && (
        <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-300 sm:flex-row">
          <div>
            Showing {currentRange.from}&ndash;{currentRange.to} of {pagination.total}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Per page</span>
              <select
                value={perPage}
                onChange={(event) => setPerPage(Number(event.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {PER_PAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page === 1}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:border-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:border-slate-600"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </footer>
      )}

      <UploadDrawer
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={() => {
          showToast('success', 'Material uploaded successfully')
          setShowUpload(false)
          setPreviewMaterial(null)
          setPage(1)
          // Immediately reflect the freshly uploaded item.
          refreshData()
        }}
      />

      <FilePreviewModal material={previewMaterial} onClose={() => setPreviewMaterial(null)} />
    </div>
  )
}

export default LearningMaterialsDashboard
