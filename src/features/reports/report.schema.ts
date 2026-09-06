import { z } from 'zod'

export const reportSchema = z.object({
  categoryId: z.string().uuid('Selecione uma categoria válida.'),
  description: z.string()
    .max(5000, 'A descrição deve ter no máximo 5.000 caracteres.')
    .refine((value) => value.trim().length > 0, 'Descreva o ocorrido.'),
  incidentDate: z.union([z.literal(''), z.iso.date('Informe uma data válida.')]),
  incidentLocation: z.string(),
})

export type ReportFormValues = z.infer<typeof reportSchema>

export interface ReportRequestDTO {
  categoryId: string
  description: string
  incidentDate: string | null
  incidentLocation: string | null
}

export interface ProtocolResponseDTO {
  protocol: string
  trackingCode: string
}

export function toReportRequest(values: ReportFormValues): ReportRequestDTO {
  return {
    categoryId: values.categoryId,
    description: values.description,
    incidentDate: values.incidentDate || null,
    incidentLocation: values.incidentLocation || null,
  }
}
