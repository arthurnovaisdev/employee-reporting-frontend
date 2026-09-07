import { zodResolver } from '@hookform/resolvers/zod'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import MailOutlined from '@mui/icons-material/MailOutlined'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link as RouterLink } from 'react-router-dom'
import { forgotPassword } from '../../features/auth/auth.api'
import {
  forgotPasswordSchema,
  formatCpf,
  toForgotPasswordRequest,
  type ForgotPasswordFormValues,
} from '../../features/auth/passwordForms'
import { getApiErrorMessage, getApiValidationDetails } from '../../lib/http/apiError'

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { cpf: '' },
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    setRequestError(null)

    try {
      await forgotPassword(toForgotPasswordRequest(values))
      reset()
      setSent(true)
    } catch (error) {
      const details = getApiValidationDetails(error)
      if (details?.cpf) setError('cpf', { type: 'server', message: details.cpf })
      setRequestError(getApiErrorMessage(error))
    }
  }

  if (sent) {
    return (
      <Stack spacing={2.25} sx={{ width: '100%', textAlign: 'center', alignItems: 'center' }}>
        <CheckCircleOutlined color="success" sx={{ fontSize: 46 }} />
        <Box>
          <Typography component="h1" variant="h5">
            Instruções enviadas
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: '0.9rem', lineHeight: 1.55 }}>
            Enviamos o link de redefinição para o e-mail de contato cadastrado.
          </Typography>
        </Box>
        <Alert severity="info" sx={{ width: '100%', textAlign: 'left' }}>
          Verifique também as pastas de spam e lixo eletrônico.
        </Alert>
        <Button component={RouterLink} to="/login" variant="contained" fullWidth>
          Voltar ao login
        </Button>
      </Stack>
    )
  }

  return (
    <Stack
      component="form"
      noValidate
      onSubmit={handleSubmit(onSubmit, () => setRequestError(null))}
      spacing={2.25}
      aria-busy={isSubmitting}
      sx={{ width: '100%' }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Box
          sx={{
            display: 'inline-grid',
            placeItems: 'center',
            width: 42,
            height: 42,
            mb: 1.5,
            borderRadius: '50%',
            bgcolor: 'rgba(217, 152, 27, 0.12)',
            color: 'primary.main',
          }}
        >
          <MailOutlined />
        </Box>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700 }}>
          Recuperação de senha
        </Typography>
        <Typography component="h1" variant="h5">
          Esqueci minha senha
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: '0.9rem', lineHeight: 1.55 }}>
          Informe o CPF usado no acesso para receber as instruções no e-mail de contato cadastrado.
        </Typography>
      </Box>

      {requestError && (
        <Alert severity="error" aria-live="polite">
          {requestError}
        </Alert>
      )}

      <Controller
        name="cpf"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="CPF"
            value={formatCpf(field.value)}
            onChange={(event) => field.onChange(event.target.value.replace(/\D/g, '').slice(0, 11))}
            error={Boolean(errors.cpf)}
            helperText={errors.cpf?.message}
            autoComplete="username"
            autoFocus
            fullWidth
            size="small"
            disabled={isSubmitting}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 14 } }}
          />
        )}
      />

      <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={{ minHeight: 42 }} startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}>
        {isSubmitting ? 'Enviando…' : 'Enviar instruções'}
      </Button>

      <Button
        component={RouterLink}
        to="/login"
        color="inherit"
        startIcon={<ArrowBackOutlined />}
        disabled={isSubmitting}
      >
        Voltar ao login
      </Button>
    </Stack>
  )
}
