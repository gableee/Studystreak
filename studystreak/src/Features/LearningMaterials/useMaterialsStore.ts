import { useContext } from 'react'
import { MaterialsContext } from './MaterialsContext'
import type { MaterialsContextType } from './MaterialsContextTypes'

export const useMaterialsStore = (): MaterialsContextType | undefined => {
  const ctx = useContext(MaterialsContext)
  if (!ctx) return undefined
  return ctx
}
