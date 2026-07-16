# Body Apple API

API da plataforma Body Apple, voltada à gestão de alunos e treinos por personal trainers. Esta etapa estabelece apenas a fundação técnica do backend; os recursos de negócio serão adicionados posteriormente.

## Stack inicial

- Node.js 20 ou superior
- TypeScript em modo estrito
- NestJS com Express
- npm
- Jest
- ESLint e Prettier
- `@nestjs/config`
- Prisma ORM 7

## Requisitos

- Node.js 20+
- npm 10+

## Instalação

```bash
npm install
```

O projeto possui valores padrão seguros para a API. Para configurar o Supabase localmente, copie o arquivo de exemplo e substitua `[YOUR-PASSWORD]` pela senha real do banco:

```bash
cp .env.example .env.local
```

O `.env.local` é ignorado pelo Git e tem prioridade sobre o `.env`.

## Variáveis de ambiente

| Variável              | Obrigatória nesta etapa | Padrão/descrição                                   |
| --------------------- | ----------------------- | -------------------------------------------------- |
| `NODE_ENV`            | Não                     | `development`; aceita também `test` e `production` |
| `PORT`                | Não                     | `3333`                                             |
| `FRONTEND_URL`        | Não                     | `http://localhost:3000`; origem aceita pelo CORS   |
| `DATABASE_URL`        | Para acesso ao banco    | Pooler em transaction mode usado em runtime        |
| `DIRECT_URL`          | Para comandos Prisma    | Pooler em session mode usado pela CLI e migrations |
| `SUPABASE_URL`        | Não                     | Reservada para a URL do projeto Supabase           |
| `SUPABASE_ANON_KEY`   | Não                     | Reservada para a chave pública do Supabase         |
| `SUPABASE_JWT_ISSUER` | Não                     | Reservada para o emissor dos tokens                |
| `SUPABASE_JWKS_URL`   | Não                     | Reservada para as chaves públicas JWT              |

As variáveis `NODE_ENV`, `PORT` e `FRONTEND_URL` são validadas ao iniciar a aplicação. `DATABASE_URL` e `DIRECT_URL` só passam a ser necessárias ao acessar o banco ou executar comandos do Prisma.

## Comandos disponíveis

| Comando                   | Ação                                             |
| ------------------------- | ------------------------------------------------ |
| `npm run start`           | Inicia a aplicação                               |
| `npm run start:dev`       | Inicia em desenvolvimento com recarga automática |
| `npm run start:debug`     | Inicia em modo debug e watch                     |
| `npm run start:prod`      | Executa o build em `dist/`                       |
| `npm run build`           | Compila o projeto                                |
| `npm run lint`            | Analisa e corrige problemas de lint              |
| `npm run format`          | Formata os arquivos TypeScript                   |
| `npm run prisma:validate` | Valida a configuração e o schema Prisma          |
| `npm run prisma:generate` | Gera o Prisma Client                             |
| `npm test`                | Executa os testes unitários                      |
| `npm run test:watch`      | Executa testes em modo watch                     |
| `npm run test:cov`        | Gera cobertura de testes                         |
| `npm run test:db`         | Testa a conexão real com o PostgreSQL            |
| `npm run test:e2e`        | Executa os testes de ponta a ponta               |

## Desenvolvimento

```bash
npm run start:dev
```

Por padrão, a API fica disponível em `http://localhost:3333/api`.

## Prisma e Supabase

O Prisma CLI usa `DIRECT_URL`, evitando executar migrations pelo pooler em transaction mode. Em runtime, o `PrismaService` usa `DATABASE_URL` com `@prisma/adapter-pg`.

O `PrismaModule` é global e disponibiliza uma única instância reutilizável do client. A conexão é aberta durante a inicialização do módulo e encerrada pelo ciclo de vida do NestJS no shutdown.

No Prisma 7, as URLs ficam em `prisma.config.ts`; por isso o bloco `datasource` de `prisma/schema.prisma` contém apenas o provider PostgreSQL.

Depois de preencher o `.env.local`, valide a configuração:

```bash
npm run prisma:validate
npm run test:db
```

## Health check

```http
GET /api/health
```

Resposta:

```json
{
  "status": "ok",
  "service": "body-apple-api"
}
```

## Estrutura de pastas

```text
src/
├── common/       # Recursos compartilhados entre módulos
├── config/       # Configuração e validação do ambiente
├── health/       # Endpoint de verificação da API
├── prisma/       # Módulo e service de acesso ao PostgreSQL
├── app.module.ts # Módulo raiz
└── main.ts       # Bootstrap e configurações globais
```

Os arquivos do Prisma ficam em `prisma/`, e o client gerado fica em `generated/prisma/` sem ser versionado.

O projeto segue a arquitetura modular do NestJS. Cada novo domínio deve ser isolado em seu próprio módulo.

## Próximos passos

- Definir os primeiros models e migrations
- Criar os módulos de domínio que utilizarão o PrismaService
- Implementar autenticação
