import { useEffect, useRef, useState } from 'react'
import { FileUp, Loader2, X } from 'lucide-react'
import { uploadLearningMaterial } from '../api'
import type { LearningMaterial, UploadMaterialPayload } from '../types'

type UploadDrawerProps = {
  open: boolean
  onClose: () => void
  onSuccess: (material: LearningMaterial) => void
}

const MAX_FILE_SIZE_BYTES = 104_857_600

const initialPayload: UploadMaterialPayload = {
  title: '',
  description: '',
  tags: [],
  isPublic: false,
  file: null,
}

export function UploadDrawer({ open, onClose, onSuccess }: UploadDrawerProps) {
  const [payload, setPayload] = useState<UploadMaterialPayload>(initialPayload)
  const [tagsInput, setTagsInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    setPayload(initialPayload)
    setTagsInput('')
    setError(null)
  }, [open])

  const closeDrawer = () => {
    if (submitting) return
    onClose()
  }

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setPayload((prev) => ({ ...prev, file: null }))
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Please choose a file smaller than 100MB.')
      return
    }

    setError(null)
    setPayload((prev) => ({ ...prev, file }))
  }

  const parseTags = (input: string): string[] => {
    return input
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    if (!payload.title.trim()) {
      setError('Title is required to upload a material.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const tags = parseTags(tagsInput)
      const created = await uploadLearningMaterial({
        ...payload,
        tags,
        file: payload.file ?? undefined,
      })

      onSuccess(created)
      setPayload(initialPayload)
      setTagsInput('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="surface-card relative w-full max-w-2xl rounded-3xl border border-slate-200/60 bg-white p-6 shadow-xl dark:border-slate-700/60 dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Upload learning material</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Store the metadata in Postgres and attach files to Supabase Storage. Private uploads will be resolved with deferred signing.
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-full border border-transparent p-2 text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label="Close upload form"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-200">
              Title
              <input
                type="text"
                value={payload.title}
                onChange={(event) => setPayload((prev) => ({ ...prev, title: event.target.value }))}
                required
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-200">
              Visibility
              <select
                value={payload.isPublic ? 'public' : 'private'}
                onChange={(event) => setPayload((prev) => ({ ...prev, isPublic: event.target.value === 'public' }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="private">Private (owner only)</option>
                <option value="public">Public (anyone can access)</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-200">
            Description
            <textarea
              value={payload.description ?? ''}
              onChange={(event) => setPayload((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Short summary to help others understand this resource"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-200">
            Tags
            <input
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="Comma separated values (e.g. anatomy, revision, pdf)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <div>
            <label
              htmlFor="material-upload"
              className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50/60 dark:border-slate-600 dark:bg-slate-900/40 dark:hover:border-blue-500/60"
            >
              <FileUp className="h-8 w-8 text-slate-500" />
              <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-medium">Drag & drop or click to attach a file</p>
                <p>PDF, DOCX, PPTX, and media files up to 100MB.</p>
              </div>
              {payload.file && (
                <p className="rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                  {payload.file.name}
                </p>
              )}
              <input
                id="material-upload"
                type="file"
                ref={fileInputRef}
                className="sr-only"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
            </label>
            {payload.file && (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Selected file size: {(payload.file.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeDrawer}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              <span>{submitting ? 'Uploading…' : 'Upload material'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadDrawer
