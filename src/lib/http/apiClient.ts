import axios from 'axios'
import { apiBaseUrl } from '../../config/env'
import { getAccessToken, setAccessToken } from '../../features/auth/tokenStore'

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
    if (error.response?.status === 401) {
      setAccessToken(null)
      window.dispatchEvent(new Event('auth:unauthorized'))
    }

    return Promise.reject(error)
  },
)
