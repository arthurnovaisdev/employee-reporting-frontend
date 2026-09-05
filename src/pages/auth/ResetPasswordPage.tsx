import { Typography } from '@mui/material'
import { PagePlaceholder } from '../../components/layout/PagePlaceholder'

export function ResetPasswordPage() {
  return (
    <PagePlaceholder
      eyebrow="RECUPERAÇÃO DE SENHA"
      title="Redefinir senha"
      description="Defina uma nova senha para voltar a acessar o canal."
    >
      <Typography color="text.secondary">Formulário de redefinição será adicionado nesta etapa.</Typography>
    </PagePlaceholder>
  )
}
