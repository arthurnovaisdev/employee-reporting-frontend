import type { AuthSession } from './auth.types'

let session: AuthSession | null = null
const listeners = new Set<() => void>()

export function getAuthSession() {
  return session
}

export function getAccessToken() {
  return session?.token ?? null
}

export function setAuthSession(nextSession: AuthSession | null) {
  if (Object.is(session, nextSession)) return

  session = nextSession
  listeners.forEach((listener) => listener())
}

export function clearAuthSession() {
  setAuthSession(null)
}

export function subscribeAuthSession(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
