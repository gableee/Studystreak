import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, X, Download, BookOpen } from 'lucide-react'
import { requestSignedUrl } from '../api'
import type { LearningMaterial } from '../types'

type FilePreviewModalProps = {
  material: LearningMaterial | null
  onClose: () => void
}

type PreviewState = {
  url: string | null
  loading: boolean
  error: string | null
}

const initialState = (): PreviewState => ({
  url: null,
  loading: false,
  error: null,
})

export function FilePreviewModal({ material, onClose }: FilePreviewModalProps) {
  const [state, setState] = useState<PreviewState>(initialState)

  useEffect(() => {
    if (!material) {
      setState(initialState())
      return
    }

    if (material.resolved_url) {
      setState({ url: material.resolved_url, loading: false, error: null })
      return
    }

    let cancelled = false
    setState({ url: null, loading: true, error: null })

    requestSignedUrl(material.id, 'preview')
      .then((response) => {
        if (cancelled) return
        setState({ url: response.signed_url, loading: false, error: null })
      })
      .catch((error) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Unable to load preview'
        setState({ url: null, loading: false, error: message })
      })

    return () => {
      cancelled = true
    }
  }, [material])

  if (!material) return null

  const { url, loading, error } = state
  const isPdf = material.mime?.includes('pdf') ?? false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="surface-card relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl dark:border-slate-700/60 dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{material.title}</h2>
            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {material.mime ?? 'Unknown type'} · {material.file_name ?? 'No filename'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (url) {
                  window.open(url, '_blank', 'noopener,noreferrer')
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-slate-600 dark:text-slate-200"
              disabled={!url}
            >
              <ExternalLink className="h-4 w-4" />
              Open in new tab
            </button>
            <button
              type="button"
              onClick={() => {
                if (url) {
                  const link = document.createElement('a')
                  link.href = url
                  link.download = material.file_name || material.title
                  link.target = '_blank'
                  link.rel = 'noopener,noreferrer'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-md transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
              disabled={!url}
            >
              <Download className="h-4 w-4" />
              Download
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-transparent p-2 text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          {loading && (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating preview…
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center text-sm text-slate-500 dark:text-slate-300">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  setState({ url: null, loading: true, error: null })
                  requestSignedUrl(material.id, 'preview')
                    .then((response) => {
                      setState({ url: response.signed_url, loading: false, error: null })
                    })
                    .catch((err) => {
                      const message = err instanceof Error ? err.message : 'Unable to load preview'
                      setState({ url: null, loading: false, error: message })
                    })
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-600 dark:text-slate-200"
              >
                Retry preview
              </button>
            </div>
          )}

          {!loading && !error && url && (
            <div className="flex flex-1 flex-col">
              {isPdf ? (
                <iframe src={url} title={`Preview ${material.title}`} className="flex-1" />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center text-sm text-slate-500 dark:text-slate-300">
                  <p>Preview is not available for this file type.</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FilePreviewModal
