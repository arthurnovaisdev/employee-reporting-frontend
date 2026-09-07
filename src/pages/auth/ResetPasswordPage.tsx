import { zodResolver } from '@hookform/resolvers/zod'
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import KeyOutlined from '@mui/icons-material/KeyOutlined'
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
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { resetPassword } from '../../features/auth/auth.api'
import { useAuth } from '../../features/auth/AuthContext'
import { getTerminalResetTokenError } from '../../features/auth/passwordErrors'
import {
  resetPasswordSchema,
  toResetPasswordRequest,
  type ResetPasswordFormValues,
} from '../../features/auth/passwordForms'
import { getApiErrorMessage } from '../../lib/http/apiError'

const missingTokenMessage = 'Este link de recuperação é inválido ou não contém um token.'

export function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { endSession } = useAuth()
  const [token, setToken] = useState(() => {
    const value = new URLSearchParams(location.search).get('token') ?? ''
    return value.trim().length > 0 ? value : ''
  })
  const [tokenError, setTokenError] = useState<string | null>(() => token ? null : missingTokenMessage)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmNewPassword: '' },
  })

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    if (!searchParams.has('token')) return

    searchParams.delete('token')
    navigate(
      { pathname: location.pathname, search: searchParams.toString() },
      { replace: true },
    )
  }, [location.pathname, location.search, navigate])

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      setTokenError(missingTokenMessage)
      return
    }

    setRequestError(null)

    try {
      await resetPassword(toResetPasswordRequest(values, token))
      reset()
      setToken('')
      endSession()
      setSuccess(true)
    } catch (error) {
      reset()
      const terminalTokenError = getTerminalResetTokenError(error)

      if (terminalTokenError) {
        setToken('')
        setTokenError(terminalTokenError)
        return
      }

      setRequestError(getApiErrorMessage(error))
    }
  }

  const passwordAdornment = (visible: boolean, toggle: () => void, label: string) => (
    <InputAdornment position="end">
      <IconButton onClick={toggle} edge="end" aria-label={label} disabled={isSubmitting}>
        {visible ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
      </IconButton>
    </InputAdornment>
  )

  if (success) {
    return (
      <Stack spacing={2.25} sx={{ width: '100%', textAlign: 'center', alignItems: 'center' }}>
        <CheckCircleOutlined color="success" sx={{ fontSize: 46 }} />
        <Box>
          <Typography component="h1" variant="h5">
            Senha redefinida
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: '0.9rem', lineHeight: 1.55 }}>
            Sua nova senha foi cadastrada. Volte ao login para acessar o sistema.
          </Typography>
        </Box>
        <Button component={RouterLink} to="/login" variant="contained" fullWidth>
          Voltar ao login
        </Button>
      </Stack>
    )
  }

  if (tokenError) {
    return (
      <Stack spacing={2.25} sx={{ width: '100%', textAlign: 'center' }}>
        <Box>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700 }}>
            Recuperação de senha
          </Typography>
          <Typography component="h1" variant="h5">
            Link indisponível
          </Typography>
        </Box>
        <Alert severity="error" sx={{ textAlign: 'left' }}>
          {tokenError}
        </Alert>
        <Button component={RouterLink} to="/forgot-password" variant="contained" fullWidth>
          Solicitar novo link
        </Button>
        <Button component={RouterLink} to="/login" color="inherit">
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
          <KeyOutlined />
        </Box>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700 }}>
          Recuperação de senha
        </Typography>
        <Typography component="h1" variant="h5">
          Redefinir senha
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: '0.9rem' }}>
          Escolha uma nova senha com 8 a 100 caracteres.
        </Typography>
      </Box>

      {requestError && (
        <Alert severity="error" aria-live="polite">
          {requestError}
        </Alert>
      )}

      <TextField
        {...register('newPassword')}
        label="Nova senha"
        type={showNewPassword ? 'text' : 'password'}
        error={Boolean(errors.newPassword)}
        helperText={errors.newPassword?.message}
        autoComplete="new-password"
        fullWidth
        size="small"
        disabled={isSubmitting}
        slotProps={{
          htmlInput: { maxLength: 100 },
          input: {
            endAdornment: passwordAdornment(
              showNewPassword,
              () => setShowNewPassword((visible) => !visible),
              showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha',
            ),
          },
        }}
      />

      <TextField
        {...register('confirmNewPassword')}
        label="Confirmar nova senha"
        type={showConfirmation ? 'text' : 'password'}
        error={Boolean(errors.confirmNewPassword)}
        helperText={errors.confirmNewPassword?.message}
        autoComplete="new-password"
        fullWidth
        size="small"
        disabled={isSubmitting}
        slotProps={{
          htmlInput: { maxLength: 100 },
          input: {
            endAdornment: passwordAdornment(
              showConfirmation,
              () => setShowConfirmation((visible) => !visible),
              showConfirmation ? 'Ocultar confirmação' : 'Mostrar confirmação',
            ),
          },
        }}
      />

      <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={{ minHeight: 42 }}>
        {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Redefinir senha'}
      </Button>
    </Stack>
  )
}
