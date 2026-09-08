import { z } from 'zod'
import { apiClient } from '../../lib/http/apiClient'
import { getApiErrorMessage } from '../../lib/http/apiError'
import { reportResponseSchema, reportStatuses } from './protocolConsult'

// Adaptador defensivo, como em categories.api.ts. O documento local ainda não
// confirma o envelope Page<T>. Só utiliza metadados presentes e válidos;
// formatos desconhecidos falham sem fabricar totais ou inferir a última página.
const metadataSchema = z.object({
  number: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative().optional(),
  totalElements: z.number().int().nonnegative().optional(),
  last: z.boolean().optional(),
})

export function readAdminReportPage(data: unknown) {
  const content = z.object({ content: z.array(reportResponseSchema) }).safeParse(data)
  const direct = metadataSchema.safeParse(data)
  const nested = z.object({ page: metadataSchema }).safeParse(data)
  const metadata = direct.success ? direct.data : nested.success ? nested.data.page : null
  if (!content.success || !metadata) throw new Error('Resposta de paginação não reconhecida.')
  const { number, totalPages, totalElements, last } = metadata
  if (totalPages !== undefined && (
    (totalPages === 0 && (number !== 0 || content.data.content.length !== 0)) ||
    (totalPages > 0 && number >= totalPages) ||
    (last !== undefined && last !== (number + 1 >= totalPages))
  )) throw new Error('Metadados de paginação inconsistentes.')
  return {
    reports: content.data.content,
    number, totalPages, totalElements,
    hasNext: last !== undefined ? !last : totalPages !== undefined ? number + 1 < totalPages : undefined,
  }
}

export type AdminReportPage = ReturnType<typeof readAdminReportPage>

export const attachmentResponseSchema = z.object({
  id: z.uuid(),
  originalFileName: z.string(),
  contentType: z.string(),
  fileSize: z.number().nonnegative().nullish(),
  createdAt: z.string().nullish(),
})

export const reportAdminResponseSchema = reportResponseSchema.extend({
  incidentDate: z.string().nullish(),
  incidentLocation: z.string().nullish(),
  attachments: z.array(attachmentResponseSchema),
})

export type AttachmentResponseDTO = z.infer<typeof attachmentResponseSchema>
export type ReportAdminResponseDTO = z.infer<typeof reportAdminResponseSchema>

export async function getAdminReportDetail(protocol: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(`/reports/admin/${encodeURIComponent(protocol)}`, { signal })
  const report = reportAdminResponseSchema.parse(data)
  if (report.protocol !== protocol) throw new Error('Resposta inesperada do detalhe da denúncia.')
  return report
}

export async function getAdminAttachment(protocol: string, attachmentId: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<Blob>(
    `/reports/admin/${encodeURIComponent(protocol)}/attachments/${encodeURIComponent(attachmentId)}`,
    { responseType: 'blob', headers: { Accept: 'application/pdf, image/jpeg, image/png, application/json' }, signal },
  )
  return data
}

export function getAdminAttachmentError(error: unknown) {
  return getApiErrorMessage(error, {
    defaultMessage: 'Não foi possível abrir o anexo. Tente novamente.',
    statusMessages: {
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para visualizar este anexo.',
      404: 'Anexo não encontrado nesta denúncia. Feche e abra o detalhe para atualizar os anexos.',
    },
  })
}

export async function getAdminReports(page: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/reports/admin', {
    params: { page, size: 10 }, signal,
  })
  const result = readAdminReportPage(data)
  if (result.number !== page) throw new Error('Página recebida diferente da solicitada.')
  return result
}

export const reportStatusUpdateSchema = z.object({
  newStatus: z.enum(reportStatuses),
  note: z.string().max(2000, 'A observação deve ter no máximo 2.000 caracteres.'),
})
export type ReportStatusUpdateForm = z.infer<typeof reportStatusUpdateSchema>

export async function updateReportStatus(protocol: string, values: ReportStatusUpdateForm) {
  const validated = reportStatusUpdateSchema.parse(values)
  const { data } = await apiClient.patch<unknown>(
    `/reports/admin/${encodeURIComponent(protocol)}/status`,
    { newStatus: validated.newStatus, note: validated.note || null },
  )
  const report = reportResponseSchema.parse(data)
  if (report.protocol !== protocol) throw new Error('Resposta inesperada da alteração de status.')
  return report
}

export function getAdminReportError(error: unknown) {
  return getApiErrorMessage(error, {
    defaultMessage: 'Não foi possível ler a resposta do serviço. Tente novamente.',
    statusMessages: {
      400: 'Não foi possível concluir a operação. Confira os dados informados e tente novamente.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para acessar este recurso.',
      404: 'Denúncia não encontrada. Atualize a listagem antes de tentar novamente.',
    },
  })
}
