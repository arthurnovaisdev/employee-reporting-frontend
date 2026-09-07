import InboxOutlined from '@mui/icons-material/InboxOutlined'
import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import { Alert, Box, Button, LinearProgress, Paper, Skeleton, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function ListPageSkeleton({ label, items = 3 }: { label: string; items?: number }) {
  return (
    <Stack spacing={1.5} sx={{ mt: 3 }} role="status" aria-live="polite" aria-label={label}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {Array.from({ length: items }, (_, index) => (
        <Paper key={index} aria-hidden="true" sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Skeleton variant="text" width={index % 2 === 0 ? '42%' : '56%'} height={28} />
          <Skeleton variant="text" width={index % 2 === 0 ? '68%' : '52%'} />
          <Skeleton variant="text" width="28%" sx={{ mt: 1 }} />
        </Paper>
      ))}
    </Stack>
  )
}

export function EmptyState({ title, description, action }: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Paper sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }} role="status">
      <InboxOutlined aria-hidden="true" sx={{ color: 'text.disabled', fontSize: 42 }} />
      <Typography component="h2" variant="h6" sx={{ mt: 1 }}>{title}</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75, mx: 'auto', maxWidth: 520 }}>
        {description}
      </Typography>
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Paper>
  )
}

export function QueryErrorState({ message, onRetry, retrying = false }: {
  message: string
  onRetry: () => void
  retrying?: boolean
}) {
  return (
    <Alert
      severity="error"
      aria-live="assertive"
      sx={{ mt: 3, alignItems: 'center' }}
      action={(
        <Button
          color="inherit"
          size="small"
          startIcon={<RefreshOutlined />}
          onClick={onRetry}
          disabled={retrying}
          aria-label="Tentar carregar novamente"
        >
          {retrying ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      )}
    >
      {message}
    </Alert>
  )
}

export function RefreshProgress({ label }: { label: string }) {
  return (
    <Box role="status" aria-live="polite" sx={{ mt: 2 }}>
      <LinearProgress aria-label={label} />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
        {label}
      </Typography>
    </Box>
  )
}
