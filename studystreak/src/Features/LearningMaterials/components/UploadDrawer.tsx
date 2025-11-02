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
  aiToggleEnabled: false,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="surface-card relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-2xl dark:border-slate-700/60 dark:bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" aria-hidden />
        <div className="relative p-6">
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Upload learning material</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Store metadata in Postgres and attach files to Supabase Storage.
              </p>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-slate-700"
              aria-label="Close upload form"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span>Title <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  value={payload.title}
                  onChange={(event) => setPayload((prev) => ({ ...prev, title: event.target.value }))}
                  required
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-600 dark:focus:ring-blue-900/30"
                  placeholder="Enter material title"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span>Visibility</span>
                <select
                  value={payload.isPublic ? 'public' : 'private'}
                  onChange={(event) => setPayload((prev) => ({ ...prev, isPublic: event.target.value === 'public' }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-blue-600 dark:focus:ring-blue-900/30"
                >
                  <option value="private">Private (owner only)</option>
                  <option value="public">Public (anyone can access)</option>
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Description</span>
              <textarea
                value={payload.description ?? ''}
                onChange={(event) => setPayload((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-600 dark:focus:ring-blue-900/30"
                placeholder="Short summary to help others understand this resource"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span>Enable AI generation</span>
                <input
                  type="checkbox"
                  checked={Boolean(payload.aiToggleEnabled)}
                  onChange={(event) => setPayload((prev) => ({ ...prev, aiToggleEnabled: event.target.checked }))}
                  className="h-4 w-4"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Tags</span>
              <input
                type="text"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="Comma separated values (e.g. anatomy, revision, pdf)"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-600 dark:focus:ring-blue-900/30"
              />
            </label>

            <div>
              <label
                htmlFor="material-upload"
                className="group flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-blue-50/30 px-6 py-10 text-center transition-all duration-200 hover:border-blue-400 hover:from-blue-50 hover:to-blue-100/50 dark:border-slate-600 dark:from-slate-800 dark:to-slate-900 dark:hover:border-blue-500/60 dark:hover:from-slate-800 dark:hover:to-blue-950/30"
              >
                <div className="rounded-2xl bg-white p-4 shadow-sm transition-all duration-200 group-hover:shadow-md dark:bg-slate-900">
                  <FileUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <p className="font-semibold">Drag & drop or click to attach a file</p>
                  <p className="text-xs">PDF, DOCX, PPTX, and media files up to 100MB.</p>
                </div>
                {payload.file && (
                  <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
                    <FileUp className="h-4 w-4" />
                    {payload.file.name}
                  </div>
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
                <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  File size: {(payload.file.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-xs font-bold dark:bg-red-900">!</span>
                <p>{error}</p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={closeDrawer}
                disabled={submitting}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-600/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-blue-900/50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                <span>{submitting ? 'Uploading…' : 'Upload material'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UploadDrawer
