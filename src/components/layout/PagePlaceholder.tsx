import { Box, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface PagePlaceholderProps {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}

export function PagePlaceholder({ eyebrow, title, description, children }: PagePlaceholderProps) {
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
        {eyebrow}
      </Typography>
      <Typography component="h1" variant="h4" sx={{ mt: 0.5 }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 620 }}>
        {description}
      </Typography>
      <Paper elevation={0} sx={{ mt: 3, minHeight: 220, p: { xs: 2.5, sm: 3 } }}>
        {children ?? (
          <Typography color="text.secondary">
            A estrutura desta etapa está pronta para receber a implementação funcional.
          </Typography>
        )}
      </Paper>
    </Box>
  )
}
