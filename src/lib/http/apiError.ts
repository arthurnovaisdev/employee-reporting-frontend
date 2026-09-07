import axios from 'axios'

interface BackendErrorResponse {
  status?: unknown
  erro?: unknown
  detalhes?: unknown
  timestamp?: unknown
}

interface ApiErrorMessageOptions {
  defaultMessage?: string
  statusMessages?: Partial<Record<number, string>>
}

function readBackendErrorBody(error: unknown) {
  if (!axios.isAxiosError<BackendErrorResponse>(error)) return null
  const data = error.response?.data
  if (!data || typeof data !== 'object') return null

  const details = data.detalhes && typeof data.detalhes === 'object' && !Array.isArray(data.detalhes)
    ? Object.fromEntries(
        Object.entries(data.detalhes)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
    : undefined

  return {
    erro: typeof data.erro === 'string' ? data.erro : undefined,
    detalhes: details && Object.keys(details).length > 0 ? details : undefined,
  }
}

export function getApiValidationDetails(error: unknown) {
  return readBackendErrorBody(error)?.detalhes
}

export function getApiErrorMessage(error: unknown, options: ApiErrorMessageOptions = {}) {
  const defaultMessage = options.defaultMessage ?? 'Não foi possível concluir a operação. Tente novamente.'
  if (!axios.isAxiosError(error)) return defaultMessage
  if (!error.response) {
    return 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.'
  }

  const status = error.response.status
  const statusOverride = options.statusMessages?.[status]
  if (statusOverride) return statusOverride

  const body = readBackendErrorBody(error)
  const backendMessage = body?.erro ?? (body?.detalhes ? Object.values(body.detalhes)[0] : undefined)

  switch (status) {
    case 400:
      return backendMessage ?? 'Confira os dados informados e tente novamente.'
    case 401:
      return backendMessage ?? 'Sua sessão expirou. Faça login novamente.'
    case 403:
      return backendMessage ?? 'Você não tem permissão para acessar este recurso.'
    case 404:
      return backendMessage ?? 'O recurso solicitado não foi encontrado.'
    case 409:
      return backendMessage ?? 'Não foi possível concluir porque os dados informados estão em conflito.'
    default:
      return status >= 500
        ? 'O serviço está temporariamente indisponível. Tente novamente mais tarde.'
        : defaultMessage
  }
}
