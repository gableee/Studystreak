import { useContext } from 'react'
import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
}

// Placeholder default; actual provider is defined in AuthProvider.tsx
export const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true })

export const useAuthContext = () => useContext(AuthContext)


