import { z } from 'zod'

export const protocolPattern = /^DEN-\d{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/
export const trackingCodePattern = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/
export const protocolSchema = z.string().regex(protocolPattern)
export const trackingCodeSchema = z.string().regex(trackingCodePattern)

export function todayAsLocalIsoDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const reportSchema = z.object({
  categoryId: z.string().uuid('Selecione uma categoria válida.'),
  description: z.string()
    .max(5000, 'A descrição deve ter no máximo 5.000 caracteres.')
    .refine((value) => value.trim().length > 0, 'Descreva o ocorrido.'),
  incidentDate: z.union([z.literal(''), z.iso.date('Informe uma data válida.')])
    .refine((value) => !value || value <= todayAsLocalIsoDate(), 'A data do ocorrido não pode ser futura.'),
  incidentLocation: z.string().max(255, 'O local deve ter no máximo 255 caracteres.'),
})

export type ReportFormValues = z.infer<typeof reportSchema>

export interface ReportRequestDTO {
  categoryId: string
  description: string
  incidentDate: string | null
  incidentLocation: string | null
}

export const protocolResponseSchema = z.object({
  protocol: protocolSchema,
  trackingCode: trackingCodeSchema,
})

export type ProtocolResponseDTO = z.infer<typeof protocolResponseSchema>

export function toReportRequest(values: ReportFormValues): ReportRequestDTO {
  return {
    categoryId: values.categoryId,
    description: values.description,
    incidentDate: values.incidentDate || null,
    incidentLocation: values.incidentLocation.trim() || null,
  }
}
