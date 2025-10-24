import { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, ExternalLink, Loader2, X } from 'lucide-react'

import { apiClient } from '@/lib/apiClient'

import type { CachedLearningMaterial, LearningMaterial, SignedUrlResponse } from '../types'

type PreviewKind = 'pdf' | 'office' | 'image' | 'other'

interface MaterialPreviewModalProps {
	isOpen: boolean
	material: CachedLearningMaterial | null
	onClose: () => void
	onDownload: (material: CachedLearningMaterial) => Promise<void> | void
	onResolvedUrl?: (materialId: string, resolvedUrl: string) => void
}

const officeViewerBase = 'https://view.officeapps.live.com/op/embed.aspx'

const fallbackDescriptions: Record<PreviewKind, string> = {
	pdf: 'Previewing PDF via secure streaming',
	office: 'Previewing Office file through Microsoft Office Online',
	image: 'Rendering image asset directly',
	other: 'Preview not available for this file type',
}

function detectPreviewKind(material: LearningMaterial | null): PreviewKind {
	if (!material) {
		return 'other'
	}

	const normalizedType = (material.content_type ?? material.content_type_label ?? '').toLowerCase()
	const ext = material.title?.split('.').pop()?.toLowerCase() ?? ''

	if (normalizedType.includes('pdf') || ext === 'pdf') {
		return 'pdf'
	}

	if (
		normalizedType.includes('presentation') ||
		normalizedType.includes('ms-powerpoint') ||
		normalizedType.includes('msword') ||
		normalizedType.includes('spreadsheet') ||
		['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)
	) {
		return 'office'
	}

	if (normalizedType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
		return 'image'
	}

	return 'other'
}

async function fetchSignedUrl(materialId: string): Promise<string | null> {
	try {
		const response = await apiClient.get<SignedUrlResponse>(`/api/learning-materials/${materialId}/signed-url`)
		if (response && typeof response === 'object') {
			if ('signed_url' in response && typeof response.signed_url === 'string') {
				return response.signed_url
			}
		}
	} catch (error) {
		console.error('Failed to fetch signed URL', error)
	}

	return null
}

const motionBackDrop = {
	hidden: { opacity: 0 },
	visible: { opacity: 1 },
	exit: { opacity: 0 },
}

const motionContent = {
	hidden: { opacity: 0, scale: 0.96, y: 16 },
	visible: { opacity: 1, scale: 1, y: 0 },
	exit: { opacity: 0, scale: 0.96, y: 12 },
}

const loaderMarkup = (
	<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/20 text-slate-200">
		<Loader2 className="h-6 w-6 animate-spin" aria-hidden />
		<p className="text-xs font-medium uppercase tracking-wide">Loading preview</p>
	</div>
)

const unsupportedMarkup = (
	<div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-slate-300">
		<p className="text-sm font-medium">Preview not available for this file type yet.</p>
		<p className="text-xs max-w-sm text-slate-400 dark:text-slate-400">
			Use the download button to view this material in its native application. The team is preparing
			richer previews via Context7 MCP analytics.
		</p>
	</div>
)

const MaterialPreviewModal = ({ isOpen, material, onClose, onDownload, onResolvedUrl }: MaterialPreviewModalProps) => {
	const previewKind = useMemo(() => detectPreviewKind(material), [material])

	const authorLabel = useMemo(() => {
		if (!material) return null
		const meta = material as unknown as Record<string, unknown>
		if (typeof material.user_name === 'string' && material.user_name.trim() !== '') return material.user_name.trim()
		if (typeof meta['uploader_name'] === 'string' && (meta['uploader_name'] as string).trim() !== '') return (meta['uploader_name'] as string).trim()
		if (typeof meta['uploader_email'] === 'string' && (meta['uploader_email'] as string).trim() !== '') return ((meta['uploader_email'] as string).split('@')[0]).trim()
		if (typeof meta['provider'] === 'string' && (meta['provider'] as string).trim() !== '') return (meta['provider'] as string).trim()
		if (typeof meta['source'] === 'string' && (meta['source'] as string).trim() !== '') return (meta['source'] as string).trim()
		return null
	}, [material])

	const displayAuthor = useMemo(() => {
		if (!authorLabel) return null
		if (material && material.user_name && authorLabel === material.user_name) {
			return `@${authorLabel}`
		}
		return authorLabel
	}, [authorLabel, material])

	const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
	const [isResolvingUrl, setIsResolvingUrl] = useState(false)
	const [isContentLoading, setIsContentLoading] = useState(true)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const resetState = useCallback(() => {
		setResolvedUrl(null)
		setIsResolvingUrl(false)
		setIsContentLoading(true)
		setErrorMessage(null)
	}, [])

	useEffect(() => {
		if (!isOpen || !material) {
			resetState()
			return
		}

		resetState()

		if (previewKind === 'pdf') {
			let cancelled = false
			const resolvePdf = async () => {
				setIsResolvingUrl(true)
				try {
					// Prefer any resolved_url attached to the material (prefetched by the list view)
					const preResolved = material.resolved_url
					if (preResolved) {
						setResolvedUrl(preResolved)
						setIsContentLoading(true)
						return
					}
					const signed = await fetchSignedUrl(material.material_id)
					if (cancelled) {
						return
					}
					if (signed) {
						setResolvedUrl(signed)
						setIsContentLoading(true)
					} else {
						setErrorMessage('Unable to generate a preview link for this material.')
						setIsContentLoading(false)
					}
				} catch (error) {
					console.error('Failed to resolve PDF signed URL', error)
					if (!cancelled) {
						setErrorMessage('Unable to generate a preview link for this material.')
						setIsContentLoading(false)
					}
				} finally {
					if (!cancelled) {
						setIsResolvingUrl(false)
					}
				}
			}

			void resolvePdf()

			return () => {
				cancelled = true
			}
		}

		// Prefer a prefetched resolved_url attached to the material
		const preResolved = material.resolved_url?.trim() ?? null
		if (preResolved) {
			setResolvedUrl(preResolved)
			setIsContentLoading(true)
			return
		}

		const immediateUrl = material.file_url?.trim() ?? null
		if (immediateUrl) {
			setResolvedUrl(immediateUrl)
			setIsContentLoading(true)
			return
		}

		let cancelled = false
		const resolveUrl = async () => {
			setIsResolvingUrl(true)
			try {
				const url = await fetchSignedUrl(material.material_id)
				if (cancelled) {
					return
				}
				if (url) {
					setResolvedUrl(url)
					setIsContentLoading(true)
				} else {
					setErrorMessage('Unable to generate a preview link for this material.')
					setIsContentLoading(false)
				}
			} catch (error) {
				console.error('Failed to resolve signed URL', error)
				if (!cancelled) {
					setErrorMessage('Unable to generate a preview link for this material.')
					setIsContentLoading(false)
				}
			} finally {
				if (!cancelled) {
					setIsResolvingUrl(false)
				}
			}
		}

		void resolveUrl()

		return () => {
			cancelled = true
		}
	}, [isOpen, material, previewKind, resetState])

	useEffect(() => {
		if (!isOpen) {
			return
		}
		if (previewKind === 'pdf' || previewKind === 'office') {
			setIsContentLoading(true)
		}
	}, [previewKind, isOpen, resolvedUrl])

	useEffect(() => {
		if (!material || !resolvedUrl || !onResolvedUrl) {
			return
		}
		if (material.resolved_url === resolvedUrl) {
			return
		}
		onResolvedUrl(material.material_id, resolvedUrl)
	}, [material, resolvedUrl, onResolvedUrl])

	const handleClose = () => {
		onClose()
	}

	const handleDownloadClick = async () => {
		if (material) {
			await onDownload(material)
		}
	}

	const handleContentLoaded = () => {
		setIsContentLoading(false)
	}

	const officeSrc = useMemo(() => {
		if (previewKind !== 'office' || !resolvedUrl) {
			return null
		}
		const srcParam = encodeURIComponent(resolvedUrl)
		return `${officeViewerBase}?src=${srcParam}&wdEmbedCode=0`
	}, [previewKind, resolvedUrl])

	// Helper values for rendering
	const uploaderEmail = useMemo(() => {
		if (!material) return null
		const meta = material as unknown as Record<string, unknown>
		if (typeof meta['uploader_email'] === 'string') return (meta['uploader_email'] as string).trim()
		return null
	}, [material])

	return (
		<AnimatePresence>
			{isOpen && material && (
				<motion.div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
					initial="hidden"
					animate="visible"
					exit="exit"
					variants={motionBackDrop}
				>
			<motion.div
				className="relative flex max-h-[90vh] w-full max-w-3xl sm:max-w-4xl md:max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900 text-white shadow-2xl"
						initial="hidden"
						animate="visible"
						exit="exit"
						variants={motionContent}
						transition={{ duration: 0.2, ease: 'easeOut' }}
						role="dialog"
						aria-modal="true"
						aria-labelledby="material-preview-title"
					>
						<header className="flex flex-col gap-3 border-b border-white/10 bg-slate-900/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="space-y-1">
								<h2 id="material-preview-title" className="text-lg font-semibold text-white">
									{material.title}
								</h2>
								<p className="text-xs text-slate-400">{fallbackDescriptions[previewKind]}</p>
								<div className="flex items-center gap-3">
									<div className="flex flex-col">
										{displayAuthor ? (
											<p className="text-xs text-slate-400">By {displayAuthor}</p>
										) : (
											<p className="text-xs text-slate-400">Uploader: Unknown</p>
										)}
										{/* show uploader email when available so viewers know who to contact */}
										{uploaderEmail && (
											<a href={`mailto:${uploaderEmail}`} className="text-xs text-slate-300 hover:underline">
												{uploaderEmail}
											</a>
										)}
									</div>
									<div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
										{material.category && (
											<span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
												{material.category}
											</span>
										)}
										{Array.isArray(material.tags) && material.tags.length > 0 && (
											<span className="hidden items-center gap-1 sm:flex">
												Tags:
												<span className="truncate">
													{material.tags.slice(0, 3).join(', ')}
													{material.tags.length > 3 ? '…' : ''}
												</span>
											</span>
										)}
									</div>
								</div>
							</div>

							<div className="flex flex-shrink-0 items-center gap-2 self-start sm:self-center">
								<button
									type="button"
									onClick={handleDownloadClick}
									className="inline-flex items-center gap-2 rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
									title="Download"
								>
									<Download className="h-4 w-4" />
									Download
								</button>

								{resolvedUrl && (
									<a
										href={previewKind === 'pdf' ? resolvedUrl : material.file_url ?? resolvedUrl}
										target="_blank"
										rel="noreferrer noopener"
										className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
									>
										<ExternalLink className="h-4 w-4" />
										Open in new tab
									</a>
								)}

								<button
									type="button"
									onClick={handleClose}
									className="rounded-full bg-slate-800/80 p-2 text-slate-200 transition hover:bg-slate-700"
									aria-label="Close preview"
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						</header>

						<div className="relative flex-1 overflow-auto bg-slate-950">
							{errorMessage && (
								<div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-300">
									<p className="text-sm font-medium">{errorMessage}</p>
									<p className="text-xs text-slate-500">Try downloading the material instead while we look into this preview type.</p>
								</div>
							)}

						{!errorMessage && previewKind === 'pdf' && resolvedUrl && (
							<iframe
								src={resolvedUrl}
								title="Material PDF preview"
								className="size-full border-0"
								onLoad={handleContentLoaded}
								// Keep the sandbox restrictive for untrusted content. PDFs do not
								// require script execution. Avoid allow-same-origin + allow-scripts
								// combinations for uploaded files.
								sandbox=""
							/>
						)}

							{!errorMessage && previewKind === 'office' && officeSrc && (
								<iframe
									src={officeSrc}
									title="Office document preview"
									className="size-full border-0"
									onLoad={handleContentLoaded}
									sandbox="allow-scripts allow-forms allow-popups"
								/>
							)}

							{!errorMessage && previewKind === 'image' && resolvedUrl && (
								<img
									src={resolvedUrl}
									alt={material.title}
									className="mx-auto h-full w-auto object-contain"
									onLoad={handleContentLoaded}
									onError={() => setErrorMessage('Unable to load the image preview at this time.')}
								/>
							)}

							{!errorMessage && previewKind === 'other' && unsupportedMarkup}

							{isContentLoading && !errorMessage && (isResolvingUrl || previewKind !== 'other') && loaderMarkup}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

export default MaterialPreviewModal

