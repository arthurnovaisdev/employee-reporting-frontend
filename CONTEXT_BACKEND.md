# Contexto atual do backend para integração do frontend

> Fonte de verdade: código atual do projeto `employee-reporting`. Não invente rotas, parâmetros, DTOs, campos, enums ou comportamentos que não estejam documentados aqui.

## 1. Base da API

- Base path: `/api`.
- Ambiente local: `http://localhost:8080/api`.
- Backend online atual: `https://employee-reporting-api-v9fh.onrender.com`.
- Base completa online: `https://employee-reporting-api-v9fh.onrender.com/api`.

O frontend deve obter a base completa da API por variável de ambiente, por exemplo `VITE_API_BASE_URL`, sem fixar host no código. Use uma configuração para desenvolvimento local e outra para o ambiente online. As rotas deste documento já contêm `/api`; não duplique esse segmento.

## 2. Autenticação

### Login

`POST /api/auth/login` é público e usa CPF + senha.

Request — `LoginRequestDTO`:

```json
{
  "cpf": "00000000000",
  "password": "SenhaExemplo"
}
```

| Campo | Tipo | Regras |
| --- | --- | --- |
| `cpf` | string | Obrigatório; exatamente 11 dígitos, sem máscara |
| `password` | string | Obrigatório; máximo de 100 caracteres |

Response `200` — `LoginResponseDTO`:

```json
{
  "token": "<JWT>",
  "name": "Pessoa Exemplo",
  "role": "EMPLOYEE",
  "passwordChanged": false
}
```

O response não contém CPF, ID, e-mail, tempo de expiração nem refresh token. Os únicos valores atuais de `role` são `EMPLOYEE` e `ADMIN`.

### Uso do JWT

Nas rotas protegidas, enviar:

```http
Authorization: Bearer <JWT>
```

O backend é stateless e não usa cookies de autenticação. Não há endpoints de refresh ou logout; logout no frontend significa descartar o token.

A validade configurada do JWT é:

- desenvolvimento: 24 horas;
- staging e produção: 2 horas.

O JWT inclui uma versão de token vinculada ao usuário. Trocar ou redefinir a senha e ativar ou desativar a conta incrementam essa versão e invalidam tokens emitidos anteriormente. Usuário desativado também é rejeitado pelo filtro JWT com `401`.

### `passwordChanged`

Usuários criados começam com `passwordChanged=false`. Essa flag não é apenas informativa: o backend bloqueia as demais rotas autenticadas até que a senha provisória seja trocada. O fluxo exato está na seção 4.

### Tratamento de `401` e `403`

- `401 Unauthorized`: credenciais de login incorretas, token ausente, inválido, malformado ou expirado, token invalidado por mudança de versão, ou usuário desativado/não encontrado. Em uma rota protegida, o frontend deve encerrar a sessão local e solicitar novo login.
- `403 Forbidden`: o token é válido, mas a role não permite a operação, ou o usuário ainda está no primeiro acesso. Não tratar todo `403` como token expirado; no primeiro acesso, encaminhar à troca de senha.

Evite enviar um Bearer antigo nas rotas públicas: o filtro JWT é executado também nelas e pode rejeitar um token inválido antes de o controller ser chamado.

## 3. Roles e autorização

Existem somente duas roles.

### `EMPLOYEE`

Pode:

- acessar `GET /api/users/me`;
- trocar a própria senha em `PATCH /api/users/me/password`;
- listar categorias ativas em `GET /api/categories`;
- criar denúncia em `POST /api/reports`;
- enviar anexos em `POST /api/reports/{protocol}/attachments`;
- consultar denúncia por protocolo + código em `GET /api/reports/consult`.

Não pode acessar `/api/users` administrativo, criar categorias nem acessar `/api/reports/admin/**`.

### `ADMIN`

Pode:

- acessar o próprio perfil e trocar a própria senha;
- cadastrar usuários `EMPLOYEE` em `POST /api/auth/register`;
- listar, consultar, ativar e desativar usuários;
- listar e criar categorias;
- listar denúncias, abrir detalhe, baixar anexos e atualizar status pelas rotas `/api/reports/admin/**`.

`ADMIN` não atua como denunciante: não pode criar denúncia, enviar anexos pelo fluxo do denunciante nem consultar por protocolo + código. O frontend não deve oferecer essas ações a uma sessão `ADMIN`.

Todas as rotas não liberadas explicitamente são negadas por padrão.

## 4. Primeiro acesso

Enquanto `passwordChanged=false`, continuam acessíveis:

- `POST /api/auth/login`;
- `POST /api/auth/forgot-password`;
- `POST /api/auth/reset-password`;
- `GET /api/users/me`;
- `PATCH /api/users/me/password`;
- Swagger/OpenAPI, quando habilitado no ambiente.

Qualquer outra rota autenticada retorna `403` com:

```json
{
  "status": 403,
  "erro": "É necessário alterar a senha provisória antes de utilizar o sistema.",
  "timestamp": "<data-hora>"
}
```

Para concluir o primeiro acesso, use `PATCH /api/users/me/password`. O sucesso é `204` sem corpo, define `passwordChanged=true` e invalida o JWT atual; o frontend deve remover esse token e solicitar novo login.

## 5. Usuários

### Endpoints

| Método | Endpoint | Acesso | Request | Sucesso |
| --- | --- | --- | --- | --- |
| `GET` | `/api/users/me` | `EMPLOYEE` ou `ADMIN` | Sem body | `200 UserResponseDTO` |
| `PATCH` | `/api/users/me/password` | `EMPLOYEE` ou `ADMIN` | `ChangePasswordRequestDTO` | `204`, sem corpo |
| `GET` | `/api/users` | `ADMIN` | Query `page`, `size` | `200 Page<UserResponseDTO>` |
| `GET` | `/api/users/{id}` | `ADMIN` | `id` UUID no path | `200 UserResponseDTO` |
| `PATCH` | `/api/users/{id}/deactivate` | `ADMIN` | `id` UUID no path; sem body | `204`, sem corpo |
| `PATCH` | `/api/users/{id}/activate` | `ADMIN` | `id` UUID no path; sem body | `204`, sem corpo |

O cadastro relacionado a usuários fica em `POST /api/auth/register`, exclusivo de `ADMIN`:

```json
{
  "name": "Pessoa Exemplo",
  "cpf": "00000000000",
  "contactEmail": "pessoa@example.com",
  "password": "SenhaProvisoria"
}
```

`RegisterRequestDTO`:

- `name`: obrigatório, máximo 150 caracteres;
- `cpf`: obrigatório, exatamente 11 dígitos;
- `contactEmail`: opcional, e-mail válido, máximo 150 caracteres;
- `password`: obrigatória, entre 6 e 100 caracteres.

O cadastro retorna `201` sem corpo e sempre cria `EMPLOYEE`, ativo, com `passwordChanged=false`. Não há criação de `ADMIN` por endpoint.

`UserResponseDTO`:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Pessoa Exemplo",
  "cpf": "00000000000",
  "contactEmail": "pessoa@example.com",
  "role": "EMPLOYEE",
  "active": true,
  "passwordChanged": true
}
```

`contactEmail` pode ser `null`.

`ChangePasswordRequestDTO`:

```json
{
  "currentPassword": "SenhaAtual",
  "newPassword": "NovaSenha"
}
```

- `currentPassword`: obrigatória, máximo 100 caracteres;
- `newPassword`: obrigatória, entre 6 e 100 caracteres;
- a nova senha não pode ser igual à atual.

### Paginação de usuários

`GET /api/users` aceita somente:

- `page`: padrão `0`, mínimo `0`;
- `size`: padrão `20`, mínimo `1`, máximo `50`.

A ordem é fixa por `name ASC`, construída pelo controller. A listagem inclui usuários ativos e inativos.

O retorno é o `Page<UserResponseDTO>` padrão do Spring, sem DTO de paginação próprio. O frontend deve consumir principalmente `content`, `number`, `size`, `totalElements`, `totalPages`, `first`, `last`, `empty` e `numberOfElements`.

### Ativação e desativação

Um `ADMIN` não pode desativar a própria conta; a tentativa retorna `400` com `Você não pode desativar a própria conta.`. Alterações efetivas de `active` invalidam os JWTs anteriores do usuário afetado.

Não existem endpoints atuais para editar perfil, CPF, e-mail ou role, excluir usuário ou alterar a senha de outra pessoa.

## 6. Categorias

| Método | Endpoint | Acesso | Request | Sucesso |
| --- | --- | --- | --- | --- |
| `GET` | `/api/categories` | `EMPLOYEE` ou `ADMIN` | Query `page`, `size` | `200 Page<CategoryResponseDTO>` |
| `POST` | `/api/categories` | `ADMIN` | `CategoryRequestDTO` | `201 CategoryResponseDTO` |

`CategoryRequestDTO`:

```json
{
  "name": "Conduta interna",
  "active": true
}
```

- `name`: obrigatório, máximo 100 caracteres;
- `active`: boolean primitivo; envie explicitamente `true` ou `false`.

`CategoryResponseDTO`:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Conduta interna",
  "active": true
}
```

Nomes duplicados sem diferenciar maiúsculas/minúsculas retornam `400`.

### Paginação e categorias ativas

`GET /api/categories` aceita:

- `page`: padrão `0`, mínimo `0`;
- `size`: padrão `20`, mínimo `1`, máximo `50`.

A ordem é fixa por `name ASC`. A implementação atual usa `findByActiveTrue`: a listagem retorna somente categorias ativas.

Ao criar uma denúncia, o backend consulta a categoria por ID e rejeita uma categoria inativa com `400` e `A categoria selecionada não está disponível.`. Portanto, não reutilize no formulário um ID de categoria antigo sem tratar essa resposta.

Não existem endpoints atuais para obter uma categoria por ID, editar, ativar, desativar ou excluir categorias.

## 7. Denúncias

### Endpoints

| Método | Endpoint | Acesso | Request | Sucesso |
| --- | --- | --- | --- | --- |
| `POST` | `/api/reports` | `EMPLOYEE` | `ReportRequestDTO` | `201 ProtocolResponseDTO` |
| `GET` | `/api/reports/consult` | `EMPLOYEE` | Query `protocol`, `code` | `200 ReportResponseDTO` |
| `POST` | `/api/reports/{protocol}/attachments` | `EMPLOYEE` | Multipart; seção 8 | `201`, sem corpo |
| `GET` | `/api/reports/admin` | `ADMIN` | Query `page`, `size` | `200 Page<ReportResponseDTO>` |
| `GET` | `/api/reports/admin/{protocol}` | `ADMIN` | Protocolo no path | `200 ReportAdminResponseDTO` |
| `GET` | `/api/reports/admin/{protocol}/attachments/{attachmentId}` | `ADMIN` | Protocolo e UUID no path | `200`, binário |
| `PATCH` | `/api/reports/admin/{protocol}/status` | `ADMIN` | `ReportStatusUpdateRequestDTO` | `200 ReportResponseDTO` |

### Criação

`ReportRequestDTO`:

```json
{
  "categoryId": "550e8400-e29b-41d4-a716-446655440000",
  "description": "Descrição do ocorrido.",
  "incidentDate": "2026-09-01",
  "incidentLocation": "Unidade de exemplo"
}
```

- `categoryId`: UUID obrigatório de categoria existente e ativa;
- `description`: obrigatória, máximo 5000 caracteres;
- `incidentDate`: opcional, `YYYY-MM-DD`, deve ser passada ou igual à data atual;
- `incidentLocation`: opcional, máximo 255 caracteres.

Response `201` — `ProtocolResponseDTO`:

```json
{
  "protocol": "DEN-2026-ABCD2345",
  "trackingCode": "ABCD2345EF"
}
```

O protocolo segue `DEN-<ano>-<8 caracteres>` e o código de rastreio possui 10 caracteres. Ambos usam o conjunto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. O `trackingCode` é retornado em texto somente na criação e armazenado como hash; o frontend deve exibi-lo para que o usuário o guarde e nunca registrá-lo em logs ou analytics. O status inicial é `RECEIVED`.

### Consulta por protocolo + código

`GET /api/reports/consult?protocol=<protocol>&code=<trackingCode>`.

O nome do query parameter é `code`, não `trackingCode`. Ambos são obrigatórios e validados pelos formatos acima. Protocolo inexistente e código incorreto têm o mesmo `404`: `Protocolo ou código de acesso inválido.`.

Response — `ReportResponseDTO`:

```json
{
  "protocol": "DEN-2026-ABCD2345",
  "category": "Conduta interna",
  "description": "Descrição do ocorrido.",
  "status": "RECEIVED",
  "createdAt": "2026-09-10T10:30:00"
}
```

`category` é o nome, não um objeto nem o ID. Esse DTO não inclui `incidentDate`, `incidentLocation`, anexos, histórico ou observações.

### Listagem e detalhe administrativos

`GET /api/reports/admin` aceita:

- `page`: padrão `0`, mínimo `0`;
- `size`: padrão `10`, mínimo `1`, máximo `50`.

A ordem é fixa por `createdAt DESC` (mais recentes primeiro). **O frontend não deve enviar parâmetro `sort` para `/api/reports/admin`**; o endpoint não declara esse parâmetro e a ordenação é definida no controller.

O detalhe `GET /api/reports/admin/{protocol}` retorna `ReportAdminResponseDTO`:

```json
{
  "protocol": "DEN-2026-ABCD2345",
  "category": "Conduta interna",
  "description": "Descrição do ocorrido.",
  "status": "IN_ANALYSIS",
  "incidentDate": "2026-09-01",
  "incidentLocation": "Unidade de exemplo",
  "createdAt": "2026-09-10T10:30:00",
  "attachments": []
}
```

`incidentDate` e `incidentLocation` podem ser `null`. `attachments` é uma lista de `AttachmentResponseDTO`, descrita na seção 8.

### Atualização de status

Request — `ReportStatusUpdateRequestDTO`:

```json
{
  "newStatus": "IN_ANALYSIS",
  "note": "Análise iniciada."
}
```

- `newStatus`: obrigatório;
- `note`: opcional, máximo 2000 caracteres.

Valores atuais e exatos de `ReportStatus`:

- `RECEIVED`
- `IN_ANALYSIS`
- `UNDER_INVESTIGATION`
- `AWAITING_ACTION`
- `CLOSED`
- `ARCHIVED`

Não há matriz de transições no código: qualquer valor do enum pode substituir outro. Uma mudança efetiva registra histórico e auditoria; a `note` não é devolvida por endpoint. Se `newStatus` for igual ao status atual, o backend apenas devolve o relatório sem registrar a `note`.

Não existem endpoints atuais para excluir denúncia, editar seus dados, listar “minhas denúncias”, consultar histórico ou comentários, nem filtrar a listagem administrativa por status ou texto.

## 8. Anexos

### Upload do `EMPLOYEE`

`POST /api/reports/{protocol}/attachments`, com `Content-Type: multipart/form-data`.

Parâmetros exatos:

- path `protocol`: formato `DEN-<ano>-<8 caracteres permitidos>`;
- parte textual `trackingCode`: obrigatória, 10 caracteres permitidos;
- partes `files`: uma ou mais; para vários arquivos, repetir a chave `files` no `FormData`.

O `trackingCode` vai no multipart, não na query string. Deixe o navegador definir o boundary do `Content-Type`.

Tipos permitidos, validados pela assinatura real do conteúdo:

- PDF: `application/pdf`, extensão `.pdf`;
- JPEG: `image/jpeg`, extensões `.jpg`, `.jpeg` ou `.jfif`;
- PNG: `image/png`, extensão `.png`.

Se o nome tiver extensão, ela deve corresponder ao conteúdo detectado. Arquivo vazio é rejeitado.

Limites atuais:

- máximo por arquivo: `10 MB`;
- máximo de anexos acumulados por denúncia: `5`;
- máximo acumulado por denúncia: `25 MiB` (`25 * 1024 * 1024` bytes);
- máximo configurado para toda a requisição multipart: `26 MB`, incluindo o envelope multipart.

Os limites de quantidade e total consideram anexos já existentes. O sucesso retorna `201` sem corpo. Protocolo inexistente ou `trackingCode` incorreto retornam o mesmo `404`: `Denúncia ou código de acesso inválido.`.

### Storage privado e download administrativo

Os arquivos são armazenados em bucket privado do Supabase. O frontend não recebe URL pública, nome interno nem credencial do Supabase e **não deve acessar o Supabase diretamente**.

O detalhe administrativo retorna apenas estes metadados em cada `AttachmentResponseDTO`:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalFileName": "comprovante.pdf",
  "contentType": "application/pdf",
  "fileSize": 123456,
  "createdAt": "2026-09-10T10:35:00"
}
```

O download deve ser feito por `GET /api/reports/admin/{protocol}/attachments/{attachmentId}`, com JWT de `ADMIN` no header `Authorization`. A resposta é binária, com `Content-Type`, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` e cache desabilitado (`no-store`). Consuma como `Blob` e use o nome recebido no `Content-Disposition` ou em `originalFileName`.

Não existem endpoints atuais para listar anexos separadamente, excluir ou editar anexos.

## 9. Recuperação de senha

### Solicitar recuperação

`POST /api/auth/forgot-password` é público.

Request — `ForgotPasswordRequestDTO`:

```json
{
  "cpf": "00000000000"
}
```

`cpf` é obrigatório e deve conter exatamente 11 dígitos.

O sucesso é sempre `200` sem corpo. Para evitar enumeração de usuários, o backend também retorna `200` sem corpo quando o CPF não existe, a conta está inativa, não há e-mail de contato ou o limite interno por conta foi atingido. O frontend deve sempre mostrar uma mensagem neutra, como “Se os dados estiverem aptos, você receberá as instruções”. Falha real no envio do provedor pode resultar em `500`.

Quando aplicável, um novo pedido remove tokens anteriores daquele usuário. O e-mail aponta para `<FRONTEND_BASE_URL>/reset-password?token=...`.

### Redefinir senha

`POST /api/auth/reset-password` é público.

Request — `ResetPasswordRequestDTO`:

```json
{
  "token": "<TOKEN_BASE64URL_DE_43_CARACTERES>",
  "newPassword": "NovaSenha"
}
```

- `token`: obrigatório, exatamente 43 caracteres Base64 URL-safe (`A-Z`, `a-z`, `0-9`, `_`, `-`);
- `newPassword`: obrigatória, entre 6 e 100 caracteres e diferente da senha atual.

O token é válido por 1 hora, é armazenado somente como hash e só pode concluir uma redefinição. Token inexistente, usado ou expirado retorna `400` com `Token inválido ou expirado.`. Conta inativa retorna `400` com `Não foi possível redefinir a senha.`.

O sucesso é `200` sem corpo, define `passwordChanged=true`, remove os tokens de recuperação do usuário e invalida JWTs emitidos anteriormente. O endpoint não retorna um novo JWT; encaminhe ao login.

## 10. Rate limiting

A API aplica rate limiting a operações sensíveis de autenticação, recuperação, criação/consulta de denúncias e upload/download de anexos. Ela pode responder `429 Too Many Requests`.

O frontend deve:

- exibir mensagem adequada e evitar retries automáticos agressivos;
- respeitar o header `Retry-After` quando ele estiver presente;
- preservar o formulário para o usuário tentar novamente depois;
- não expor detalhes internos do mecanismo de limitação.

O formato do body segue `ErrorResponseDTO`; a mensagem usual do filtro é `Muitas tentativas. Aguarde antes de tentar novamente.`.

## 11. Erros

### Erro comum

`ErrorResponseDTO`:

```json
{
  "status": 400,
  "erro": "Mensagem do erro.",
  "timestamp": "2026-09-10T10:30:00"
}
```

### Erros de validação de body

`ValidationErrorResponseDTO`:

```json
{
  "status": 400,
  "detalhes": {
    "cpf": "O CPF deve conter exatamente 11 dígitos numéricos.",
    "password": "A senha não pode estar vazia."
  },
  "timestamp": "2026-09-10T10:30:00"
}
```

`detalhes` é um mapa `campo -> mensagem`. Validações de parâmetros de path/query retornam o formato comum com mensagem genérica de parâmetros inválidos.

### Status aplicáveis

| Status | Uso atual |
| --- | --- |
| `400` | Validação, JSON malformado, parâmetro ausente/inválido e regras de negócio |
| `401` | Login inválido; Bearer ausente, inválido, expirado ou invalidado; usuário desativado/não encontrado |
| `403` | Role sem permissão ou bloqueio de primeiro acesso |
| `404` | Usuário, categoria, denúncia/anexo não encontrado; protocolo + código inválido |
| `409` | Violação de integridade/restrição no banco |
| `413` | Requisição multipart acima do limite configurado |
| `429` | Limite de requisições excedido |
| `500` | Falha interna não tratada, autenticação interna ou dependência externa |

Mensagens de segurança que o frontend deve reconhecer:

- `401`: `CPF ou senha inválidos.`, `Token ausente, inválido ou expirado`, `Sessão expirada. Faça login novamente.`, `Token de acesso inválido.`, `Token de acesso inválido ou malformado.`, `Usuário desativado ou não autorizado.` ou `Usuário desativado ou não encontrado.`;
- `403` por role: `Você não tem permissão para acessar este recurso`;
- `403` por primeiro acesso: `É necessário alterar a senha provisória antes de utilizar o sistema.`;
- `413`: `O arquivo enviado excede o tamanho máximo permitido.`;
- `429`: mensagem de excesso de tentativas;
- `500` genérico: `Ocorreu um erro interno no servidor. Tente novamente mais tarde.`.

Não faça a interface depender do texto exato para decidir o fluxo quando o status e o estado local forem suficientes. `timestamp` é um `LocalDateTime` sem indicação de fuso horário.

## 12. CORS e ambientes

- Desenvolvimento permite a origem `http://localhost:5173`.
- Staging e produção obtêm a URL do frontend por `FRONTEND_BASE_URL`; ela alimenta tanto o CORS quanto o link de recuperação de senha.
- Métodos CORS permitidos: `GET`, `POST`, `PATCH`, `OPTIONS`.
- Headers de request permitidos: `Authorization`, `Content-Type`, `Accept`.
- `allowCredentials=false`; a autenticação não usa cookies.
- `Content-Disposition` é exposto ao navegador para download de anexos.
- Swagger/OpenAPI está ativo em `dev` e `staging` e desativado em `prod`. Quando ativo, usa os caminhos padrão `/swagger-ui/**` e `/v3/api-docs/**` fora de `/api`.

Não coloque no frontend nem neste documento valores de JWT secret, credenciais de banco, chaves de e-mail ou chaves/bucket do Supabase.

## 13. Frontend Integration Rules

- Use a URL base da API por variável de ambiente: local `http://localhost:8080/api`; online `https://employee-reporting-api-v9fh.onrender.com/api`.
- Envie JWT exclusivamente como `Authorization: Bearer <token>`; não use cookies.
- Respeite `passwordChanged`: com `false`, permita apenas perfil e troca de senha, além das rotas públicas; após a troca, descarte o JWT invalidado e peça novo login.
- Separe rigorosamente as interfaces por role: `ADMIN` não denuncia; `EMPLOYEE` não acessa a administração.
- Não envie `sort` em `GET /api/reports/admin`; a ordem é sempre `createdAt DESC`.
- Não acesse Supabase diretamente e não construa URLs públicas de anexos. Faça o download administrativo pela API Spring autenticada.
- Trate explicitamente `401`, `403`, `413` e `429`; em `429`, respeite `Retry-After` quando presente.
- Nunca coloque CPF, JWT, senha, token de recuperação ou tracking code em logs, analytics ou mensagens de erro de cliente.
- Preserve CPF como string de 11 dígitos e não aplique conversão numérica.
- Não presuma endpoints, filtros, campos, enums, histórico, comentários ou operações que não existam neste documento.

## Referência rápida de endpoints

| Método | Endpoint | Acesso |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Público |
| `POST` | `/api/auth/register` | `ADMIN` |
| `POST` | `/api/auth/forgot-password` | Público |
| `POST` | `/api/auth/reset-password` | Público |
| `GET` | `/api/users/me` | Autenticado |
| `PATCH` | `/api/users/me/password` | Autenticado |
| `GET` | `/api/users` | `ADMIN` |
| `GET` | `/api/users/{id}` | `ADMIN` |
| `PATCH` | `/api/users/{id}/deactivate` | `ADMIN` |
| `PATCH` | `/api/users/{id}/activate` | `ADMIN` |
| `GET` | `/api/categories` | `EMPLOYEE` ou `ADMIN` |
| `POST` | `/api/categories` | `ADMIN` |
| `POST` | `/api/reports` | `EMPLOYEE` |
| `GET` | `/api/reports/consult` | `EMPLOYEE` |
| `POST` | `/api/reports/{protocol}/attachments` | `EMPLOYEE` |
| `GET` | `/api/reports/admin` | `ADMIN` |
| `GET` | `/api/reports/admin/{protocol}` | `ADMIN` |
| `GET` | `/api/reports/admin/{protocol}/attachments/{attachmentId}` | `ADMIN` |
| `PATCH` | `/api/reports/admin/{protocol}/status` | `ADMIN` |
