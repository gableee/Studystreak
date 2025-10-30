import type { LearningMaterial } from './types'

export type MaterialsContextType = {
  allMaterials: LearningMaterial[]
  loading: boolean
  isFullyLoaded: boolean
  total: number | null
  refresh: () => Promise<void>
}
