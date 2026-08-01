# API de rotinas

Rotinas são planejamentos pertencentes ao personal autenticado. Nesta etapa,
elas ainda não possuem treinos, exercícios ou atribuições a alunos.

Todas as rotas exigem:

```http
Authorization: Bearer <access_token>
```

O backend deriva o personal exclusivamente do JWT. `trainerId` nunca faz parte
dos contratos de entrada ou saída.

## Representação

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

`startDate` e `endDate` são datas civis `YYYY-MM-DD` ou `null`. Os demais campos
temporais são timestamps ISO 8601 UTC.

Status aceitos:

- `draft`;
- `active`;
- `archived`.

## Criar

```http
POST /api/routines
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

Regras:

- `name`: obrigatório, trim, de 2 a 120 caracteres;
- `startDate` e `endDate`: opcionais, não nullable na criação;
- `removeOnExpiration`: opcional, booleano, padrão `false`;
- `instructions`: opcional, trim, máximo de 2.000 caracteres;
- `status` é controlado pelo servidor e inicia como `draft`;
- `endDate` não pode ser anterior a `startDate`;
- `removeOnExpiration: true` exige `endDate`.

Retorna `201` com a rotina criada.

Exemplo:

```bash
curl -X POST http://localhost:3333/api/routines \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Hipertrofia — 4 dias",
    "startDate": "2026-08-03",
    "endDate": "2026-09-03",
    "removeOnExpiration": true,
    "instructions": "Executar quatro vezes por semana."
  }'
```

## Listar

```http
GET /api/routines?page=1&limit=20&search=hipertrofia&status=draft
```

Query params:

- `page`: inteiro a partir de 1, padrão 1;
- `limit`: inteiro de 1 a 100, padrão 20;
- `search`: opcional, trim, máximo de 100 caracteres; busca por `name` e
  `instructions` sem diferenciar maiúsculas e minúsculas;
- `status`: `draft | active | archived`.

Rotinas excluídas logicamente não aparecem. A ordenação é `createdAt`
decrescente e `id` crescente como desempate.

Resposta `200`:

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

Embora a query use `limit`, os metadados seguem o contrato já adotado por
alunos e retornam `pageSize`.

## Consultar

```http
GET /api/routines/:routineId
```

`routineId` deve ser UUID v4. Retorna `200` ou `404` quando a rotina não existe,
foi excluída ou pertence a outro personal.

## Atualizar

```http
PATCH /api/routines/:routineId
```

Body parcial:

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

É permitido limpar os campos opcionais:

```json
{
  "startDate": null,
  "endDate": null,
  "instructions": null,
  "removeOnExpiration": false
}
```

A validação combina os valores enviados com os valores já persistidos. Remover
`endDate` enquanto `removeOnExpiration` permanecer `true` retorna `400`; o
backend não altera o booleano implicitamente.

Retorna `200` com a rotina atualizada.

## Excluir

```http
DELETE /api/routines/:routineId
```

Preenche `deletedAt`, sem exclusão física ou cascade, e retorna `204` sem body.
Repetir a exclusão da mesma rotina pelo mesmo personal também retorna `204`.

## Erros

- `400`: UUID, query, body ou período inválido, enum inválido e campos extras;
- `401`: access token ausente, inválido ou expirado;
- `404`: perfil do personal ou rotina não encontrada no escopo autenticado;
- `500`: falha inesperada, sem detalhes internos.

O projeto ainda utiliza o formato padrão de erros do NestJS e não possui
Swagger/OpenAPI configurado.

## Persistência

A migration `20260801010000_create_training_routines` cria:

- enum PostgreSQL `training_routine_status`;
- tabela `training_routines`;
- índices de ownership, exclusão lógica, status e ordenação;
- chave estrangeira para `trainers` com `ON DELETE RESTRICT`;
- constraints para consistência das datas e remoção ao expirar.

Nenhuma variável de ambiente foi adicionada.
