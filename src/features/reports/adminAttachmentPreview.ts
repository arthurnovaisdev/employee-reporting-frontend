export const adminAttachmentTypeLabels: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'Imagem JPEG',
  'image/png': 'Imagem PNG',
}

export function formatAttachmentSize(bytes: number | null | undefined) {
  if (bytes == null) return 'Tamanho não informado'
  if (bytes < 1024) return `${bytes.toLocaleString('pt-BR')} bytes`
  const unit = bytes < 1024 * 1024 ? 'KB' : 'MB'
  const size = bytes / (unit === 'KB' ? 1024 : 1024 * 1024)
  return `${size.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}`
}

export function downloadAttachment(blob: Blob, fileName: string) {
  if (!(blob instanceof Blob) || !Object.hasOwn(adminAttachmentTypeLabels, blob.type)) {
    throw new Error('Formato de anexo não reconhecido.')
  }
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}
