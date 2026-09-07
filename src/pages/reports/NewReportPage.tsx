import { zodResolver } from '@hookform/resolvers/zod'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import SendOutlined from '@mui/icons-material/SendOutlined'
import { Alert, Box, Button, CircularProgress, MenuItem, Paper, Skeleton, Stack, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { AttachmentPicker } from '../../features/reports/AttachmentPicker'
import { getCategories } from '../../features/reports/categories.api'
import { useReportFlow } from '../../features/reports/ReportFlowLayout'
import { reportSchema, toReportRequest, type ReportFormValues } from '../../features/reports/report.schema'
import { submitReport } from '../../features/reports/reports.api'
import { getApiErrorMessage, getApiValidationDetails } from '../../lib/http/apiError'

export function NewReportPage() {
  const navigate = useNavigate()
  const { endSession } = useAuth()
  const { receipt, setReceipt, setBusy } = useReportFlow()
  const [files, setFiles] = useState<File[]>([])
  const [validatingFiles, setValidatingFiles] = useState(false)
  const [stage, setStage] = useState<'idle' | 'creating' | 'uploading'>('idle')
  const [error, setErrorMessage] = useState<string | null>(null)
  const submitting = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const { control, register, handleSubmit, setError, reset, watch, formState: { errors } } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { categoryId: '', description: '', incidentDate: '', incidentLocation: '' },
  })
  const categories = useQuery({
    queryKey: ['report-categories'],
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: 60_000,
    enabled: stage === 'idle' && !receipt,
  })
  const availableCategories = categories.data ?? []
  const busy = stage !== 'idle'
  const disabled = busy || validatingFiles

  useEffect(() => {
    if (!busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  async function onSubmit(values: ReportFormValues) {
    if (submitting.current || validatingFiles || receipt) return
    if (!availableCategories.some((category) => category.id === values.categoryId)) {
      setError('categoryId', { message: 'Selecione uma categoria disponível.' })
      return
    }
    submitting.current = true
    setBusy(true)
    setStage('creating')
    setErrorMessage(null)
    try {
      const result = await submitReport(toReportRequest(values), files, (created) => {
        if (!mounted.current) return
        setReceipt(created)
        reset()
        setStage(created.attachmentStatus === 'uploading' ? 'uploading' : 'creating')
      })
      if (result.sessionExpired) endSession()
      if (!mounted.current) return
      setReceipt(result)
      setFiles([])
      navigate('/reports/success', { replace: true })
    } catch (failure) {
      if (!mounted.current) return
      if (axios.isAxiosError(failure)) {
        const details = getApiValidationDetails(failure)
        for (const field of ['categoryId', 'description', 'incidentDate', 'incidentLocation'] as const) {
          if (details?.[field]) setError(field, { type: 'server', message: details[field] })
        }
      }
      setErrorMessage(getApiErrorMessage(failure))
    } finally {
      submitting.current = false
      if (mounted.current) {
        setStage('idle')
        setBusy(false)
      }
    }
  }

  if (receipt && !busy) return <Navigate to="/reports/success" replace />

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Button startIcon={<ArrowBackOutlined />} onClick={() => navigate('/home')} disabled={busy} sx={{ mb: 2, color: 'text.secondary' }}>Voltar ao início</Button>
      <Paper sx={{ p: { xs: 2.5, sm: 4 } }}>
        <Stack component="form" noValidate autoComplete="off" onSubmit={handleSubmit(onSubmit)} spacing={2.5} aria-busy={busy}>
          <Box>
            <Typography color="primary.main" variant="overline">Nova denúncia</Typography>
            <Typography component="h1" variant="h5">Registrar denúncia</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
              Relate o ocorrido com clareza. Categoria e descrição são obrigatórias; os demais campos são opcionais.
            </Typography>
          </Box>
          {error && <Alert severity="error" aria-live="assertive">{error}</Alert>}
          {categories.isPending && (
            <Box role="status" aria-live="polite" aria-label="Carregando categorias">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Carregando categorias…</Typography>
              <Skeleton variant="rounded" height={56} aria-hidden="true" />
            </Box>
          )}
          {categories.isError && <Alert severity="error" aria-live="assertive" action={<Button color="inherit" size="small" disabled={categories.isFetching} onClick={() => void categories.refetch()}>{categories.isFetching ? 'Tentando…' : 'Tentar novamente'}</Button>}>{getApiErrorMessage(categories.error, { defaultMessage: 'Não foi possível carregar as categorias.' })}</Alert>}
          {categories.isSuccess && availableCategories.length === 0 && <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => void categories.refetch()}>Atualizar</Button>}>Nenhuma categoria está disponível no momento.</Alert>}
          <Controller name="categoryId" control={control} render={({ field }) => (
            <TextField {...field} select fullWidth required label="Categoria" disabled={disabled || !categories.isSuccess || !availableCategories.length}
              error={Boolean(errors.categoryId)} helperText={errors.categoryId?.message}>
              {availableCategories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
            </TextField>
          )} />
          <TextField {...register('description')} label="Descrição do ocorrido" placeholder="Descreva o que aconteceu…" multiline minRows={6} fullWidth required disabled={disabled}
            error={Boolean(errors.description)} helperText={errors.description?.message ?? `${watch('description').length.toLocaleString('pt-BR')} / 5.000 caracteres`} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField {...register('incidentDate')} type="date" label="Data do ocorrido (opcional)" fullWidth disabled={disabled}
              slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.incidentDate)} helperText={errors.incidentDate?.message} />
            <TextField {...register('incidentLocation')} label="Local do ocorrido (opcional)" fullWidth disabled={disabled}
              error={Boolean(errors.incidentLocation)} helperText={errors.incidentLocation?.message} />
          </Stack>
          <AttachmentPicker files={files} onChange={setFiles} disabled={disabled} validating={validatingFiles} onValidating={setValidatingFiles} />
          <Typography color="text.secondary" variant="body2">Revise as informações antes de enviar. Ao finalizar, guarde o protocolo e o código de acompanhamento para consultar sua denúncia.</Typography>
          {busy && <Alert severity="info" role="status">{stage === 'uploading' ? 'Denúncia registrada. Enviando os anexos…' : 'Registrando sua denúncia…'} Aguarde nesta página.</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={disabled || !categories.isSuccess || !availableCategories.length}
            startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <SendOutlined />}>
            {stage === 'uploading' ? 'Enviando anexos…' : busy ? 'Registrando…' : validatingFiles ? 'Verificando arquivos…' : 'Enviar denúncia'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
