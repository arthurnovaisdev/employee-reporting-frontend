const localApiBaseUrl = import.meta.env.DEV ? 'http://localhost:8080/api' : undefined

export function resolveApiBaseUrl(
  configuredValue: string | undefined,
  development: boolean,
  production: boolean,
) {
  const value = configuredValue?.trim()

  if (!value) {
    if (development && localApiBaseUrl) return localApiBaseUrl
    throw new Error('VITE_API_BASE_URL é obrigatória fora do ambiente de desenvolvimento.')
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(value)
  } catch {
    throw new Error('VITE_API_BASE_URL deve ser uma URL absoluta válida.')
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('VITE_API_BASE_URL deve utilizar HTTP ou HTTPS.')
  }

  if (production && parsedUrl.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL deve utilizar HTTPS em produção.')
  }

  if (parsedUrl.pathname.replace(/\/+$/, '') !== '/api') {
    throw new Error('VITE_API_BASE_URL deve incluir o base path /api.')
  }

  return value.replace(/\/+$/, '')
}

export const apiBaseUrl = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.DEV,
  import.meta.env.PROD,
)
