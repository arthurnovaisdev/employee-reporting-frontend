import { zodResolver } from '@hookform/resolvers/zod'
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
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { changePassword } from '../../features/auth/auth.api'
import { useAuth } from '../../features/auth/AuthContext'
import {
  changePasswordSchema,
  toChangePasswordRequest,
  type ChangePasswordFormValues,
} from '../../features/auth/passwordForms'
import { getApiErrorMessage, getApiValidationDetails } from '../../lib/http/apiError'

export function ChangePasswordPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { endSession, session } = useAuth()
  const firstAccess = session?.passwordChanged === false
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  async function onSubmit(values: ChangePasswordFormValues) {
    setRequestError(null)

    try {
      await changePassword(toChangePasswordRequest(values))
      reset()
      endSession()
      navigate('/login', {
        replace: true,
        state: { loginNotice: 'Senha alterada com sucesso. Entre novamente para continuar.' },
      })
    } catch (error) {
      reset()
      const details = getApiValidationDetails(error)
      for (const field of ['currentPassword', 'newPassword'] as const) {
        if (details?.[field]) setError(field, { type: 'server', message: details[field] })
      }
      setRequestError(getApiErrorMessage(error))
    }
  }

  const passwordAdornment = (visible: boolean, toggle: () => void) => (
    <InputAdornment position="end">
      <IconButton
        onClick={toggle}
        edge="end"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        disabled={isSubmitting}
      >
        {visible ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
      </IconButton>
    </InputAdornment>
  )

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
            <KeyOutlined />
          </Box>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700 }}>
            {firstAccess ? 'Primeiro acesso' : 'Segurança da conta'}
          </Typography>
          <Typography component="h1" variant="h5">
            {firstAccess ? 'Atualize sua senha' : 'Alterar senha'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: '0.9rem' }}>
            {firstAccess
              ? 'Esta alteração é obrigatória antes de continuar.'
              : 'Defina uma nova senha para sua conta.'}
          </Typography>
        </Box>

        <Alert severity="info">
          Informe a senha atual e escolha uma nova senha com pelo menos 6 caracteres.
        </Alert>

        {requestError && (
          <Alert severity="error" aria-live="polite">
            {requestError}
          </Alert>
        )}

        <TextField
          {...register('currentPassword')}
          label="Senha atual"
          type={showCurrentPassword ? 'text' : 'password'}
          error={Boolean(errors.currentPassword)}
          helperText={errors.currentPassword?.message}
          autoComplete="current-password"
          fullWidth
          size="small"
          disabled={isSubmitting}
          slotProps={{
            htmlInput: { maxLength: 100 },
            input: {
              endAdornment: passwordAdornment(showCurrentPassword, () =>
                setShowCurrentPassword((visible) => !visible),
              ),
            },
          }}
        />

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
              endAdornment: passwordAdornment(showNewPassword, () =>
                setShowNewPassword((visible) => !visible),
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
              endAdornment: passwordAdornment(showConfirmation, () =>
                setShowConfirmation((visible) => !visible),
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
          {isSubmitting ? 'Salvando…' : firstAccess ? 'Salvar e entrar novamente' : 'Salvar nova senha'}
        </Button>

        <Button
          type="button"
          color="inherit"
          onClick={() => {
            if (firstAccess) {
              endSession()
              navigate('/login', { replace: true })
              return
            }

            navigate(session?.role === 'ADMIN' ? '/admin/reports' : '/home')
          }}
          disabled={isSubmitting}
        >
          {firstAccess ? 'Sair' : 'Cancelar'}
        </Button>
      </Stack>
    </Box>
  )
}
