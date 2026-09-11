import { z } from 'zod'
import { apiClient } from '../../lib/http/apiClient'
import { getApiErrorMessage } from '../../lib/http/apiError'
import { readSpringPage } from '../../lib/http/springPage'

const categorySchema = z.object({ id: z.string().uuid(), name: z.string(), active: z.boolean() })
export type Category = z.infer<typeof categorySchema>

export function readCategoryPage(data: unknown) {
  const page = readSpringPage(data, categorySchema, 'categorias')
  return {
    categories: page.content,
    number: page.number,
    totalPages: page.totalPages,
    totalElements: page.totalElements,
    hasNext: !page.last,
  }
}

export type CategoryPage = ReturnType<typeof readCategoryPage>

export async function getCategoryPage(page: number, signal?: AbortSignal) {
  const response = await apiClient.get<unknown>('/categories', {
    params: { page, size: 20 }, signal,
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
      params: { page, size: 20 }, signal,
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
  return getApiErrorMessage(error, {
    defaultMessage: 'Não foi possível ler a resposta do serviço. Tente novamente.',
    statusMessages: {
      403: 'Você não tem permissão para gerenciar categorias.',
      409: 'Já existe uma categoria com este nome.',
    },
  })
}
