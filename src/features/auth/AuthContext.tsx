import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { AuthSession } from './auth.types'
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
  subscribeAuthSession,
} from './authStore'

interface AuthContextValue {
  session: AuthSession | null
  isAuthenticated: boolean
  startSession: (session: AuthSession) => void
  endSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSession,
    getAuthSession,
  )

  const endSession = useCallback(() => {
    clearAuthSession()
    queryClient.clear()
  }, [queryClient])

  const startSession = useCallback((nextSession: AuthSession) => {
    queryClient.clear()
    setAuthSession(nextSession)
  }, [queryClient])

  useEffect(() => {
    window.addEventListener('auth:unauthorized', endSession)
    return () => window.removeEventListener('auth:unauthorized', endSession)
  }, [endSession])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: session !== null,
      startSession,
      endSession,
    }),
    [endSession, session, startSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }

  return context
}
