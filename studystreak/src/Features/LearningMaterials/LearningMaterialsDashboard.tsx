import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthContext } from '../../Auth/context/useAuthContext'
import { deleteLearningMaterial, likeLearningMaterial, unlikeLearningMaterial, requestSignedUrl } from './api'
import type { LearningMaterial, MaterialsFilter, SortOption } from './types'
import { normalizeMaterialRecord, useLearningMaterialsQuery } from './useLearningMaterialsQuery'
import { MaterialsProvider } from './MaterialsProvider'
import { useMaterialsStore } from './useMaterialsStore'
import { showToast as showGlobalToast, type ToastType } from '../../components/toastService'
import { useDebounce } from './hooks/useDebounce'
import BulkActionsToolbar from './components/BulkActionsToolbar'
import FilePreviewModal from './components/FilePreviewModal'
import EditMaterialModal from './components/EditMaterialModal'
import MaterialsList from './components/MaterialsList'
import SearchAndFilterBar from './components/SearchAndFilterBar'
import SectionFilters from './components/SectionFilters'
import { UploadDrawer } from './components/UploadDrawer'
import { updateLearningMaterial } from './api'

const DEFAULT_SORT: SortOption = 'created_at.desc'
const DEFAULT_PER_PAGE = 12
const PER_PAGE_OPTIONS = [12, 24, 48]

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
  const { user, loading: authLoading } = useAuthContext()
  const userId = user?.id ?? null
  const admin = isAdminUser(user)

  const [filter, setFilter] = useState<MaterialsFilter>('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [sort, setSort] = useState<SortOption>(DEFAULT_SORT)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [previewMaterial, setPreviewMaterial] = useState<LearningMaterial | null>(null)
  const [editMaterial, setEditMaterial] = useState<LearningMaterial | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  // local toast state removed — use global toast service
  const [allMaterials, setAllMaterials] = useState<LearningMaterial[]>([])
  const materialsRef = useRef<LearningMaterial[]>([])

  const { materials: fetchedMaterials, loading: queryLoading, error: queryError, pagination } = useLearningMaterialsQuery({
    filter,
    search: debouncedSearch,
    page,
    perPage,
    sort,
    refreshKey,
    enabled: !authLoading,
  })

  const applyMaterialsUpdate = useCallback((updater: (prev: LearningMaterial[]) => LearningMaterial[]) => {
    setAllMaterials((prev) => {
      const next = updater(prev)
      materialsRef.current = next
      return next
    })
  }, [])

  const provider = useMaterialsStore()

  useEffect(() => {
    if (queryLoading) {
      return
    }

    // Prefer provider data only when the current filter is 'all' and the provider has loaded items.
    // The provider will prefetch remaining pages in the background and set `isFullyLoaded`.
    if (filter === 'all' && provider && provider.allMaterials && provider.allMaterials.length > 0) {
      materialsRef.current = provider.allMaterials
      setAllMaterials(provider.allMaterials)
      return
    }

    materialsRef.current = fetchedMaterials
    setAllMaterials(fetchedMaterials)
  }, [fetchedMaterials, queryLoading, provider, filter])

  useEffect(() => {
    setPage(1)
  }, [filter, search, sort, perPage])

  // global showToast helper
  const showToast = useCallback((type: ToastType, text: string) => {
    showGlobalToast({ type, text })
  }, [])

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev
      const existing = new Set(allMaterials.map((item) => item.id))
      const next = new Set<string>()
      prev.forEach((id) => {
        if (existing.has(id)) next.add(id)
      })
      return next
    })
  }, [allMaterials])

  const searchQuery = debouncedSearch.trim().toLowerCase()

  const filteredMaterials = useMemo(() => {
    let items = allMaterials

    if (searchQuery !== '') {
      const terms = searchQuery.split(/\s+/).filter((term) => term.length > 0)
      if (terms.length > 0) {
        items = items.filter((material) => {
          const haystack = [
            material.title,
            material.description ?? '',
            material.file_name ?? '',
            material.uploader_name ?? '',
            material.tags.join(' '),
          ]
            .join(' ')
            .toLowerCase()

          return terms.every((term) => haystack.includes(term))
        })
      }
    }

    return items
  }, [allMaterials, searchQuery])

  const sortedMaterials = useMemo(() => {
    const items = [...filteredMaterials]
    const [field, dirRaw] = sort.split('.') as [string, string?]
    const direction = dirRaw === 'asc' ? 1 : -1

    const toTimestamp = (value: string) => {
      const time = Date.parse(value)
      return Number.isNaN(time) ? 0 : time
    }

    items.sort((a, b) => {
      switch (field) {
        case 'title':
          return a.title.localeCompare(b.title) * direction
        case 'likes_count':
          return (a.likes_count - b.likes_count) * direction
        case 'downloads_count':
          return (a.downloads_count - b.downloads_count) * direction
        case 'created_at':
        default:
          return (toTimestamp(a.created_at) - toTimestamp(b.created_at)) * direction
      }
    })

    return items
  }, [filteredMaterials, sort])

  const totalItems = pagination.total
  const totalPages = useMemo(() => {
    const per = pagination.perPage > 0 ? pagination.perPage : perPage
    if (per <= 0) {
      return 1
    }
    return Math.max(1, Math.ceil(totalItems / per))
  }, [pagination.perPage, perPage, totalItems])

  useEffect(() => {
    setPage((current) => {
      if (current > totalPages) return totalPages
      if (current < 1) return 1
      return current
    })
  }, [totalPages])

  const currentRange = useMemo(() => {
    if (totalItems === 0) {
      return { from: 0, to: 0 }
    }
    const from = (pagination.page - 1) * pagination.perPage + 1
    const to = Math.min(totalItems, from + sortedMaterials.length - 1)
    return { from, to }
  }, [pagination.page, pagination.perPage, sortedMaterials.length, totalItems])

  const materials = sortedMaterials

  const listIsLoading = queryLoading && materials.length === 0

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

  const refreshData = useCallback(() => {
    setRefreshKey((value) => value + 1)
  }, [])

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
      applyMaterialsUpdate((prev) => prev.filter((item) => item.id !== material.id))
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
      const idSet = new Set(ids)
      applyMaterialsUpdate((prev) => prev.filter((item) => !idSet.has(item.id)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete selected materials'
      showToast('error', message)
    } finally {
      ids.forEach((id) => markBusy(id, false))
    }
  }

  const handleLike = useCallback(async (material: LearningMaterial) => {
    // Prevent anonymous likes
    if (!userId) {
      showToast('error', 'Please sign in to like materials')
      return
    }

    // Prevent concurrent like/unlike requests for the same material
    let started = false
    setBusyIds((prev) => {
      if (prev.has(material.id)) return prev
      const next = new Set(prev)
      next.add(material.id)
      started = true
      return next
    })

    if (!started) return

    const previous = materialsRef.current.find((item) => item.id === material.id)
    if (!previous) {
      // Clear busy state if we couldn't find the item
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(material.id)
        return next
      })
      return
    }

    const wasLiked = previous.user_liked

    // Optimistic UI update
    applyMaterialsUpdate((prev) =>
      prev.map((item) => {
        if (item.id !== material.id) return item
        const shouldLike = !item.user_liked
        const nextCount = shouldLike ? item.likes_count + 1 : Math.max(0, item.likes_count - 1)
        return {
          ...item,
          user_liked: shouldLike,
          likes_count: nextCount,
        }
      }),
    )

    try {
      if (wasLiked) {
        await unlikeLearningMaterial(material.id)
        showToast('success', 'Removed like')
      } else {
        await likeLearningMaterial(material.id)
        showToast('success', 'Material liked')
      }
    } catch (err) {
      // Revert optimistic update on error
      applyMaterialsUpdate((prev) =>
        prev.map((item) => {
          if (item.id !== material.id) return item
          return { ...previous }
        }),
      )
      const message = err instanceof Error ? err.message : 'Unable to update like'
      showToast('error', message)
    } finally {
      // Clear busy flag
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(material.id)
        return next
      })
    }
  }, [applyMaterialsUpdate, showToast, userId])

  const canDelete = useCallback((material: LearningMaterial) => {
    // Only show delete button in 'my' materials section or if admin
    if (filter !== 'my' && !admin) return false
    if (admin) return true
    if (!userId) return false
    return material.uploader_id === userId
  }, [admin, userId, filter])

  return (
    <MaterialsProvider>
      <div className="relative mx-auto max-w-6xl space-y-8 pb-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-purple-500/20 via-transparent to-transparent blur-3xl" aria-hidden />

      {/* Global ToastProvider will render toasts */}

      <SearchAndFilterBar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={(value) => setSort(value)}
        onRefresh={refreshData}
        onUpload={() => setShowUpload(true)}
        disabled={queryLoading && materials.length === 0}
      />

      <SectionFilters value={filter} onChange={(value: MaterialsFilter) => setFilter(value)} disabled={queryLoading && materials.length === 0} />

      <BulkActionsToolbar
        count={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onClear={clearSelection}
        disabled={queryLoading && materials.length === 0}
      />

      <MaterialsList
        materials={materials}
        loading={listIsLoading}
        error={queryError}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelection}
        onPreview={setPreviewMaterial}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onLike={handleLike}
        onEdit={(m) => setEditMaterial(m)}
        onUpload={() => setShowUpload(true)}
        filter={filter}
        canDelete={canDelete}
        busyIds={busyIds}
      />

      {totalItems > 0 && (
        <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-300 sm:flex-row">
          <div>
            Showing {currentRange.from}&ndash;{currentRange.to} of {totalItems}
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
        onSuccess={(created) => {
          const normalized = normalizeMaterialRecord(created) ?? created
          applyMaterialsUpdate((prev) => {
            const filtered = prev.filter((item) => item.id !== normalized.id)
            return [normalized, ...filtered]
          })
          showToast('success', 'Material uploaded successfully')
          setShowUpload(false)
          setPreviewMaterial(null)
          setPage(1)
          // Force a refresh of the listing cache so the backend's persisted
          // state (including ai_toggle_enabled) is fetched and reconciled.
          setRefreshKey((k) => k + 1)
        }}
      />

      <FilePreviewModal material={previewMaterial} onClose={() => setPreviewMaterial(null)} />
      <EditMaterialModal
        material={editMaterial}
        onClose={() => setEditMaterial(null)}
        onSubmit={async (payload) => {
          if (!editMaterial) return
          try {
            const updated = await updateLearningMaterial(editMaterial.id, payload)
            const normalized = normalizeMaterialRecord(updated) ?? updated
            applyMaterialsUpdate((prev) => {
              return prev.map((item) => (item.id === normalized.id ? normalized : item))
            })
            showToast('success', 'Material updated')
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to update material'
            showToast('error', message)
            throw err
          }
        }}
      />
      </div>
    </MaterialsProvider>
  )
}

export default LearningMaterialsDashboard
