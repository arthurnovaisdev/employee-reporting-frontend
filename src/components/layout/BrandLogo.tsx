import { Box } from '@mui/material'

interface BrandLogoProps {
  compact?: boolean
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <Box
      component="img"
      src="/brand/mbfreire-logo.png"
      alt="MB.FREIRE"
      sx={{
        display: 'block',
        width: compact ? 86 : 132,
        height: 'auto',
      }}
    />
  )
}
