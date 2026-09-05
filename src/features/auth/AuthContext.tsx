import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthSession } from './auth.types'
import { clearStoredSession, readStoredSession, writeStoredSession } from './authStorage'
import { setAccessToken } from './tokenStore'

interface AuthContextValue {
  session: AuthSession | null
  isAuthenticated: boolean
  startSession: (session: AuthSession) => void
  endSession: () => void
  markPasswordChanged: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<AuthSession | null>(() => {
    const restoredSession = readStoredSession()
    setAccessToken(restoredSession?.token ?? null)
    return restoredSession
  })

  const endSession = useCallback(() => {
    setAccessToken(null)
    clearStoredSession()
    setSession(null)
    queryClient.clear()
  }, [queryClient])

  const startSession = useCallback((nextSession: AuthSession) => {
    queryClient.clear()
    setAccessToken(nextSession.token)
    writeStoredSession(nextSession)
    setSession(nextSession)
  }, [queryClient])

  const markPasswordChanged = useCallback(() => {
    setSession((currentSession) => {
      if (!currentSession) {
        return null
      }

      const updatedSession = { ...currentSession, passwordChanged: true }
      writeStoredSession(updatedSession)
      return updatedSession
    })
  }, [])

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
      markPasswordChanged,
    }),
    [endSession, markPasswordChanged, session, startSession],
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
