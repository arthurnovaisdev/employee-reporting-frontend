import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField, Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { getAdminReportError, reportStatusUpdateSchema, updateReportStatus, type ReportStatusUpdateForm } from './adminReports.api'
import { formatReportCreatedAt, reportStatusLabels, reportStatuses, type ReportResponseDTO } from './protocolConsult'

export function AdminReportDetail({ report, onClose, onUpdated }: {
  report: ReportResponseDTO
  onClose: () => void
  onUpdated: (report: ReportResponseDTO) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<ReportStatusUpdateForm | null>(null)
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const { control, register, watch, handleSubmit, reset, formState: { errors } } = useForm<ReportStatusUpdateForm>({
    resolver: zodResolver(reportStatusUpdateSchema),
    defaultValues: { newStatus: report.status, note: '' },
  })
  const unchanged = watch('newStatus') === report.status

  async function save() {
    if (!confirmation || submitting.current) return
    submitting.current = true
    setSaving(true)
    setError(null)
    try {
      const updated = await updateReportStatus(report.protocol, confirmation)
      if (!mounted.current) return
      reset({ newStatus: updated.status, note: '' })
      onUpdated(updated)
    } catch (failure) {
      if (mounted.current) setError(getAdminReportError(failure))
    } finally {
      submitting.current = false
      if (mounted.current) {
        setSaving(false)
        setConfirmation(null)
      }
    }
  }

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={() => { if (!saving) onClose() }} aria-labelledby="report-detail-title">
      <DialogTitle id="report-detail-title">Detalhe da denúncia</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{report.protocol}</Typography>
            <Chip label={reportStatusLabels[report.status]} color="primary" variant="outlined" size="small" sx={{ mt: 1 }} />
          </Box>
          <Box component="dl" sx={{ m: 0, '& dt': { color: 'text.secondary', fontSize: '0.875rem' }, '& dd': { m: 0, mb: 2, overflowWrap: 'anywhere' } }}>
            <Typography component="dt">Categoria</Typography><Typography component="dd">{report.category}</Typography>
            <Typography component="dt">Registrada em</Typography><Typography component="dd">{formatReportCreatedAt(report.createdAt)}</Typography>
            <Typography component="dt">Descrição</Typography><Typography component="dd" sx={{ whiteSpace: 'pre-wrap' }}>{report.description}</Typography>
          </Box>
          <Divider />
          <Stack component="form" id="report-status-form" noValidate onSubmit={handleSubmit((values) => {
            if (!unchanged && !saving) { setError(null); setConfirmation(values) }
          })} spacing={2} aria-busy={saving}>
            <Typography component="h2" variant="h6">Alterar status</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Controller name="newStatus" control={control} render={({ field }) => (
              <TextField {...field} select label="Novo status" fullWidth disabled={saving || Boolean(confirmation)} error={Boolean(errors.newStatus)} helperText={errors.newStatus?.message}>
                {reportStatuses.map((status) => <MenuItem key={status} value={status}>{reportStatusLabels[status]}</MenuItem>)}
              </TextField>
            )} />
            <TextField {...register('note')} label="Observação (opcional)" multiline minRows={3} fullWidth
              disabled={saving || Boolean(confirmation)} error={Boolean(errors.note)}
              helperText={errors.note?.message ?? `${watch('note').length} / 2.000 caracteres`} />
            <Typography variant="body2" color="text.secondary">
              A observação acompanha uma mudança de status. Após o envio, ela não estará disponível para consulta nesta tela.
            </Typography>
            {unchanged && <Typography variant="body2" color="text.secondary">Selecione um status diferente para salvar uma alteração.</Typography>}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>Fechar</Button>
        <Button type="submit" form="report-status-form" variant="contained" disabled={unchanged || saving || Boolean(confirmation)}>Revisar alteração</Button>
      </DialogActions>
      <Dialog open={Boolean(confirmation)} onClose={() => { if (!saving) setConfirmation(null) }} maxWidth="xs" fullWidth aria-labelledby="confirm-status-title">
        <DialogTitle id="confirm-status-title">Confirmar alteração?</DialogTitle>
        <DialogContent>
          <Typography>De {reportStatusLabels[report.status]} para {confirmation && reportStatusLabels[confirmation.newStatus]}.</Typography>
          {confirmation?.note && <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{confirmation.note}</Typography>}
          {saving && <Typography role="status" sx={{ mt: 2 }}>Salvando alteração…</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmation(null)} disabled={saving}>Voltar</Button>
          <Button onClick={() => void save()} variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}>Confirmar e salvar</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}
