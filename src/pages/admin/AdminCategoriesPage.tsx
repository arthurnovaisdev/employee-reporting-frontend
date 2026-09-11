import { zodResolver } from '@hookform/resolvers/zod'
import AddOutlined from '@mui/icons-material/AddOutlined'
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
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { AppSnackbar, type SnackbarFeedback } from '../../components/feedback/AppSnackbar'
import { EmptyState, ListPageSkeleton, QueryErrorState, RefreshProgress } from '../../components/feedback/AsyncStates'
import { PagePagination } from '../../components/navigation/PagePagination'
import { useAuth } from '../../features/auth/AuthContext'
import { getApiValidationDetails } from '../../lib/http/apiError'
import {
  categoryFormSchema,
  createCategory,
  getCategoryManagementError,
  getCategoryPage,
  type CategoryForm,
} from '../../features/reports/categories.api'

function CreateCategoryDialog({ onClose, onCreated }: {
  onClose: () => void
  onCreated: () => void
}) {
  const [requestError, setRequestError] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', active: true },
  })

  async function onSubmit(values: CategoryForm) {
    setRequestError(null)
    try {
      await createCategory(values)
      reset()
      onCreated()
    } catch (error) {
      const details = getApiValidationDetails(error)
      if (details?.name) setError('name', { type: 'server', message: details.name })
      setRequestError(getCategoryManagementError(error))
    }
  }

  return (
    <Dialog open fullWidth maxWidth="xs" onClose={() => { if (!isSubmitting) onClose() }} aria-labelledby="create-category-title" aria-describedby="create-category-description">
      <DialogTitle id="create-category-title">Criar categoria</DialogTitle>
      <DialogContent dividers>
        <Stack
          component="form"
          id="create-category-form"
          noValidate
          spacing={2}
          onSubmit={handleSubmit(onSubmit, () => setRequestError(null))}
          aria-busy={isSubmitting}
          sx={{ pt: 0.5 }}
        >
          <Typography id="create-category-description" color="text.secondary" variant="body2">
            Informe o nome e o estado inicial. A listagem atual mostra somente categorias ativas; uma categoria criada inativa não aparecerá nela.
          </Typography>
          {requestError && <Alert severity="error" aria-live="assertive">{requestError}</Alert>}
          <TextField
            {...register('name')}
            label="Nome da categoria"
            autoFocus
            fullWidth
            disabled={isSubmitting}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} disabled={isSubmitting} />}
                label="Criar como categoria ativa"
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
        <Button
          type="submit"
          form="create-category-form"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {isSubmitting ? 'Criando…' : 'Criar categoria'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function AdminCategoriesPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [feedback, setFeedback] = useState<SnackbarFeedback | null>(null)
  const query = useQuery({
    queryKey: ['admin-categories', page],
    queryFn: ({ signal }) => getCategoryPage(page, signal),
    enabled: session?.role === 'ADMIN' && session.passwordChanged,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: !createOpen,
  })
  const data = query.data

  function onCreated() {
    setCreateOpen(false)
    setFeedback({ severity: 'success', message: 'Categoria criada com sucesso.' })
    if (page !== 0) setPage(0)
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
    ])
  }

  return (
    <Box>
      <Typography variant="overline" color="primary.main">Painel do RH</Typography>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography component="h1" variant="h4">Categorias</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Consulte as categorias existentes e disponibilize novas opções para os funcionários.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => { setFeedback(null); setCreateOpen(true) }} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          Criar categoria
        </Button>
      </Stack>

      {query.isError && <QueryErrorState message={getCategoryManagementError(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />}
      {query.isError && page > 0 && <Button sx={{ mt: 1 }} onClick={() => setPage(0)}>Voltar à primeira página</Button>}
      {query.isPending && <ListPageSkeleton label="Carregando categorias…" />}
      {query.isFetching && data && <RefreshProgress label="Atualizando categorias…" />}

      {data && !query.isError && (
        <>
          <Stack direction="row" spacing={2} sx={{ mt: 3, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {data.totalElements !== undefined && (
              <Paper sx={{ p: 2, minWidth: 150 }}>
                <Typography color="primary.main" variant="h5">{data.totalElements.toLocaleString('pt-BR')}</Typography>
                <Typography variant="body2" color="text.secondary">Categorias disponíveis</Typography>
              </Paper>
            )}
            <Typography variant="body2" color="text.secondary">20 categorias ativas por página · ordem alfabética</Typography>
          </Stack>

          {data.categories.length === 0 ? (
            <EmptyState title="Nenhuma categoria nesta página" description="Crie uma categoria para disponibilizar uma nova opção no sistema." />
          ) : (
            <Stack component="ul" spacing={1.5} sx={{ p: 0, m: 0, listStyle: 'none' }} aria-label="Categorias cadastradas" aria-busy={query.isFetching}>
              {data.categories.map((category) => (
                <Paper component="li" key={category.id} sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{category.name}</Typography>
                      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                        Disponível para uso nas denúncias.
                      </Typography>
                    </Box>
                    <Chip label="Ativa" size="small" color="success" sx={{ flexShrink: 0 }} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          <PagePagination
            label="Paginação de categorias"
            page={data.number}
            totalPages={data.totalPages}
            hasNext={data.hasNext}
            disabled={query.isFetching}
            onPrevious={() => setPage(data.number - 1)}
            onNext={() => setPage(data.number + 1)}
          />
        </>
      )}

      {createOpen && <CreateCategoryDialog onClose={() => setCreateOpen(false)} onCreated={onCreated} />}
      <AppSnackbar feedback={feedback} onClose={() => setFeedback(null)} />
    </Box>
  )
}
