import { Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { PagePlaceholder } from '../../components/layout/PagePlaceholder'

export function ForbiddenPage() {
  const navigate = useNavigate()

  return (
    <PagePlaceholder
      eyebrow="ACESSO RESTRITO"
      title="Você não tem permissão para acessar esta área"
      description="Sua sessão continua ativa, mas este recurso está disponível apenas para usuários autorizados."
    >
      <Button variant="contained" onClick={() => navigate('/home', { replace: true })}>
        Voltar ao início
      </Button>
    </PagePlaceholder>
  )
}
