export const attachmentMimeTypes = ['image/jpeg', 'image/png', 'application/pdf']
export const maxAttachmentBytes = 10 * 1024 * 1024

export function createAttachmentFormData(files: File[], trackingCode: string) {
  const body = new FormData()
  body.append('trackingCode', trackingCode)
  files.forEach((file) => body.append('files', file))
  return body
}

export async function validateAttachments(files: File[], trackingCode = '000000') {
  for (const file of files) {
    if (!attachmentMimeTypes.includes(file.type)) {
      return `${file.name}: tipo não permitido. Selecione JPEG, PNG ou PDF.`
    }
    if (file.size === 0) return `${file.name}: o arquivo está vazio.`
    if (file.size > maxAttachmentBytes) return `${file.name}: o limite por arquivo é 10 MB.`
  }

  if (files.length === 0) return null
  if (files.reduce((total, file) => total + file.size, 0) > maxAttachmentBytes) {
    return 'Os arquivos juntos ultrapassam 10 MB. Remova um arquivo ou selecione arquivos menores.'
  }

  // Mede também nomes, headers e boundary gerados pelo navegador. O servidor
  // continua sendo a validação definitiva do multipart efetivamente enviado.
  const multipart = await new Response(createAttachmentFormData(files, trackingCode)).blob()
  if (multipart.size > maxAttachmentBytes) {
    return 'O envio completo ultrapassa 10 MB, incluindo os dados dos arquivos. Selecione arquivos menores.'
  }
  return null
}
