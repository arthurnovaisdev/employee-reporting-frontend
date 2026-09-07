import { Alert, Snackbar } from '@mui/material'

export type FeedbackSeverity = 'success' | 'error' | 'warning' | 'info'

export interface SnackbarFeedback {
  message: string
  severity: FeedbackSeverity
}

export function AppSnackbar({ feedback, onClose }: {
  feedback: SnackbarFeedback | null
  onClose: () => void
}) {
  return (
    <Snackbar
      open={Boolean(feedback)}
      autoHideDuration={feedback?.severity === 'error' ? 7000 : 5000}
      onClose={(_, reason) => { if (reason !== 'clickaway') onClose() }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={onClose}
        severity={feedback?.severity ?? 'info'}
        variant="filled"
        role={feedback?.severity === 'error' ? 'alert' : 'status'}
        sx={{ width: '100%', maxWidth: 'min(560px, calc(100vw - 32px))' }}
      >
        {feedback?.message}
      </Alert>
    </Snackbar>
  )
}
