import React, { useMemo } from 'react'
import { Download, ExternalLink, X } from 'lucide-react'
import type { LearningMaterial } from './MaterialsList'

interface MaterialPreviewModalProps {
  material: LearningMaterial
  onClose: () => void
}

const buildViewerUrl = (fileUrl: string, contentType: string | undefined): string => {
  const normalizedType = contentType?.toLowerCase() ?? ''
  const lowerUrl = fileUrl.toLowerCase()
  const isPowerPoint =
    normalizedType.includes('presentation') || lowerUrl.endsWith('.ppt') || lowerUrl.endsWith('.pptx')

  if (isPowerPoint) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
  }

  return fileUrl
}

const MaterialPreviewModal: React.FC<MaterialPreviewModalProps> = ({ material, onClose }) => {
  const fileUrl = material.file_url

  const viewerUrl = useMemo(() => {
    if (!fileUrl) {
      return null
    }
    return buildViewerUrl(fileUrl, material.content_type)
  }, [fileUrl, material.content_type])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{material.title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {material.user_name ? `Shared by @${material.user_name}` : 'Shared material preview'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {viewerUrl && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner dark:border-slate-700 dark:bg-slate-800">
              <iframe
                title={`Preview of ${material.title}`}
                src={viewerUrl}
                className="h-[70vh] w-full border-0"
                allowFullScreen
              />
            </div>
          )}

          {!viewerUrl && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200">
              Preview is unavailable for this material. Try downloading it instead.
            </div>
          )}

          {material.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300">{material.description}</p>
          )}

          {fileUrl && (
            <div className="flex flex-wrap gap-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pill-tab-active inline-flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in new tab
              </a>
              <a
                href={fileUrl}
                download
                className="pill-tab inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MaterialPreviewModal
