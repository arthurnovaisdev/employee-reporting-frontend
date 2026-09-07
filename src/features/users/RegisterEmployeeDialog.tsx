import { zodResolver } from '@hookform/resolvers/zod'
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  getUserManagementError,
  registerEmployee,
  registerEmployeeFormSchema,
  type RegisterEmployeeForm,
} from './users.api'
import { getApiValidationDetails } from '../../lib/http/apiError'

export function RegisterEmployeeDialog({ onClose, onCreated }: {
  onClose: () => void
  onCreated: () => void
}) {
  const [requestError, setRequestError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterEmployeeForm>({
    resolver: zodResolver(registerEmployeeFormSchema),
    defaultValues: { name: '', cpf: '', contactEmail: '', password: '' },
  })

  async function onSubmit(values: RegisterEmployeeForm) {
    setRequestError(null)
    try {
      await registerEmployee(values)
      reset()
      onCreated()
    } catch (error) {
      const details = getApiValidationDetails(error)
      for (const field of ['name', 'cpf', 'contactEmail', 'password'] as const) {
        if (details?.[field]) setError(field, { type: 'server', message: details[field] })
      }
      setRequestError(getUserManagementError(error))
    }
  }

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={() => { if (!isSubmitting) onClose() }} aria-labelledby="register-employee-title" aria-describedby="register-employee-description">
      <DialogTitle id="register-employee-title">Cadastrar funcionário</DialogTitle>
      <DialogContent dividers>
        <Stack
          component="form"
          id="register-employee-form"
          noValidate
          spacing={2}
          onSubmit={handleSubmit(onSubmit, () => setRequestError(null))}
          aria-busy={isSubmitting}
          sx={{ pt: 0.5 }}
        >
          <Typography id="register-employee-description" color="text.secondary" variant="body2">
            A nova conta será criada como funcionário e deverá trocar a senha provisória no primeiro acesso.
          </Typography>
          {requestError && <Alert severity="error" aria-live="assertive">{requestError}</Alert>}
          <TextField
            {...register('name')}
            label="Nome completo"
            autoComplete="name"
            fullWidth
            disabled={isSubmitting}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            slotProps={{ htmlInput: { maxLength: 150 } }}
          />
          <TextField
            {...register('cpf')}
            label="CPF"
            autoComplete="off"
            fullWidth
            disabled={isSubmitting}
            error={Boolean(errors.cpf)}
            helperText={errors.cpf?.message ?? 'Somente os 11 dígitos, sem pontuação.'}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 11 } }}
          />
          <TextField
            {...register('contactEmail')}
            label="E-mail de contato (opcional)"
            type="email"
            autoComplete="email"
            fullWidth
            disabled={isSubmitting}
            error={Boolean(errors.contactEmail)}
            helperText={errors.contactEmail?.message ?? 'Usado pelo fluxo de recuperação de senha.'}
            slotProps={{ htmlInput: { maxLength: 150 } }}
          />
          <TextField
            {...register('password')}
            label="Senha provisória"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            fullWidth
            disabled={isSubmitting}
            error={Boolean(errors.password)}
            helperText={errors.password?.message ?? 'De 8 a 100 caracteres.'}
            slotProps={{
              htmlInput: { maxLength: 100 },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Ocultar senha provisória' : 'Mostrar senha provisória'}
                      disabled={isSubmitting}
                    >
                      {showPassword ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
        <Button
          type="submit"
          form="register-employee-form"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {isSubmitting ? 'Cadastrando…' : 'Cadastrar funcionário'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
