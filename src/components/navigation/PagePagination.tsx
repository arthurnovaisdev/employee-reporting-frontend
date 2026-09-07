import { Button, Stack, Typography } from '@mui/material'

export function PagePagination({
  label,
  page,
  totalPages,
  hasNext,
  disabled,
  onPrevious,
  onNext,
}: {
  label: string
  page: number
  totalPages?: number
  hasNext?: boolean
  disabled: boolean
  onPrevious: () => void
  onNext: () => void
}) {
  const pageText = totalPages === 0
    ? 'Nenhuma página'
    : `Página ${page + 1}${totalPages !== undefined ? ` de ${totalPages}` : ''}`

  return (
    <Stack
      component="nav"
      aria-label={label}
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ mt: 3, alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}
    >
      <Button fullWidth variant="outlined" disabled={disabled || page === 0} onClick={onPrevious} sx={{ maxWidth: { sm: 150 } }}>
        Anterior
      </Button>
      <Typography role="status" aria-live="polite" variant="body2" sx={{ order: { xs: -1, sm: 0 } }}>
        {pageText}
      </Typography>
      <Button fullWidth variant="outlined" disabled={disabled || hasNext !== true} onClick={onNext} sx={{ maxWidth: { sm: 150 } }}>
        Próxima
      </Button>
    </Stack>
  )
}
