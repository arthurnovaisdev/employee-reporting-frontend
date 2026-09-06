import { Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { PagePlaceholder } from '../../components/layout/PagePlaceholder'
import { useAuth } from '../../features/auth/AuthContext'

export function ForbiddenPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const landingPath = session?.role === 'ADMIN' ? '/admin/reports' : '/home'

  return (
    <PagePlaceholder
      eyebrow="ACESSO RESTRITO"
      title="Você não tem permissão para acessar esta área"
      description="Sua sessão continua ativa, mas este recurso está disponível apenas para usuários autorizados."
    >
      <Button variant="contained" onClick={() => navigate(landingPath, { replace: true })}>
        Voltar ao início
      </Button>
    </PagePlaceholder>
  )
}
