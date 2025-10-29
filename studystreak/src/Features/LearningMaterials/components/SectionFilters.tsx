import { BookOpen, FolderOpen, Heart, Layers, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MaterialsFilter } from '../types'

type SectionFiltersProps = {
  value: MaterialsFilter
  onChange: (value: MaterialsFilter) => void
  disabled?: boolean
}

const SECTIONS: Array<{
  key: MaterialsFilter
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
    caption: 'Browse all materials you can access',
    icon: Layers,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    borderColorActive: 'rgba(148, 163, 184, 0.75)',
    activeGradient: 'from-slate-500/80 to-slate-700/80',
  },
  {
    key: 'my',
    label: 'My materials',
    caption: 'Materials you have uploaded',
    icon: FolderOpen,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderColorActive: 'rgba(236, 72, 153, 0.6)',
    activeGradient: 'from-purple-500/80 to-pink-500/80',
  },
  {
    key: 'liked',
    label: 'Liked materials',
    caption: 'Materials you have liked',
    icon: Heart,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderColorActive: 'rgba(244, 63, 94, 0.65)',
    activeGradient: 'from-rose-500/80 to-pink-500/80',
  },
  {
    key: 'community',
    label: 'Community library',
    caption: 'Public materials from all users',
    icon: Users,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderColorActive: 'rgba(16, 185, 129, 0.65)',
    activeGradient: 'from-emerald-500/80 to-teal-500/80',
  },
  {
    key: 'official',
    label: 'Official courses',
    caption: 'Materials from official sources',
    icon: BookOpen,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderColorActive: 'rgba(59, 130, 246, 0.7)',
    activeGradient: 'from-blue-500/80 to-indigo-500/80',
  },
]

export function SectionFilters({ value, onChange, disabled = false }: SectionFiltersProps) {
  return (
    <section className="surface-section space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const isActive = value === section.key
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onChange(section.key)}
              disabled={disabled}
              className={`group relative flex flex-col gap-2.5 overflow-hidden rounded-[1.5rem] border-2 px-5 py-4 text-left transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${
                isActive
                  ? `bg-gradient-to-br ${section.activeGradient} border-transparent text-white shadow-xl hover:shadow-2xl transform hover:scale-[1.02]`
                  : 'border-slate-200/60 bg-white/75 text-slate-600 shadow-sm hover:border-slate-300 hover:shadow-md hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800/70'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              style={{ 
                borderColor: isActive ? 'transparent' : section.borderColor 
              }}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" aria-hidden />
              )}
              <span className={`relative flex items-center gap-2.5 text-sm font-bold ${isActive ? 'text-white' : ''}`}>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-white/20 shadow-lg' 
                    : 'bg-slate-100 group-hover:bg-slate-200 dark:bg-slate-800 dark:group-hover:bg-slate-700'
                }`}>
                  <Icon className="h-4 w-4" />
                </span>
                {section.label}
              </span>
              <span className={`relative text-xs leading-relaxed ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                {section.caption}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default SectionFilters
