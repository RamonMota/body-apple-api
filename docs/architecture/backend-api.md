# BODY APPLE API — ARQUITETURA E PADRÕES

Este documento fornece contexto arquitetural para assistentes de IA que ajudem
no desenvolvimento do backend Body Apple. As sugestões devem seguir os padrões
abaixo. Em caso de divergência, o código do repositório é a fonte de verdade.


## 1. CONTEXTO DO BACKEND

Body Apple é uma plataforma voltada à gestão de alunos e treinos por personal
trainers. Este repositório contém sua API backend.

O projeto é uma aplicação monolítica modular. Os domínios compartilham o mesmo
processo e banco, mas devem permanecer isolados em módulos NestJS, com limites e
responsabilidades claros.


## 2. STACK

- Node.js 20 ou superior;
- npm;
- TypeScript estrito, target ES2023 e módulos CommonJS;
- NestJS 11 com Express;
- Prisma ORM 7;
- PostgreSQL hospedado no Supabase;
- @prisma/adapter-pg e pg para conexão com o banco;
- Supabase Auth como provedor de identidade;
- jose para validação de JWT por JWKS;
- class-validator e class-transformer para DTOs;
- Jest e Supertest para testes;
- ESLint e Prettier.

Ao sugerir código, considerar as APIs e convenções dessas versões. Evitar
soluções específicas de versões antigas do NestJS ou Prisma.


## 3. ORGANIZAÇÃO DO REPOSITÓRIO

body-apple-api/
├── prisma/
│   ├── migrations/       migrations SQL versionadas
│   └── schema.prisma     modelos e mapeamentos do banco
├── src/
│   ├── auth/             autenticação e identidade da requisição
│   ├── config/           configuração e validação do ambiente
│   ├── health/           verificação de disponibilidade da API
│   ├── prisma/           infraestrutura de acesso ao PostgreSQL
│   ├── <dominio>/        módulo isolado de cada domínio de negócio
│   ├── app.module.ts     composição da aplicação
│   └── main.ts           bootstrap e políticas HTTP globais
├── test/                 testes E2E e de integração
├── prisma.config.ts      configuração do Prisma CLI
├── package.json          scripts e dependências
└── README.md             instruções de execução do repositório

O Prisma Client é gerado em generated/prisma/ e não deve ser editado ou
versionado.


## 4. ARQUITETURA MODULAR

Cada domínio deve possuir seu próprio módulo NestJS. Um módulo pode conter:

- <dominio>.module.ts: composição do módulo;
- <dominio>.controller.ts: contrato e adaptação HTTP;
- <dominio>.service.ts: regras de negócio e casos de uso;
- dto/: validação e transformação de entradas;
- arquivos de tipos específicos do domínio;
- testes unitários próximos ao código testado.

Dependências entre módulos devem ser explícitas por imports e exports. Providers
devem ser obtidos por injeção de dependência, sem instanciação manual no código
da aplicação.

O AppModule é responsável somente por compor configuração, infraestrutura e
módulos de domínio. Ele não deve concentrar regras de negócio.


## 5. RESPONSABILIDADES POR CAMADA

Controller

- declara rotas, métodos HTTP, status e decorators;
- recebe parâmetros, body e identidade autenticada;
- delega o caso de uso ao service;
- não acessa o Prisma diretamente;
- não concentra regras de negócio.

DTO

- descreve o formato aceito pela API;
- valida toda entrada externa;
- aplica transformações simples e determinísticas, como trim;
- permite que a ValidationPipe rejeite propriedades desconhecidas.

Service

- implementa regras de negócio e casos de uso;
- coordena consultas e mutações no banco;
- traduz erros conhecidos de infraestrutura em exceções HTTP apropriadas;
- retorna somente os dados necessários ao consumidor.

PrismaService

- centraliza a instância do Prisma Client;
- gerencia conexão e desconexão pelo ciclo de vida do NestJS;
- é injetado nos services de domínio;
- não contém regras de negócio.

Module

- declara controllers e providers;
- importa dependências de outros módulos;
- exporta apenas o que realmente precisa ser compartilhado.


## 6. FLUXO DE UMA REQUISIÇÃO

Fluxo padrão:

Requisição HTTP
  -> configurações globais do NestJS
  -> guard de autenticação, quando necessário
  -> transformação e validação do DTO
  -> controller
  -> service do domínio
  -> PrismaService
  -> PostgreSQL

Fluxo de retorno:

PostgreSQL
  -> PrismaService
  -> service seleciona e normaliza os dados públicos
  -> controller
  -> resposta HTTP serializada pelo NestJS


## 7. CONFIGURAÇÃO HTTP GLOBAL

O bootstrap da aplicação deve manter:

- prefixo global /api;
- porta obtida da configuração, com padrão 3333;
- CORS restrito à origem definida por FRONTEND_URL;
- ValidationPipe global com transform: true;
- ValidationPipe global com whitelist: true;
- ValidationPipe global com forbidNonWhitelisted: true;
- shutdown hooks habilitados.

Todo contrato de entrada deve considerar que campos não declarados no DTO são
rejeitados. Não aceitar silenciosamente propriedades desconhecidas.


## 8. AUTENTICAÇÃO E IDENTIDADE

O Supabase Auth é o provedor de identidade, mas a API valida o access token
localmente com jose e as chaves públicas obtidas por JWKS.

Fluxo arquitetural:

1. O cliente envia Authorization: Bearer <access-token>.
2. O AuthGuard extrai o token.
3. O serviço JWT verifica assinatura, algoritmo, issuer, audience, expiração e
   claims obrigatórios.
4. O guard converte os claims em uma identidade interna mínima.
5. A identidade é anexada à requisição.
6. Controllers usam @CurrentUser() para recebê-la.

Formato interno da identidade:

{
  id: string;       // claim sub
  email: string;    // claim email
  role?: string;    // claim role, quando disponível
}

Padrões obrigatórios:

- nunca confiar em id, email ou papel enviados no body;
- derivar a identidade exclusivamente do JWT validado;
- aplicar AuthGuard explicitamente em toda rota ou controller privado;
- não usar a anon key para substituir a validação criptográfica do token;
- não expor claims, identificadores internos ou dados sensíveis sem necessidade;
- retornar UnauthorizedException para credenciais ausentes ou inválidas;
- manter uma representação interna pequena e tipada do usuário autenticado.


## 9. PERSISTÊNCIA COM PRISMA

O Prisma schema é a fonte de verdade dos modelos persistidos. Alterações de
estrutura devem incluir migration versionada e regeneração do Prisma Client.

Padrões de modelagem:

- usar UUIDs como identificadores das entidades;
- mapear nomes do banco em snake_case com @map e @@map quando o código usar
  camelCase;
- usar createdAt e updatedAt para auditoria temporal;
- representar unicidade e integridade no banco, não somente no service;
- selecionar explicitamente os campos retornados quando houver dados internos;
- não retornar diretamente campos sensíveis ou vínculos internos de autenticação;
- traduzir códigos Prisma conhecidos em exceções de domínio/HTTP;
- evitar consultas Prisma em controllers.

Conexões:

- DATABASE_URL é usada pela aplicação em runtime;
- DIRECT_URL é usada pelo Prisma CLI e pelas migrations;
- prisma.config.ts centraliza a URL usada pelo CLI;
- o datasource do schema declara PostgreSQL conforme o padrão do Prisma 7.


## 10. DTOs E VALIDAÇÃO

Toda entrada externa deve ter um DTO específico. Os DTOs devem usar decorators
de class-validator e, quando necessário, transformações de class-transformer.

Diretrizes:

- validar tipo, tamanho, formato e obrigatoriedade;
- normalizar strings com trim quando fizer sentido para o domínio;
- impedir strings compostas apenas por espaços;
- não reutilizar automaticamente DTOs de criação em atualização quando os
  contratos tiverem semânticas diferentes;
- não incluir em DTOs campos derivados da autenticação;
- preferir regras explícitas em vez de coerções ambíguas;
- cobrir entradas válidas, inválidas e campos extras em testes.


## 11. ERROS E CONTRATOS HTTP

Usar as exceções do NestJS que representem corretamente o resultado:

- BadRequestException ou erros da ValidationPipe para entrada inválida;
- UnauthorizedException para autenticação ausente ou inválida;
- ForbiddenException para usuário autenticado sem permissão;
- NotFoundException quando o recurso não existir no escopo consultado;
- ConflictException para violações de unicidade ou estado incompatível.

Regras:

- não esconder erros de programação como se fossem erros de negócio;
- traduzir somente falhas conhecidas e esperadas;
- manter mensagens úteis sem revelar detalhes internos do banco ou segurança;
- preservar a semântica dos métodos HTTP;
- explicar qualquer alteração de contrato que afete consumidores da API.


## 12. CONFIGURAÇÃO E AMBIENTE

ConfigModule deve permanecer global, com configuração tipada, cache e validação
no bootstrap. Os arquivos locais de ambiente não devem ser versionados.

Variáveis seguem estas responsabilidades:

- NODE_ENV: ambiente de execução;
- PORT: porta HTTP;
- FRONTEND_URL: origem aceita pelo CORS;
- DATABASE_URL: conexão PostgreSQL de runtime;
- DIRECT_URL: conexão usada pelo Prisma CLI;
- SUPABASE_URL: URL do projeto Supabase;
- SUPABASE_JWT_ISSUER: issuer esperado nos JWTs;
- SUPABASE_JWKS_URL: endpoint de chaves públicas;
- SUPABASE_ANON_KEY: chave pública, somente quando algum fluxo precisar dela.

Nunca colocar senhas, tokens, chaves ou URLs com credenciais em código, testes,
documentação ou respostas. Exemplos devem usar valores fictícios.


## 13. TESTES

Estratégia:

- testes unitários próximos aos controllers, guards, services e validadores;
- dependências externas substituídas por mocks nos testes unitários;
- testes E2E em test/ para validar rotas, autenticação, pipes e contratos HTTP;
- testes de integração separados para conexão e comportamento real do banco;
- Supertest para requisições E2E;
- Jest como executor e framework de asserções.

Toda mudança deve ter testes proporcionais ao risco. Casos importantes:

- caminho de sucesso;
- ausência do recurso;
- conflito de unicidade;
- entrada inválida;
- propriedades não permitidas;
- autenticação ausente, inválida ou expirada;
- isolamento do recurso pelo usuário autenticado;
- tradução de erros conhecidos do Prisma.


## 14. QUALIDADE DE CÓDIGO

- manter TypeScript estrito e evitar any;
- preferir tipos inferidos do Prisma quando eles representam o domínio;
- usar nomes claros em inglês no código e português nas mensagens destinadas ao
  usuário, seguindo o padrão existente;
- manter funções e classes com responsabilidade única;
- evitar abstrações prematuras;
- reutilizar infraestrutura compartilhada por módulos, não por imports globais
  informais;
- não adicionar dependências sem necessidade comprovada;
- executar formatação, lint, testes e build após mudanças relevantes;
- preservar compatibilidade com as configurações existentes do projeto.

Comandos de verificação:

- npm run build
- npm run lint
- npm test
- npm run test:e2e
- npm run test:db
- npm run prisma:validate
- npm run prisma:generate


## 15. DIRETRIZES PARA RESPOSTAS DE IA

Ao ajudar neste projeto:

1. Responder em português, salvo solicitação em outro idioma.
2. Seguir a arquitetura modular e a separação Controller -> Service -> Prisma.
3. Considerar autenticação, autorização, validação e isolamento de dados desde o
   desenho da solução.
4. Explicar impactos em schema, migration, API e testes quando aplicável.
5. Distinguir fatos observados no código de recomendações arquiteturais.
6. Não inventar regras de produto; sinalizar suposições que dependam de decisão.
7. Preferir soluções simples, seguras e consistentes com a stack existente.
8. Fornecer exemplos compatíveis com NestJS 11, Prisma 7 e TypeScript estrito.
9. Não sugerir acesso direto ao banco por controllers.
10. Não sugerir que dados de identidade sejam recebidos do cliente quando podem
    ser obtidos do token.
11. Não expor segredos nem recomendar que sejam versionados.
12. Consultar primeiro os arquivos relevantes do repositório quando uma resposta
    depender de detalhes de implementação.


## 16. DOMÍNIO DE ROTINAS

O módulo `src/routines/` implementa o CRUD de planejamentos do personal
autenticado em `/api/routines`. O controller aplica `AuthGuard`, os DTOs validam
e transformam params, query e body, e o service escopa todas as operações pelo
`authUserId` derivado do JWT.

O model `TrainingRoutine` pertence a `Trainer`, usa exclusão lógica e possui o
status controlado `draft | active | archived`. `startDate` e `endDate` são datas
civis opcionais persistidas como PostgreSQL `DATE` e serializadas na API como
`YYYY-MM-DD`.

O contrato HTTP completo, exemplos, paginação, erros e regras de período estão
documentados em `docs/routines-api.md`.

Esta etapa não inclui treinos dentro da rotina, exercícios, execução,
atribuição a alunos, expiração automática, exclusão física, versionamento ou
clonagem.
