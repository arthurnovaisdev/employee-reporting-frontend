# Contexto do backend para integração do frontend

> Toda IA responsável pelo frontend deve ler este documento antes de implementar ou alterar qualquer integração com o backend.

O frontend será desenvolvido em outro projeto e outro repositório, sem acesso ao código deste backend. Use exatamente os endpoints, campos e valores de enums documentados. Não invente contratos. Sempre que o backend mudar, este documento deverá ser atualizado.

Este documento descreve o código-fonte analisado, sem execução da API. Exemplos usam dados fictícios; tokens indicados por placeholders não são tokens válidos. Comportamentos dependentes da serialização ou infraestrutura estão identificados explicitamente.

## 1. Visão geral

`employee-reporting` expõe uma API REST para um canal interno de comunicação e denúncias. Inclui autenticação por CPF e senha, usuários, categorias, denúncias, acompanhamento por protocolo e código, alteração administrativa de status, anexos e recuperação de senha por e-mail.

A denúncia não armazena um relacionamento com o usuário denunciante, mas suas rotas exigem autenticação. Portanto, não apresentar o serviço como acessível sem login nem prometer anonimato absoluto de infraestrutura.

As respostas usam DTOs planos: por exemplo, `category` em uma denúncia é o nome da categoria, não um objeto nem seu ID. O projeto usa Spring MVC, Spring Security, JWT, Jakarta Validation e persistência JPA/PostgreSQL. O `pom.xml` declara Java 25, Spring Boot 4.1.1, JJWT 0.12.6 e Springdoc 2.8.5.

## 2. Base URL

Base local: **`http://localhost:8080/api`**.

Confirmada por `server.port=8080` em `src/main/resources/application.properties` e pelos mappings `/api/auth`, `/api/categories`, `/api/reports` e `api/users` dos controllers. Não há context path adicional configurado. A ausência da barra inicial no mapping de `UserController` não cria outra base.

Configure essa base no cliente HTTP e acrescente, por exemplo, `/auth/login`, resultando em `http://localhost:8080/api/auth/login`. As rotas abaixo já incluem `/api`; não duplique esse segmento.

Swagger/OpenAPI: há configuração `bearerAuth` e lib Springdoc. Os caminhos padrão explicitamente liberados na segurança são `http://localhost:8080/swagger-ui.html`, `http://localhost:8080/swagger-ui/index.html` e `http://localhost:8080/v3/api-docs` (também seus subcaminhos). Eles ficam fora da base `/api`. Não há override de URL configurado; disponibilidade e compatibilidade das dependências devem ser confirmadas em runtime. A declaração global de Bearer no OpenAPI não substitui as regras reais de segurança abaixo.

## 3. Autenticação e autorização

### Login e JWT

`POST /api/auth/login` recebe `LoginRequestDTO` e retorna `LoginResponseDTO` com HTTP 200:

```json
{
  "cpf": "00000000000",
  "password": "SenhaExemplo123"
}
```

```json
{
  "token": "<JWT>",
  "name": "Pessoa Exemplo",
  "role": "EMPLOYEE",
  "passwordChanged": false
}
```

CPF é string de exatamente 11 dígitos, sem pontuação; e-mail não é credencial de login. Em requisições protegidas, envie:

```http
Authorization: Bearer <TOKEN>
```

`token` vem sem o prefixo `Bearer`. O filtro exige o prefixo literal `Bearer `, com espaço. O JWT é assinado, no formato compacto, com claims `sub` (CPF), `role` (authority `ROLE_EMPLOYEE` ou `ROLE_ADMIN`), `iat` e `exp`. A assinatura usa chave HMAC; o algoritmo específico não é fixado explicitamente em `signWith(getKey())`. Não é necessário interpretar o JWT para obter a role: a resposta de login já retorna `EMPLOYEE` ou `ADMIN`.

`jwt.expiration-ms=86400000`: validade configurada de 24 horas a partir da emissão. Não existem endpoints de refresh ou logout. A sessão é stateless e CSRF está desabilitado. Logout é descarte do token no frontend; não há revogação implementada. Trocar ou redefinir senha não invalida JWTs já emitidos no código atual.

### Permissões reais

| Grupo | Regra |
| --- | --- |
| `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password` | Público |
| Swagger/OpenAPI nos caminhos citados | Público |
| `/api/auth/register` | ADMIN |
| `/api/users/me` e `/api/users/me/password` | Autenticado |
| Demais rotas `/api/users/**` | ADMIN |
| `/api/reports/admin` e subrotas | ADMIN |
| Demais rotas `/api/reports/**` | EMPLOYEE ou ADMIN |
| POST `/api/categories` | ADMIN |
| GET `/api/categories` | Autenticado; não há restrição específica de role |

Somente `EMPLOYEE` e `ADMIN` existem. Não há endpoint exclusivo de EMPLOYEE. As authorities são construídas a partir do usuário consultado no banco a cada autenticação por JWT, não diretamente da claim `role`. As demais URLs caem em `anyRequest().authenticated()`; isso não significa que possuam endpoint.

### Primeiro acesso, usuário desativado e falhas de token

Usuários cadastrados começam com `active=true` e `passwordChanged=false`. O login informa `passwordChanged`, mas nenhuma regra da segurança bloqueia outras operações até a troca de senha.

`UserDetailsImpl.isEnabled()` reflete `active`, permitindo ao mecanismo de login rejeitar usuário desativado. Não há handler específico para `DisabledException`: o handler genérico pode responder 500, em vez de um erro específico de conta desativada. Confirmar a resposta efetiva em runtime.

**O filtro JWT não verifica `isEnabled()`**: um usuário desativado ainda pode ser autenticado com JWT válido, pois a validação compara CPF e expiração. Não assumir que desativar conta revoga sessões.

O filtro retorna 401 para JWT expirado ou `JwtException`; usuário não encontrado ao carregar o JWT também gera 401. Ausência de token em rota protegida gera 401. Nem todo conteúdo inválido necessariamente vira 401: exceções fora das categorias tratadas caem no 500 genérico do filtro. O filtro também roda em endpoints públicos; evite enviar JWT vencido em login ou recuperação, pois ele pode impedir essas chamadas.

## 4. Endpoints

Convenções aplicáveis a **cada endpoint** abaixo:

- Prefixo de host: `http://localhost:8080`. Todas as rotas listadas incluem `/api`.
- Requisições com body JSON usam `Content-Type: application/json`; respostas DTO são JSON. GET e PATCH sem body não precisam de Content-Type. Upload usa `multipart/form-data` com boundary gerado pelo cliente.
- Onde consta “nenhum”, não há path/query/body definido no controller. Não enviar propriedades extras.
- Toda rota protegida pode responder 401; rotas com role podem responder 403. Todas podem ter 500 por falha interna. Regras de 400/404/409 específicas estão listadas por operação. Formatos dos erros estão na seção 8.
- Resposta “sem corpo” é vazia, não `{}` e não `null` serializado. Não chamar parsing JSON obrigatório nessas respostas.
- Exemplos completos dos DTOs referenciados estão na seção 5; isso também define os corpos das operações, sem campos adicionais implícitos.

### AuthController — 4 endpoints

| Método e rota | Finalidade / acesso | Path / query | Body | Sucesso | Principais erros específicos |
| --- | --- | --- | --- | --- | --- |
| POST `/api/auth/login` | Login por CPF; público | Nenhum / nenhum | `LoginRequestDTO` | 200, `LoginResponseDTO` | 400 validação; 401 CPF/senha inválidos; caso de desativação descrito na seção 3 |
| POST `/api/auth/register` | Criar usuário; ADMIN | Nenhum / nenhum | `RegisterRequestDTO` | 201, sem corpo | 400 validação ou CPF já cadastrado; 409 restrição de banco |
| POST `/api/auth/forgot-password` | Solicitar recuperação por e-mail; público | Nenhum / nenhum | `ForgotPasswordRequestDTO` | 200, sem corpo | 400 validação ou falta de e-mail de contato; 404 usuário não encontrado; 500 falha de envio |
| POST `/api/auth/reset-password` | Redefinir senha; público | Nenhum / nenhum | `ResetPasswordRequestDTO` | 200, sem corpo | 400 validação, token usado ou expirado; 404 token inválido/não encontrado |

Cadastro sempre cria `EMPLOYEE`; não recebe `role`, `active` ou `passwordChanged`. Não existe cadastro público, criação de ADMIN via API ou envio automático de senha provisória por e-mail nesse fluxo.

### CategoryController — 2 endpoints

| Método e rota | Finalidade / acesso | Path / query | Body | Sucesso | Principais erros específicos |
| --- | --- | --- | --- | --- | --- |
| POST `/api/categories` | Criar categoria; ADMIN | Nenhum / nenhum | `CategoryRequestDTO` | 201, `CategoryResponseDTO` | 400 validação; 409 nome duplicado/restrição de banco |
| GET `/api/categories` | Listar categorias; autenticado | Nenhum / `page`, `size`, `sort` | Nenhum | 200, `Page<CategoryResponseDTO>` | 500 em falhas de consulta, inclusive ordenação não suportada conforme resolução em runtime |

A listagem não filtra `active`; retorna também categorias inativas. Não existem consulta individual, edição, ativação, desativação ou exclusão de categoria pela API.

### ReportController — 5 endpoints

| Método e rota | Finalidade / acesso | Path / query | Body | Sucesso | Principais erros específicos |
| --- | --- | --- | --- | --- | --- |
| POST `/api/reports` | Criar denúncia; EMPLOYEE ou ADMIN | Nenhum / nenhum | `ReportRequestDTO` | 201, `ProtocolResponseDTO` | 400 validação; 404 categoria não encontrada; 409 restrição de banco |
| POST `/api/reports/{protocol}/attachments` | Anexar arquivos; EMPLOYEE ou ADMIN | `protocol`: String / `trackingCode`: String obrigatório, enviar como campo textual multipart | Multipart com `trackingCode` e `files`, múltiplos arquivos | 201, sem corpo | 400 código incorreto; 404 denúncia não encontrada; arquivos inválidos lançam exceções sem handler específico, podendo resultar em 500; limites multipart dependem do tratamento em runtime |
| GET `/api/reports/consult` | Consultar por protocolo e código; EMPLOYEE ou ADMIN | Nenhum / `protocol`: String obrigatório, `code`: String obrigatório | Nenhum | 200, `ReportResponseDTO` | 404 protocolo não encontrado ou código incorreto; ausência de parâmetro sem handler específico, ver seção 8 |
| GET `/api/reports/admin` | Listar todas as denúncias; ADMIN | Nenhum / `page`, `size`, `sort` | Nenhum | 200, `Page<ReportResponseDTO>` | 500 falhas de consulta/ordenação |
| PATCH `/api/reports/admin/{protocol}/status` | Alterar status; ADMIN | `protocol`: String / nenhum | `ReportStatusUpdateRequestDTO` | 200, `ReportResponseDTO` | 400 validação; 404 denúncia não encontrada; enum inválido é erro de conversão, ver seção 8 |

Exemplo de consulta: `http://localhost:8080/api/reports/consult?protocol=DEN-2026-1234567&code=ABC234`. Os valores são fictícios. Use codificação de query parameters; não registre a URL com código em logs ou analytics.

Regras confirmadas em `ReportService`:

- Categoria precisa existir, mas `active` não é verificado na criação.
- Protocolo gerado: `DEN-<ano corrente>-<7 dígitos>`. Há unicidade no banco, mas não há tentativa adicional programada em caso de colisão.
- `trackingCode` possui 6 caracteres sorteados com `SecureRandom` do conjunto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. É armazenado somente como hash BCrypt e retornado em texto apenas na criação. Não há recuperação nem reemissão desse código.
- Para consultar, o campo de query se chama **`code`**, não `trackingCode`. A comparação usa BCrypt e não normaliza espaços ou caixa.
- Estado inicial: `RECEIVED`. Não há restrições de transição entre os valores do enum. Atualizar para o mesmo status retorna a denúncia sem gravar histórico/auditoria e sem salvar a nova `note`.
- Mudança efetiva cria `StatusHistory` com o novo status e `observation` recebida de `note`, além de `AuditLog` com o administrador e a ação `UPDATE_STATUS: <antigo> -> <novo>`.
- A consulta, a listagem administrativa e a alteração de status retornam o mesmo `ReportResponseDTO`. Não retornam ID interno, `categoryId`, `incidentDate`, `incidentLocation`, `updatedAt`, tracking code, anexos, histórico ou observações.
- Não existem atualização de descrição/categoria/data/local, exclusão de denúncia, comentários, consulta administrativa individual sem código, listagem “minhas denúncias” ou filtros de busca/status além da paginação.

### UserController — 6 endpoints

| Método e rota | Finalidade / acesso | Path / query | Body | Sucesso | Principais erros específicos |
| --- | --- | --- | --- | --- | --- |
| GET `/api/users/me` | Perfil do usuário autenticado | Nenhum / nenhum | Nenhum | 200, `UserResponseDTO` | Erros comuns de autenticação |
| GET `/api/users` | Listar usuários; ADMIN | Nenhum / `page`, `size`, `sort` | Nenhum | 200, `Page<UserResponseDTO>` | 500 falhas de consulta/ordenação |
| GET `/api/users/{id}` | Consultar usuário; ADMIN | `id`: UUID / nenhum | Nenhum | 200, `UserResponseDTO` | 404 usuário não encontrado; UUID malformado: erro de conversão |
| PATCH `/api/users/me/password` | Trocar própria senha; autenticado | Nenhum / nenhum | `ChangePasswordRequestDTO` | 204, sem corpo | 400 validação, senha atual incorreta ou nova senha igual à atual; 404 usuário não encontrado |
| PATCH `/api/users/{id}/deactivate` | Desativar usuário; ADMIN | `id`: UUID / nenhum | Nenhum | 204, sem corpo | 404 usuário não encontrado; UUID malformado: erro de conversão |
| PATCH `/api/users/{id}/activate` | Ativar usuário; ADMIN | `id`: UUID / nenhum | Nenhum | 204, sem corpo | 404 usuário não encontrado; UUID malformado: erro de conversão |

Listagem inclui ativos e inativos. Ativação/desativação apenas atribui `active`, sem proteção específica contra desativar a si mesmo ou outro ADMIN. Não existem edição de perfil, mudança de role, alteração de e-mail, exclusão de usuário ou troca de senha de terceiro nesses endpoints.

## 5. DTOs e contratos JSON

Os DTOs HTTP são records Java sem renomeação de propriedades JSON. UUID é representado como string. Campos opcionais de referência aceitam `null` no contrato de validação; não assumir que a propriedade sempre estará presente em todas as configurações de serialização. As responses não declaram Jakarta Validation; a obrigatoriedade abaixo descreve os valores produzidos pelos serviços e seus campos nullable.

Datas: `LocalDate` representa data sem horário, no formato ISO `YYYY-MM-DD`. `LocalDateTime` não contém fuso horário; não acrescente `Z` nem presuma UTC. Os exemplos mostram ISO `YYYY-MM-DDTHH:mm:ss`. Não há formatação Jackson customizada para responses MVC; confirmar em runtime a serialização efetiva e a precisão fracionária. O timestamp dos erros do filtro tem uma ressalva específica na seção 8.

### Request DTOs

#### LoginRequestDTO

| Campo | Tipo Java / JSON | Obrigatório | Validações / formato |
| --- | --- | --- | --- |
| `cpf` | String / string | Sim | `@NotBlank`, `@Pattern` com `\d{11}`; 11 dígitos sem máscara |
| `password` | String / string | Sim | `@NotBlank`, `@Size(min=8,max=100)` |

Exemplo na seção 3. A validação de CPF não calcula dígitos verificadores.

#### RegisterRequestDTO

| Campo | Tipo Java / JSON | Obrigatório | Validações / formato |
| --- | --- | --- | --- |
| `name` | String / string | Sim | `@NotBlank`, `@Size(max=150)` |
| `cpf` | String / string | Sim | `@NotBlank`, `@Pattern` com `\d{11}` |
| `contactEmail` | String / string ou null | Não | `@Email`, `@Size(max=150)`; não há `@NotBlank` |
| `password` | String / string | Sim | Senha provisória; `@NotBlank`, `@Size(min=8,max=100)` |

```json
{
  "name": "Pessoa Exemplo",
  "cpf": "00000000000",
  "contactEmail": "pessoa@example.com",
  "password": "SenhaExemplo123"
}
```

#### ForgotPasswordRequestDTO

| Campo | Tipo Java / JSON | Obrigatório | Validações / formato |
| --- | --- | --- | --- |
| `cpf` | String / string | Sim | `@NotBlank`, `@Pattern` com `\d{11}` |

```json
{
  "cpf": "00000000000"
}
```

#### ResetPasswordRequestDTO

| Campo | Tipo Java / JSON | Obrigatório | Validações / formato |
| --- | --- | --- | --- |
| `token` | String / string | Sim | `@NotBlank`; enviar exatamente o token do link; não há validação sintática de UUID no DTO |
| `newPassword` | String / string | Sim | `@NotBlank`, `@Size(min=8,max=100)` |

```json
{
  "token": "<TOKEN_DO_LINK>",
  "newPassword": "NovaSenhaExemplo123"
}
```

#### ChangePasswordRequestDTO

| Campo | Tipo Java / JSON | Obrigatório | Validações / formato |
| --- | --- | --- | --- |
| `currentPassword` | String / string | Sim | `@NotBlank`; sem `@Size` nesse campo |
| `newPassword` | String / string | Sim | `@NotBlank`, `@Size(min=8,max=100)` |

```json
{
  "currentPassword": "SenhaExemplo123",
  "newPassword": "NovaSenhaExemplo123"
}
```

Não há campo de confirmação de senha na API. Confirmação, se oferecida, é validação local do frontend. O service impede reutilizar a senha atual, embora a mensagem a chame de “senha provisória”.

#### CategoryRequestDTO

| Campo | Tipo Java / JSON | Obrigatório | Validações / formato |
| --- | --- | --- | --- |
| `name` | String / string | Sim | `@NotBlank`, `@Size(max=100)` |
| `active` | boolean / boolean | Sem validação de presença | Primitivo, não representa null; enviar explicitamente `true` ou `false` |

```json
{
  "name": "Conduta interna",
  "active": true
}
```

Não há default explícito no DTO para `active`; ausência/null depende do binding Jackson de primitivo, portanto não depender de coerção automática.

#### ReportRequestDTO

| Campo | Tipo Java / JSON | Obrigatório | Validações / formato |
| --- | --- | --- | --- |
| `categoryId` | UUID / string | Sim | `@NotNull`; UUID de categoria existente |
| `description` | String / string | Sim | `@NotBlank`, `@Size(max=5000)` |
| `incidentDate` | LocalDate / string ou null | Não | ISO `YYYY-MM-DD`; sem validação de passado/futuro |
| `incidentLocation` | String / string ou null | Não | Sem validação Jakarta de comprimento; não confundir ausência de limite no DTO com ausência de restrição no banco |

```json
{
  "categoryId": "550e8400-e29b-41d4-a716-446655440000",
  "description": "Descrição fictícia do ocorrido.",
  "incidentDate": "2026-09-01",
  "incidentLocation": "Unidade de exemplo"
}
```

#### ReportStatusUpdateRequestDTO

| Campo | Tipo Java / JSON | Obrigatório | Validações / formato |
| --- | --- | --- | --- |
| `newStatus` | ReportStatus / string | Sim | `@NotNull`; valor exato do enum |
| `note` | String / string ou null | Não | `@Size(max=2000)`; pode ser vazia; não retorna na response |

```json
{
  "newStatus": "IN_ANALYSIS",
  "note": "Análise iniciada."
}
```

Todos os oito request DTOs acima são recebidos com `@Valid @RequestBody`. Não há validações customizadas, `@Min` ou `@Max` nesses contratos. `@NotBlank` rejeita null, vazio e apenas espaços; `@NotNull` rejeita null. `@Size`, `@Pattern` e `@Email` não tornam por si só um campo obrigatório. As mensagens de validação são retornadas por campo em `detalhes`; para várias violações no mesmo campo, o map conserva uma mensagem, sem ordem garantida.

### Response DTOs

#### LoginResponseDTO

| Campo | Tipo Java / JSON | Presença / formato |
| --- | --- | --- |
| `token` | String / string | JWT gerado no login |
| `name` | String / string | Nome do usuário |
| `role` | String / string | `EMPLOYEE` ou `ADMIN`, sem `ROLE_` |
| `passwordChanged` | boolean / boolean | Indica se houve troca/redefinição de senha |

Exemplo completo na seção 3. Não retorna `id`, `cpf`, `active`, `contactEmail`, `expiresIn` ou refresh token.

#### CategoryResponseDTO

| Campo | Tipo Java / JSON | Presença / formato |
| --- | --- | --- |
| `id` | UUID / string | ID persistido |
| `name` | String / string | Nome não nulo |
| `active` | boolean / boolean | Estado da categoria |

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Conduta interna",
  "active": true
}
```

#### ProtocolResponseDTO

| Campo | Tipo Java / JSON | Presença / formato |
| --- | --- | --- |
| `protocol` | String / string | Protocolo gerado |
| `trackingCode` | String / string | Código de 6 caracteres retornado somente na criação |

```json
{
  "protocol": "DEN-2026-1234567",
  "trackingCode": "ABC234"
}
```

#### ReportResponseDTO

| Campo | Tipo Java / JSON | Presença / formato |
| --- | --- | --- |
| `protocol` | String / string | Não nulo |
| `category` | String / string | Nome da categoria, não objeto/UUID |
| `description` | String / string | Texto da denúncia, não nulo |
| `status` | ReportStatus / string | Valor exato do enum |
| `createdAt` | LocalDateTime / data-hora | Gerado na persistência; sem fuso; confirmar serialização efetiva |

```json
{
  "protocol": "DEN-2026-1234567",
  "category": "Conduta interna",
  "description": "Descrição fictícia do ocorrido.",
  "status": "RECEIVED",
  "createdAt": "2026-09-04T12:30:00"
}
```

#### UserResponseDTO

| Campo | Tipo Java / JSON | Presença / formato |
| --- | --- | --- |
| `id` | UUID / string | ID persistido |
| `name` | String / string | Não nulo |
| `cpf` | String / string | 11 dígitos; dado pessoal, preservar zeros iniciais |
| `contactEmail` | String / string ou null | Opcional; pode não existir |
| `role` | String / string | `EMPLOYEE` ou `ADMIN` |
| `active` | boolean / boolean | Conta ativa ou desativada |
| `passwordChanged` | boolean / boolean | Estado de troca de senha |

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Pessoa Exemplo",
  "cpf": "00000000000",
  "contactEmail": null,
  "role": "EMPLOYEE",
  "active": true,
  "passwordChanged": false
}
```

Não há senha ou hash de senha em nenhuma response HTTP.

#### DTOs de erro

Também fazem parte da comunicação HTTP, pelos handlers:

| DTO | Campos Java / JSON |
| --- | --- |
| `ErrorResponseDTO` | `status`: int/number; `erro`: String/string; `timestamp`: LocalDateTime, serialização dependente do mapper |
| `ValidationErrorResponseDTO` | `status`: int/number; `detalhes`: Map<String,String>/objeto de mensagens por campo; `timestamp`: LocalDateTime |

Os handlers preenchem os três campos. Exemplos e diferenças de serialização estão na seção 8.

## 6. Enums

### Role

Valores exatos: `EMPLOYEE`, `ADMIN`.

Usado para autorização e retornado como String em `LoginResponseDTO.role` e `UserResponseDTO.role`. Cadastro via API fixa `EMPLOYEE`. A criação inicial de ADMIN ocorre na inicialização do backend, fora de endpoint. Não há campo de role em request.

### ReportStatus

Valores exatos, na ordem do Java:

```text
RECEIVED
IN_ANALYSIS
UNDER_INVESTIGATION
AWAITING_ACTION
CLOSED
ARCHIVED
```

Usado em `ReportStatusUpdateRequestDTO.newStatus` e `ReportResponseDTO.status`. Inicial: `RECEIVED`. O código não define descrições formais, etapas obrigatórias nem regras de transição; rótulos em português são apresentação do frontend e não devem substituir os valores enviados. O valor real é `UNDER_INVESTIGATION`, com essa grafia.

## 7. Paginação

| Endpoint | Tipo retornado | Defaults explícitos no controller |
| --- | --- | --- |
| GET `/api/categories` | `Page<CategoryResponseDTO>` | `Pageable` sem `@PageableDefault`; page/size/sort não fixados pelo projeto |
| GET `/api/reports/admin` | `Page<ReportResponseDTO>` | `page=0`, `size=10`, `sort=createdAt`; direção não explicitada |
| GET `/api/users` | `Page<UserResponseDTO>` | `size=20`, `sort=name`; page e direção não explicitadas |

Convenção do resolver Spring Data: página inicial 0, parâmetros `page`, `size`, `sort`; `sort=campo,asc` ou `sort=campo,desc`, podendo repetir `sort`. Sem override do framework, os defaults usuais são page 0, size 20 e sem ordenação para `Pageable` simples, e direção ASC para `@PageableDefault`. Estes defaults de framework não estão definidos integralmente em código local; confirmar em runtime ou enviar parâmetros explicitamente. Não há configuração local de limite máximo de página.

Exemplos de consumo explícito:

- `/api/categories?page=0&size=20&sort=name,asc`
- `/api/reports/admin?page=0&size=10&sort=createdAt,desc`
- `/api/users?page=0&size=20&sort=name,asc`

Não há whitelist de sort no código. Use propriedades conhecidas da entidade consultada; `category` da response de denúncia é nome projetado, não um campo escalar equivalente na entidade. Não suponha que todo campo visual possa ser usado para ordenar.

**A estrutura exata de serialização de Page<T> deve ser confirmada em runtime.** O projeto retorna `Page<T>` diretamente, sem envelope próprio. Não há exemplo fictício de envelope neste documento. O frontend precisará identificar no retorno real o conteúdo, página, tamanho, total de elementos/páginas e indicadores de navegação, sem tratar nomes presumidos como contrato confirmado. Os itens são exatamente os DTOs indicados.

## 8. Tratamento de erros

`GlobalExceptionHandler` é `@RestControllerAdvice`. Existem dois formatos, sem envelope comum adicional.

Exemplo de erro de negócio, com timestamp ilustrado como ISO:

```json
{
  "status": 400,
  "erro": "CPF já cadastrado no sistema.",
  "timestamp": "2026-09-04T12:30:00"
}
```

Exemplo de Jakarta Validation:

```json
{
  "status": 400,
  "detalhes": {
    "description": "A descrição da denúncia não pode estar vazia.",
    "categoryId": "A categoria da denúncia é obrigatória."
  },
  "timestamp": "2026-09-04T12:30:00"
}
```

`detalhes` não se chama `errors`, e `erro` não se chama `message`. O erro de validação não inclui `erro`.

| HTTP | Origem / cenários confirmados no código | Mensagem / formato |
| --- | --- | --- |
| 400 | `BusinessRuleException` | `ErrorResponseDTO` com mensagem da exceção |
| 400 | `MethodArgumentNotValidException` | `ValidationErrorResponseDTO`, mensagens por campo |
| 401 | `BadCredentialsException` no login | `erro`: `CPF ou senha inválidos` |
| 401 | AuthenticationEntryPoint | `erro`: `Token ausente ou inválido` |
| 401 | `ExpiredJwtException` no filtro | `erro`: `Sessão expirada. Faça login novamente.` |
| 401 | `JwtException` no filtro | `erro`: `Token de acesso inválido ou malformado.` |
| 401 | `UsernameNotFoundException` no filtro | `erro`: `Usuário desativado ou não encontrado.`; a busca em si não filtra active |
| 403 | AccessDeniedHandler | `erro`: `Você não tem permissão para acessar este recurso` |
| 404 | `ResourceNotFoundException` | `ErrorResponseDTO` com mensagem da exceção |
| 409 | `DataIntegrityViolationException` | `erro`: `Conflito de dados: O registro que você tentou inserir já existe ou viola uma restrição no banco de dados.` |
| 500 | Handler genérico de Exception | `erro`: `Ocorreu um erro interno no servidor. Tente novamente mais tarde.` |
| 500 | Catch genérico no filtro JWT | `erro`: `Erro interno de autenticação.` |

Mensagens de negócio relevantes:

- CPF repetido no cadastro: `CPF já cadastrado no sistema.` (400, não 409 na verificação prévia).
- Troca de senha: `A senha atual está incorreta.` ou `A nova senha não pode ser igual à senha provisória.` (400).
- Recuperação sem e-mail: `Este usuário não possui um e-mail de contato cadastrado para recuperação.` (400).
- Reset usado: `Este link de recuperação já foi utilizado.` (400).
- Reset expirado: `O link de recuperação expirou. Solicite um novo.` (400).
- Reset desconhecido: `Token inválido ou não encontrado.` (404).
- Usuário inexistente: `Usuário não encontrado.` (404).
- Categoria inexistente: `Categoria não encontrada.` (404).
- Consulta com protocolo inexistente: `Protocolo não encontrado.` (404).
- Consulta com código incorreto: `Protocolo ou código de acesso inválido.` (404).
- Upload com código incorreto: `Código de rastreio inválido para este protocolo.` (400).
- Upload/status com protocolo inexistente: `Denúncia não encontrada com o protocolo: <protocol>` (404).

Não há handlers específicos para JSON malformado, enum/UUID/data inválidos, parâmetros obrigatórios ausentes, `IllegalArgumentException`, `DisabledException` ou tamanho multipart excedido. Exceções que alcançam o advice genérico podem produzir 500, mesmo sendo problemas de entrada. Falhas anteriores ao MVC, no container ou no processamento multipart podem ter tratamento diferente; confirmar status e body em runtime, sem assumir 400/413 padronizados.

**Timestamp do filtro:** `JWTAuthenticationFilter` cria seu próprio `com.fasterxml.jackson.databind.ObjectMapper` e registra `JavaTimeModule`, sem desabilitar timestamps. Assim, não há garantia de string ISO nessa origem; pode serializar `LocalDateTime` como array numérico. `SecurityConfig` usa `tools.jackson.databind.ObjectMapper` injetado. Confirmar os formatos reais das três origens (MVC, handlers Security e filtro); não fazer a interface depender do parsing de `timestamp` para apresentar um erro.

## 9. CORS

`CorsConfig` é aplicado a `/**` e habilitado na cadeia Security.

| Configuração | Valor |
| --- | --- |
| Origins | `http://localhost:5173`, `https://reporting.mbfreire.local` |
| Métodos | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS` |
| Headers permitidos | `*`, incluindo Authorization e Content-Type |
| Credentials | `true` |
| Headers expostos | Não configurados explicitamente |
| Max age | Não configurado explicitamente |

Para desenvolvimento local no navegador, usar origem `http://localhost:5173`. `http://127.0.0.1:5173`, outras portas ou HTTPS localhost não estão na lista. A liberação de PUT/DELETE por CORS não cria endpoints desses métodos. JWT é enviado no header; o backend não implementa autenticação por cookie, e `allowCredentials=true` não obriga `withCredentials` para o Bearer.

## 10. Upload de arquivos

- Endpoint: `POST /api/reports/{protocol}/attachments`, com JWT de EMPLOYEE ou ADMIN.
- Body: `multipart/form-data`; campo textual obrigatório **`trackingCode`** (String, código retornado na criação) e campo **`files`**, mapeado para `List<MultipartFile>`. Para vários arquivos, repetir `files` no `FormData`. Ambos são `@RequestParam`; enviar o código no FormData evita colocá-lo na URL. Não há `@NotBlank` no parâmetro, mas o service compara seu valor com o hash BCrypt.
- MIME types aceitos: `image/jpeg`, `image/png`, `application/pdf`. A checagem usa o Content-Type informado no arquivo; não há inspeção de conteúdo implementada.
- Limite configurado: `spring.servlet.multipart.max-file-size=10MB` por arquivo e `spring.servlet.multipart.max-request-size=10MB` para a requisição inteira. Vários arquivos compartilham o limite total, incluindo o envelope multipart.
- Não há limite explícito de quantidade no service. Lista vazia e arquivo vazio são rejeitados.
- Sucesso: 201 sem corpo, sem IDs, nomes ou URLs retornados.
- O upload exige protocolo e `trackingCode` válido, além de autenticação. Código incorreto retorna 400 com `erro`: `Código de rastreio inválido para este protocolo.`. Não há checagem de autor nem restrição por status da denúncia. Na consulta o parâmetro se chama `code`; no upload, `trackingCode`.
- Armazenamento no servidor: `uploads/attachments`, relativo ao diretório de execução, normalizado para caminho absoluto. Nome interno gerado com UUID e extensão; não é uma URL pública.
- **Existem somente endpoints de upload: não existem endpoints de download, listagem, visualização ou exclusão de anexos.** Nenhuma response de denúncia contém anexos.

Rejeições internas de arquivo lançam `IllegalArgumentException`: `Nenhum arquivo foi enviado.`, `Não é possível enviar um arquivo vazio.` e `Tipo de arquivo não permitido. Apenas PDF, JPEG e PNG são aceitos.`. Como não há handler específico, essas mensagens não são garantidas no body HTTP; o advice genérico retorna 500 com mensagem genérica. Falha de escrita também gera exceção genérica. Validar MIME e tamanho no frontend melhora a experiência, mas não substitui a validação do servidor.

Se um arquivo de um lote falhar, não há compensação dos arquivos já escritos em disco. Não assumir sucesso parcial identificável nem reenviar automaticamente todo o lote: a API não retorna quais arquivos foram gravados.

## 11. Fluxos principais

### Login

Enviar CPF sem máscara e senha a `/auth/login`. Usar `token` no header das próximas chamadas e `role` para a interface. `/users/me` fornece o perfil completo. Centralizar 401 para encerrar a sessão local e solicitar novo login; em 403, informar falta de permissão sem loop de relogin.

### Primeiro acesso / troca de senha

Ao receber `passwordChanged=false`, o frontend pode encaminhar para troca de senha. Enviar `currentPassword` e `newPassword` em PATCH `/users/me/password`. Em 204, atualizar o perfil via `/users/me` ou ajustar o estado local. A flag fica true. Esse encaminhamento é política de interface: o backend não força a troca antes de outras operações.

### Recuperação de senha

Enviar CPF a POST `/auth/forgot-password`. O usuário deve possuir `contactEmail` não vazio. O backend cria token UUID, válido por uma hora, e envia e-mail via Brevo. A API responde 200 sem revelar o token. CPF não encontrado retorna 404, portanto o comportamento atual não oculta a existência de contas.

O link montado em `EmailService` é fixo: `http://localhost:5173/reset-password?token=<token>`. A página é responsabilidade do frontend; não é rota REST do backend. Ler o token da query e enviar `token` e `newPassword` a POST `/auth/reset-password`. Em 200, encaminhar ao login; não há JWT na resposta.

Reset marca o token como usado e `passwordChanged=true`. Token usado é verificado antes de expiração. Novo pedido não invalida tokens anteriores; não há verificação de `active` nesses serviços. O reset não impede reutilizar a senha atual. Envio/entrega de e-mail dependem da configuração e disponibilidade do provedor; não há endpoint para cadastrar/editar e-mail de contato depois do cadastro.

### Criação de denúncia

Autenticar, carregar categorias paginadas e enviar `ReportRequestDTO` em POST `/reports`. Embora a interface possa mostrar apenas ativas, o backend não rejeita categoria inativa. Em 201, exibir claramente **protocol e trackingCode** e oferecer copiar/salvar. O código só é devolvido nessa criação e deve ser tratado como informação sensível de acesso: não registrar em logs nem enviar a serviços externos.

### Consulta por protocolo

Com login ativo, solicitar protocolo e código, enviar GET `/reports/consult` com `protocol` e `code`. Exibir os cinco campos de `ReportResponseDTO`. Tratar 404 tanto para protocolo inexistente como código incorreto. Não há recuperação do tracking code ou consulta somente por protocolo.

### Upload de anexos

Após criar a denúncia, montar `FormData` com o campo textual `trackingCode` e uma ou mais partes `files`, e enviar ao protocolo retornado. Deixar navegador/cliente gerar Content-Type com boundary; não enviar JSON. Tratar 201 sem parsing de body. Não construir links de download ou galeria a partir do protocolo, pois não há contrato para isso.

### Fluxo administrativo

ADMIN lista denúncias em `/reports/admin` e altera status em `/reports/admin/{protocol}/status` com observação opcional. A resposta atualiza a denúncia, mas não fornece histórico ou note. ADMIN também cadastra EMPLOYEE em `/auth/register`, lista/consulta usuários e ativa/desativa contas. ADMIN cria categorias; qualquer usuário autenticado pode listá-las.

## 12. Pontos de atenção e cuidados de integração

### Limitações relevantes do backend atual

- Criação, acompanhamento e upload de denúncias exigem login apesar do contexto de denúncias anônimas.
- Criação de categoria exige ADMIN; listagem exige autenticação e inclui categorias inativas, que também são aceitas na criação de denúncia.
- `ReportAdminResponseDTO` existe, mas não é usado pelos controllers ou serviços de resposta. Declara `protocol`, `category`, `description`, `status`, `incidentDate`, `incidentLocation`, `createdAt`; não consumir esse formato. A API administrativa retorna `ReportResponseDTO`.
- `incidentDate` e `incidentLocation` são aceitos e persistidos, mas não retornados por nenhum endpoint atual.
- `StatusHistory` e `AuditLog` são gravados na alteração efetiva de status, mas não têm endpoints REST de consulta. `note` não pode ser recuperada via API. Não há comentários.
- Anexos só possuem upload, exigindo protocolo, trackingCode e autenticação. Não há download/listagem/exclusão e o retorno não permite identificar arquivos.
- `passwordChanged=false` não restringe a API. Desativação não bloqueia o caminho de autenticação por JWT já emitido. Troca/reset não revogam JWTs.
- Erros de entrada não cobertos por handlers específicos podem virar 500. Não assumir que todos os erros de cliente serão 400.
- Recuperação depende de e-mail previamente cadastrado e usa link fixo em localhost. Não há endpoint de edição desse e-mail.
- Formato de `Page<T>`, datas/timestamps, defaults efetivos do resolver de paginação, falhas multipart, resposta de usuário desativado, CORS em execução e disponibilidade do Swagger precisam de confirmação em runtime.
- Os exemplos de datas usam ISO para orientar integração, mas os mappers diferentes, especialmente no filtro JWT, impedem garantir um formato único de timestamp somente pelo código.

### Recomendações para o cliente HTTP

Configurar uma instância Axios ou wrapper de fetch com base `http://localhost:8080/api`, tratamento centralizado de erros e inclusão de Bearer apenas quando necessário. Nas rotas públicas de autenticação/recuperação, evitar anexar um token antigo. Não existe renovação automática de sessão no backend.

Enviar `application/json` em requests JSON e `FormData` no upload, deixando o boundary para o navegador. Distinguir respostas vazias de responses JSON e manter uma alternativa de mensagem caso a infraestrutura devolva body fora dos DTOs de erro. Respeitar validações, campos nullable, enums e paginação; não enviar campos extras, inclusive confirmação de senha.

Nunca logar JWT, senha, token de recuperação ou tracking code. A estratégia de armazenamento de JWT pertence ao frontend; o backend não define uma. Senhas só devem existir temporariamente no estado do formulário, nunca em localStorage/sessionStorage ou persistência. Limpar esses estados ao finalizar o fluxo. Não expor secrets do backend. Preservar CPF como string e tratar datas sem inventar timezone.

### Referências do código e revisão

Contrato baseado nos quatro arquivos de `controller`, oito records de `dto/request`, responses efetivamente usados em `dto/response`, `enums/Role.java`, `enums/ReportStatus.java`, `config/SecurityConfig.java`, `config/CorsConfig.java`, `config/OpenApiConfig.java`, classes de `security`, `exception/GlobalExceptionHandler.java` e configurações de `src/main/resources/application.properties`. Services e modelos foram usados para confirmar somente regras citadas de criação, consulta, status, senha e arquivos.

A revisão confrontou os 17 mappings, nomes dos DTOs/campos, enums, regras Security, validações e exemplos JSON com o código. Não houve execução de chamadas HTTP; os pontos de runtime acima permanecem pendentes.

## 13. Tabela final de endpoints

Todos os endpoints de negócio encontrados nos controllers estão abaixo. O host local é `http://localhost:8080`. Swagger/OpenAPI é fornecido pela dependência, não pelos quatro controllers de negócio.

| Método | Endpoint | Auth | Role | Descrição |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | Não | Pública | Autenticar por CPF e senha |
| POST | `/api/auth/register` | Sim | ADMIN | Cadastrar EMPLOYEE |
| POST | `/api/auth/forgot-password` | Não | Pública | Solicitar recuperação por e-mail |
| POST | `/api/auth/reset-password` | Não | Pública | Redefinir senha usando token |
| POST | `/api/categories` | Sim | ADMIN | Criar categoria |
| GET | `/api/categories` | Sim | Qualquer autenticado | Listar categorias paginadas |
| POST | `/api/reports` | Sim | EMPLOYEE ou ADMIN | Criar denúncia e obter protocolo/código |
| POST | `/api/reports/{protocol}/attachments` | Sim | EMPLOYEE ou ADMIN | Enviar anexos |
| GET | `/api/reports/consult` | Sim | EMPLOYEE ou ADMIN | Consultar com protocol e code |
| GET | `/api/reports/admin` | Sim | ADMIN | Listar denúncias paginadas |
| PATCH | `/api/reports/admin/{protocol}/status` | Sim | ADMIN | Alterar status |
| GET | `/api/users/me` | Sim | Qualquer autenticado | Consultar próprio perfil |
| GET | `/api/users` | Sim | ADMIN | Listar usuários paginados |
| GET | `/api/users/{id}` | Sim | ADMIN | Consultar usuário por UUID |
| PATCH | `/api/users/me/password` | Sim | Qualquer autenticado | Trocar própria senha |
| PATCH | `/api/users/{id}/deactivate` | Sim | ADMIN | Desativar usuário |
| PATCH | `/api/users/{id}/activate` | Sim | ADMIN | Ativar usuário |
