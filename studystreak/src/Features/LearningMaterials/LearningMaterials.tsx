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
  Clock,
  Download,
  FileText,
  Filter,
  FolderOpen,
  Heart,
  Layers,
  ListFilter,
  Plus,
  Search,
  Star,
  Users,
  Video,
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

const officialCourses = [
  {
    title: 'Clinical decision lab',
    summary: 'Practice inclusive bedside assessments and interprofessional communication scenarios.',
    lessons: '16 modules',
    duration: '12 hr guided',
    cohort: 'Health sciences',
    rating: '4.9',
    accent: 'from-sky-400/90 to-blue-500/90',
    icon: BookOpen,
  },
  {
    title: 'Adaptive studio systems',
    summary: 'Prototype accessible spaces with sustainable materials and community feedback loops.',
    lessons: '12 workshops',
    duration: '9 hr studio',
    cohort: 'Architecture & design',
    rating: '4.8',
    accent: 'from-purple-400/90 to-rose-500/90',
    icon: BookOpen,
  },
  {
    title: 'Ethical data storytelling',
    summary: 'Investigate fairness metrics, bias mitigation, and visual narratives for civic teams.',
    lessons: '10 labs',
    duration: '6 hr lab',
    cohort: 'Data & analytics',
    rating: '4.7',
    accent: 'from-emerald-400/90 to-teal-500/90',
    icon: BookOpen,
  },
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

const communityResources = [
  {
    title: 'Ward round reflection prompts',
    summary: 'Printable prompts that support trauma-informed patient conversations.',
    author: 'amina_j',
    likes: '312',
    downloads: '1.4k',
    tag: 'Nursing',
    accent: 'from-sky-500 to-indigo-500',
    icon: FileText,
  },
  {
    title: 'Studio critique audio kit',
    summary: 'Five-part audio pack capturing inclusive feedback language from design mentors.',
    author: 'marco.studio',
    likes: '486',
    downloads: '2.1k',
    tag: 'Architecture',
    accent: 'from-purple-500 to-pink-500',
    icon: Video,
  },
  {
    title: 'Community data ethics canvas',
    summary: 'Collaborative template for mapping stakeholders and consent requirements.',
    author: 'datafieldnotes',
    likes: '658',
    downloads: '3.8k',
    tag: 'Data storytelling',
    accent: 'from-emerald-500 to-teal-500',
    icon: FileText,
  },
  {
    title: 'Intro to distributed systems',
    summary: 'Peer-annotated lecture notes covering consensus, CAP theorem, and fault tolerance.',
    author: 'comp_sci_collective',
    likes: '224',
    downloads: '1.1k',
    tag: 'Computer science',
    accent: 'from-blue-500 to-cyan-500',
    icon: FileText,
  },
  {
    title: 'Calculus focus review set',
    summary: 'Flashcards and worked problems emphasising limits, derivatives, and integrals.',
    author: 'mathlab',
    likes: '341',
    downloads: '1.9k',
    tag: 'Calculus',
    accent: 'from-orange-500 to-amber-500',
    icon: FileText,
  },
]

const personalMaterials = [
  {
    title: 'Ward-round reflections.pdf',
    meta: 'Updated 3h ago | 1.2 MB | synced across devices',
    accent: 'from-sky-500/80 to-blue-500/80',
    icon: FileText,
    ai: true,
  },
  {
    title: 'Studio lighting walkthrough.mp4',
    meta: 'Uploaded last week | 240 MB | captions attached',
    accent: 'from-purple-500/80 to-pink-500/80',
    icon: Video,
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

  const visibleResources =
    activeTopic === 'All topics'
      ? communityResources
      : communityResources.filter((resource) => resource.tag === activeTopic)

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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {officialCourses.map((course) => {
              const Icon = course.icon
              return (
                <article key={course.title} className="surface-card flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${course.accent} text-white shadow-lg`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500">
                      <Star className="h-4 w-4" />
                      {course.rating}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{course.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-300">{course.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {course.lessons}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {course.duration}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {course.cohort}
                    </span>
                  </div>
                  <button className="pill-tab-active inline-flex justify-center">
                    Continue course
                  </button>
                </article>
              )
            })}
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

          <div className="space-y-4">
            {visibleResources.map((resource) => {
              const Icon = resource.icon
              return (
                <article key={resource.title} className="surface-card flex flex-wrap items-start gap-4">
                  <span className={`inline-flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br ${resource.accent} text-white shadow-md`}>
                    <Icon className="h-7 w-7" />
                  </span>
                  <div className="flex-1 min-w-[16rem] space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{resource.title}</h3>
                      <span className="badge badge-info">{resource.tag}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-300">{resource.summary}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-300">
                      <span>@{resource.author}</span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        {resource.likes}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Download className="h-3.5 w-3.5" />
                        {resource.downloads}
                      </span>
                    </div>
                  </div>
                  <button className="pill-tab inline-flex items-center gap-2">
                    Open resource
                  </button>
                </article>
              )
            })}
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