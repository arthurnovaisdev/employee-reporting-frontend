import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { AppSnackbar, type SnackbarFeedback } from '../../components/feedback/AppSnackbar'
import {
  getUser,
  getUserManagementError,
  setUserActive,
  type UserPage,
  type UserResponseDTO,
} from './users.api'

export function formatCpf(cpf: string) {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

function accountTypeLabel(user: UserResponseDTO) {
  return user.role === 'ADMIN' ? 'Administrador' : 'Funcionário'
}

export function AdminUserDetail({ selectedUser, onClose, onChanged }: {
  selectedUser: UserResponseDTO
  onClose: () => void
  onChanged: (user: UserResponseDTO) => void
}) {
  const queryClient = useQueryClient()
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<SnackbarFeedback | null>(null)
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)
  const query = useQuery({
    queryKey: ['admin-user', selectedUser.id],
    queryFn: ({ signal }) => getUser(selectedUser.id, signal),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
  const user = query.data ?? selectedUser

  async function changeActive(nextActive: boolean) {
    if (submitting.current) return
    submitting.current = true
    setSaving(true)
    setActionError(null)
    setFeedback(null)

    try {
      await setUserActive(user.id, nextActive)
      const updated = { ...user, active: nextActive }
      queryClient.setQueryData(['admin-user', user.id], updated)
      queryClient.setQueriesData<UserPage>({ queryKey: ['admin-users'] }, (current) => current && ({
        ...current,
        users: current.users.map((listedUser) => listedUser.id === updated.id ? updated : listedUser),
      }))
      onChanged(updated)
      setFeedback({
        severity: 'success',
        message: nextActive ? 'Usuário ativado com sucesso.' : 'Usuário desativado com sucesso.',
      })
      setConfirmationOpen(false)
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-user', user.id] }),
      ])
    } catch (error) {
      setActionError(getUserManagementError(error))
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open fullWidth maxWidth="sm" onClose={() => { if (!saving) onClose() }} aria-labelledby="user-detail-title">
        <DialogTitle id="user-detail-title">Informações do usuário</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {query.isFetching && !query.data && (
              <Stack spacing={1} role="status" aria-live="polite" aria-label="Carregando informações atualizadas">
                <Typography variant="body2" color="text.secondary">Carregando informações atualizadas…</Typography>
                <Skeleton variant="text" width="55%" height={32} aria-hidden="true" />
                <Skeleton variant="rounded" height={120} aria-hidden="true" />
              </Stack>
            )}
            {query.isError && (
              <Alert
                severity="error"
                aria-live="assertive"
                action={<Button color="inherit" size="small" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Tentando…' : 'Tentar novamente'}</Button>}
              >
                {getUserManagementError(query.error)}
              </Alert>
            )}
            {actionError && <Alert severity="error" aria-live="assertive">{actionError}</Alert>}

            <Box>
              <Typography component="h2" variant="h6" sx={{ overflowWrap: 'anywhere' }}>{user.name}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                <Chip label={accountTypeLabel(user)} size="small" variant="outlined" />
                <Chip label={user.active ? 'Ativo' : 'Desativado'} size="small" color={user.active ? 'success' : 'default'} />
              </Stack>
            </Box>

            <Box component="dl" sx={{ m: 0, '& dt': { color: 'text.secondary', fontSize: '0.875rem' }, '& dd': { m: 0, mb: 2, overflowWrap: 'anywhere' } }}>
              <Typography component="dt">CPF</Typography>
              <Typography component="dd">{formatCpf(user.cpf)}</Typography>
              <Typography component="dt">E-mail de contato</Typography>
              <Typography component="dd">{user.contactEmail ?? 'Não informado'}</Typography>
              <Typography component="dt">Primeiro acesso</Typography>
              <Typography component="dd">{user.passwordChanged ? 'Senha já alterada' : 'Troca de senha pendente'}</Typography>
              <Typography component="dt">Identificador</Typography>
              <Typography component="dd" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{user.id}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={onClose} disabled={saving}>Fechar</Button>
          {user.active ? (
            <Button color="warning" variant="outlined" onClick={() => setConfirmationOpen(true)} disabled={saving || query.isFetching || query.isError}>
              Desativar usuário
            </Button>
          ) : (
            <Button variant="contained" onClick={() => void changeActive(true)} disabled={saving || query.isFetching || query.isError} startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}>
              {saving ? 'Ativando…' : 'Ativar usuário'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={confirmationOpen} onClose={() => { if (!saving) setConfirmationOpen(false) }} maxWidth="xs" fullWidth aria-labelledby="deactivate-user-title" aria-describedby="deactivate-user-description">
        <DialogTitle id="deactivate-user-title">Desativar este usuário?</DialogTitle>
        <DialogContent>
          <Typography id="deactivate-user-description">
            {user.name} poderá perder o acesso ao sistema. Sessões já emitidas podem permanecer válidas até expirarem, conforme o comportamento atual do serviço.
          </Typography>
          {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmationOpen(false)} disabled={saving}>Cancelar</Button>
          <Button color="warning" variant="contained" onClick={() => void changeActive(false)} disabled={saving} startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}>
            {saving ? 'Desativando…' : 'Confirmar desativação'}
          </Button>
        </DialogActions>
      </Dialog>
      <AppSnackbar feedback={feedback} onClose={() => setFeedback(null)} />
    </>
  )
}
