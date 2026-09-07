import PersonAddAltOutlined from '@mui/icons-material/PersonAddAltOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AppSnackbar, type SnackbarFeedback } from '../../components/feedback/AppSnackbar'
import { EmptyState, ListPageSkeleton, QueryErrorState, RefreshProgress } from '../../components/feedback/AsyncStates'
import { PagePagination } from '../../components/navigation/PagePagination'
import { useAuth } from '../../features/auth/AuthContext'
import { AdminUserDetail, formatCpf } from '../../features/users/AdminUserDetail'
import { RegisterEmployeeDialog } from '../../features/users/RegisterEmployeeDialog'
import {
  getUserManagementError,
  getUsers,
  type UserPage,
  type UserResponseDTO,
} from '../../features/users/users.api'

export function AdminUsersPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [selectedUser, setSelectedUser] = useState<UserResponseDTO | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [feedback, setFeedback] = useState<SnackbarFeedback | null>(null)
  const query = useQuery({
    queryKey: ['admin-users', page],
    queryFn: ({ signal }) => getUsers(page, signal),
    enabled: session?.role === 'ADMIN' && session.passwordChanged,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: !selectedUser && !registerOpen,
  })
  const data = query.data

  function onUserChanged(updated: UserResponseDTO) {
    queryClient.setQueryData<UserPage>(['admin-users', page], (current) => current && ({
      ...current,
      users: current.users.map((user) => user.id === updated.id ? updated : user),
    }))
    setSelectedUser(updated)
  }

  function onEmployeeCreated() {
    setRegisterOpen(false)
    setFeedback({ severity: 'success', message: 'Funcionário cadastrado com sucesso.' })
    if (page !== 0) setPage(0)
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  return (
    <Box>
      <Typography variant="overline" color="primary.main">Painel do RH</Typography>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography component="h1" variant="h4">Gestão de usuários</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Cadastre funcionários, consulte seus dados e controle o acesso ao sistema.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddAltOutlined />} onClick={() => { setFeedback(null); setRegisterOpen(true) }} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          Cadastrar funcionário
        </Button>
      </Stack>

      {query.isError && <QueryErrorState message={getUserManagementError(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />}
      {query.isError && page > 0 && <Button sx={{ mt: 1 }} onClick={() => setPage(0)}>Voltar à primeira página</Button>}
      {query.isPending && <ListPageSkeleton label="Carregando usuários…" />}
      {query.isFetching && data && <RefreshProgress label="Atualizando usuários…" />}

      {data && !query.isError && (
        <>
          <Stack direction="row" spacing={2} sx={{ mt: 3, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {data.totalElements !== undefined && (
              <Paper sx={{ p: 2, minWidth: 150 }}>
                <Typography color="primary.main" variant="h5">{data.totalElements.toLocaleString('pt-BR')}</Typography>
                <Typography variant="body2" color="text.secondary">Usuários cadastrados</Typography>
              </Paper>
            )}
            <Typography variant="body2" color="text.secondary">20 usuários por página · ordem alfabética</Typography>
          </Stack>

          {data.users.length === 0 ? (
            <EmptyState title="Nenhum usuário nesta página" description="Os usuários cadastrados aparecerão aqui em ordem alfabética." />
          ) : (
            <Stack component="ul" spacing={1.5} sx={{ p: 0, m: 0, listStyle: 'none' }} aria-label="Usuários cadastrados" aria-busy={query.isFetching}>
              {data.users.map((user) => (
                <Paper component="li" key={user.id} sx={{ overflow: 'hidden' }}>
                  <Box
                    component="button"
                    type="button"
                    disabled={query.isFetching}
                    onClick={() => { setFeedback(null); setSelectedUser(user) }}
                    sx={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      color: 'text.primary',
                      bgcolor: 'transparent',
                      border: 0,
                      p: { xs: 2, sm: 2.5 },
                      font: 'inherit',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' },
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{user.name}</Typography>
                        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                          {formatCpf(user.cpf)}{user.contactEmail ? ` · ${user.contactEmail}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        <Chip label={user.role === 'ADMIN' ? 'Administrador' : 'Funcionário'} size="small" variant="outlined" />
                        <Chip label={user.active ? 'Ativo' : 'Desativado'} size="small" color={user.active ? 'success' : 'default'} />
                      </Stack>
                    </Stack>
                    <Typography component="span" color="primary.main" variant="body2" sx={{ display: 'block', mt: 1.5, fontWeight: 700 }}>
                      Ver informações
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}

          <PagePagination
            label="Paginação de usuários"
            page={data.number}
            totalPages={data.totalPages}
            hasNext={data.hasNext}
            disabled={query.isFetching}
            onPrevious={() => setPage(data.number - 1)}
            onNext={() => setPage(data.number + 1)}
          />
          {data.hasNext === undefined && <Alert severity="info" sx={{ mt: 2 }}>Não foi possível determinar se há mais páginas. Tente atualizar a lista.</Alert>}
        </>
      )}

      {selectedUser && (
        <AdminUserDetail
          key={selectedUser.id}
          selectedUser={selectedUser}
          onClose={() => setSelectedUser(null)}
          onChanged={onUserChanged}
        />
      )}
      {registerOpen && <RegisterEmployeeDialog onClose={() => setRegisterOpen(false)} onCreated={onEmployeeCreated} />}
      <AppSnackbar feedback={feedback} onClose={() => setFeedback(null)} />
    </Box>
  )
}
