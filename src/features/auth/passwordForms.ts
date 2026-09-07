import { z } from 'zod'
import type {
  ChangePasswordRequestDTO,
  ForgotPasswordRequestDTO,
  ResetPasswordRequestDTO,
} from './auth.api'

const newPasswordSchema = z
  .string()
  .min(8, 'A nova senha deve ter entre 8 e 100 caracteres.')
  .max(100, 'A nova senha deve ter entre 8 e 100 caracteres.')
  .refine((value) => value.trim().length > 0, 'Informe a nova senha.')

const confirmationSchema = z
  .string()
  .min(1, 'Confirme a nova senha.')
  .max(100, 'A confirmação deve ter no máximo 100 caracteres.')

export const forgotPasswordSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/, 'Informe um CPF com 11 dígitos.'),
})

export const resetPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmNewPassword: confirmationSchema,
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmNewPassword'],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().refine((value) => value.trim().length > 0, 'Informe a senha atual.'),
    newPassword: newPasswordSchema,
    confirmNewPassword: confirmationSchema,
  })
  .superRefine((values, context) => {
    if (values.currentPassword === values.newPassword) {
      context.addIssue({
        code: 'custom',
        message: 'A nova senha deve ser diferente da senha atual.',
        path: ['newPassword'],
      })
    }

    if (values.newPassword !== values.confirmNewPassword) {
      context.addIssue({
        code: 'custom',
        message: 'As senhas não coincidem.',
        path: ['confirmNewPassword'],
      })
    }
  })

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export function formatCpf(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function toForgotPasswordRequest(values: ForgotPasswordFormValues): ForgotPasswordRequestDTO {
  return { cpf: values.cpf }
}

export function toResetPasswordRequest(
  values: ResetPasswordFormValues,
  token: string,
): ResetPasswordRequestDTO {
  return { token, newPassword: values.newPassword }
}

export function toChangePasswordRequest(values: ChangePasswordFormValues): ChangePasswordRequestDTO {
  return {
    currentPassword: values.currentPassword,
    newPassword: values.newPassword,
  }
}
