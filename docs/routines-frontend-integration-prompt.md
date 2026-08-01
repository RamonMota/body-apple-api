# Prompt para integrar rotinas no frontend

Implemente no frontend Body Apple a integração completa do CRUD de rotinas do
personal autenticado, usando o contrato de backend descrito neste documento.

Antes de editar:

1. leia integralmente as instruções do repositório do frontend, README,
   manifesto de dependências e documentação de arquitetura;
2. localize os padrões existentes de Supabase Auth, Route Handlers/BFF, cliente
   HTTP, React Query, Zod, formulários, componentes, paginação, filtros,
   notificações, confirmação de exclusão e testes;
3. apresente um plano curto, as rotas de frontend propostas e os arquivos que
   pretende alterar;
4. preserve alterações existentes e não crie uma arquitetura paralela;
5. não modifique o backend nesta tarefa.

## Contexto esperado do frontend

O frontend Body Apple utiliza Next.js App Router, React, TypeScript estrito,
Route Handlers como BFF, Supabase Auth, React Query e Zod. Confirme essas
premissas no código antes de implementar.

Regras obrigatórias:

- `API_URL` deve permanecer server-only;
- o browser deve chamar somente o BFF do frontend;
- Route Handlers privados devem obter a sessão Supabase no servidor e encaminhar
  `Authorization: Bearer <access_token>` ao backend;
- nunca enviar `trainerId`, email, role ou outro identificador como prova de
  ownership;
- validar entrada e respostas remotas com Zod, seguindo o padrão existente;
- preservar status HTTP relevantes e tratar `204` sem tentar interpretar JSON;
- não registrar access tokens, instruções privadas ou dados pessoais;
- não adicionar dependências sem necessidade comprovada.

## Objetivo de produto

Permitir que o personal autenticado:

1. visualize uma lista paginada de rotinas;
2. pesquise por nome ou instruções;
3. filtre por status;
4. crie uma rotina;
5. consulte os detalhes de uma rotina;
6. edite parcialmente campos e status;
7. limpe datas e instruções opcionais;
8. exclua logicamente uma rotina mediante confirmação.

Não implementar nesta etapa:

- treinos dentro da rotina;
- exercícios, séries ou repetições;
- atribuição da rotina aos alunos;
- execução de treino;
- expiração automática;
- clonagem ou versionamento.

## Contrato do backend

Base URL disponível somente no servidor:

```text
${API_URL}
```

Todos os endpoints abaixo exigem:

```http
Authorization: Bearer <access_token>
```

### Representação de rotina

```json
{
  "id": "49bce5e5-f0c4-4e63-882c-75ae74ba0b02",
  "name": "Hipertrofia — 4 dias",
  "startDate": "2026-08-03",
  "endDate": "2026-09-03",
  "removeOnExpiration": true,
  "instructions": "Executar quatro vezes por semana.",
  "status": "draft",
  "createdAt": "2026-08-01T12:00:00.000Z",
  "updatedAt": "2026-08-01T12:00:00.000Z",
  "deletedAt": null
}
```

Tipos e nulabilidade:

- `id`: UUID string;
- `name`: string;
- `startDate`: `YYYY-MM-DD | null`;
- `endDate`: `YYYY-MM-DD | null`;
- `removeOnExpiration`: boolean;
- `instructions`: `string | null`;
- `status`: `draft | active | archived`;
- `createdAt` e `updatedAt`: timestamp ISO 8601 UTC;
- `deletedAt`: timestamp ISO 8601 UTC ou `null`.

O backend não retorna `trainerId`.

### 1. Criar rotina

```http
POST /api/routines
Content-Type: application/json
```

Body mínimo:

```json
{
  "name": "Rotina inicial"
}
```

Body completo:

```json
{
  "name": "Hipertrofia — 4 dias",
  "startDate": "2026-08-03",
  "endDate": "2026-09-03",
  "removeOnExpiration": true,
  "instructions": "Executar quatro vezes por semana."
}
```

Validações:

- `name`: obrigatório, trim, entre 2 e 120 caracteres;
- `startDate`: opcional, `YYYY-MM-DD`, não nullable na criação;
- `endDate`: opcional, `YYYY-MM-DD`, não nullable na criação;
- `removeOnExpiration`: opcional, booleano, padrão `false`;
- `instructions`: opcional, trim, máximo de 2.000 caracteres e não nullable na
  criação;
- não enviar `status`, `trainerId`, `id`, timestamps ou campos desconhecidos;
- quando ambas as datas existirem, `endDate` não pode ser anterior a
  `startDate`;
- `removeOnExpiration: true` exige `endDate`.

O backend cria a rotina com `status: "draft"`.

Sucesso: `201` com a rotina criada.

### 2. Listar rotinas

```http
GET /api/routines?page=1&limit=20&search=hipertrofia&status=draft
```

Query params:

- `page`: opcional, inteiro >= 1, padrão 1;
- `limit`: opcional, inteiro de 1 a 100, padrão 20;
- `search`: opcional, trim, máximo de 100 caracteres; pesquisa em `name` e
  `instructions` sem diferenciar maiúsculas e minúsculas;
- `status`: opcional, `draft | active | archived`.

Não enviar query params vazios ou desconhecidos. O backend rejeita propriedades
fora do contrato.

Ordenação do backend:

1. `createdAt` decrescente;
2. `id` crescente como desempate.

Sucesso `200`:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Atenção: a query usa `limit`, mas a resposta usa `meta.pageSize`, seguindo o
contrato existente de alunos.

### 3. Consultar rotina

```http
GET /api/routines/:routineId
```

`routineId` deve ser UUID v4.

Sucesso: `200` com a rotina.

Retorna `404` quando a rotina não existe, foi excluída ou pertence a outro
personal.

### 4. Atualizar rotina

```http
PATCH /api/routines/:routineId
Content-Type: application/json
```

Todos os campos abaixo são opcionais:

```json
{
  "name": "Hipertrofia atualizada",
  "startDate": "2026-08-10",
  "endDate": "2026-10-10",
  "removeOnExpiration": false,
  "instructions": "Novas instruções",
  "status": "active"
}
```

É permitido limpar apenas os campos nullable:

```json
{
  "startDate": null,
  "endDate": null,
  "instructions": null,
  "removeOnExpiration": false
}
```

Não enviar `null` em `name`, `removeOnExpiration` ou `status`.

O backend combina o PATCH com os dados persistidos antes de validar. Portanto:

- atualizar apenas `endDate` ainda considera a `startDate` salva;
- atualizar apenas `startDate` ainda considera a `endDate` salva;
- remover `endDate` enquanto `removeOnExpiration` permanecer `true` retorna
  `400`;
- para limpar `endDate` nesse caso, envie explicitamente
  `removeOnExpiration: false` na mesma mutation;
- o backend nunca desativa `removeOnExpiration` implicitamente.

Sucesso: `200` com a rotina atualizada.

### 5. Excluir rotina

```http
DELETE /api/routines/:routineId
```

Sucesso: `204`, sem body.

A exclusão é lógica e pode ser repetida pelo mesmo personal. A rotina deixa de
aparecer na listagem e na consulta individual.

## Erros

Status esperados:

- `400`: UUID, query, body, datas ou período inválidos, enum inválido ou campo
  desconhecido;
- `401`: access token ausente, inválido ou expirado;
- `404`: perfil ou rotina não encontrada no escopo autenticado;
- `500`: falha inesperada.

O backend usa atualmente o formato padrão de erro do NestJS. Não presuma que
exista `error.code` estável. Reaproveite o adaptador de erros do frontend e
preserve pelo menos o status e uma mensagem segura.

## BFF solicitado

Crie ou estenda Route Handlers internos do frontend para representar o recurso,
preferencialmente:

```text
GET    /api/routines
POST   /api/routines
GET    /api/routines/[routineId]
PATCH  /api/routines/[routineId]
DELETE /api/routines/[routineId]
```

Os paths acima são uma proposta. Use a convenção real encontrada no frontend.

Os handlers devem:

- obter o access token no servidor pelo mecanismo Supabase existente;
- responder `401` quando não houver sessão válida;
- encaminhar o bearer token ao backend;
- construir query params somente com valores definidos;
- validar params, body e resposta com Zod;
- preservar os status `400`, `401` e `404`;
- não tentar executar `response.json()` em uma resposta `204`;
- nunca devolver o access token ao browser;
- usar cache apropriado para dados privados e mutáveis, evitando respostas
  públicas ou obsoletas do Next.js.

## Schemas e tipos sugeridos

Adapte os nomes à convenção do projeto:

```ts
const routineStatusSchema = z.enum(['draft', 'active', 'archived']);

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

const routineSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startDate: dateOnlySchema.nullable(),
  endDate: dateOnlySchema.nullable(),
  removeOnExpiration: z.boolean(),
  instructions: z.string().nullable(),
  status: routineStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

const routineListSchema = z.object({
  data: z.array(routineSchema),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
```

Crie schemas diferentes para criação e edição. Não use um único schema que
perca as diferenças de nulabilidade:

- criação aceita ausência, mas não `null` em datas e instruções;
- edição aceita `null` em `startDate`, `endDate` e `instructions`;
- criação não aceita `status`;
- edição aceita `status`.

Implemente refinements para:

- validar datas reais, e não apenas o formato regex;
- impedir `endDate < startDate` quando ambas existirem;
- exigir `endDate` quando `removeOnExpiration` for `true`;
- na edição, considerar os valores atuais da rotina ao validar um formulário
  parcial ou montar um payload coerente.

## Camada de dados e React Query

Siga a organização existente de services, hooks e query keys. A integração deve
possuir:

- query paginada para listagem;
- query de detalhe por `routineId`;
- mutation de criação;
- mutation de atualização;
- mutation de exclusão;
- query keys determinísticas incluindo página, limite, busca e status;
- invalidação ou atualização direta do cache após mutations;
- remoção/invalidação do detalhe após exclusão;
- nenhum retry automático para erros `400`, `401` ou `404`;
- preservação da página anterior durante transições, se esse já for o padrão do
  projeto;
- debounce de busca, se existir infraestrutura para isso.

Evite atualizações otimistas que possam ocultar falhas de validação do período.
Prefira atualizar o cache após a resposta confirmada do backend.

## Interface solicitada

Integre as rotinas na área autenticada do personal, respeitando navegação,
layout e design system existentes.

### Lista

Deve conter:

- título e ação para criar rotina;
- busca por nome/instruções;
- filtro de status com opção “Todos”;
- paginação baseada em `meta.totalPages`;
- estados de carregamento, vazio, erro e lista;
- nome, período, status e indicação de remoção ao expirar;
- ações acessíveis para visualizar, editar e excluir;
- confirmação antes da exclusão;
- feedback de sucesso e erro.

Quando `startDate` e `endDate` forem `null`, exiba uma representação clara como
“Sem período definido”. Formate datas civis sem construir `new Date('YYYY-MM-DD')`
de maneira que possa mudar o dia pelo timezone. Prefira formatar os componentes
da própria string ou usar o utilitário date-only já adotado no frontend.

### Criação e edição

Reaproveite componentes de formulário quando isso não apagar diferenças de
contrato.

Campos:

- nome;
- data inicial opcional;
- data final opcional;
- checkbox “Remover treino ao expirar”, mapeado para
  `removeOnExpiration`;
- instruções opcionais;
- status apenas na edição.

Comportamentos:

- não transformar campo de data vazio em string vazia no payload; na criação,
  omita-o; na edição, envie `null` somente quando o usuário estiver limpando um
  valor previamente existente;
- ao limpar `endDate` de uma rotina com `removeOnExpiration: true`, desmarque o
  checkbox de forma explícita na interface ou bloqueie o envio com uma mensagem;
- não envie campos inalterados no PATCH, salvo se o padrão do frontend usar um
  payload completo coerente com o contrato;
- impedir envio duplicado durante mutations;
- manter dados do formulário em erros recuperáveis;
- exibir mensagens inline para validações de período.

### Detalhe

Apresente todos os campos públicos da rotina e ações para editar ou excluir.
Não crie seções funcionais de treinos ou alunos nesta etapa; se o design já as
previr, mantenha-as ausentes ou claramente indisponíveis sem chamadas falsas.

## Testes esperados

Adicione testes proporcionais à infraestrutura real do frontend, cobrindo:

1. BFF encaminha o bearer token sem expô-lo;
2. BFF retorna `401` sem sessão;
3. query params usam `page`, `limit`, `search` e `status` corretamente;
4. respostas de lista e detalhe são validadas;
5. lista vazia e paginação;
6. busca e filtro por status;
7. criação somente com nome;
8. criação com todos os campos;
9. criação não envia `status` ou `trainerId`;
10. datas inexistentes ou período invertido são rejeitados;
11. `removeOnExpiration: true` sem `endDate` é rejeitado;
12. edição parcial e alteração de status;
13. limpeza de datas e instruções envia `null` corretamente;
14. tentativa de limpar `endDate` mantendo remoção ativa é bloqueada ou exibe o
    erro `400` preservado;
15. exclusão trata `204` sem JSON e atualiza o cache;
16. `404` de rotina inexistente apresenta estado adequado;
17. datas civis não mudam de dia por timezone;
18. loading, erro, confirmações e acessibilidade relevantes.

## Critérios de conclusão

Considere a integração concluída somente quando:

- todo o CRUD funciona pela camada BFF autenticada;
- `API_URL` e access token permanecem no servidor;
- ownership nunca depende de dados enviados pelo browser;
- requests e responses são validados na borda;
- datas civis permanecem no dia correto;
- nullable e campos ausentes são tratados conforme o contrato;
- paginação, busca e filtro funcionam sem parâmetros desconhecidos;
- React Query mantém cache consistente após mutations;
- lint, typecheck, testes e build passam;
- não há credenciais ou dados privados em logs;
- nenhuma funcionalidade futura de treinos ou atribuição foi simulada.

Ao finalizar, entregue:

1. resumo da integração;
2. arquivos alterados;
3. rotas BFF criadas;
4. páginas e componentes adicionados;
5. decisões de UX e tratamento de datas;
6. testes e comandos executados com resultados;
7. divergências reais encontradas entre este contrato e o frontend.
