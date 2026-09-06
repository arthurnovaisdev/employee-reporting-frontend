import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { useReportFlow } from '../../features/reports/ReportFlowLayout'

export function ReportSuccessPage() {
  const { receipt } = useReportFlow()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null)

  if (session?.role === 'ADMIN') return <Navigate to="/admin/reports" replace />
  if (!receipt) return <Navigate to={session ? '/reports/new' : '/login'} replace />

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setFeedback({ text: `${label} copiado para a área de transferência.`, error: false })
    } catch {
      setFeedback({ text: 'Não foi possível copiar automaticamente. Selecione e copie as informações abaixo.', error: true })
    }
  }

  return (
    <Paper sx={{ maxWidth: 640, mx: 'auto', p: { xs: 2.5, sm: 4 } }}>
      <Stack spacing={2.5}>
        <Box sx={{ textAlign: 'center' }}>
          <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 48, mb: 1 }} />
          <Typography component="h1" variant="h5">Denúncia registrada com sucesso</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>Guarde as informações abaixo para acompanhar sua denúncia.</Typography>
        </Box>
        {receipt.attachmentStatus === 'failed' && <Alert severity="warning">
          Sua denúncia foi registrada. Houve falha somente no envio dos anexos. O protocolo e o código de acompanhamento continuam válidos.
          Não foi possível confirmar quais arquivos foram recebidos. Não registre a denúncia novamente.
        </Alert>}
        {receipt.attachmentStatus === 'uploaded' && <Alert severity="success">Os anexos foram enviados com sucesso.</Alert>}
        {receipt.sessionExpired && <Alert severity="info">Sua sessão expirou durante o envio dos anexos. Guarde os dados abaixo antes de entrar novamente.</Alert>}
        <Alert severity="warning">O código é exibido somente neste registro e não pode ser recuperado. Guarde ambos em um local seguro. Ao sair ou recarregar esta página, essas informações serão descartadas.</Alert>
        {[
          { label: 'Protocolo', value: receipt.protocol, action: 'Copiar protocolo' },
          { label: 'Código de acompanhamento', value: receipt.trackingCode, action: 'Copiar código' },
        ].map((item) => (
          <Box key={item.label} sx={{ p: 2, bgcolor: 'rgba(217, 152, 27, 0.06)', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">{item.label}</Typography>
            <Typography sx={{ color: 'primary.main', fontFamily: 'monospace', fontWeight: 700, fontSize: { xs: '1.2rem', sm: '1.4rem' }, my: 1, userSelect: 'all', overflowWrap: 'anywhere' }}>{item.value}</Typography>
            <Button size="small" startIcon={<ContentCopyOutlined />} onClick={() => void copy(item.value, item.label)}>{item.action}</Button>
          </Box>
        ))}
        <Button variant="outlined" startIcon={<ContentCopyOutlined />} onClick={() => void copy(`Protocolo: ${receipt.protocol}\nCódigo de acompanhamento: ${receipt.trackingCode}`, 'Protocolo e código')}>Copiar ambos</Button>
        {feedback && <Alert severity={feedback.error ? 'error' : 'success'} role="status">{feedback.text}</Alert>}
        <FormControlLabel control={<Checkbox checked={saved} onChange={(event) => setSaved(event.target.checked)} />} label="Guardei meu protocolo e meu código de acompanhamento." />
        <Button variant="contained" disabled={!saved} onClick={() => navigate(session ? '/home' : '/login', { replace: true })}>{session ? 'Voltar ao início' : 'Entrar novamente'}</Button>
      </Stack>
    </Paper>
  )
}
