import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { LearningMaterial } from '../types'

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
  const [tagsInput, setTagsInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!material) return
    setTitle(material.title ?? '')
    setDescription(material.description ?? null)
    setIsPublic(Boolean(material.is_public))
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
      <div className="surface-card relative w-full max-w-2xl rounded-2xl border bg-white shadow-2xl dark:border-slate-700/60 dark:bg-slate-900">
        <header className="flex items-center justify-between gap-4 border-b p-4">
          <h2 className="text-lg font-semibold">Edit material</h2>
          <button className="rounded-full p-2 text-slate-500" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="p-4">
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="mt-4 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            rows={4}
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
          />

          <label className="mt-4 flex items-center gap-3 text-sm">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <span>Public</span>
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">Tags (comma separated)</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

          <div className="mt-4 flex justify-end gap-3">
            <button type="button" className="rounded-xl border px-4 py-2" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-4 py-2 text-white"
              onClick={handleSave}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
