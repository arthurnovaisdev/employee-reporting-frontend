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
import { useAuth } from '../../features/auth/AuthContext'
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
      setRequestError(getCategoryManagementError(error))
    }
  }

  return (
    <Dialog open fullWidth maxWidth="xs" onClose={() => { if (!isSubmitting) onClose() }} aria-labelledby="create-category-title">
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
          <Typography color="text.secondary" variant="body2">
            Informe o nome e o estado inicial. A API atual mantém categorias ativas e inativas na listagem.
          </Typography>
          {requestError && <Alert severity="error" aria-live="polite">{requestError}</Alert>}
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
          Criar categoria
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
  const [success, setSuccess] = useState(false)
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
    setSuccess(true)
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
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => { setSuccess(false); setCreateOpen(true) }}>
          Criar categoria
        </Button>
      </Stack>

      {success && <Alert severity="success" onClose={() => setSuccess(false)} sx={{ mt: 3 }}>Categoria criada com sucesso.</Alert>}
      {query.isError && <Alert severity="error" sx={{ mt: 3 }}>{getCategoryManagementError(query.error)}</Alert>}
      {query.isError && page > 0 && <Button sx={{ mt: 1 }} onClick={() => setPage(0)}>Voltar à primeira página</Button>}
      {query.isFetching && (
        <Stack direction="row" spacing={1.5} role="status" sx={{ mt: 3, alignItems: 'center' }}>
          <CircularProgress size={20} />
          <Typography>Carregando categorias…</Typography>
        </Stack>
      )}

      {data && !query.isError && (
        <>
          <Stack direction="row" spacing={2} sx={{ mt: 3, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {data.totalElements !== undefined && (
              <Paper sx={{ p: 2, minWidth: 150 }}>
                <Typography color="primary.main" variant="h5">{data.totalElements.toLocaleString('pt-BR')}</Typography>
                <Typography variant="body2" color="text.secondary">Categorias cadastradas</Typography>
              </Paper>
            )}
            <Typography variant="body2" color="text.secondary">20 categorias por página · ordem alfabética</Typography>
          </Stack>

          {data.categories.length === 0 ? (
            <Paper sx={{ p: 4 }}><Typography>Nenhuma categoria nesta página.</Typography></Paper>
          ) : (
            <Stack component="ul" spacing={1.5} sx={{ p: 0, m: 0, listStyle: 'none' }} aria-label="Categorias cadastradas" aria-busy={query.isFetching}>
              {data.categories.map((category) => (
                <Paper component="li" key={category.id} sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{category.name}</Typography>
                      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                        {category.active ? 'Disponível para uso nas denúncias.' : 'Mantida no cadastro como inativa.'}
                      </Typography>
                    </Box>
                    <Chip label={category.active ? 'Ativa' : 'Inativa'} size="small" color={category.active ? 'success' : 'default'} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          <Stack component="nav" aria-label="Paginação de categorias" direction="row" sx={{ mt: 3, alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" disabled={query.isFetching || data.number === 0} onClick={() => setPage(data.number - 1)}>Anterior</Button>
            <Typography role="status" variant="body2">
              {data.totalPages === 0 ? 'Nenhuma página' : `Página ${data.number + 1} de ${data.totalPages}`}
            </Typography>
            <Button variant="outlined" disabled={query.isFetching || !data.hasNext} onClick={() => setPage(data.number + 1)}>Próxima</Button>
          </Stack>
        </>
      )}

      {createOpen && <CreateCategoryDialog onClose={() => setCreateOpen(false)} onCreated={onCreated} />}
    </Box>
  )
}
