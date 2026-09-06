import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import LogoutOutlined from '@mui/icons-material/LogoutOutlined'
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import ShieldOutlined from '@mui/icons-material/ShieldOutlined'
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/layout/BrandLogo'
import { useAuth } from '../features/auth/AuthContext'

interface PortalActionProps {
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
}

function PortalAction({ title, description, icon, onClick }: PortalActionProps) {
  return (
    <Paper
      component="button"
      type="button"
      onClick={onClick}
      elevation={0}
      sx={{
        width: '100%',
        minHeight: { xs: 112, sm: 118 },
        p: { xs: 2.25, sm: 2.5 },
        display: 'grid',
        gridTemplateColumns: '44px minmax(0, 1fr) 24px',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 2 },
        color: 'text.primary',
        textAlign: 'left',
        font: 'inherit',
        cursor: 'pointer',
        bgcolor: 'rgba(27, 28, 24, 0.88)',
        borderColor: '#33342d',
        transition: 'border-color 160ms ease, background-color 160ms ease, transform 160ms ease',
        '&:hover': {
          bgcolor: '#20211c',
          borderColor: 'rgba(217, 152, 27, 0.7)',
          transform: 'translateY(-1px)',
        },
        '&:focus-visible': {
          outline: '3px solid rgba(217, 152, 27, 0.35)',
          outlineOffset: 2,
        },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'rgba(217, 152, 27, 0.1)',
          color: 'primary.main',
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography component="span" sx={{ display: 'block', fontWeight: 700, fontSize: '1rem' }}>
          {title}
        </Typography>
        <Typography
          component="span"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.45, fontSize: '0.82rem', lineHeight: 1.45 }}
        >
          {description}
        </Typography>
      </Box>

      <ArrowForwardRounded aria-hidden="true" sx={{ color: 'primary.main', fontSize: 21 }} />
    </Paper>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const { endSession, session } = useAuth()

  const handleLogout = () => {
    endSession()
    navigate('/login', { replace: true })
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        backgroundImage:
          'radial-gradient(circle at 50% -12%, rgba(217, 152, 27, 0.075), transparent 34rem)',
      }}
    >
      <Box
        component="header"
        sx={{
          minHeight: 68,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(18, 19, 16, 0.86)',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            py: 1.15,
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
              bgcolor: '#f4f2ed',
              borderRadius: 1.25,
              px: 1.1,
              py: 0.65,
              lineHeight: 0,
            }}
          >
            <BrandLogo compact />
          </Box>

          <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} sx={{ alignItems: 'center' }}>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ mr: { sm: 0.75 }, minWidth: 0, alignItems: 'center' }}
            >
              <PersonOutlineRounded sx={{ color: 'text.disabled', fontSize: 20 }} />
              <Typography
                color="text.secondary"
                noWrap
                title={session?.name}
                sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 180, fontSize: '0.78rem' }}
              >
                {session?.name}
              </Typography>
            </Stack>

            <Button
              variant="text"
              size="small"
              startIcon={<LogoutOutlined />}
              onClick={handleLogout}
              sx={{
                minWidth: { xs: 40, sm: 'auto' },
                px: { xs: 1, sm: 1.25 },
                color: 'text.secondary',
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.6 } },
              }}
              aria-label="Sair da conta"
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Sair
              </Box>
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container
        component="main"
        maxWidth="sm"
        sx={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: { xs: 4.5, sm: 6.5 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto' }}>
          <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 3.5 } }}>
            <Box
              sx={{
                display: 'inline-grid',
                placeItems: 'center',
                width: 34,
                height: 34,
                mb: 1.25,
                borderRadius: '50%',
                color: 'primary.main',
                bgcolor: 'rgba(217, 152, 27, 0.1)',
              }}
            >
              <ShieldOutlined sx={{ fontSize: 20 }} />
            </Box>
            <Typography
              component="p"
              color="primary.main"
              sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.13em' }}
            >
              OUVIDORIA INTERNA
            </Typography>
            <Typography
              component="h1"
              sx={{ mt: 1, fontSize: { xs: '1.5rem', sm: '1.75rem' }, fontWeight: 700, lineHeight: 1.2 }}
            >
              Um canal interno para você se manifestar
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ mt: 1.15, mx: 'auto', maxWidth: 420, fontSize: '0.9rem', lineHeight: 1.55 }}
            >
              Registre uma denúncia ou acompanhe uma manifestação já enviada de forma simples e
              discreta.
            </Typography>
          </Box>

          <Stack spacing={1.5}>
            <PortalAction
              title="Fazer uma denúncia"
              description="Relate o ocorrido e, se desejar, inclua arquivos de apoio."
              icon={<DescriptionOutlined />}
              onClick={() => navigate('/reports/new')}
            />
            <PortalAction
              title="Consultar protocolo"
              description="Use o protocolo e o código de acompanhamento recebidos no registro."
              icon={<SearchOutlined />}
              onClick={() => navigate('/reports/consult')}
            />
          </Stack>

          <Box
            sx={{
              mt: 2.25,
              p: 2,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.25,
              border: '1px solid rgba(217, 152, 27, 0.18)',
              borderRadius: 1.5,
              bgcolor: 'rgba(217, 152, 27, 0.045)',
            }}
          >
            <ShieldOutlined sx={{ mt: 0.15, color: 'primary.main', fontSize: 19, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>Privacidade no registro</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.35, fontSize: '0.75rem', lineHeight: 1.55 }}>
                A denúncia não é vinculada diretamente à sua identidade. Para consultá-la depois,
                guarde o protocolo e o código de acompanhamento fornecidos ao finalizar o envio.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>

      <Box
        component="footer"
        sx={{
          py: 2,
          px: 2,
          textAlign: 'center',
          borderTop: '1px solid rgba(54, 55, 47, 0.65)',
        }}
      >
        <Typography color="text.disabled" sx={{ fontSize: '0.69rem', letterSpacing: '0.02em' }}>
          Canal interno MB.FREIRE · Acesso autenticado
        </Typography>
      </Box>
    </Box>
  )
}
