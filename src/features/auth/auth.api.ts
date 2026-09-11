import { z } from 'zod'
import { apiClient } from '../../lib/http/apiClient'
import type { AuthSession } from './auth.types'

export const loginRequestSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/, 'Informe um CPF com 11 dígitos.'),
  password: z
    .string()
    .max(100, 'A senha deve ter no máximo 100 caracteres.')
    .refine((value) => value.trim().length > 0, 'Informe sua senha.'),
})

export type LoginRequestDTO = z.infer<typeof loginRequestSchema>

export type LoginResponseDTO = AuthSession

export interface ChangePasswordRequestDTO {
  currentPassword: string
  newPassword: string
}

export interface ForgotPasswordRequestDTO {
  cpf: string
}

export interface ResetPasswordRequestDTO {
  token: string
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
  const validatedRequest = loginRequestSchema.parse(request)
  const response = await apiClient.post<LoginResponseDTO>('/auth/login', validatedRequest)
  return loginResponseSchema.parse(response.data)
}

export async function changePassword(request: ChangePasswordRequestDTO) {
  await apiClient.patch<void>('/users/me/password', request)
}

export async function forgotPassword(request: ForgotPasswordRequestDTO) {
  await apiClient.post<void>('/auth/forgot-password', request)
}

export async function resetPassword(request: ResetPasswordRequestDTO) {
  await apiClient.post<void>('/auth/reset-password', request)
}
