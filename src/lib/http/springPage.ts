import { z } from 'zod'

const pageMetadataSchema = z.object({
  number: z.number().int().nonnegative(),
  size: z.number().int().min(1).max(50),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  first: z.boolean(),
  last: z.boolean(),
  empty: z.boolean(),
  numberOfElements: z.number().int().nonnegative(),
})

export function readSpringPage<T>(data: unknown, itemSchema: z.ZodType<T>, resourceLabel: string) {
  const parsed = pageMetadataSchema.extend({ content: z.array(itemSchema) }).safeParse(data)
  if (!parsed.success) throw new Error(`Resposta de paginação de ${resourceLabel} não reconhecida.`)

  const page = parsed.data
  const expectedLast = page.totalPages === 0 || page.number + 1 >= page.totalPages
  if (
    page.numberOfElements !== page.content.length
    || page.empty !== (page.content.length === 0)
    || page.first !== (page.number === 0)
    || page.last !== expectedLast
    || page.numberOfElements > page.size
    || page.totalElements < page.content.length
    || (page.totalPages === 0 && (page.number !== 0 || !page.empty || page.totalElements !== 0))
    || (page.totalPages > 0 && page.number >= page.totalPages)
  ) {
    throw new Error(`Metadados de paginação de ${resourceLabel} inconsistentes.`)
  }

  return page
}
