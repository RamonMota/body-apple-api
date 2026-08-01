# Instruções do repositório

Este arquivo define as orientações permanentes para agentes de IA que trabalhem
no Body Apple API.

## Contexto obrigatório

- Antes de propor ou implementar mudanças no backend, leia
  `docs/architecture/backend-api.md`.
- Trate o código e `prisma/schema.prisma` como fontes de verdade.
- Se a documentação divergir do código, preserve o comportamento comprovado e
  atualize a documentação no mesmo trabalho quando isso fizer parte do escopo.
- Não invente regras de produto. Identifique claramente qualquer suposição que
  dependa de decisão do usuário.

## Comunicação

- Responda em português, salvo solicitação em outro idioma.
- Diferencie fatos observados, recomendações e hipóteses.
- Explique impactos em schema, migrations, contratos HTTP e testes quando forem
  relevantes para a mudança.
- Seja objetivo, mas registre riscos, limitações e decisões importantes.

## Arquitetura

- Preserve a arquitetura monolítica modular do NestJS.
- Organize cada domínio em seu próprio módulo.
- Mantenha a separação `Controller -> Service -> PrismaService`.
- Controllers definem o contrato HTTP e delegam regras aos services.
- Services concentram regras de negócio e acesso ao Prisma.
- DTOs validam e transformam toda entrada externa.
- Use injeção de dependência do NestJS; não instancie providers manualmente na
  aplicação.
- Evite abstrações prematuras e dependências novas sem necessidade comprovada.

## Segurança e dados

- Em rotas privadas, obtenha a identidade somente do JWT validado.
- Nunca confie em identificadores, email ou papel enviados no body para definir
  a identidade do usuário.
- Aplique o `AuthGuard` explicitamente em controllers ou rotas privadas.
- Não exponha segredos, claims desnecessários ou identificadores internos.
- Não inclua credenciais reais em código, testes, logs ou documentação.
- Não acesse o Prisma diretamente em controllers.
- Selecione explicitamente os campos públicos ao consultar entidades que tenham
  dados internos.
- Toda alteração persistente de estrutura deve incluir migration versionada e
  regeneração do Prisma Client.
- Não edite nem versione `generated/prisma/`.

## Validação e erros

- Preserve a `ValidationPipe` global com `transform`, `whitelist` e
  `forbidNonWhitelisted` habilitados.
- Use DTOs específicos e regras explícitas de tipo, tamanho, formato e
  obrigatoriedade.
- Traduza somente erros conhecidos de infraestrutura para exceções do NestJS.
- Não converta erros inesperados de programação em erros de negócio.
- Preserve a semântica dos status e métodos HTTP.

## Testes e verificação

- Adicione ou atualize testes proporcionais ao risco da mudança.
- Cubra sucesso, validação, autenticação, ausência, conflito e isolamento por
  usuário quando esses cenários se aplicarem.
- Use mocks em testes unitários e Supertest nos testes E2E.
- Execute as verificações relevantes antes de concluir:
  - `npm run build`
  - `npm run lint`
  - `npm test`
  - `npm run test:e2e`
  - `npm run prisma:validate`, quando houver mudança no Prisma
  - `npm run prisma:generate`, quando houver mudança no schema
- Informe claramente qualquer verificação que não pôde ser executada.

## Disciplina de alterações

- Preserve TypeScript estrito e evite `any`.
- Mantenha mudanças pequenas e relacionadas ao pedido.
- Preserve alterações existentes do usuário no worktree.
- Não altere contratos públicos silenciosamente.
- Não remova ou sobrescreva dados, migrations ou mudanças do usuário sem
  autorização explícita.
