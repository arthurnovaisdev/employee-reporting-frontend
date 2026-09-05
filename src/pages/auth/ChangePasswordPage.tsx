import { Typography } from '@mui/material'
import { PagePlaceholder } from '../../components/layout/PagePlaceholder'

export function ChangePasswordPage() {
  return (
    <PagePlaceholder
      eyebrow="PRIMEIRO ACESSO"
      title="Atualize sua senha"
      description="Para continuar, defina uma nova senha de acesso."
    >
      <Typography color="text.secondary">Formulário de troca de senha será adicionado nesta etapa.</Typography>
    </PagePlaceholder>
  )
}
