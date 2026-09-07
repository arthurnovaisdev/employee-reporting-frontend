import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../../features/auth/AuthContext'
import { AdminReportDetail } from '../../features/reports/AdminReportDetail'
import { getAdminReports, getAdminReportError, type AdminReportPage } from '../../features/reports/adminReports.api'
import { formatReportCreatedAt, reportStatusLabels, type ReportResponseDTO } from '../../features/reports/protocolConsult'

export function AdminReportsPage() {
  const { session } = useAuth()
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<ReportResponseDTO | null>(null)
  const [success, setSuccess] = useState(false)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['admin-reports', page],
    queryFn: ({ signal }) => getAdminReports(page, signal),
    enabled: session?.role === 'ADMIN' && session.passwordChanged,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: !selected,
  })
  const data = query.data

  function onUpdated(updated: ReportResponseDTO) {
    queryClient.setQueryData<AdminReportPage>(['admin-reports', page], (current) => current && ({
      ...current,
      reports: current.reports.map((report) => report.protocol === updated.protocol ? updated : report),
    }))
    setSelected(null)
    setSuccess(true)
    void queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
  }

  return (
    <Box>
      <Typography variant="overline" color="primary.main">Painel do RH</Typography>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography component="h1" variant="h4">Denúncias</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Consulte os relatos recebidos e atualize seu andamento.</Typography>
        </Box>
        <Button variant="outlined" onClick={() => void query.refetch()} disabled={query.isFetching || Boolean(selected)}>Atualizar lista</Button>
      </Stack>
      {success && <Alert severity="success" onClose={() => setSuccess(false)} sx={{ mt: 3 }}>Alteração de status salva.</Alert>}
      {query.isError && <Alert severity="error" sx={{ mt: 3 }}>{getAdminReportError(query.error)}</Alert>}
      {query.isError && page > 0 && <Button sx={{ mt: 1 }} onClick={() => setPage(0)}>Voltar à primeira página</Button>}
      {query.isFetching && <Stack direction="row" spacing={1.5} role="status" sx={{ mt: 3, alignItems: 'center' }}>
        <CircularProgress size={20} /><Typography>Carregando denúncias…</Typography>
      </Stack>}
      {data && !query.isError && (
        <>
          <Stack direction="row" spacing={2} sx={{ mt: 3, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {data.totalElements !== undefined && <Paper sx={{ p: 2, minWidth: 140 }}>
              <Typography color="primary.main" variant="h5">{data.totalElements.toLocaleString('pt-BR')}</Typography>
              <Typography variant="body2" color="text.secondary">Total de denúncias</Typography>
            </Paper>}
            <Typography variant="body2" color="text.secondary">10 denúncias por página</Typography>
          </Stack>
          {data.reports.length === 0 ? <Paper sx={{ p: 4 }}><Typography>Nenhuma denúncia nesta página.</Typography></Paper> : (
            <Stack component="ul" spacing={1.5} sx={{ p: 0, m: 0, listStyle: 'none' }} aria-label="Denúncias recebidas" aria-busy={query.isFetching}>
              {data.reports.map((report) => <Paper component="li" key={report.protocol} sx={{ overflow: 'hidden' }}>
                <Box component="button" type="button" disabled={query.isFetching} onClick={() => { setSuccess(false); setSelected(report) }}
                  sx={{ display: 'block', width: '100%', textAlign: 'left', color: 'text.primary', bgcolor: 'transparent', border: 0, p: { xs: 2, sm: 2.5 }, font: 'inherit', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' } }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                    <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{report.protocol}</Typography>
                    <Chip component="span" label={reportStatusLabels[report.status]} size="small" color="primary" variant="outlined" sx={{ alignSelf: 'flex-start', maxWidth: '100%' }} />
                  </Stack>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1, overflowWrap: 'anywhere' }}>{report.category} · {formatReportCreatedAt(report.createdAt)}</Typography>
                  <Typography sx={{ mt: 1, overflowWrap: 'anywhere', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{report.description}</Typography>
                  <Typography component="span" color="primary.main" variant="body2" sx={{ display: 'block', mt: 1.5, fontWeight: 700 }}>Ver detalhe e status</Typography>
                </Box>
              </Paper>)}
            </Stack>
          )}
          <Stack component="nav" aria-label="Paginação de denúncias" direction="row" sx={{ mt: 3, alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" disabled={query.isFetching || data.number === 0} onClick={() => { setSuccess(false); setPage(data.number - 1) }}>Anterior</Button>
            <Typography role="status" variant="body2">
              {data.totalPages === 0 ? 'Nenhuma página' : `Página ${data.number + 1}${data.totalPages !== undefined ? ` de ${data.totalPages}` : ''}`}
            </Typography>
            <Button variant="outlined" disabled={query.isFetching || data.hasNext !== true} onClick={() => { setSuccess(false); setPage(data.number + 1) }}>Próxima</Button>
          </Stack>
          {data.hasNext === undefined && <Alert severity="info" sx={{ mt: 2 }}>Não foi possível determinar se há mais páginas. Tente atualizar a lista.</Alert>}
        </>
      )}
      {selected && <AdminReportDetail key={selected.protocol} report={selected} onClose={() => setSelected(null)} onUpdated={onUpdated} />}
    </Box>
  )
}
