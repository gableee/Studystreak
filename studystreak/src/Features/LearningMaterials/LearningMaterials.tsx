/**
 * Learning Materials
 * Purpose: Central hub for all learning content
 * Sections:
 * - Official Courses: Admin-provided modules with progress tracking bars
 * - Community Library: User-shared notes, flashcards, or summaries with upvote system
 * - My Materials: Personal uploads with AI-generated quizzes or summaries
 * - Search & Discover: Filter by subject, difficulty, or tag
/**
 * Learning Materials
 * Purpose: Central hub for all learning content
 * Sections:
 * - Official Courses: Admin-provided modules with progress tracking bars
 * - Community Library: User-shared notes, flashcards, or summaries with upvote system
 * - My Materials: Personal uploads with AI-generated quizzes or summaries
 * - Search & Discover: Filter by subject, difficulty, or tag
 * Design: card-based layout with thumbnails, file type icons, and floating search bar.
 * @module Features/LearningMaterials
 */

import { useState } from 'react'

import {
  BookOpen,
  FileText,
  Filter,
  FolderOpen,
  Layers,
  ListFilter,
  Plus,
  Search,
  Users,
  Wand2,
} from 'lucide-react'

const learningFilters = [
  { label: 'All resources', active: true },
  { label: 'Health sciences' },
  { label: 'Built environment' },
  { label: 'Creative studios' },
  { label: 'Data & analytics' },
  { label: 'Saved offline' },
]

const communityFilters = [
  'All topics',
  'Computer science',
  'Nursing',
  'Calculus',
  'Architecture',
  'Data storytelling',
  'Wellbeing',
]

const materialSections = [
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
    key: 'personal',
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

const personalMaterials = [
  {
    title: 'Ward-round reflections.pdf',
    meta: 'Updated 3h ago | 1.2 MB | synced across devices',
    accent: 'from-sky-500/80 to-blue-500/80',
    icon: FileText,
    ai: false,
  },
  {
    title: 'Data ethics brief.md',
    meta: 'Saved offline | 420 KB | shared with cohort',
    accent: 'from-emerald-500/80 to-teal-500/80',
    icon: FileText,
    ai: true,
  },
]

export default function LearningMaterials() {
  const [activeTopic, setActiveTopic] = useState<string>('All topics')
  const [activeSection, setActiveSection] = useState<string>('all')

  const showOfficial = activeSection === 'all' || activeSection === 'official'
  const showCommunity = activeSection === 'all' || activeSection === 'community'
  const showPersonal = activeSection === 'all' || activeSection === 'personal'

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
            <button className="pill-tab-active inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Upload material
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by subject, accessibility tag, or cohort..."
              className="w-full rounded-3xl border border-white/20 bg-white/80 py-3 pl-12 pr-4 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {learningFilters.map((filter) => (
              <button
                key={filter.label}
                className={`${filter.active ? 'pill-tab-active' : 'pill-tab'} inline-flex items-center gap-2`}
              >
                {filter.label}
              </button>
            ))}
            <button className="pill-tab inline-flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Refine filters
            </button>
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

      {showOfficial && (
        <section className="surface-section space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-500/30 p-3 text-blue-600 dark:text-blue-300">
                <BookOpen className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Official cohorts</h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">Faculty-approved modules with real-time progress sync</p>
              </div>
            </div>
            <button className="pill-tab inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              View catalog
            </button>
          </div>
        </section>
      )}

      {showCommunity && (
        <section className="surface-section space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/30 p-3 text-emerald-500 dark:text-emerald-300">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Community library</h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">Shared summaries, recordings, and collaborative flashcards</p>
              </div>
            </div>
            <button className="pill-tab inline-flex items-center gap-2">
              Explore more
            </button>
          </div>

          <div className="surface-card flex flex-wrap items-center gap-2 border border-emerald-500/20 bg-white/50 p-3 text-xs text-slate-500 shadow-sm dark:border-emerald-500/30 dark:bg-white/5 dark:text-slate-300">
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-200">
              <ListFilter className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
              Narrow by topic
            </span>
            <div className="flex flex-wrap gap-2">
              {communityFilters.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setActiveTopic(topic)}
                  className={`${
                    activeTopic === topic ? 'pill-tab-active' : 'pill-tab'
                  } inline-flex items-center gap-2 text-xs`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {showPersonal && (
        <section className="surface-section space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/30 p-3 text-purple-500 dark:text-purple-300">
                <FolderOpen className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">My personal desk</h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">Keep private notes, uploads, and AI-generated quizzes in sync</p>
              </div>
            </div>
            <button className="pill-tab inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add item
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {personalMaterials.map((material) => {
              const Icon = material.icon
              return (
                <article key={material.title} className="surface-card flex items-start gap-3">
                  <span className={`inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${material.accent} text-white`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{material.title}</p>
                      {material.ai && (
                        <span className="badge badge-info gap-1">
                          <Wand2 className="h-3.5 w-3.5" />
                          AI quiz ready
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-300">{material.meta}</p>
                  </div>
                </article>
              )
            })}
          </div>
          <button className="pill-tab-active inline-flex w-full justify-center">
            Manage library
          </button>
        </section>
      )}

      <section className="surface-section space-y-4">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Wand2 className="h-4 w-4" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">Discover topics curated for balance</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            'Inclusive patient case toolkit',
            'Carbon-neutral structures',
            'Neurodivergent study strategies',
            'Data storytelling labs',
            'Mindful movement sequences',
            'Community advocacy scripts',
          ].map((topic) => (
            <span key={topic} className="pill-tab inline-flex items-center gap-2">
              {topic}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}