import axios from 'axios'
import { apiBaseUrl } from '../../config/env'
import { clearAuthSession, getAccessToken } from '../../features/auth/authStore'
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
  const path = url?.split(/[?#]/, 1)[0]
  return publicPaths.includes(path ?? '')
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (isPublicRequest(config.url)) {
    config.headers.delete('Authorization')
  } else if (token) {
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
      clearAuthSession()
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
