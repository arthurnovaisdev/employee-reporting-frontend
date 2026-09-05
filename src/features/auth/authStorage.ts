import { z } from 'zod'
import type { AuthSession } from './auth.types'

const storageKey = 'mbfreire.auth.session'

const storedSessionSchema = z
  .object({
    token: z.string().min(1),
    name: z.string().min(1),
    role: z.enum(['EMPLOYEE', 'ADMIN']),
    passwordChanged: z.boolean(),
  })
  .strict()

export function readStoredSession(): AuthSession | null {
  const rawSession = window.sessionStorage.getItem(storageKey)

  if (!rawSession) {
    return null
  }

  try {
    const parsedSession = storedSessionSchema.safeParse(JSON.parse(rawSession))

    if (parsedSession.success) {
      return parsedSession.data
    }
  } catch {
    // Dados inválidos são descartados sem expor conteúdo sensível.
  }

  window.sessionStorage.removeItem(storageKey)
  return null
}

export function writeStoredSession(session: AuthSession) {
  window.sessionStorage.setItem(storageKey, JSON.stringify(session))
}

export function clearStoredSession() {
  window.sessionStorage.removeItem(storageKey)
}
