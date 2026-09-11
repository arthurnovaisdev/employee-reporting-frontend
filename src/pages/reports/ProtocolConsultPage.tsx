import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined'
import CategoryOutlined from '@mui/icons-material/CategoryOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  consultReport,
  formatReportCreatedAt,
  getProtocolConsultErrorMessage,
  protocolConsultSchema,
  reportStatusLabels,
  reportStatuses,
  type ProtocolConsultFormValues,
  type ReportResponseDTO,
} from '../../features/reports/protocolConsult'

interface ReportFieldProps {
  icon: React.ReactNode
  label: string
  value: string
  monospace?: boolean
}

function ReportField({ icon, label, value, monospace = false }: ReportFieldProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1.25, minWidth: 0 }}>
      <Box sx={{ color: 'primary.main', mt: 0.1, lineHeight: 0 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography
          sx={{
            mt: 0.35,
            fontSize: '0.95rem',
            lineHeight: 1.5,
            overflowWrap: 'anywhere',
            fontFamily: monospace ? 'ui-monospace, SFMono-Regular, Consolas, monospace' : undefined,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  )
}

function CurrentStatus({ report }: { report: ReportResponseDTO }) {
  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            Status da denúncia
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.35, fontSize: '0.8rem' }}>
            Situação atual informada pelo sistema.
          </Typography>
        </Box>
        <Chip
          label={reportStatusLabels[report.status]}
          color="primary"
          size="small"
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 700 }}
        />
      </Stack>

      <Box component="ol" aria-label="Etapas conceituais do status" sx={{ p: 0, m: 0, mt: 2.5 }}>
        {reportStatuses.map((status, index) => {
          const current = status === report.status
          return (
            <Box
              component="li"
              key={status}
              aria-current={current ? 'step' : undefined}
              sx={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '22px minmax(0, 1fr)',
                gap: 1.25,
                pb: index === reportStatuses.length - 1 ? 0 : 1.7,
                listStyle: 'none',
                '&::after': index === reportStatuses.length - 1 ? undefined : {
                  content: '""',
                  position: 'absolute',
                  left: '5px',
                  top: '14px',
                  bottom: 0,
                  width: '1px',
                  bgcolor: 'divider',
                },
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  mt: 0.5,
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  bgcolor: current ? 'primary.main' : 'background.paper',
                  border: '2px solid',
                  borderColor: current ? 'primary.main' : 'divider',
                  boxShadow: current ? '0 0 0 4px rgba(217, 152, 27, 0.13)' : 'none',
                }}
              />
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Typography
                  color={current ? 'text.primary' : 'text.disabled'}
                  sx={{ fontSize: '0.84rem', fontWeight: current ? 700 : 500 }}
                >
                  {reportStatusLabels[status]}
                </Typography>
                {current && (
                  <Typography color="primary.main" sx={{ fontSize: '0.7rem', fontWeight: 700 }}>
                    STATUS ATUAL
                  </Typography>
                )}
              </Stack>
            </Box>
          )
        })}
      </Box>

      <Alert severity="info" sx={{ mt: 2.5 }}>
        O destaque indica somente o status atual. Esta visualização não representa um histórico de alterações.
      </Alert>
    </Box>
  )
}

export function ProtocolConsultPage() {
  const [showCode, setShowCode] = useState(false)
  const [report, setReport] = useState<ReportResponseDTO | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProtocolConsultFormValues>({
    resolver: zodResolver(protocolConsultSchema),
    defaultValues: { protocol: '', code: '' },
  })

  async function onSubmit(values: ProtocolConsultFormValues) {
    setRequestError(null)
    setReport(null)

    try {
      setReport(await consultReport(values))
    } catch (error) {
      setRequestError(getProtocolConsultErrorMessage(error))
    }
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 920, mx: 'auto' }}>
      <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
        Acompanhamento
      </Typography>
      <Typography component="h1" variant="h4" sx={{ mt: 0.5 }}>
        Consultar protocolo
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 650 }}>
        Informe os dados recebidos ao registrar a denúncia para consultar a situação atual.
      </Typography>

      <Paper elevation={0} sx={{ mt: 3, p: { xs: 2.5, sm: 3.5 } }}>
        <Stack
          component="form"
          noValidate
          autoComplete="off"
          onSubmit={handleSubmit(onSubmit, () => {
            setRequestError(null)
            setReport(null)
          })}
          spacing={2.25}
          aria-busy={isSubmitting}
          sx={{ maxWidth: 610 }}
        >
          <Box>
            <Typography component="h2" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Acompanhar denúncia
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.55, fontSize: '0.84rem', lineHeight: 1.55 }}>
              O protocolo e o código de acompanhamento são necessários para a consulta.
            </Typography>
          </Box>

          {requestError && <Alert severity="error" aria-live="assertive">{requestError}</Alert>}

          <TextField
            {...register('protocol')}
            label="Protocolo"
            placeholder="DEN-AAAA-ABCD2345"
            required
            fullWidth
            disabled={isSubmitting}
            error={Boolean(errors.protocol)}
            helperText={errors.protocol?.message}
            slotProps={{
              htmlInput: {
                maxLength: 17,
                autoCapitalize: 'characters',
                spellCheck: false,
              },
            }}
          />

          <TextField
            {...register('code')}
            label="Código de acompanhamento"
            type={showCode ? 'text' : 'password'}
            required
            fullWidth
            disabled={isSubmitting}
            error={Boolean(errors.code)}
            helperText={errors.code?.message}
            slotProps={{
              htmlInput: {
                maxLength: 10,
                autoCapitalize: 'characters',
                spellCheck: false,
              },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showCode ? 'Ocultar código' : 'Mostrar código'}
                      edge="end"
                      onClick={() => setShowCode((visible) => !visible)}
                      disabled={isSubmitting}
                    >
                      {showCode ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <SearchOutlined />}
          >
            {isSubmitting ? 'Consultando…' : 'Consultar'}
          </Button>
        </Stack>
      </Paper>

      {report && (
        <Box sx={{ mt: 4 }} aria-live="polite">
          <Typography color="primary.main" variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
            Resultado da consulta
          </Typography>
          <Paper elevation={0} sx={{ mt: 1, p: { xs: 2.5, sm: 3.5 } }}>
            <Typography component="h2" variant="h5">
              Denúncia localizada
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: 2.5,
                mt: 3,
              }}
            >
              <ReportField
                icon={<SearchOutlined fontSize="small" />}
                label="Protocolo"
                value={report.protocol}
                monospace
              />
              <ReportField
                icon={<CategoryOutlined fontSize="small" />}
                label="Categoria"
                value={report.category}
              />
              <ReportField
                icon={<CalendarTodayOutlined fontSize="small" />}
                label="Registrada em"
                value={formatReportCreatedAt(report.createdAt)}
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            <ReportField
              icon={<DescriptionOutlined fontSize="small" />}
              label="Descrição"
              value={report.description}
            />

            <Divider sx={{ my: 3 }} />
            <CurrentStatus report={report} />
          </Paper>
        </Box>
      )}
    </Box>
  )
}
