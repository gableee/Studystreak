import { BookOpen, FolderOpen, Layers, Users } from 'lucide-react'
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
      <div className="flex flex-wrap gap-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const isActive = value === section.key
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onChange(section.key)}
              disabled={disabled}
              className={`inline-flex min-w-[12rem] flex-1 flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                isActive
                  ? `bg-gradient-to-r ${section.activeGradient} text-white shadow-lg`:
                  'bg-white/75 text-slate-600 hover:shadow-md dark:bg-white/5 dark:text-slate-200'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
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
  )
}

export default SectionFilters
