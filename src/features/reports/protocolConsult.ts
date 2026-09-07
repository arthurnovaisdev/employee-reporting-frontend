import { z } from 'zod'
import { apiClient } from '../../lib/http/apiClient'
import { getApiErrorMessage } from '../../lib/http/apiError'

export const reportStatuses = [
  'RECEIVED',
  'IN_ANALYSIS',
  'UNDER_INVESTIGATION',
  'AWAITING_ACTION',
  'CLOSED',
  'ARCHIVED',
] as const

export type ReportStatus = (typeof reportStatuses)[number]

export const reportStatusLabels: Record<ReportStatus, string> = {
  RECEIVED: 'Recebida',
  IN_ANALYSIS: 'Em análise',
  UNDER_INVESTIGATION: 'Em investigação',
  AWAITING_ACTION: 'Aguardando providência',
  CLOSED: 'Encerrada',
  ARCHIVED: 'Arquivada',
}

const normalizeCredential = (value: string) => value.trim().toUpperCase()

export const protocolConsultSchema = z.object({
  protocol: z.string()
    .transform(normalizeCredential)
    .pipe(z.string().regex(/^DEN-\d{4}-\d{7}$/, 'Informe um protocolo válido.')),
  code: z.string()
    .transform(normalizeCredential)
    .pipe(
      z.string().regex(
        /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/,
        'Informe um código de acompanhamento válido.',
      ),
    ),
})

export type ProtocolConsultFormValues = z.infer<typeof protocolConsultSchema>

export const reportResponseSchema = z.object({
  protocol: z.string().min(1),
  category: z.string().min(1),
  description: z.string(),
  status: z.enum(reportStatuses),
  createdAt: z.string().min(1),
})

export type ReportResponseDTO = z.infer<typeof reportResponseSchema>

export async function consultReport(values: ProtocolConsultFormValues) {
  const { data } = await apiClient.get('/reports/consult', {
    params: {
      protocol: values.protocol,
      code: values.code,
    },
  })

  return reportResponseSchema.parse(data)
}

export function getProtocolConsultErrorMessage(error: unknown) {
  return getApiErrorMessage(error, {
    defaultMessage: 'Não foi possível concluir a consulta. Tente novamente.',
    statusMessages: {
      400: 'Os dados da consulta não são válidos. Confira o protocolo e o código de acompanhamento.',
      404: 'Não foi possível localizar uma denúncia com os dados informados. Confira o protocolo e o código de acompanhamento.',
    },
  })
}

export function formatReportCreatedAt(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/,
  )

  if (!match) return value

  const [, year, month, day, hour, minute] = match
  return `${day}/${month}/${year} às ${hour}:${minute}`
}
