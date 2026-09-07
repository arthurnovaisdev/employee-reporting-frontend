import axios from 'axios'
import { z } from 'zod'
import { apiClient } from '../../lib/http/apiClient'

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

const userPageMetadataSchema = z.object({
  number: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative().optional(),
  totalElements: z.number().int().nonnegative().optional(),
  last: z.boolean().optional(),
})

export function readUserPage(data: unknown) {
  const content = z.object({ content: z.array(userResponseSchema) }).safeParse(data)
  const direct = userPageMetadataSchema.safeParse(data)
  const nested = z.object({ page: userPageMetadataSchema }).safeParse(data)
  const metadata = direct.success ? direct.data : nested.success ? nested.data.page : null

  if (!content.success || !metadata) {
    throw new Error('Resposta de paginação de usuários não reconhecida.')
  }

  const { number, totalPages, totalElements, last } = metadata
  if (totalPages !== undefined && (
    (totalPages === 0 && (number !== 0 || content.data.content.length !== 0)) ||
    (totalPages > 0 && number >= totalPages) ||
    (last !== undefined && last !== (number + 1 >= totalPages))
  )) {
    throw new Error('Metadados de paginação de usuários inconsistentes.')
  }

  return {
    users: content.data.content,
    number,
    totalPages,
    totalElements,
    hasNext: last !== undefined
      ? !last
      : totalPages !== undefined
        ? number + 1 < totalPages
        : undefined,
  }
}

export type UserPage = ReturnType<typeof readUserPage>

export async function getUsers(page: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/users', {
    params: { page, size: 20, sort: 'name,asc' },
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
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(100, 'A senha deve ter no máximo 100 caracteres.'),
})

export type RegisterEmployeeForm = z.infer<typeof registerEmployeeFormSchema>

const registerRequestSchema = z.object({
  name: z.string().min(1).max(150),
  cpf: z.string().regex(/^\d{11}$/),
  contactEmail: z.string().email().max(150).nullable(),
  password: z.string().min(8).max(100),
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
  if (!axios.isAxiosError(error)) {
    return 'Não foi possível ler a resposta do serviço. Tente novamente.'
  }
  if (!error.response) {
    return 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.'
  }

  const body = error.response.data as { erro?: unknown; detalhes?: unknown } | undefined
  const backendMessage = typeof body?.erro === 'string'
    ? body.erro
    : body?.detalhes && typeof body.detalhes === 'object'
      ? Object.values(body.detalhes).find((message): message is string => typeof message === 'string')
      : undefined

  switch (error.response.status) {
    case 400: return backendMessage ?? 'Confira os dados informados e tente novamente.'
    case 401: return 'Sua sessão expirou. Faça login novamente.'
    case 403: return 'Você não tem permissão para gerenciar usuários.'
    case 404: return 'Usuário não encontrado. Atualize a listagem e tente novamente.'
    case 409: return 'Já existe um registro com os dados informados.'
    default: return 'O serviço está temporariamente indisponível. Tente novamente mais tarde.'
  }
}
