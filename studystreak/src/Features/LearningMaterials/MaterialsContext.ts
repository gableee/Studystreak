import { createContext } from 'react'
import type { MaterialsContextType } from './MaterialsContextTypes'

export const MaterialsContext = createContext<MaterialsContextType | undefined>(undefined)
