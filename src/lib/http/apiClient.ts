import axios from 'axios'
import { apiBaseUrl } from '../../config/env'
import { getAccessToken, setAccessToken } from '../../features/auth/tokenStore'
import { getApiErrorMessage } from './apiError'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** O chamador deve encerrar a sessão em 401, preservando o comprovante. */
    handleAuthErrorLocally?: boolean
  }
}

const publicPaths = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
]

function isPublicRequest(url?: string) {
  return publicPaths.some((path) => url?.startsWith(path))
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token && !isPublicRequest(config.url)) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.config?.handleAuthErrorLocally) {
      return Promise.reject(error)
    }

    const publicRequest = isPublicRequest(error.config?.url)
    if (!publicRequest && error.response?.status === 401) {
      setAccessToken(null)
      window.dispatchEvent(new CustomEvent('auth:unauthorized', {
        detail: { message: getApiErrorMessage(error) },
      }))
    }

    if (!publicRequest && error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('auth:forbidden', {
        detail: { message: getApiErrorMessage(error) },
      }))
    }

    return Promise.reject(error)
  },
)
