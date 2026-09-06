import axios from 'axios'
import { apiClient } from '../../lib/http/apiClient'
import { createAttachmentFormData, validateAttachments } from './attachments'
import type { ProtocolResponseDTO, ReportRequestDTO } from './report.schema'

export type AttachmentStatus = 'none' | 'uploading' | 'uploaded' | 'failed'
export interface ReportReceipt extends ProtocolResponseDTO {
  attachmentStatus: AttachmentStatus
  sessionExpired?: boolean
}

export async function submitReport(
  request: ReportRequestDTO,
  files: File[],
  onCreated: (receipt: ReportReceipt) => void,
): Promise<ReportReceipt> {
  const validationError = await validateAttachments(files)
  if (validationError) throw new Error(validationError)

  const { data } = await apiClient.post<ProtocolResponseDTO>('/reports', request)
  const receipt: ReportReceipt = {
    protocol: data.protocol,
    trackingCode: data.trackingCode,
    attachmentStatus: files.length ? 'uploading' : 'none',
  }
  // Preserva o comprovante antes de qualquer operação de upload. Não colocar
  // em caches de mutation, storage, URL, history.state ou logs.
  onCreated(receipt)
  if (!files.length) return receipt

  try {
    const error = await validateAttachments(files, receipt.trackingCode)
    if (error) throw new Error(error)
    await apiClient.post(
      `/reports/${encodeURIComponent(receipt.protocol)}/attachments`,
      createAttachmentFormData(files, receipt.trackingCode),
      { handleAuthErrorLocally: true },
    )
    return { ...receipt, attachmentStatus: 'uploaded' }
  } catch (error) {
    // Não há informação sobre quais arquivos foram gravados: nunca repetir o lote.
    return {
      ...receipt,
      attachmentStatus: 'failed',
      sessionExpired: axios.isAxiosError(error) && error.response?.status === 401,
    }
  }
}
