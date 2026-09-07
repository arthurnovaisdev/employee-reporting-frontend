import { zodResolver } from '@hookform/resolvers/zod'
import LockOutlined from '@mui/icons-material/LockOutlined'
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useState } from 'react'
import { login } from '../../features/auth/auth.api'
import { useAuth } from '../../features/auth/AuthContext'
import { getApiErrorMessage, getApiValidationDetails } from '../../lib/http/apiError'

const loginSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/, 'Informe um CPF com 11 dígitos.'),
  password: z
    .string()
    .min(8, 'A senha deve ter entre 8 e 100 caracteres.')
    .max(100, 'A senha deve ter entre 8 e 100 caracteres.')
    .refine((value) => value.trim().length > 0, 'Informe sua senha.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function formatCpf(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { startSession } = useAuth()
  const authMessage = typeof (location.state as { authMessage?: unknown } | null)?.authMessage === 'string'
    ? (location.state as { authMessage: string }).authMessage
    : null
  const {
    control,
    register,
    handleSubmit,
    resetField,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      cpf: '',
      password: '',
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setRequestError(null)

    try {
      const session = await login(values)
      resetField('password')
      startSession(session)

      if (!session.passwordChanged) {
        navigate('/change-password', { replace: true })
        return
      }

      navigate(session.role === 'ADMIN' ? '/admin/reports' : '/home', { replace: true })
    } catch (error) {
      resetField('password')
      const details = getApiValidationDetails(error)
      for (const field of ['cpf', 'password'] as const) {
        if (details?.[field]) setError(field, { type: 'server', message: details[field] })
      }
      setRequestError(getApiErrorMessage(error))
    }
  }

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit(onSubmit, () => setRequestError(null))}
      aria-busy={isSubmitting}
      sx={{ width: '100%' }}
    >
      <Stack spacing={2.25}>
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              display: 'inline-grid',
              placeItems: 'center',
              width: 42,
              height: 42,
              borderRadius: '50%',
              bgcolor: 'rgba(217, 152, 27, 0.12)',
              color: 'primary.main',
              mb: 1.5,
            }}
          >
            <LockOutlined />
          </Box>
          <Typography component="h1" variant="h5">
            Ouvidoria Interna
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: '0.9rem' }}>
            Canal de denúncias e manifestações
          </Typography>
        </Box>

        {(requestError || authMessage) && (
          <Alert severity="error" aria-live="polite">
            {requestError ?? authMessage}
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

        <TextField
          {...register('password')}
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          error={Boolean(errors.password)}
          helperText={errors.password?.message}
          autoComplete="current-password"
          fullWidth
          size="small"
          disabled={isSubmitting}
          slotProps={{
            htmlInput: { maxLength: 100 },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((visible) => !visible)}
                    edge="end"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isSubmitting}
          sx={{ minHeight: 42 }}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>

        <RouterLink
          to="/forgot-password"
          style={{
            color: '#d9981b',
            fontSize: '0.875rem',
            textAlign: 'center',
            textDecoration: 'none',
          }}
        >
          Esqueci minha senha
        </RouterLink>

        <Typography color="text.disabled" sx={{ fontSize: '0.75rem', pt: 1, textAlign: 'center' }}>
          Acesso restrito a funcionários da empresa
        </Typography>
      </Stack>
    </Box>
  )
}
