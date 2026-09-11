export const attachmentMimeTypes = ['image/jpeg', 'image/png', 'application/pdf']
export const maxAttachmentBytes = 10 * 1024 * 1024
export const maxAttachmentCount = 5
export const maxTotalAttachmentBytes = 25 * 1024 * 1024

const extensionsByMimeType: Record<string, readonly string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg', 'jfif'],
  'image/png': ['png'],
}

export function createAttachmentFormData(files: File[], trackingCode: string) {
  const body = new FormData()
  body.append('trackingCode', trackingCode)
  files.forEach((file) => body.append('files', file))
  return body
}

export async function validateAttachments(files: File[]) {
  if (files.length > maxAttachmentCount) {
    return `Envie no máximo ${maxAttachmentCount} anexos por denúncia.`
  }

  for (const file of files) {
    if (!attachmentMimeTypes.includes(file.type)) {
      return `${file.name}: tipo não permitido. Selecione JPEG, PNG ou PDF.`
    }
    if (file.size === 0) return `${file.name}: o arquivo está vazio.`
    if (file.size > maxAttachmentBytes) return `${file.name}: o limite por arquivo é 10 MB.`
    const extensionMatch = file.name.match(/\.([^.]+)$/)
    if (extensionMatch && !extensionsByMimeType[file.type]?.includes(extensionMatch[1].toLowerCase())) {
      return `${file.name}: a extensão não corresponde ao tipo do arquivo.`
    }
  }

  if (files.length === 0) return null
  if (files.reduce((total, file) => total + file.size, 0) > maxTotalAttachmentBytes) {
    return 'Os anexos juntos ultrapassam 25 MiB. Remova um arquivo ou selecione arquivos menores.'
  }
  return null
}
