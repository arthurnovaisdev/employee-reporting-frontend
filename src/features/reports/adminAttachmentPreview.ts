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

// Reserva a aba no clique, antes do await, para evitar bloqueio de pop-ups.
export function reserveAttachmentPreview(onDispose: () => void = () => {}) {
  const opened = window.open('about:blank', '_blank')
  if (!opened) return null
  const tab = opened
  tab.opener = null
  tab.document.title = 'Visualização de anexo'
  tab.document.body.textContent = 'Carregando anexo…'
  let objectUrl: string | null = null
  let disposed = false
  const timer = window.setInterval(() => { if (tab.closed) dispose() }, 1000)

  function dispose() {
    if (disposed) return
    disposed = true
    window.clearInterval(timer)
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    else if (!tab.closed) tab.close()
    onDispose()
  }

  return {
    dispose,
    show(blob: Blob) {
      if (disposed || tab.closed) { dispose(); return }
      // Apenas os formatos de visualização previstos pelo contrato.
      if (!(blob instanceof Blob) || !Object.hasOwn(adminAttachmentTypeLabels, blob.type)) {
        throw new Error('Formato de anexo não reconhecido.')
      }
      objectUrl = URL.createObjectURL(blob)
      tab.location.replace(objectUrl)
    },
  }
}
