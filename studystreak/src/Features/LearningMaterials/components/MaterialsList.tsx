import { Fragment, useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import {
	Download,
	Eye,
	FileArchive,
	FileAudio2,
	FileImage,
	FileText,
	FileType2,
	Heart,
	Loader2,
	ShieldCheck,
	Sparkles,
	UserCircle,
} from 'lucide-react'

import { useAuth } from '@/Auth/hooks/useAuth'
import { apiClient, ApiError } from '@/lib/apiClient'

import MaterialPreviewModal, { type LearningMaterial, type SectionKey } from './MaterialPreviewModal'

type MaterialsListProps = {
	filter: SectionKey
	searchQuery: string
	onUploadClick: () => void
	refreshKey: number
}

type FetchState = 'idle' | 'loading' | 'error' | 'ready'

type ActionKind = 'like' | 'download'

type IconDescriptor = {
	Icon: ComponentType<{ className?: string }>
	accent: string
	badge: string
}

interface SignedUrlResponse {
	signed_url?: string
}

const cardIconMap: Array<{ matcher: (material: LearningMaterial) => boolean; icon: IconDescriptor }> = [
	{
		matcher: (material) => (material.content_type ?? '').includes('pdf') || material.title.toLowerCase().endsWith('.pdf'),
		icon: { Icon: FileText, accent: 'bg-gradient-to-br from-blue-500 to-indigo-600', badge: 'PDF' },
	},
	{
		matcher: (material) =>
			['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].some((ext) => material.title.toLowerCase().endsWith(`.${ext}`)) ||
			(material.content_type ?? '').includes('presentation') ||
			(material.content_type ?? '').includes('msword'),
		icon: { Icon: FileType2, accent: 'bg-gradient-to-br from-purple-500 to-pink-600', badge: 'Office' },
	},
	{
		matcher: (material) => (material.content_type ?? '').startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(material.title),
		icon: { Icon: FileImage, accent: 'bg-gradient-to-br from-emerald-500 to-teal-500', badge: 'Image' },
	},
	{
		matcher: (material) => (material.content_type ?? '').startsWith('audio/'),
		icon: { Icon: FileAudio2, accent: 'bg-gradient-to-br from-orange-500 to-amber-500', badge: 'Audio' },
	},
	{
		matcher: (material) => (material.content_type ?? '').startsWith('video/'),
		icon: { Icon: Eye, accent: 'bg-gradient-to-br from-rose-500 to-red-500', badge: 'Video' },
	},
	{
		matcher: () => true,
		icon: { Icon: FileArchive, accent: 'bg-gradient-to-br from-slate-500 to-slate-700', badge: 'Asset' },
	},
]

const emptyStateMessages: Record<SectionKey, string> = {
	all: 'No learning materials found yet. Refresh or upload the first resource for the community.',
	my: 'You have not uploaded anything yet. Share a PDF, deck, or notes to kick things off.',
	community: 'The community library is empty. Encourage peers to contribute or upload something yourself.',
	official: 'Official cohorts have not published materials for this filter yet.',
}

const formatCount = (value?: number | null) => new Intl.NumberFormat('en', { notation: 'compact' }).format(value ?? 0)

const resolveIcon = (material: LearningMaterial): IconDescriptor => {
	const found = cardIconMap.find((entry) => entry.matcher(material))
	return found?.icon ?? cardIconMap[cardIconMap.length - 1]!.icon
}

const buildQueryString = (options: { filter: SectionKey; searchQuery: string; userId?: string | null }) => {
	const params = new URLSearchParams()
	params.set('filter', options.filter)
	const trimmedSearch = options.searchQuery.trim()
	if (trimmedSearch !== '') {
		params.set('search', trimmedSearch)
	}
	if (options.userId) {
		params.set('user_id', options.userId)
	}
	return params.toString()
}

const normalizeMaterial = (raw: LearningMaterial): LearningMaterial => ({
	...raw,
	like_count: typeof raw.like_count === 'number' ? raw.like_count : 0,
	download_count: typeof raw.download_count === 'number' ? raw.download_count : 0,
	tags: Array.isArray(raw.tags) ? raw.tags : [],
})

const MaterialsList = ({ filter, searchQuery, onUploadClick, refreshKey }: MaterialsListProps) => {
	const { user } = useAuth()

	const [materials, setMaterials] = useState<LearningMaterial[]>([])
	const [state, setState] = useState<FetchState>('idle')
	const [fetchError, setFetchError] = useState<string | null>(null)
	const [selectedMaterial, setSelectedMaterial] = useState<LearningMaterial | null>(null)
	const [actionPending, setActionPending] = useState<Record<string, Partial<Record<ActionKind, boolean>>>>({})
	const [actionMessage, setActionMessage] = useState<string | null>(null)

	const recordActionPending = useCallback((id: string, kind: ActionKind, pending: boolean) => {
		setActionPending((prev) => ({
			...prev,
			[id]: {
				...(prev[id] ?? {}),
				[kind]: pending,
			},
		}))
	}, [])

	useEffect(() => {
		const abortController = new AbortController()
		let cancelled = false

		const fetchMaterials = async () => {
			setState('loading')
			setFetchError(null)

			try {
				const queryString = buildQueryString({ filter, searchQuery, userId: user?.id ?? null })
				const path = queryString ? `/api/learning-materials?${queryString}` : '/api/learning-materials'
				const response = await apiClient.get<LearningMaterial[]>(path, { signal: abortController.signal })
				if (cancelled) {
					return
				}
				setMaterials(Array.isArray(response) ? response.map(normalizeMaterial) : [])
				setState('ready')
			} catch (error) {
				if (cancelled) {
					return
				}
				console.error('Failed to load learning materials', error)
				let message = 'Unable to load learning materials right now.'
				if (error instanceof ApiError) {
					const details = typeof error.payload === 'object' && error.payload !== null ? String((error.payload as { error?: string }).error ?? '') : ''
					if (details) {
						message = details
					} else if (error.message) {
						message = error.message
					}
				} else if (error instanceof Error && error.message) {
					message = error.message
				}
				setFetchError(message)
				setState('error')
			}
		}

		void fetchMaterials()

		return () => {
			cancelled = true
			abortController.abort()
		}
	}, [filter, searchQuery, refreshKey, user?.id])

	const handlePreview = useCallback((material: LearningMaterial) => {
		setSelectedMaterial(material)
	}, [])

	const updateMaterialCount = useCallback((materialId: string, key: 'like_count' | 'download_count', delta: number) => {
		setMaterials((prev) =>
			prev.map((item) =>
				item.material_id === materialId
					? {
							...item,
							[key]: Math.max(0, (item[key] ?? 0) + delta),
						}
					: item,
			),
		)
	}, [])

	const handleLike = useCallback(
		async (material: LearningMaterial) => {
			const { material_id: materialId } = material
			if (actionPending[materialId]?.like) {
				return
			}

			recordActionPending(materialId, 'like', true)
			updateMaterialCount(materialId, 'like_count', 1)

			try {
				await apiClient.post(`/api/learning-materials/${materialId}/like`)
				setActionMessage('Thanks for the feedback!')
			} catch (error) {
				console.error('Failed to like material', error)
				updateMaterialCount(materialId, 'like_count', -1)
				setActionMessage('We could not register your like. Please try again.')
			} finally {
				recordActionPending(materialId, 'like', false)
			}
		},
		[actionPending, recordActionPending, updateMaterialCount],
	)

	const resolveDownloadUrl = useCallback(async (material: LearningMaterial): Promise<string | null> => {
		if (material.file_url) {
			return material.file_url
		}
		try {
			const signed = await apiClient.get<SignedUrlResponse>(`/api/learning-materials/${material.material_id}/signed-url`)
			if (signed && typeof signed.signed_url === 'string') {
				return signed.signed_url
			}
		} catch (error) {
			console.error('Failed to generate signed URL', error)
			setActionMessage('Could not generate a download link. Try again shortly.')
		}
		return null
	}, [])

const handleDownload = useCallback(
  async (material: LearningMaterial) => {
    const materialId = material.material_id
    if (actionPending[materialId]?.download) {
      return
    }

    recordActionPending(materialId, 'download', true)

    try {
      const url = await resolveDownloadUrl(material)
      if (!url) {
        throw new Error('No download URL available')
      }

      // Use a hidden anchor tag instead of window.open
      const a = document.createElement('a')
      a.href = url
      a.download = material.title // Suggest filename for download
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      await apiClient.post(`/api/learning-materials/${materialId}/download`)
      updateMaterialCount(materialId, 'download_count', 1)
      setActionMessage('Download started. Enjoy the material!')
    } catch (error) {
      console.error('Failed to process download', error)
      setActionMessage('Unable to start the download. Please retry.')
    } finally {
      recordActionPending(materialId, 'download', false)
    }
  },
  [actionPending, recordActionPending, resolveDownloadUrl, updateMaterialCount],
)

	useEffect(() => {
		if (!actionMessage) {
			return
		}
		const timeout = window.setTimeout(() => setActionMessage(null), 4000)
		return () => window.clearTimeout(timeout)
	}, [actionMessage])

	const cards = useMemo(() => materials.map(normalizeMaterial), [materials])

	const renderCard = (material: LearningMaterial) => {
		const iconConfig = resolveIcon(material)
		const likeBusy = actionPending[material.material_id]?.like ?? false
		const downloadBusy = actionPending[material.material_id]?.download ?? false

		return (
			<article
				key={material.material_id}
				className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700/60 dark:bg-slate-900/70"
			>
				<div className="flex flex-col gap-4">
					<div className="flex items-start justify-between gap-3">
						<div className="flex items-center gap-3">
							<span className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg ${iconConfig.accent}`}>
								<iconConfig.Icon className="h-6 w-6" aria-hidden />
							</span>
							<div className="space-y-1">
								<h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">{material.title}</h3>
								<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
									<span title="Uploader" className="inline-flex items-center gap-1">
										<UserCircle className="h-3.5 w-3.5" />
										{material.user_name ? `@${material.user_name}` : 'Unknown uploader'}
									</span>
									<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-300">
										{iconConfig.badge}
									</span>
									{material.category && (
										<span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
											{material.category}
										</span>
									)}
									{material.is_public && (
										<span title="Public material" className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
											<ShieldCheck className="h-3.5 w-3.5" />
											Public
										</span>
									)}
								</div>
							</div>
						</div>
						<button
							type="button"
							onClick={() => handlePreview(material)}
							className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition hover:bg-blue-700"
						>
							<Eye className="h-4 w-4" />
							Preview
						</button>
					</div>

					{material.description && (
						<p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{material.description}</p>
					)}

					{material.tags && material.tags.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{material.tags.slice(0, 6).map((tag) => (
								<span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
									#{tag}
								</span>
							))}
							{material.tags.length > 6 && (
								<span className="text-xs text-slate-400">+{material.tags.length - 6} more</span>
							)}
						</div>
					)}
				</div>

				<div className="mt-4 space-y-4">
					<div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
						<span className="inline-flex items-center gap-1" title="Likes">
							<Heart className="h-3.5 w-3.5 text-rose-500" aria-hidden />
							{formatCount(material.like_count)} likes
						</span>
						<span className="inline-flex items-center gap-1" title="Downloads">
							<Download className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
							{formatCount(material.download_count)} downloads
						</span>
						<span className="inline-flex items-center gap-1" title="AI quiz readiness">
							<Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
							{material.ai_quiz_generated ? 'AI quiz ready' : 'Quiz not generated'}
						</span>
					</div>

					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => handleDownload(material)}
							disabled={downloadBusy}
							className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{downloadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
							Download
						</button>
						<button
							type="button"
							onClick={() => handleLike(material)}
							disabled={likeBusy}
							className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-500 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-600/60 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/40"
						>
							{likeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
							Like
						</button>
					</div>
				</div>
			</article>
		)
	}

	return (
		<section className="surface-section space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-white">Learning materials</h2>
					<p className="text-sm text-slate-500 dark:text-slate-300">
						Discover curated resources from your cohort and community with secure previews and engagement insights.
					</p>
				</div>
				<button
					type="button"
					onClick={onUploadClick}
					className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
				>
					<Download className="h-4 w-4" />
					Upload new material
				</button>
			</div>

			{state === 'loading' && (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{Array.from({ length: 6 }).map((_, index) => (
						<div
							key={index}
							className="h-48 animate-pulse rounded-2xl border border-slate-200/70 bg-white/60 dark:border-slate-800/60 dark:bg-slate-900/40"
						/>
					))}
				</div>
			)}

			{state === 'error' && fetchError && (
				<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200">
					{fetchError}
				</div>
			)}

			{state === 'ready' && cards.length === 0 && (
				<div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
					<FileText className="h-8 w-8 text-slate-400" />
					<p className="max-w-md text-sm">{emptyStateMessages[filter]}</p>
					<button
						type="button"
						onClick={onUploadClick}
						className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
					>
						Share a material
					</button>
				</div>
			)}

			{cards.length > 0 && (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{cards.map((material) => (
						<Fragment key={material.material_id}>{renderCard(material)}</Fragment>
					))}
				</div>
			)}

			<MaterialPreviewModal
				isOpen={Boolean(selectedMaterial)}
				material={selectedMaterial}
				onClose={() => setSelectedMaterial(null)}
				onDownload={handleDownload}
			/>

			{actionMessage && (
				<div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-lg">
					{actionMessage}
				</div>
			)}
		</section>
	)
}

export default MaterialsList

