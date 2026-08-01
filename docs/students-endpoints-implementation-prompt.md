# Prompt para implementar e consolidar os endpoints de students

Use integralmente as instruções de
`docs/backend-endpoint-implementation-prompt.md` e as regras de `AGENTS.md`.
A demanda específica do domínio `students` está preenchida abaixo.

O domínio já possui implementação no repositório. Antes de editar, audite o
comportamento existente e trate controller, DTOs, service, testes e
`prisma/schema.prisma` como fontes de verdade. Não crie um segundo módulo nem
altere silenciosamente contratos públicos já comprovados.

## Demanda do endpoint

```text
Domínio/recurso:
Students (alunos vinculados a um personal trainer).

Objetivo de negócio:
Permitir que o personal autenticado cadastre, liste, consulte, edite e exclua
logicamente apenas os próprios alunos.

Métodos HTTP e paths:
1. POST /api/students
2. GET /api/students
3. GET /api/students/:studentId
4. PATCH /api/students/:studentId
5. DELETE /api/students/:studentId

Quem pode executar:
Todos os endpoints são privados. O usuário deve apresentar um access token
Supabase válido em `Authorization: Bearer <access_token>`. A identidade e o
perfil do personal devem ser derivados exclusivamente do JWT validado. Nunca
aceitar `trainerId`, `ownerId`, email, role ou outro campo enviado pelo browser
como prova de identidade ou ownership.

Parâmetros de path:
- `studentId`: UUID v4 obrigatório em GET, PATCH e DELETE de item.

Query params de GET /api/students:
- `page`: inteiro >= 1; opcional; padrão 1.
- `pageSize`: inteiro entre 1 e 100; opcional; padrão 20.
- `search`: string opcional, trim aplicado, máximo de 100 caracteres. A busca
  atual considera nome sem diferenciar maiúsculas/minúsculas e telefone pelos
  dígitos pesquisados.
- `status`: opcional; enum `active | inactive`.
- Rejeitar query params desconhecidos conforme a ValidationPipe global.

Body esperado de POST /api/students:
- `fullName`: string obrigatória, trim aplicado, de 2 a 120 caracteres e não
  composta somente por espaços.
- `phone`: string obrigatória. Aceitar telefone em E.164; preservar a
  normalização brasileira já existente para entradas locais válidas e
  persistir o valor normalizado. Exemplo: `(85) 99999-9999` vira
  `+5585999999999`.
- `birthDate`: data civil obrigatória no formato `YYYY-MM-DD`, válida e não
  futura.
- `gender`: obrigatório; enum
  `male | female | nonBinary | preferNotToSay`.
- `status`: opcional; enum `active | inactive`; padrão `active`.
- Nenhum campo é nullable.
- Não aceitar `id`, `trainerId`, `registrationSource`, `createdAt`, `updatedAt`,
  `deletedAt` nem propriedades desconhecidas.

Body esperado de PATCH /api/students/:studentId:
- Atualização parcial com os mesmos formatos e validações de `fullName`,
  `phone`, `birthDate`, `gender` e `status` descritos no POST.
- Todos esses campos são opcionais, mas nenhum campo enviado pode ser `null`.
- Não aceitar campos internos ou desconhecidos.
- Verificar e documentar o comportamento atual para body vazio. Não introduzir
  uma nova regra de produto sem decisão explícita caso o comportamento ainda
  não esteja definido por código ou testes.

Resposta de sucesso esperada para POST, GET de item e PATCH:
- Resposta direta, sem envelope, contendo somente:
  - `id`: string UUID;
  - `fullName`: string;
  - `phone`: string normalizada;
  - `birthDate`: data do aluno;
  - `gender`: `male | female | nonBinary | preferNotToSay`;
  - `status`: `active | inactive`;
  - `registrationSource`: `trainer`;
  - `createdAt`: timestamp ISO 8601 UTC;
  - `updatedAt`: timestamp ISO 8601 UTC;
  - `deletedAt`: timestamp ISO 8601 UTC ou `null`.
- Não expor `trainerId` nem dados do perfil do personal.
- POST retorna 201.
- GET de item retorna 200.
- PATCH retorna 200 com o aluno atualizado.

Exemplo de resposta de aluno:
{
  "id": "8e4367b8-658c-46a2-ae1f-58a57a6f5e20",
  "fullName": "Ana Silva",
  "phone": "+5585999999999",
  "birthDate": "1995-05-20",
  "gender": "female",
  "status": "active",
  "registrationSource": "trainer",
  "createdAt": "2026-07-21T12:00:00.000Z",
  "updatedAt": "2026-07-21T12:00:00.000Z",
  "deletedAt": null
}

Resposta de sucesso esperada para GET /api/students:
- Status 200.
- Envelope paginado no formato:
{
  "data": [<student>],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
- Excluir registros com `deletedAt` preenchido.
- Aplicar filtro opcional por status e busca por nome/telefone.
- Ordenação determinística atual: `fullName` ascendente e, em caso de empate,
  `id` ascendente.

Resposta de sucesso esperada para DELETE /api/students/:studentId:
- Status 204, sem body.
- Realizar exclusão lógica: preencher `deletedAt` e alterar `status` para
  `inactive`.
- Preservar a idempotência observada para nova exclusão do mesmo aluno pelo
  mesmo personal: retornar 204.

Regras de negócio:
- Todo aluno pertence a exatamente um personal.
- Escopar leitura e mutation pelo `authUserId` derivado do `sub` do JWT.
- Um personal não pode ler, alterar ou excluir aluno de outro personal.
- Para aluno inexistente, excluído ou fora do ownership, responder 404 sem
  revelar a existência do recurso. No DELETE repetido pelo mesmo owner,
  preservar o 204 já observado.
- O telefone é único conforme a constraint atual do banco. Confirmar no schema
  se a unicidade é global ou composta antes de alterar qualquer regra; no
  schema atual ela é global.
- `registrationSource` é controlado pelo servidor e vale `trainer`.
- GET de lista e GET de item não retornam alunos excluídos logicamente.
- Não alterar schema, migrations ou a estratégia de soft delete sem necessidade
  comprovada.

Efeitos colaterais:
- POST persiste um novo aluno ligado ao perfil do personal autenticado.
- PATCH atualiza somente os campos enviados e atualiza `updatedAt` pelo Prisma.
- DELETE não remove a linha: define `deletedAt` e força status `inactive`.
- As leituras não possuem efeitos colaterais.

Erros conhecidos:
- 400 para UUID inválido, body/query inválidos, data inexistente ou futura,
  enum inválido, telefone inválido e campos não permitidos.
- 401 para bearer token ausente, inválido ou expirado.
- 404 para aluno inexistente ou não visível ao personal autenticado.
- 404 com a semântica existente quando o perfil do personal necessário à
  criação não existir.
- 409 para telefone já cadastrado.
- Não expor detalhes do Prisma, banco, stack trace, token ou dados internos.
- Caracterizar o formato de erro atualmente exposto pelo NestJS antes de propor
  códigos estáveis ou um novo envelope; não fazer essa mudança transversal
  silenciosamente dentro deste domínio.

Tela/fluxo consumidor no frontend:
- Cadastro de aluno.
- Lista paginada de alunos, com busca e filtro por status.
- Visualização de detalhes do aluno.
- Edição parcial de dados cadastrais e status.
- Exclusão/arquivamento lógico do aluno.

Observações:
- O código existente retorna objetos Date do Prisma. Criar teste E2E que
  caracterize a serialização HTTP real de `birthDate`. Como ela representa uma
  data civil, o contrato desejado é `YYYY-MM-DD`, mas qualquer mudança de uma
  resposta já consumida como timestamp ISO deve ser registrada como alteração
  de contrato e não pode ocorrer silenciosamente.
- Validar explicitamente que `null` seja rejeitado no POST e no PATCH. Não
  presumir que `@IsOptional()` sozinho diferencia `null` de campo ausente.
- Confirmar que um PATCH com body vazio deve permanecer como no-op ou ser
  rejeitado; se código e testes não definirem isso, solicitar decisão antes de
  inventar a regra.
- Não há Swagger/OpenAPI configurado no estado atual observado. Se documentar o
  contrato exigir adicionar essa infraestrutura, apresente-a separadamente e
  não inclua dependência nova sem necessidade aprovada.
```

## Prompt para o agente responsável

Implemente ou consolide a demanda acima seguindo integralmente
`docs/backend-endpoint-implementation-prompt.md`.

Antes de editar, apresente um plano curto, o contrato HTTP confirmado e os
arquivos que serão alterados. Como os endpoints já existem, comece por uma
análise de lacunas entre a demanda, o comportamento comprovado e os testes. Faça
somente as mudanças necessárias para fechar essas lacunas, preserve alterações
existentes do usuário e não duplique arquitetura.

Garanta testes proporcionais para sucesso, autenticação, validação, ownership
entre dois personals, recurso inexistente, conflito de telefone, paginação,
filtros, serialização, soft delete e repetição do DELETE. Execute todas as
verificações exigidas por `AGENTS.md` e entregue ao final o resumo de contrato e
os exemplos `curl` solicitados pelo prompt geral.
