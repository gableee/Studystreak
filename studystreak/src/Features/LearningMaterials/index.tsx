import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { BookOpen, FolderOpen, Users, Layers, Search, Plus } from 'lucide-react'
import FileUpload from './components/FileUpload'
import MaterialsList from './components/MaterialsList'

type SectionKey = 'all' | 'my' | 'community' | 'official'

const materialSections: Array<{
  key: SectionKey
  label: string
  caption: string
  icon: LucideIcon
  borderColor: string
  borderColorActive: string
  activeGradient: string
}> = [
  {
    key: 'all',
    label: 'All collections',
    caption: 'Show official, community, and personal libraries together',
    icon: Layers,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    borderColorActive: 'rgba(148, 163, 184, 0.75)',
    activeGradient: 'from-slate-500/80 to-slate-700/80',
  },
  {
    key: 'my',
    label: 'My materials',
    caption: 'Personal uploads with AI-generated support',
    icon: FolderOpen,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderColorActive: 'rgba(236, 72, 153, 0.6)',
    activeGradient: 'from-purple-500/80 to-pink-500/80',
  },
  {
    key: 'community',
    label: 'Community library',
    caption: 'Shared notes, flashcards, and collaborative resources',
    icon: Users,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderColorActive: 'rgba(16, 185, 129, 0.65)',
    activeGradient: 'from-emerald-500/80 to-teal-500/80',
  },
  {
    key: 'official',
    label: 'Official courses',
    caption: 'Faculty-curated modules with synced progress',
    icon: BookOpen,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderColorActive: 'rgba(59, 130, 246, 0.7)',
    activeGradient: 'from-blue-500/80 to-indigo-500/80',
  },
]

const LearningMaterials = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadSuccess = () => {
    setShowUploadModal(false)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-8 pb-12">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-purple-500/20 via-transparent to-transparent blur-3xl" aria-hidden />

      <header className="surface-section relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-transparent to-purple-500/15" aria-hidden />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-3">
              <span className="badge badge-info uppercase tracking-wide">Curated hub</span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Discover materials tailored to every way you learn
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
                Compare hospital rotations with architecture studios and data labs, organized with inclusive language and built-in accessibility.
              </p>
            </div>
            <button onClick={() => setShowUploadModal(true)} className="pill-tab-active inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Upload material
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by subject, accessibility tag, or cohort..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-3xl border border-white/20 bg-white/80 py-3 pl-12 pr-4 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
            />
          </div>
        </div>
      </header>

      <section className="surface-section space-y-4">
        <div className="flex flex-wrap gap-3">
          {materialSections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.key

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={`inline-flex min-w-[12rem] flex-1 flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? `bg-gradient-to-r ${section.activeGradient} text-white shadow-lg`
                    : 'bg-white/75 text-slate-600 hover:shadow-md dark:bg-white/5 dark:text-slate-200'
                }`}
                style={{ borderColor: isActive ? section.borderColorActive : section.borderColor }}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4" />
                  {section.label}
                </span>
                <span className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-300'}`}>
                  {section.caption}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <MaterialsList
        filter={activeSection}
        searchQuery={searchQuery}
        onUploadClick={() => setShowUploadModal(true)}
        refreshKey={refreshKey}
      />

      {showUploadModal && (
        <FileUpload onUploadSuccess={handleUploadSuccess} onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  )
}

export default LearningMaterials
