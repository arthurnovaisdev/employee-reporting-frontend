import { z } from 'zod'
import { apiClient } from '../../lib/http/apiClient'
import type { AuthSession } from './auth.types'

export interface LoginRequestDTO {
  cpf: string
  password: string
}

export type LoginResponseDTO = AuthSession

export interface ChangePasswordRequestDTO {
  currentPassword: string
  newPassword: string
}

const loginResponseSchema = z
  .object({
    token: z.string().min(1),
    name: z.string().min(1),
    role: z.enum(['EMPLOYEE', 'ADMIN']),
    passwordChanged: z.boolean(),
  })
  .strict()

export async function login(request: LoginRequestDTO) {
  const response = await apiClient.post<LoginResponseDTO>('/auth/login', request)
  return loginResponseSchema.parse(response.data)
}

export async function changePassword(request: ChangePasswordRequestDTO) {
  await apiClient.patch<void>('/users/me/password', request)
}
