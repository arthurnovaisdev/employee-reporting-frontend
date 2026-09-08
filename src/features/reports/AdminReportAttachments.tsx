import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getAdminAttachment, getAdminAttachmentError, type AttachmentResponseDTO } from './adminReports.api'
import { adminAttachmentTypeLabels, formatAttachmentSize, reserveAttachmentPreview } from './adminAttachmentPreview'
import { formatReportCreatedAt } from './protocolConsult'

export function AdminReportAttachments({ protocol, attachments }: {
  protocol: string
  attachments: AttachmentResponseDTO[]
}) {
  return (
    <Stack component="section" spacing={2} aria-labelledby="report-attachments-title">
      <Typography id="report-attachments-title" component="h2" variant="h6">Anexos</Typography>
      {attachments.length === 0 ? (
        <Typography color="text.secondary" variant="body2" role="status">Nenhum anexo enviado nesta denúncia.</Typography>
      ) : (
        <Stack component="ul" spacing={1.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {attachments.map((attachment) => <AttachmentItem key={attachment.id} protocol={protocol} attachment={attachment} />)}
        </Stack>
      )}
    </Stack>
  )
}

function AttachmentItem({ protocol, attachment }: { protocol: string; attachment: AttachmentResponseDTO }) {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef<AbortController | null>(null)
  const previews = useRef(new Set<NonNullable<ReturnType<typeof reserveAttachmentPreview>>>())
  useEffect(() => {
    const opened = previews.current
    return () => {
      inFlight.current?.abort()
      inFlight.current = null
      opened.forEach((preview) => preview.dispose())
      opened.clear()
    }
  }, [])
  const supported = Object.hasOwn(adminAttachmentTypeLabels, attachment.contentType)
  const allowed = session?.role === 'ADMIN' && session.passwordChanged

  async function view() {
    if (inFlight.current || !allowed || !supported) return
    setError(null)
    const controller = new AbortController()
    const preview = reserveAttachmentPreview(() => {
      controller.abort()
      if (preview) previews.current.delete(preview)
    })
    if (!preview) {
      setError('O navegador bloqueou a nova aba. Permita pop-ups para este site e tente novamente.')
      return
    }
    previews.current.add(preview)
    inFlight.current = controller
    setLoading(true)
    try {
      const blob = await getAdminAttachment(protocol, attachment.id, controller.signal)
      if (!controller.signal.aborted) preview.show(blob)
    } catch (failure) {
      if (!controller.signal.aborted) setError(getAdminAttachmentError(failure))
      preview.dispose()
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null
        setLoading(false)
      }
    }
  }

  return (
    <Paper component="li" variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <DescriptionOutlined color="primary" aria-hidden="true" sx={{ mt: 0.25 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{attachment.originalFileName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {adminAttachmentTypeLabels[attachment.contentType] ?? 'Arquivo'} · {formatAttachmentSize(attachment.fileSize)}
            </Typography>
            {attachment.createdAt && <Typography variant="body2" color="text.secondary">Enviado em {formatReportCreatedAt(attachment.createdAt)}</Typography>}
          </Box>
        </Stack>
        {error && <Alert severity="error" aria-live="assertive">{error}</Alert>}
        {!supported && <Typography variant="body2" color="text.secondary">Visualização indisponível para este tipo de arquivo.</Typography>}
        <Button variant="outlined" size="small" onClick={() => void view()} disabled={loading || !allowed || !supported}
          aria-label={`${error ? 'Tentar visualizar novamente' : 'Visualizar'} ${attachment.originalFileName} em nova aba`}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <OpenInNewOutlined />}
          sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>
          {loading ? 'Carregando…' : error ? 'Tentar novamente' : 'Visualizar'}
        </Button>
        {loading && <Typography role="status" aria-live="polite" variant="caption" color="text.secondary">Preparando visualização do anexo…</Typography>}
      </Stack>
    </Paper>
  )
}
