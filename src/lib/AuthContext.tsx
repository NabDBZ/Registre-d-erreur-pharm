import { createContext, useContext } from 'react'
import type { SessionUtilisateur } from '../types'

interface AuthContextValue {
  session: SessionUtilisateur
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur du AuthProvider')
  return ctx
}
