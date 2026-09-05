import { Typography } from '@mui/material'
import { PagePlaceholder } from '../../components/layout/PagePlaceholder'

export function ForgotPasswordPage() {
  return (
    <PagePlaceholder
      eyebrow="RECUPERAÇÃO DE SENHA"
      title="Esqueci minha senha"
      description="Solicite instruções para redefinir sua senha de acesso."
    >
      <Typography color="text.secondary">Formulário de solicitação será adicionado nesta etapa.</Typography>
    </PagePlaceholder>
  )
}
