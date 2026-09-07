import axios from 'axios'

interface ErrorResponse {
  erro?: string
}

const expiredMessage = 'O link de recuperação expirou. Solicite um novo.'
const usedMessage = 'Este link de recuperação já foi utilizado.'
const invalidMessage = 'Token inválido ou não encontrado.'

export function getTerminalResetTokenError(error: unknown) {
  if (!axios.isAxiosError<ErrorResponse>(error)) return null

  const message = error.response?.data?.erro

  if (error.response?.status === 404) return invalidMessage
  if (error.response?.status === 400 && message === expiredMessage) return expiredMessage
  if (error.response?.status === 400 && message === usedMessage) return usedMessage

  return null
}
