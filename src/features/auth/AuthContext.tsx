import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthSession } from './auth.types'
import { setAccessToken } from './tokenStore'

interface AuthContextValue {
  session: AuthSession | null
  isAuthenticated: boolean
  startSession: (session: AuthSession) => void
  endSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)

  const endSession = () => {
    setAccessToken(null)
    setSession(null)
  }

  const startSession = (nextSession: AuthSession) => {
    setAccessToken(nextSession.token)
    setSession(nextSession)
  }

  useEffect(() => {
    window.addEventListener('auth:unauthorized', endSession)
    return () => window.removeEventListener('auth:unauthorized', endSession)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: session !== null,
      startSession,
      endSession,
    }),
    [session],
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
