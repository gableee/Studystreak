import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X, ZoomIn, ZoomOut, Download, Loader2 } from 'lucide-react'
import { requestSignedUrl } from '../api'

type PDFViewerState = {
  url: string | null
  loading: boolean
  error: string | null
  currentPage: number
  totalPages: number
  zoom: number
}

/**
 * Full-screen PDF viewer with navigation controls
 * Supports zoom, page navigation, and scroll/time tracking hooks for future analytics (future development)
 */
export function PDFViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<PDFViewerState>({
    url: null,
    loading: true,
    error: null,
    currentPage: 1,
    totalPages: 0,
    zoom: 100
  })

  // Track time spent on page (for future analytics)
  const startTimeRef = useRef<number>(Date.now())
  const scrollEventsRef = useRef<number>(0)

  useEffect(() => {
    if (!id) {
      setState(prev => ({ ...prev, loading: false, error: 'Material ID not provided' }))
      return
    }

    let cancelled = false

    requestSignedUrl(id, 'preview')
      .then((response) => {
        if (cancelled) return
        setState(prev => ({ ...prev, url: response.signed_url, loading: false }))
      })
      .catch((error) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Unable to load PDF'
        setState(prev => ({ ...prev, loading: false, error: message }))
      })

    return () => {
      cancelled = true
      // Log analytics on unmount (future: send to backend)
      const startTime = startTimeRef.current
      const timeSpent = Math.floor((Date.now() - startTime) / 1000)
      console.log(`[Analytics] Material ${id}: ${timeSpent}s spent, ${scrollEventsRef.current} scroll events`)
    }
  }, [id])

  // Track scroll events (for future engagement metrics)
  useEffect(() => {
    const handleScroll = () => {
      scrollEventsRef.current += 1
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleZoomIn = () => {
    setState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 10, 200) }))
  }

  const handleZoomOut = () => {
    setState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 10, 50) }))
  }

  const handleDownload = () => {
    if (state.url) {
      const link = document.createElement('a')
      link.href = state.url
      link.download = `material-${id}.pdf`
      link.target = '_blank'
      link.rel = 'noopener,noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleClose = () => {
    navigate(-1)
  }

  if (state.loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-400">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (state.error || !state.url) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <p className="text-lg text-slate-300">{state.error || 'Failed to load PDF'}</p>
          <button
            onClick={handleClose}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Top toolbar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close viewer"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-slate-300">PDF Viewer</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1">
            <button
              onClick={handleZoomOut}
              className="rounded p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
              disabled={state.zoom <= 50}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center text-xs text-slate-300">
              {state.zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="rounded p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
              disabled={state.zoom >= 200}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </header>

      {/* PDF content area */}
      <div className="relative flex-1 overflow-auto bg-slate-900">
        <div 
          className="flex min-h-full items-center justify-center p-4"
          style={{ transform: `scale(${state.zoom / 100})`, transformOrigin: 'top center' }}
        >
          <iframe
            ref={iframeRef}
            src={state.url}
            title="PDF Document"
            className="h-[calc(100vh-5rem)] w-full max-w-5xl rounded-lg border border-slate-700 bg-white shadow-2xl"
            style={{ minHeight: '800px' }}
          />
        </div>
      </div>

      {/* Future: Add page navigation for PDF.js integration */}
      {/* <div className="flex items-center justify-center gap-4 border-t border-slate-800 bg-slate-900/95 px-4 py-2">
        <button className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm text-slate-300">Page {state.currentPage} of {state.totalPages}</span>
        <button className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div> */}
    </div>
  )
}

export default PDFViewerPage
