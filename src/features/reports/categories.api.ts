import axios from 'axios'
import { z } from 'zod'
import { apiClient } from '../../lib/http/apiClient'

const categorySchema = z.object({ id: z.string().uuid(), name: z.string(), active: z.boolean() })
const metadataSchema = z.object({
  number: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  totalElements: z.number().int().nonnegative().optional(),
  last: z.boolean().optional(),
})
const contentSchema = z.object({ content: z.array(categorySchema) })
export type Category = z.infer<typeof categorySchema>

// Page<T> não tem envelope confirmado no documento. Inspeciona e valida em
// runtime os dois formatos Spring (metadados na raiz ou em page), falhando
// explicitamente se o servidor devolver uma estrutura diferente.
export function readCategoryPage(data: unknown) {
  const content = contentSchema.safeParse(data)
  const direct = metadataSchema.safeParse(data)
  const nested = z.object({ page: metadataSchema }).safeParse(data)
  const metadata = direct.success ? direct.data : nested.success ? nested.data.page : null
  if (!content.success || !metadata) throw new Error('Formato de paginação de categorias não reconhecido.')
  const { number, totalPages, totalElements, last } = metadata
  if (
    (totalPages === 0 && (number !== 0 || content.data.content.length !== 0)) ||
    (totalPages > 0 && number >= totalPages) ||
    (last !== undefined && last !== (number + 1 >= totalPages))
  ) throw new Error('Metadados de paginação de categorias inconsistentes.')
  return {
    categories: content.data.content,
    number,
    totalPages,
    totalElements,
    hasNext: last !== undefined ? !last : number + 1 < totalPages,
  }
}

export type CategoryPage = ReturnType<typeof readCategoryPage>

export async function getCategoryPage(page: number, signal?: AbortSignal) {
  const response = await apiClient.get<unknown>('/categories', {
    params: { page, size: 20, sort: 'name,asc' }, signal,
  })
  const result = readCategoryPage(response.data)
  if (result.number !== page) throw new Error('Página de categorias inesperada.')
  return result
}

export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  const categories = new Map<string, Category>()
  let page = 0
  while (true) {
    const response = await apiClient.get<unknown>('/categories', {
      params: { page, size: 20, sort: 'name,asc' }, signal,
    })
    const result = readCategoryPage(response.data)
    if (result.number !== page) throw new Error('Página de categorias inesperada.')
    const previousSize = categories.size
    result.categories.forEach((category) => categories.set(category.id, category))
    if (page + 1 >= result.totalPages) return Array.from(categories.values())
    if (categories.size === previousSize) throw new Error('Não foi possível completar a lista de categorias.')
    page += 1
  }
}

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da categoria.').max(100, 'Use no máximo 100 caracteres.'),
  active: z.boolean(),
})

export type CategoryForm = z.infer<typeof categoryFormSchema>

export async function createCategory(values: CategoryForm) {
  const request = categoryFormSchema.parse(values)
  const { data } = await apiClient.post<unknown>('/categories', {
    name: request.name.trim(),
    active: request.active,
  })
  return categorySchema.parse(data)
}

export function getCategoryManagementError(error: unknown) {
  if (!axios.isAxiosError(error)) return 'Não foi possível ler a resposta do serviço. Tente novamente.'
  if (!error.response) return 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.'

  const body = error.response.data as { erro?: unknown; detalhes?: unknown } | undefined
  const backendMessage = typeof body?.erro === 'string'
    ? body.erro
    : body?.detalhes && typeof body.detalhes === 'object'
      ? Object.values(body.detalhes).find((message): message is string => typeof message === 'string')
      : undefined

  switch (error.response.status) {
    case 400: return backendMessage ?? 'Confira os dados informados e tente novamente.'
    case 401: return 'Sua sessão expirou. Faça login novamente.'
    case 403: return 'Você não tem permissão para gerenciar categorias.'
    case 409: return backendMessage ?? 'Já existe uma categoria com este nome.'
    default: return 'O serviço está temporariamente indisponível. Tente novamente mais tarde.'
  }
}
