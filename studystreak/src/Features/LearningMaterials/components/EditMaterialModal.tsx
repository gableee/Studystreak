import { useEffect, useState } from 'react'
import { X, Loader2, Lock, Globe, Sparkles } from 'lucide-react'
import type { LearningMaterial } from '../types'
import { Switch } from '../../../components/ui/switch'

type EditMaterialModalProps = {
  material: LearningMaterial | null
  onClose: () => void
  onSubmit: (payload: {
    title?: string
    description?: string | null
    isPublic?: boolean
    tags?: string[] | null
  }) => Promise<void>
}

export default function EditMaterialModal({ material, onClose, onSubmit }: EditMaterialModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [aiToggleEnabled, setAiToggleEnabled] = useState(false)
  const [tagsInput, setTagsInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!material) return
    setTitle(material.title ?? '')
    setDescription(material.description ?? null)
    setIsPublic(Boolean(material.is_public))
    setAiToggleEnabled(Boolean(material.ai_toggle_enabled))
    setTagsInput(Array.isArray(material.tags) ? material.tags.join(', ') : '')
    setError(null)
  }, [material])

  if (!material) return null

  const handleSave = async () => {
    setError(null)
    if (title.trim() === '') {
      setError('Title is required')
      return
    }
    const payload: any = {}
    if (title !== material.title) payload.title = title.trim()
    if (description !== (material.description ?? null)) payload.description = description
    if (isPublic !== Boolean(material.is_public)) payload.isPublic = isPublic
    if (aiToggleEnabled !== Boolean(material.ai_toggle_enabled)) payload.aiToggleEnabled = aiToggleEnabled
    // parse tags input (comma separated)
    if (tagsInput !== (Array.isArray(material.tags) ? material.tags.join(', ') : '')) {
      const parsed = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
      payload.tags = parsed.length > 0 ? parsed : null
    }

    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }

    setBusy(true)
    try {
      await onSubmit(payload)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save changes'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="surface-card relative w-full max-w-2xl rounded-3xl border border-slate-200/60 bg-white shadow-2xl dark:border-slate-700/60 dark:bg-slate-900">
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Edit Material</h2>
          <button
            className="rounded-full p-2 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Title</label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder-slate-500 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus:border-blue-500 dark:focus:bg-slate-800 dark:focus:ring-blue-900/30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter material title"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Description</label>
            <textarea
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder-slate-500 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus:border-blue-500 dark:focus:bg-slate-800 dark:focus:ring-blue-900/30"
              rows={4}
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
            />
          </div>

          {/* Visibility Switch with dynamic label and badge */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Visibility</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm transition-all duration-200 ${
                  isPublic
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                }`}
              >
                {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {isPublic ? 'Public' : 'Private'}
              </span>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              className="transition-all duration-300 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-500 data-[state=checked]:to-teal-500 data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-amber-500 data-[state=unchecked]:to-orange-500"
            />
          </div>

          {/* AI Toggle Switch */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Enable AI features</span>
                {Boolean(material.ai_toggle_enabled) && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                    <Lock className="h-3 w-3" />
                    Cannot disable once enabled
                  </span>
                )}
              </div>
            </div>
            <Switch
              checked={aiToggleEnabled}
              onCheckedChange={setAiToggleEnabled}
              disabled={Boolean(material.ai_toggle_enabled)}
              className="transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Tags</label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder-slate-500 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus:border-blue-500 dark:focus:bg-slate-800 dark:focus:ring-blue-900/30"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. anatomy, revision, pdf"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-xs font-bold dark:bg-red-900">!</span>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-700"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-600/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-blue-900/50"
              onClick={handleSave}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
