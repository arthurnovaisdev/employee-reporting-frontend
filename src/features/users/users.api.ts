import { z } from 'zod'
import { apiClient } from '../../lib/http/apiClient'
import { getApiErrorMessage } from '../../lib/http/apiError'
import { readSpringPage } from '../../lib/http/springPage'

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  cpf: z.string().regex(/^\d{11}$/),
  contactEmail: z.string().nullable(),
  role: z.enum(['EMPLOYEE', 'ADMIN']),
  active: z.boolean(),
  passwordChanged: z.boolean(),
})

export type UserResponseDTO = z.infer<typeof userResponseSchema>

export function readUserPage(data: unknown) {
  const page = readSpringPage(data, userResponseSchema, 'usuários')
  return {
    users: page.content,
    number: page.number,
    totalPages: page.totalPages,
    totalElements: page.totalElements,
    hasNext: !page.last,
  }
}

export type UserPage = ReturnType<typeof readUserPage>

export async function getUsers(page: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/users', {
    params: { page, size: 20 },
    signal,
  })
  const result = readUserPage(data)
  if (result.number !== page) {
    throw new Error('Página de usuários recebida diferente da solicitada.')
  }
  return result
}

export async function getUser(id: string, signal?: AbortSignal) {
  const userId = z.string().uuid().parse(id)
  const { data } = await apiClient.get<unknown>(`/users/${encodeURIComponent(userId)}`, { signal })
  const user = userResponseSchema.parse(data)
  if (user.id !== userId) {
    throw new Error('Usuário recebido diferente do solicitado.')
  }
  return user
}

export const registerEmployeeFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do funcionário.').max(150, 'Use no máximo 150 caracteres.'),
  cpf: z.string().trim().regex(/^\d{11}$/, 'Informe os 11 dígitos do CPF, sem pontuação.'),
  contactEmail: z.union([
    z.literal(''),
    z.string().trim().email('Informe um e-mail válido.').max(150, 'Use no máximo 150 caracteres.'),
  ]),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').max(100, 'A senha deve ter no máximo 100 caracteres.'),
})

export type RegisterEmployeeForm = z.infer<typeof registerEmployeeFormSchema>

const registerRequestSchema = z.object({
  name: z.string().min(1).max(150),
  cpf: z.string().regex(/^\d{11}$/),
  contactEmail: z.string().email().max(150).nullable(),
  password: z.string().min(6).max(100),
})

export function toRegisterRequest(values: RegisterEmployeeForm) {
  return registerRequestSchema.parse({
    name: values.name.trim(),
    cpf: values.cpf.trim(),
    contactEmail: values.contactEmail.trim() || null,
    password: values.password,
  })
}

export async function registerEmployee(values: RegisterEmployeeForm) {
  await apiClient.post('/auth/register', toRegisterRequest(values))
}

export async function setUserActive(id: string, active: boolean) {
  const userId = z.string().uuid().parse(id)
  await apiClient.patch(`/users/${encodeURIComponent(userId)}/${active ? 'activate' : 'deactivate'}`)
}

export function getUserManagementError(error: unknown) {
  return getApiErrorMessage(error, {
    defaultMessage: 'Não foi possível ler a resposta do serviço. Tente novamente.',
    statusMessages: {
      403: 'Você não tem permissão para gerenciar usuários.',
      404: 'Usuário não encontrado. Atualize a listagem e tente novamente.',
      409: 'Já existe um registro com os dados informados.',
    },
  })
}
