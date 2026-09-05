import axios from 'axios'

interface ErrorResponse {
  erro?: string
  detalhes?: Record<string, string>
}

export function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError<ErrorResponse>(error)) {
    return 'Não foi possível concluir a operação. Tente novamente.'
  }

  const response = error.response?.data

  if (response?.erro) {
    return response.erro
  }

  const validationMessage = response?.detalhes && Object.values(response.detalhes)[0]
  return validationMessage ?? 'Não foi possível concluir a operação. Tente novamente.'
}
