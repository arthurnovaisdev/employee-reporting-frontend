# PROJECT_CONTEXT.md

## 1. Finalidade deste documento

Este documento contém o **contexto geral do projeto de Canal de Denúncias Anônimas / Ouvidoria Interna da MB.FREIRE**.

Ele deve ser utilizado como contexto permanente por qualquer IA que participe do projeto, principalmente para:

* desenvolvimento e evolução do frontend;
* integração frontend ↔ backend;
* análise de requisitos;
* decisões de UX/UI;
* planejamento de funcionalidades;
* documentação;
* testes;
* revisão técnica;
* futuras melhorias.

Antes de sugerir ou implementar mudanças relevantes no sistema, considere as decisões registradas neste documento.

Este documento apresenta o **contexto geral do produto**.

Para detalhes técnicos exatos da API, como endpoints, DTOs, enums e contratos HTTP, a fonte de verdade deve ser o arquivo:

`CONTEXT_BACKEND.md`

Caso exista divergência entre este documento e o `CONTEXT_BACKEND.md` sobre o contrato atual da API, prevalece o `CONTEXT_BACKEND.md`.

---

# 2. Visão geral do projeto

O projeto é um **Canal de Denúncias Anônimas / Ouvidoria Interna** desenvolvido para a empresa **MB.FREIRE**, uma empresa do setor contábil.

O sistema tem como objetivo fornecer um canal interno no qual funcionários possam registrar denúncias e manifestações relacionadas ao ambiente de trabalho de maneira segura e com preservação da identidade do denunciante.

O sistema também possui uma área administrativa para que responsáveis autorizados, como profissionais do RH ou responsáveis pela gestão do canal, possam acompanhar as denúncias e atualizar seu andamento.

O sistema será acessado pelo navegador.

---

# 3. Objetivos principais

O sistema deve permitir:

* registro de denúncias;
* preservação do anonimato do denunciante;
* acompanhamento posterior da denúncia;
* categorização das manifestações;
* inclusão opcional de arquivos/anexos;
* acompanhamento do status;
* administração das denúncias por usuários autorizados;
* autenticação segura dos funcionários;
* gerenciamento dos usuários da empresa;
* recuperação de senha;
* controle de permissões;
* registro de operações administrativas relevantes;
* execução dentro da infraestrutura definida para a empresa.

---

# 4. Contexto de privacidade e anonimato

A preservação da identidade do denunciante é um requisito central do projeto.

A denúncia não deve armazenar diretamente a identidade do funcionário que realizou o registro.

O funcionário acompanha sua denúncia através de informações específicas fornecidas após a criação, principalmente:

* protocolo;
* código de acompanhamento/acesso.

Essas informações funcionam como mecanismo para localizar e consultar posteriormente a denúncia.

O frontend deve tratar o código de acompanhamento como uma informação sensível.

Ao criar uma denúncia, deve existir uma etapa clara mostrando ao usuário:

* protocolo;
* código de acompanhamento;
* aviso de que essas informações devem ser guardadas.

O frontend pode oferecer recursos como:

* copiar protocolo;
* copiar código;
* copiar ambos;
* salvar as informações;
* imprimir ou gerar um registro para o próprio usuário, caso essa funcionalidade seja implementada.

O código de acompanhamento nunca deve aparecer em logs ou ser enviado desnecessariamente para serviços externos.

---

# 5. Usuários do sistema

Existem dois perfis principais:

## EMPLOYEE

Funcionário da empresa.

Pode utilizar as funcionalidades destinadas aos funcionários, como:

* autenticação;
* criação de denúncia;
* acompanhamento da denúncia;
* envio opcional de anexos;
* gerenciamento da própria senha;
* recuperação de senha.

## ADMIN

Usuário administrativo, destinado principalmente ao responsável pelo canal/RH.

Possui permissões administrativas adicionais.

A conta ADMIN é exclusivamente administrativa e não deve ser utilizada para registrar ou acompanhar denúncias como denunciante.

Caso uma pessoa que exerça função administrativa/RH deseje registrar uma denúncia como funcionária, deverá utilizar sua conta EMPLOYEE separada.

Pode realizar operações como:

* consultar denúncias;
* acompanhar denúncias;
* alterar status;
* administrar usuários;
* cadastrar funcionários;
* ativar/desativar usuários;
* administrar recursos disponíveis conforme definido pelo backend.

As permissões exatas devem sempre ser verificadas no `CONTEXT_BACKEND.md`.

---

# 6. Arquitetura geral

O projeto é dividido em dois sistemas independentes.

## Backend

Repositório próprio.

Stack principal:

* Java;
* Spring Boot;
* Spring Web;
* Spring Security;
* JWT;
* Spring Data JPA;
* Hibernate;
* Jakarta Validation;
* PostgreSQL;
* Maven;
* integração com serviço de e-mail;
* suporte a upload de anexos.

O backend expõe uma API REST.

Base URL local utilizada durante o desenvolvimento:

`http://localhost:8080/api`

## Frontend

Projeto completamente separado do backend.

Possui:

* outro diretório;
* outro projeto no IntelliJ;
* outro repositório Git.

Stack planejada/principal:

* React;
* Vite;
* TypeScript;
* Material UI;
* React Router;
* Axios;
* React Query;
* React Hook Form;
* Zod.

O frontend se comunica exclusivamente com o backend através da API REST.

---

# 7. Divisão de responsabilidade entre frontend e backend

## Backend

Responsável por:

* autenticação;
* autorização;
* regras de negócio;
* persistência;
* validações definitivas;
* geração de protocolo;
* geração e proteção do código de acompanhamento;
* segurança;
* JWT;
* gerenciamento de usuários;
* gerenciamento de denúncias;
* gerenciamento de categorias;
* armazenamento de informações dos anexos;
* histórico;
* auditoria;
* recuperação de senha;
* envio de e-mail.

## Frontend

Responsável por:

* interface;
* experiência do usuário;
* formulários;
* navegação;
* apresentação dos dados;
* validações auxiliares;
* comunicação HTTP;
* armazenamento controlado do JWT;
* controle visual baseado na role;
* tratamento dos erros da API;
* experiência de acompanhamento da denúncia;
* experiência administrativa.

O frontend nunca deve duplicar regras críticas de segurança esperando que elas substituam validações do backend.

---

# 8. Autenticação

O sistema utiliza autenticação com:

* CPF;
* senha.

O login não utiliza e-mail como identificador principal.

O backend retorna um JWT após autenticação válida.

As requisições protegidas utilizam:

`Authorization: Bearer <TOKEN>`

O frontend deve possuir uma camada centralizada de comunicação HTTP.

Recomenda-se utilizar um cliente Axios configurado com interceptor para adicionar automaticamente o JWT.

Nunca registrar o JWT em:

* console;
* logs;
* serviços externos;
* ferramentas de analytics.

---

# 9. Cadastro de funcionários

Não existe cadastro público livre.

O cadastro de novos funcionários é uma operação administrativa.

O administrador cadastra o funcionário no sistema.

O usuário cadastrado possui perfil de funcionário.

Existe suporte ao conceito de senha inicial/provisória e necessidade de alteração de senha.

O frontend deve respeitar o comportamento real definido pelo backend para primeiro acesso.

---

# 10. Primeiro acesso e alteração de senha

O sistema possui controle para identificar se o funcionário já alterou sua senha inicial.

Quando aplicável, após o login o frontend deve verificar essa informação.

Caso a senha ainda precise ser alterada, o usuário deve ser direcionado para o fluxo de troca de senha antes de acessar normalmente o sistema.

A senha nunca deve ser persistida em:

* localStorage;
* sessionStorage;
* IndexedDB;
* cookies comuns;
* qualquer armazenamento permanente do navegador.

Ela pode existir apenas temporariamente no estado do formulário durante a operação.

---

# 11. Recuperação de senha

Existe um fluxo de redefinição de senha por e-mail.

O sistema utiliza o **Brevo** como serviço de e-mail transacional.

O e-mail de contato do funcionário é separado da credencial utilizada para login.

O fluxo geral é:

1. funcionário solicita recuperação;
2. backend identifica o usuário;
3. backend gera um token temporário;
4. um e-mail é enviado;
5. o usuário acessa o link;
6. frontend abre a página de redefinição;
7. nova senha é enviada ao backend;
8. token é invalidado/utilizado.

A implementação exata do token, validade e endpoints deve ser consultada no `CONTEXT_BACKEND.md`.

## 11.1 Implementação dos fluxos de senha no frontend

O fluxo em `/forgot-password` solicita somente o CPF e envia o `ForgotPasswordRequestDTO` para o endpoint documentado. A tela informa o envio do link sem revelar o endereço de contato e apresenta os erros de usuário inexistente ou sem e-mail conforme a resposta atual do backend.

Em `/reset-password`, o token é lido da query string, mantido apenas na memória da página e removido da barra de endereço. O formulário possui nova senha e confirmação local, mas envia somente `token` e `newPassword`. Token inválido, expirado ou já utilizado encerra a tentativa e oferece a solicitação de um novo link. Após sucesso, senha, confirmação, token temporário e eventual sessão local são descartados antes do retorno ao login.

A troca autenticada usa `PATCH /api/users/me/password` com somente `currentPassword` e `newPassword`. A confirmação existe apenas no formulário e nunca é enviada. Sessões com `passwordChanged=false`, independentemente da role, permanecem restritas à troca obrigatória; após HTTP 204, a flag local é atualizada e o usuário segue para a área correspondente à sua role.

As senhas permanecem somente no estado temporário dos formulários e durante a requisição. Não são gravadas em storage, cookies, URLs, logs ou caches de mutation.

---

# 12. Denúncias

A denúncia representa a principal entidade funcional do sistema.

Uma denúncia pode conter informações como:

* categoria;
* descrição;
* data do incidente;
* local do incidente;
* status;
* data de criação;
* protocolo;
* informações necessárias para acompanhamento.

Nem todos os campos são obrigatórios.

O contrato exato deve ser obtido no `CONTEXT_BACKEND.md`.

---

# 13. Criação de denúncia

Fluxo conceitual esperado:

1. usuário entra no sistema;
2. acessa a funcionalidade de nova denúncia;
3. seleciona uma categoria;
4. informa a descrição;
5. opcionalmente informa data do ocorrido;
6. opcionalmente informa local;
7. opcionalmente adiciona arquivos;
8. revisa os dados;
9. confirma o envio;
10. backend registra a denúncia;
11. protocolo e código de acompanhamento são apresentados.

O frontend deve destacar claramente que o protocolo/código devem ser guardados.

---

## 13.1 Implementação do fluxo no frontend

O formulário em `/reports/new` usa React Hook Form e Zod com os quatro campos de `ReportRequestDTO`. A rota é exclusiva de `EMPLOYEE`; acesso de `ADMIN` é redirecionado para `/admin/reports`.

As categorias são carregadas de `GET /api/categories`, percorrendo as páginas e validando a estrutura recebida em runtime. O adaptador reconhece metadados na raiz ou em `page`; a serialização do ambiente real ainda precisa ser confirmada com uma sessão autenticada. Categorias inativas não são filtradas, conforme a aceitação atual do backend.

A criação usa `POST /api/reports`. Somente após receber protocolo e código, e somente quando existem arquivos, envia `FormData` para `POST /api/reports/{protocol}/attachments`, repetindo `files` e incluindo `trackingCode`. JPEG, PNG e PDF são validados por MIME, extensão, tamanho individual de 10 MB, máximo de 5 anexos e total acumulado de 25 MiB; arquivos vazios são rejeitados. O backend valida a assinatura real e aplica o limite do multipart.

O comprovante em `/reports/success` oferece cópia individual e conjunta. Protocolo e código ficam apenas na memória das rotas do fluxo, sem storage, URL ou cache de mutations. São descartados ao sair do fluxo ou recarregar a página; a interface orienta o usuário a guardá-los.

Falhas de upload não invalidam o registro: a tela preserva o comprovante e informa que apenas os anexos falharam. Não há reenvio automático do lote. Um 401 durante o upload encerra a sessão, mas permite guardar o comprovante em memória antes de novo login.

Os testes locais do contrato e do encadeamento podem ser executados com `npm test`, usando respostas simuladas, sem criar denúncias reais.

---

# 14. Anexos opcionais

A denúncia pode possuir **arquivos opcionais**.

O usuário não é obrigado a enviar arquivos para registrar uma denúncia.

O frontend deve oferecer uma área opcional para adicionar evidências/documentos.

O backend atualmente possui suporte para upload de anexos associados a uma denúncia.

Entre os formatos suportados estão, conforme configuração atual do backend:

* JPEG;
* PNG;
* PDF.

Os limites e tipos exatos devem ser consultados no `CONTEXT_BACKEND.md`.

O frontend deve:

* deixar claro que o envio é opcional;
* validar extensão/tipo antes do upload quando possível;
* validar tamanho;
* apresentar arquivos selecionados;
* permitir remover um arquivo antes do envio;
* indicar progresso/estado de upload quando necessário;
* apresentar erros de maneira compreensível.

Nunca assumir a existência de:

* download;
* exclusão;
* visualização;
* listagem de anexos;

sem confirmar primeiro no `CONTEXT_BACKEND.md`.

---

# 15. Protocolo e código de acompanhamento

Após registrar a denúncia, o backend gera informações que permitem o acompanhamento.

O usuário deve receber claramente:

* protocolo;
* código de acompanhamento.

O código puro não deve ser tratado como dado comum.

O backend utiliza mecanismo de hash para protegê-lo no armazenamento.

O frontend deve assumir que o usuário precisa guardar essas informações.

A tela de sucesso do envio da denúncia é uma etapa importante do sistema e não deve simplesmente redirecionar o usuário sem antes apresentar essas informações.

---

# 16. Acompanhamento da denúncia

O sistema possui funcionalidade para acompanhar uma denúncia através das informações fornecidas ao denunciante.

O usuário informa:

* protocolo;
* código de acompanhamento.

Após validação, o backend retorna as informações públicas/permitidas daquela denúncia.

O frontend não deve expor informações administrativas ou dados que possam comprometer o anonimato.

---

# 17. Status das denúncias

As denúncias possuem um status.

O backend utiliza um enum próprio.

Os valores técnicos exatos devem sempre ser retirados do `CONTEXT_BACKEND.md`.

No frontend, os valores técnicos podem ser convertidos para textos amigáveis.

Exemplo conceitual:

`RECEIVED` → `Recebida`

Porém, a API sempre deve receber exatamente o valor técnico esperado pelo backend.

Nunca enviar o texto traduzido no lugar do enum.

---

# 18. Histórico de status

O backend possui estrutura para registrar histórico das mudanças de status.

Esse histórico permite saber que uma denúncia passou por determinadas etapas ao longo do processo.

A disponibilidade desse histórico através da API deve ser confirmada no `CONTEXT_BACKEND.md`.

Não implementar uma tela de histórico assumindo que existe endpoint para isso sem verificar o contrato atual.

---

# 19. Auditoria administrativa

O backend possui mecanismo de auditoria para determinadas ações administrativas.

O objetivo é permitir rastreabilidade das ações realizadas por administradores.

Esse recurso é importante principalmente porque o sistema trabalha com denúncias e informações potencialmente sensíveis.

A interface do frontend não deve assumir que todos os dados de auditoria estão disponíveis via API.

---

# 20. Categorias

As denúncias são associadas a categorias.

Exemplos conceituais podem incluir:

* assédio;
* comportamento inadequado;
* problemas no ambiente de trabalho;
* outras manifestações.

Os nomes reais das categorias são dados do sistema e não devem ser hardcoded no frontend.

O frontend deve buscar as categorias através da API quando essa operação estiver disponível.

---

# 21. Área administrativa

O sistema deve possuir uma interface própria para administradores.

Principais necessidades:

* visão das denúncias;
* paginação;
* visualização das informações permitidas;
* identificação do status;
* alteração de status;
* gerenciamento de funcionários;
* ativação/desativação de usuários;
* criação de novos funcionários;
* acesso às funções administrativas disponíveis.

O frontend deve separar claramente a experiência do funcionário da experiência administrativa.

Rotas administrativas devem possuir proteção no frontend, mas a autorização real continua sendo responsabilidade do backend.

---

## 21.1 Painel administrativo de denúncias no frontend

`/admin/reports` é protegido para ADMIN e lista os cinco campos de `ReportResponseDTO`. O frontend envia somente `page` e `size=10`, preservando a ordem retornada; não envia `sort` nem oferece seletor de ordenação, conforme a orientação atual do responsável pelo projeto de que o backend ordena por `createdAt DESC`.

O `CONTEXT_BACKEND.md` confirma a ordenação fixa por `createdAt DESC` e deixa a serialização de `Page<T>` pendente. O adaptador administrativo valida em runtime o conteúdo e metadados na raiz ou em `page`, como o adaptador de categorias existente. Totais só são exibidos quando recebidos; próxima página só é habilitada com indicação válida de continuidade. Esses formatos ainda precisam ser confirmados com uma resposta real, e os testes usam fixtures identificadas como simulações.

O detalhe abre em um diálogo e carrega GET `/api/reports/admin/{protocol}` por uma query específica com chave `['admin-report-detail', protocol]`, habilitada somente para ADMIN após a troca de senha. Exibe os campos de `ReportAdminResponseDTO`, incluindo data/local do ocorrido e a lista `attachments`. O carregamento usa skeleton; falhas mostram mensagem contextual e nova tentativa, sem usar o item da listagem como detalhe substituto.

A seção Anexos mostra nome original, tipo amigável, tamanho em bytes/KB/MB e data de envio quando disponível. Lista vazia exibe “Nenhum anexo enviado nesta denúncia.”. A ação Visualizar solicita GET `/api/reports/admin/{protocol}/attachments/{attachmentId}` pelo Axios existente com `responseType: 'blob'` e Bearer do interceptor. PDF, JPEG e PNG abrem por Blob URL em uma aba reservada durante o clique. A ação fica desabilitada durante a requisição; falhas ficam no item e permitem tentar novamente. URLs são revogadas quando a aba é fechada ou o detalhe é desmontado; requisições pendentes são canceladas ao sair. Bloqueio de pop-ups recebe orientação local. Não há uso de caminhos físicos, nome interno de armazenamento, edição, exclusão ou upload administrativo.

A alteração usa PATCH `/api/reports/admin/{protocol}/status` com `newStatus` e `note` opcional, limitada a 2.000 caracteres. A confirmação antecede o envio; após sucesso o DTO retornado atualiza a lista, que é reconsultada. O formulário impede salvar o mesmo status porque o backend não grava a observação nesse caso. Observações anteriores e histórico continuam sem endpoints de leitura. Os dados administrativos permanecem em memória e os caches de lista e detalhe são descartados quando deixam de ser usados. O tratamento existente encerra a sessão em 401 e mantém a sessão válida em 403.

---

# 22. Gestão de usuários

Administradores podem gerenciar funcionários.

Operações existentes ou previstas no backend incluem:

* cadastrar;
* listar;
* consultar;
* ativar;
* desativar.

Um funcionário desativado não deve possuir acesso normal ao sistema.

Nunca assumir que o frontend possui autoridade para definir permissões.

Todas as decisões de autorização pertencem ao backend.

---

# 23. Tratamento de erros

O frontend deve possuir tratamento centralizado de erros HTTP.

Comportamento esperado:

## 400

Problemas de validação ou regra de negócio.

Apresentar mensagem adequada ao usuário.

## 401

Usuário não autenticado, sessão/token inválido ou expirado.

Limpar autenticação e retornar ao login quando apropriado.

## 403

Usuário autenticado, mas sem autorização.

Mostrar página/mensagem de acesso não autorizado.

## 404

Recurso não encontrado ou consulta inválida.

Mostrar mensagem contextual.

## 409

Conflito de dados.

## 500

Erro interno do servidor.

Evitar exibir stack traces ou mensagens técnicas.

O formato exato dos objetos de erro está documentado no `CONTEXT_BACKEND.md`.

---

# 24. Paginação

Determinados endpoints administrativos utilizam paginação.

O frontend deve considerar:

* page;
* size;
* sort.

A página inicial normalmente é zero-based conforme Spring Data.

Não criar tipos TypeScript para a estrutura de paginação sem verificar o formato atual documentado ou retornado pela API.

---

# 25. Identidade visual

A aplicação pertence à MB.FREIRE.

A identidade visual deve transmitir:

* confiança;
* seriedade;
* profissionalismo;
* segurança;
* discrição.

Por ser um sistema de denúncias, evitar um visual excessivamente chamativo ou que remeta constantemente a alerta/perigo.

---

# 26. Paleta visual definida

Diretrizes principais:

## Preto grafite

Uso:

* textos;
* cabeçalhos;
* ícones;
* elementos estruturais.

Evitar utilizar preto absoluto como grande fundo dominante quando não necessário.

## Âmbar escuro

Uso:

* botões;
* links;
* ações importantes.

## Âmbar / dourado

Uso:

* logo;
* detalhes;
* elementos de destaque.

Utilizar com moderação.

## Branco / cinza claro

Devem representar grande parte dos fundos no tema claro.

Ajudam a manter o sistema profissional e reduzem a sensação visual de "alerta".

Evitar amarelo puro:

`#FFFF00`

Evitar preto puro quando tons grafite forem suficientes.

---

# 27. Tema claro e tema escuro

Foram considerados layouts em:

* tema claro;
* tema escuro.

Independentemente do tema escolhido, manter:

* identidade MB.FREIRE;
* boa legibilidade;
* contraste;
* aparência corporativa;
* consistência entre telas;
* acessibilidade.

---

# 28. Logo da MB.FREIRE

Foram fornecidas logos oficiais da MB.FREIRE como referência visual.

Quando utilizadas no frontend:

* utilizar versão com fundo transparente;
* preferencialmente PNG;
* preservar proporção;
* não deformar;
* não alterar a identidade visual;
* manter margem adequada;
* não aplicar efeitos exagerados.

A logo deve integrar a interface de forma discreta e profissional.

---

## 28.1 Referência visual aprovada para o frontend

O mapa de telas fornecido em 05/09/2026 passa a ser a referência principal de layout e linguagem visual do frontend.

Os arquivos persistidos no projeto são:

* `docs/design/DESIGN_REFERENCE.md` — regras e interpretação da referência visual;
* `docs/design/references/ouvidoria-screen-map.png` — mapa de telas aprovado;
* `docs/design/references/mbfreire-logo-source.png` — imagem original recebida, mantida como referência;
* `public/brand/mbfreire-logo.png` — logo preparado com fundo transparente para uso na aplicação.

O frontend deve seguir essa base visual, preservando o caráter corporativo, discreto, profissional e responsivo. O mapa orienta UX/UI, mas não substitui o contrato técnico definido em `CONTEXT_BACKEND.md`.

---

# 29. UX esperada

Como o sistema trabalha com denúncias, a experiência deve ser simples.

Evitar:

* formulários excessivamente complexos;
* quantidade desnecessária de etapas;
* termos técnicos;
* mensagens vagas;
* elementos que gerem insegurança ao usuário.

Priorizar:

* instruções claras;
* sensação de confidencialidade;
* confirmação das ações;
* mensagens de sucesso;
* orientação sobre protocolo;
* feedback de carregamento;
* mensagens de erro compreensíveis.

---

# 30. Segurança no frontend

Nunca:

* armazenar senha permanentemente;
* expor JWT em logs;
* colocar secrets no frontend;
* incluir chave do Brevo;
* incluir JWT secret;
* confiar apenas na role armazenada localmente para segurança;
* assumir que esconder um botão equivale a autorização;
* enviar dados sensíveis para analytics;
* logar denúncia ou tracking code.

O frontend controla a interface.

O backend controla a segurança real.

---

# 31. Banco de dados

O banco principal utilizado é PostgreSQL.

Durante o desenvolvimento já foram utilizados ambientes como:

* PostgreSQL local/Docker;
* PostgreSQL hospedado no Neon.

O backend utiliza JPA/Hibernate para persistência.

Detalhes de tabelas não devem ser usados diretamente pelo frontend.

O frontend deve interagir somente através da API.

---

# 32. Docker e ambiente

O backend possui contexto de execução com PostgreSQL via Docker.

Existe configuração para utilização de PostgreSQL 16.

A infraestrutura de desenvolvimento e a infraestrutura definitiva podem ser diferentes.

O frontend não deve hardcodar configurações específicas de produção.

---

# 33. Serviço de e-mail

O projeto utiliza Brevo para e-mails transacionais relacionados principalmente à recuperação de senha.

O serviço de e-mail utilizado pelo sistema não precisa ser o mesmo serviço utilizado pela empresa para seu e-mail corporativo.

Nenhuma API key do Brevo deve aparecer no frontend.

Toda comunicação com o Brevo acontece pelo backend.

---

# 34. Etapas do desenvolvimento

O projeto foi dividido conceitualmente em fases.

## Fase 1 — Estrutura do backend

Incluiu principalmente:

* entidades;
* repositories;
* services;
* controllers;
* JPA/Hibernate;
* PostgreSQL;
* regras básicas da API.

Essa fase foi concluída.

Os endpoints principais foram testados utilizando Postman.

## Fase 2 — Segurança e autenticação

Incluiu:

* Spring Security;
* JWT;
* autenticação;
* roles;
* controle de acesso;
* login;
* recuperação/troca de senha.

## Fase 3 — Frontend e integração

Inclui:

* React;
* TypeScript;
* interface;
* integração com API;
* experiência do funcionário;
* experiência administrativa;
* tratamento de autenticação;
* anexos;
* formulários;
* testes de integração.

Esta é uma das principais etapas atuais.

## Fase 4 — Implantação

Objetivo final:

implantar o sistema na infraestrutura definida para utilização pela empresa.

---

# 35. Divisão de trabalho durante o desenvolvimento

O backend principal foi desenvolvido com maior participação direta do desenvolvedor responsável pelo projeto.

Áreas como:

* entities;
* repositories;
* services;
* controllers;
* JPA;
* PostgreSQL;

foram tratadas principalmente manualmente.

Spring Security e JWT foram desenvolvidos em uma abordagem intermediária, entendendo a lógica e utilizando IA como auxílio.

Frontend, integração, revisão e determinados testes podem receber participação maior de ferramentas de IA.

Isso significa que a IA não deve assumir que está autorizada a reestruturar todo o backend.

Alterações estruturais relevantes devem ser justificadas.

---

# 36. Uso de IA no projeto

IA pode ser utilizada para:

* frontend;
* integração;
* criação de componentes;
* refatorações;
* testes;
* revisão;
* documentação;
* análise;
* geração de boilerplate.

Porém, deve evitar:

* criar endpoints fictícios;
* alterar contratos sem necessidade;
* inventar requisitos;
* introduzir bibliotecas desnecessárias;
* reescrever áreas estáveis sem justificativa;
* modificar segurança sem entender o impacto;
* substituir decisões consolidadas apenas por preferência técnica.

---

# 37. Relação entre PROJECT_CONTEXT e CONTEXT_BACKEND

Existem dois documentos com finalidades diferentes.

## `PROJECT_CONTEXT.md`

Contém:

* contexto geral;
* objetivos;
* arquitetura;
* decisões;
* fluxos;
* UX;
* identidade visual;
* regras para IA;
* status do projeto.

## `CONTEXT_BACKEND.md`

Contém:

* endpoints exatos;
* DTOs;
* JSON;
* enums;
* validações;
* autenticação;
* roles;
* paginação;
* erros;
* CORS;
* contratos técnicos.

Regra:

**Nunca usar o PROJECT_CONTEXT.md para adivinhar um contrato da API.**

Para implementar integração HTTP, consulte sempre o `CONTEXT_BACKEND.md`.

---

# 38. Prioridades do projeto

Ao tomar decisões, utilizar a seguinte ordem de prioridade:

1. Segurança
2. Privacidade
3. Anonimato
4. Integridade dos dados
5. Correção funcional
6. Clareza para o usuário
7. Manutenibilidade
8. Experiência visual
9. Conveniência de desenvolvimento

Uma implementação visualmente sofisticada nunca deve comprometer anonimato, segurança ou simplicidade.

---

# 39. Regras permanentes para qualquer IA que trabalhe no projeto

Antes de realizar uma tarefa:

1. Leia este `PROJECT_CONTEXT.md`.
2. Se a tarefa envolver integração com o backend, leia também `CONTEXT_BACKEND.md`.
3. Não invente endpoints.
4. Não invente DTOs.
5. Não invente enums.
6. Não altere decisões consolidadas sem explicar.
7. Não exponha informações sensíveis.
8. Não introduza dependências desnecessárias.
9. Preserve a identidade visual da MB.FREIRE.
10. Considere sempre o anonimato do denunciante.
11. Considere anexos como opcionais.
12. Mantenha frontend e backend desacoplados.
13. Utilize API REST para integração.
14. Trate erros adequadamente.
15. Respeite roles e autorização.
16. Priorize implementações simples e manuteníveis.

---

# 40. Regra de atualização

Este documento representa o contexto atual conhecido do projeto.

Sempre que houver uma mudança importante em:

* arquitetura;
* requisitos;
* identidade visual;
* fluxo de denúncia;
* autenticação;
* tecnologia;
* estratégia de implantação;
* regras de anonimato;
* comportamento dos anexos;

este arquivo deve ser atualizado.

Alterações puramente técnicas do contrato da API devem ser atualizadas principalmente no:

`CONTEXT_BACKEND.md`

---

# 41. Resumo rápido para IA

Se precisar compreender o projeto rapidamente:

> O sistema é uma Ouvidoria Interna / Canal de Denúncias Anônimas da MB.FREIRE. O backend é uma API REST Java/Spring Boot com PostgreSQL, Spring Security e JWT. Funcionários autenticam com CPF e senha, podem registrar denúncias sem vínculo direto entre a denúncia e sua identidade, acompanhar através de protocolo + código e adicionar arquivos opcionalmente. Administradores possuem uma área própria para gerenciar denúncias e funcionários. Há recuperação de senha por e-mail via Brevo. O frontend é um projeto React/Vite/TypeScript separado do backend e deve seguir a identidade visual corporativa da MB.FREIRE. Para qualquer integração HTTP, `CONTEXT_BACKEND.md` é a fonte de verdade.
