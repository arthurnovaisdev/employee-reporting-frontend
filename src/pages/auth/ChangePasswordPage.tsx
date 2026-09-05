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
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { changePassword } from '../../features/auth/auth.api'
import { useAuth } from '../../features/auth/AuthContext'
import { getApiErrorMessage } from '../../lib/http/apiError'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().refine((value) => value.trim().length > 0, 'Informe a senha atual.'),
    newPassword: z
      .string()
      .min(8, 'A nova senha deve ter entre 8 e 100 caracteres.')
      .max(100, 'A nova senha deve ter entre 8 e 100 caracteres.')
      .refine((value) => value.trim().length > 0, 'Informe a nova senha.'),
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: 'A nova senha deve ser diferente da senha atual.',
    path: ['newPassword'],
  })

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export function ChangePasswordPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const navigate = useNavigate()
  const { endSession, markPasswordChanged, session } = useAuth()
  const {
    register,
    handleSubmit,
    reset,
    resetField,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      reset()
      markPasswordChanged()
      navigate(session?.role === 'ADMIN' ? '/admin/reports' : '/home', { replace: true })
    },
    onError: () => {
      resetField('currentPassword')
      resetField('newPassword')
    },
  })

  const passwordAdornment = (visible: boolean, toggle: () => void) => (
    <InputAdornment position="end">
      <IconButton
        onClick={toggle}
        edge="end"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visible ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
      </IconButton>
    </InputAdornment>
  )

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit((values) => changePasswordMutation.mutate(values))}
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
            Primeiro acesso
          </Typography>
          <Typography component="h1" variant="h5">
            Atualize sua senha
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: '0.9rem' }}>
            Esta alteração é obrigatória antes de continuar.
          </Typography>
        </Box>

        <Alert severity="info">
          Informe a senha atual e escolha uma nova senha com pelo menos 8 caracteres.
        </Alert>

        {changePasswordMutation.isError && (
          <Alert severity="error" aria-live="polite">
            {getApiErrorMessage(changePasswordMutation.error)}
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
          slotProps={{
            htmlInput: { maxLength: 100 },
            input: {
              endAdornment: passwordAdornment(showNewPassword, () =>
                setShowNewPassword((visible) => !visible),
              ),
            },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={changePasswordMutation.isPending}
          sx={{ minHeight: 42 }}
        >
          {changePasswordMutation.isPending ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            'Salvar nova senha'
          )}
        </Button>

        <Button
          type="button"
          color="inherit"
          onClick={() => {
            endSession()
            navigate('/login', { replace: true })
          }}
        >
          Sair
        </Button>
      </Stack>
    </Box>
  )
}
