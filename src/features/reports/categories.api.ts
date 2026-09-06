import { z } from 'zod'
import { apiClient } from '../../lib/http/apiClient'

const categorySchema = z.object({ id: z.string().uuid(), name: z.string(), active: z.boolean() })
const metadataSchema = z.object({ number: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative() })
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
  return { categories: content.data.content, ...metadata }
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
