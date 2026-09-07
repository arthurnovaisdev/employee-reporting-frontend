import { Button } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { PagePlaceholder } from '../../components/layout/PagePlaceholder'
import { useAuth } from '../../features/auth/AuthContext'

export function ForbiddenPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const landingPath = session?.role === 'ADMIN' ? '/admin/reports' : '/home'
  const accessMessage = typeof (location.state as { accessMessage?: unknown } | null)?.accessMessage === 'string'
    ? (location.state as { accessMessage: string }).accessMessage
    : 'Sua sessão continua ativa, mas este recurso está disponível apenas para usuários autorizados.'

  return (
    <PagePlaceholder
      eyebrow="ACESSO RESTRITO"
      title="Você não tem permissão para acessar esta área"
      description={accessMessage}
    >
      <Button variant="contained" onClick={() => navigate(landingPath, { replace: true })}>
        Voltar ao início
      </Button>
    </PagePlaceholder>
  )
}
