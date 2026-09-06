import axios from 'axios'
import { apiBaseUrl } from '../../config/env'
import { getAccessToken, setAccessToken } from '../../features/auth/tokenStore'

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

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const isPublicRequest = publicPaths.some((path) => config.url?.startsWith(path))
  const token = getAccessToken()

  if (token && !isPublicRequest) {
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
    if (error.response?.status === 401) {
      setAccessToken(null)
      window.dispatchEvent(new Event('auth:unauthorized'))
    }

    if (error.response?.status === 403) {
      window.dispatchEvent(new Event('auth:forbidden'))
    }

    return Promise.reject(error)
  },
)
