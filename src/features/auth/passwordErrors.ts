import axios from 'axios'

interface ErrorResponse {
  erro?: unknown
  detalhes?: unknown
}

const invalidTokenMessage = 'O link de recuperação é inválido ou expirou. Solicite um novo.'

export function getTerminalResetTokenError(error: unknown) {
  if (!axios.isAxiosError<ErrorResponse>(error)) return null

  if (error.response?.status !== 400) return null

  const data = error.response.data
  const tokenValidationError = data?.detalhes
    && typeof data.detalhes === 'object'
    && !Array.isArray(data.detalhes)
    && typeof (data.detalhes as Record<string, unknown>).token === 'string'

  if (data?.erro === 'Token inválido ou expirado.' || tokenValidationError) {
    return invalidTokenMessage
  }

  return null
}
