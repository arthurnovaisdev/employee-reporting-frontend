import { Box, Paper } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'

export function PublicLayout() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 4,
        background: 'radial-gradient(circle at 50% 0%, #25261f 0%, #121310 48%)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          borderTop: '2px solid',
          borderTopColor: 'primary.main',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.28)',
        }}
      >
        <Box
          sx={{
            bgcolor: '#f4f2ed',
            borderRadius: 1.5,
            px: 2,
            py: 1.25,
            lineHeight: 0,
          }}
        >
          <BrandLogo />
        </Box>
        <Outlet />
      </Paper>
    </Box>
  )
}
