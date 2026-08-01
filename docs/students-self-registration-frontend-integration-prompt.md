# Prompt para integrar o autocadastro de alunos no frontend

Implemente no frontend Body Apple a integração completa do link público e
permanente de autocadastro de alunos descrito abaixo.

Antes de editar, leia integralmente as instruções do repositório do frontend,
README, manifesto de dependências e documentação de arquitetura. Inspecione os
fluxos já existentes de Supabase Auth, Route Handlers/BFF, React Query, Zod,
formulários, notificações, tratamento de erros, componentes visuais e testes.
Use o código real como fonte de verdade e não crie uma arquitetura paralela.

## Contexto técnico esperado

O frontend utiliza Next.js App Router, React, TypeScript estrito, Route Handlers
como BFF, Supabase Auth, React Query e Zod. Confirme isso no código antes de
implementar.

Regras obrigatórias:

- `API_URL` deve permanecer server-only;
- chamadas autenticadas ao backend devem ser feitas pelo BFF com
  `Authorization: Bearer <access_token>` obtido pelo mecanismo Supabase já
  existente;
- o browser nunca deve enviar `trainerId` nem qualquer identidade como prova de
  ownership;
- a chamada pública de autocadastro não usa JWT;
- preserve camelCase nos contratos TypeScript;
- valide formulários e respostas na borda com Zod, seguindo o padrão existente;
- não registre access tokens, o código público completo ou dados pessoais em
  logs e ferramentas de analytics;
- não adicione dependências sem necessidade comprovada.

## Objetivo de produto

Permitir que o personal:

1. gere um código público permanente de autocadastro;
2. copie e compartilhe uma URL do frontend contendo esse código;
3. consulte o código já ativo sem rotacioná-lo;
4. rotacione o código mediante confirmação, invalidando o link anterior;
5. desative o link.

Permitir que qualquer aluno com um link válido abra uma página pública,
preencha os próprios dados e seja cadastrado no personal associado ao código.

O código é um identificador público de associação, não uma credencial de login
do personal. Ele não expira automaticamente e permanece válido até rotação ou
desativação.

## Contrato do backend

Base URL server-only:

```text
${API_URL}
```

### 1. Consultar código ativo

```http
GET /api/trainers/student-registration-link
Authorization: Bearer <access_token>
```

Sucesso `200`:

```json
{
  "token": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

Erros:

- `401`: access token ausente, inválido ou expirado;
- `404`: perfil do personal inexistente ou link ainda não gerado/desativado.

Para essa consulta, trate `404` de link inexistente como estado vazio normal da
interface, sem exibir uma tela de erro fatal.

### 2. Gerar ou rotacionar código

```http
POST /api/trainers/student-registration-link
Authorization: Bearer <access_token>
```

Não possui body.

Sucesso `201`:

```json
{
  "token": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
}
```

Se já existir um código, o `POST` realiza rotação e invalida imediatamente o
código anterior. A interface deve pedir confirmação antes de chamar esse
endpoint quando já houver link ativo.

Erros:

- `401`: access token ausente, inválido ou expirado;
- `404`: perfil do personal inexistente.

### 3. Desativar código

```http
DELETE /api/trainers/student-registration-link
Authorization: Bearer <access_token>
```

Sucesso `204`, sem body. A operação pode ser repetida.

Erros:

- `401`: access token ausente, inválido ou expirado;
- `404`: perfil do personal inexistente.

### 4. Autocadastro público

```http
POST /api/public/student-registrations/:token
Content-Type: application/json
```

Não enviar `Authorization`.

O `token` é uma string base64url com exatamente 43 caracteres:

```regex
^[A-Za-z0-9_-]{43}$
```

Body:

```json
{
  "fullName": "Ana Silva",
  "phone": "+5585999999999",
  "birthDate": "1995-05-20",
  "gender": "female"
}
```

Campos:

- `fullName`: obrigatório, trim, entre 2 e 120 caracteres, não pode conter
  somente espaços;
- `phone`: obrigatório; o backend aceita E.164 e também normaliza telefones
  brasileiros locais válidos;
- `birthDate`: obrigatório, `YYYY-MM-DD`, data real e não futura;
- `gender`: obrigatório; `male | female | nonBinary | preferNotToSay`.

Não enviar `status`, `trainerId`, `registrationSource`, timestamps ou campos
desconhecidos. O backend define `status` como `active` e
`registrationSource` como `selfRegistration`.

Sucesso `201`:

```json
{
  "id": "8e4367b8-658c-46a2-ae1f-58a57a6f5e20",
  "fullName": "Ana Silva",
  "phone": "+5585999999999",
  "birthDate": "1995-05-20T00:00:00.000Z",
  "gender": "female",
  "status": "active",
  "registrationSource": "selfRegistration",
  "createdAt": "2026-08-01T12:00:00.000Z",
  "updatedAt": "2026-08-01T12:00:00.000Z",
  "deletedAt": null
}
```

Observe que o request usa uma data civil `YYYY-MM-DD`, mas a resposta atual do
backend serializa `birthDate` como timestamp ISO em UTC.

Erros:

- `400`: token malformado, dados inválidos ou campos desconhecidos;
- `404`: token inexistente, rotacionado ou desativado;
- `409`: não foi possível concluir o cadastro, inclusive por conflito de
  telefone;
- `500`: falha inesperada.

O backend usa atualmente o formato de erro padrão do NestJS. Não presuma a
existência de um `error.code` estável; preserve status e mensagem usando o
adaptador de erros já existente no frontend.

## Implementação solicitada

### BFF do gerenciamento do link

Crie ou estenda Route Handlers internos do frontend para consultar, gerar e
desativar o link. Prefira um recurso BFF consistente, por exemplo:

```text
GET    /api/student-registration-link
POST   /api/student-registration-link
DELETE /api/student-registration-link
```

Os nomes acima são uma sugestão; priorize a convenção encontrada no projeto.
Os handlers devem:

- obter a sessão Supabase no servidor;
- responder `401` quando não houver sessão válida;
- encaminhar o bearer token ao backend;
- validar a resposta `{ token: string }`;
- preservar status relevantes do backend;
- tratar corretamente respostas `204` sem tentar interpretar JSON;
- nunca retornar o access token ao browser.

### BFF do autocadastro público

Crie uma Route Handler pública para encaminhar o formulário, por exemplo:

```text
POST /api/public/student-registrations/:token
```

Ela deve:

- validar token e body com Zod;
- chamar o endpoint público correspondente no backend sem bearer token;
- usar somente `API_URL` no servidor;
- preservar os status `400`, `404` e `409`;
- não confiar em campos adicionais recebidos do browser;
- não armazenar nem registrar o body completo.

### Tela autenticada do personal

Integre o gerenciamento do link na área autenticada mais coerente encontrada
no projeto, como a lista de alunos ou configurações do perfil.

A interface deve possuir:

- estado de carregamento;
- estado sem link, com ação “Gerar link de cadastro”;
- exibição da URL completa quando houver código ativo;
- ação para copiar a URL usando a API do navegador;
- feedback de cópia concluída ou falha;
- ação de rotação com diálogo de confirmação informando que o link anterior
  deixará de funcionar;
- ação de desativação com confirmação;
- estados de mutation com botões desabilitados;
- feedback acessível de sucesso e erro;
- atualização/invalidação correta do cache React Query.

Monte a URL compartilhável a partir da origem pública configurada pelo frontend
e de uma rota pública do App Router. Se o projeto não tiver convenção definida,
use como proposta:

```text
/cadastro/aluno/[token]
```

Não codifique domínio de produção diretamente no componente. Em renderização no
servidor, não acesse `window`; use configuração pública validada ou construa a
URL no cliente após a montagem, seguindo o padrão existente.

### Página pública do aluno

Crie a rota pública dinâmica para o formulário de autocadastro. Ela não deve
redirecionar para login nem depender de sessão Supabase.

Requisitos:

- validar o formato do token antes de enviar;
- campos para nome completo, telefone, data de nascimento e gênero;
- labels, mensagens e navegação por teclado acessíveis;
- opções de gênero com labels localizados, mantendo os valores do enum no
  payload;
- máscara de telefone apenas visual, sem divergir do valor validado/enviado;
- impedir envio duplicado enquanto a mutation estiver pendente;
- exibir confirmação clara após `201`, sem reenviar automaticamente;
- mostrar “link inválido ou desativado” para `404`;
- mostrar mensagem genérica de conflito para `409`, sem afirmar que um telefone
  específico já está cadastrado;
- manter os dados não sensíveis do formulário quando ocorrer erro recuperável;
- não colocar nome, telefone ou data de nascimento na URL.

Não é necessário consultar dados públicos do personal: o backend não expõe um
endpoint de preview do link nesta versão.

## Schemas e tipos sugeridos

Defina schemas Zod equivalentes a:

```ts
const registrationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/);

const studentGenderSchema = z.enum([
  'male',
  'female',
  'nonBinary',
  'preferNotToSay',
]);

const studentRegistrationLinkSchema = z.object({
  token: registrationTokenSchema,
});

const selfRegistrationInputSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(1),
  birthDate: z.string(),
  gender: studentGenderSchema,
});
```

Complete a validação de `birthDate` para garantir `YYYY-MM-DD`, data real e não
futura. Reaproveite validadores existentes de aluno se eles tiverem exatamente a
mesma semântica; não duplique regras desnecessariamente.

Valide também a resposta completa do aluno, incluindo enums e timestamps ISO,
seguindo o padrão de contratos remotos do frontend.

## React Query

Siga a organização existente de query keys. A integração deve ter:

- query para o link ativo;
- mutation para gerar/rotacionar;
- mutation para desativar;
- mutation pública para autocadastro;
- invalidação ou atualização direta do cache após gerar, rotacionar e
  desativar;
- nenhum retry automático para `400`, `401`, `404` ou `409`;
- cuidado para não persistir o token em cache durável, logs ou ferramentas de
  telemetria.

## Testes esperados

Adicione testes proporcionais ao padrão real do frontend, cobrindo:

1. BFF privado encaminha o access token sem expô-lo;
2. BFF privado retorna `401` sem sessão;
3. `GET` interpreta `404` de link ausente como estado vazio da interface;
4. geração apresenta o link e atualiza o cache;
5. rotação exige confirmação e substitui a URL anterior;
6. desativação limpa o estado e trata `204` sem JSON;
7. página pública funciona sem autenticação;
8. token malformado não dispara request ao backend;
9. formulário normaliza/valida os campos esperados;
10. payload não inclui `trainerId`, `status` ou campos internos;
11. sucesso `201` exibe confirmação e impede envio duplicado;
12. `404` e `409` exibem mensagens apropriadas;
13. estados de carregamento, erro e acessibilidade relevantes.

## Critérios de conclusão

Considere a integração concluída somente quando:

- o personal consegue gerar, recuperar, copiar, rotacionar e desativar o link;
- o aluno consegue se cadastrar por uma página pública sem sessão;
- `API_URL` e access token permanecem no servidor;
- contratos de request e response são validados;
- erros HTTP são preservados e apresentados adequadamente;
- nenhum campo de ownership é aceito do browser;
- os testes relevantes, lint, typecheck e build passam;
- não há credenciais ou dados pessoais em logs;
- a documentação do frontend registra a rota pública escolhida e qualquer
  divergência em relação a este contrato.

Ao finalizar, entregue:

- resumo dos arquivos alterados;
- URL pública adotada;
- contratos BFF criados;
- decisões de UX;
- testes e comandos executados com resultado;
- pendências reais, especialmente rate limiting no edge/proxy.
