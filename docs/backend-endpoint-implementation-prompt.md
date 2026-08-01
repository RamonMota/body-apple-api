# Prompt geral para implementar endpoints no backend do Body Apple

> Leve este arquivo para o repositório do backend. Preencha somente a seção "Demanda do endpoint" e entregue o documento ao agente responsável pela implementação. Ele é reutilizável para qualquer domínio: clientes, rotinas, treinos, exercícios, avaliações, feed ou novos recursos.

## Demanda do endpoint

Preencha o que estiver definido. Não invente campos apenas para completar o modelo.

```text
Domínio/recurso:
Objetivo de negócio:
Método HTTP:
Path sugerido:
Quem pode executar:
Parâmetros de path:
Query params:
Body esperado:
Resposta de sucesso esperada:
Regras de negócio:
Efeitos colaterais:
Erros conhecidos:
Tela/fluxo consumidor no frontend:
Observações:
```

Se a demanda envolver vários endpoints do mesmo recurso, liste todos. Se algum item essencial estiver indefinido e não puder ser descoberto no código, pare antes de implementar e faça perguntas objetivas.

---

## Prompt para o agente do backend

Implemente a demanda descrita acima usando o código real deste backend como fonte de verdade.

### 1. Descoberta obrigatória

Antes de editar:

1. leia integralmente `AGENTS.md`, `README`, manifesto de dependências e instruções relevantes;
2. localize as rotas mais semelhantes à demanda;
3. identifique os padrões existentes de controller/handler, service/use case, repository, DTO, validação, serialização, autenticação, autorização, erros, logs e testes;
4. examine schema, migrations, constraints, relacionamentos e convenção de IDs do banco;
5. verifique como `GET /api/me` e `/api/trainers/profile` validam o token Supabase e relacionam o usuário autenticado ao perfil do personal;
6. procure contratos ou documentação de API existentes, como OpenAPI/Swagger;
7. apresente um plano curto, o contrato proposto e os arquivos que pretende alterar.

Não crie uma arquitetura paralela. Reaproveite o padrão predominante do backend e limite mudanças ao domínio solicitado e à infraestrutura estritamente necessária.

### 2. Contexto do frontend consumidor

O frontend Body Apple utiliza:

- Next.js App Router, React e TypeScript estrito;
- Route Handlers como BFF em `/api/**`;
- `API_URL` server-only para acessar este backend;
- Supabase Auth; recursos privados recebem `Authorization: Bearer <access_token>`;
- React Query para consulta, cache e mutations;
- Zod para validar formulários e contratos na borda;
- camelCase nos modelos TypeScript;
- strings ISO em JSON para datas e timestamps;
- integrações incrementais organizadas por domínio.

O contrato entregue por este backend deve ser explícito, estável e documentado.

### 3. Definição do contrato

Confirme antes de implementar:

- método e path;
- autenticação e permissão necessárias;
- params de path e query, incluindo defaults e limites;
- body, campos obrigatórios, opcionais e nullable;
- normalização e enums aceitos;
- formato exato da resposta de sucesso;
- status de sucesso e de erro;
- paginação, ordenação e filtros, quando aplicáveis;
- idempotência, concorrência e efeitos colaterais, quando aplicáveis;
- comportamento de recursos relacionados ao excluir ou arquivar;
- exemplos JSON realistas sem dados sensíveis.

Regras de representação na borda HTTP:

- use camelCase no JSON, salvo contrato existente diferente que não possa ser migrado;
- serialize IDs como string;
- serialize timestamps como ISO 8601 UTC;
- serialize datas civis como `YYYY-MM-DD`, sem conversão indevida de fuso;
- diferencie campo ausente de campo explicitamente `null`;
- use enums com valores estáveis e documentados;
- não exponha nomes de tabela, detalhes de ORM ou entidades internas;
- mantenha um formato consistente: não alterne entre resposta direta e envelope sem uma razão documentada.

Para listas, não introduza paginação automaticamente. Use-a quando a demanda, o volume esperado ou o padrão do backend exigir. Nesse caso, documente cursor/página, limite máximo e metadados da resposta.

### 4. Autenticação, ownership e autorização

Para endpoints privados:

1. valide o bearer token pelo mecanismo existente;
2. derive o usuário e o perfil do personal a partir do token;
3. nunca aceite `trainerId`, `ownerId` ou equivalente do browser como prova de ownership;
4. aplique o escopo do personal diretamente nas queries e mutations;
5. para recurso inexistente ou pertencente a outro personal, prefira `404` quando isso evitar enumeração;
6. se houver papéis adicionais, centralize a verificação conforme o padrão de autorização existente;
7. não registre tokens, segredos ou dados pessoais completos.

Endpoints públicos precisam ser declarados explicitamente na demanda. Não torne um endpoint público por ausência de instrução.

### 5. Validação e erros

Valide params, query e body na entrada, antes do acesso ao banco. Use a biblioteca e o formato de erro já adotados no backend.

Sem padrão preexistente, use como referência:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos.",
    "fieldErrors": {
      "fieldName": ["Descrição do erro."]
    }
  }
}
```

Status de referência:

- `200` para leitura/atualização com resposta;
- `201` para criação;
- `204` para operação bem-sucedida sem body;
- `400` para request/JSON malformado;
- `401` para autenticação ausente ou inválida;
- `403` para ação autenticada conhecida, mas não permitida;
- `404` para recurso não encontrado ou não visível ao usuário;
- `409` para conflito real de estado ou unicidade;
- `422` para validação semântica, se for o padrão do projeto;
- `500` apenas para falhas inesperadas, sem stack trace ou detalhes internos na resposta.

Não converta indiscriminadamente todos os erros para `500` e não use mensagens textuais como único contrato de erro. Códigos de erro devem ser estáveis.

### 6. Persistência e consistência

- gere IDs e campos controlados pelo servidor no backend;
- crie migrations e constraints seguindo o projeto;
- preserve integridade referencial;
- use transação quando uma operação modificar várias entidades de forma atômica;
- respeite o padrão existente de hard delete, soft delete ou arquivamento;
- trate concorrência quando duas requisições puderem sobrescrever estado relevante;
- evite consultas N+1 e selecione apenas os dados necessários;
- use a camada de persistência real e os repositories adotados pelo projeto.

### 7. Testes proporcionais ao endpoint

Use a infraestrutura existente. Cubra, quando aplicável:

1. caminho de sucesso;
2. token ausente, inválido ou expirado;
3. ownership entre dois personals;
4. params, query e body inválidos;
5. recurso inexistente;
6. lista vazia e limites de paginação/filtro;
7. conflito ou duplicidade;
8. efeitos colaterais e integridade transacional;
9. serialização exata do contrato;
10. comportamento de exclusão/arquivamento;
11. regressão das rotas relacionadas alteradas.

Pelo menos os testes de integração do endpoint devem exercitar autenticação, validação, caso de uso e persistência conforme a estrutura do projeto.

### 8. Entrega obrigatória para o frontend

Ao concluir, gere um resumo de contrato copiável contendo:

```text
Método e path:
Autenticação:
Path params:
Query params:
Request body + exemplo:
Success status:
Response body + exemplo:
Erros possíveis com status e code:
Regras de ownership:
Paginação/ordenação:
Efeitos colaterais:
```

Inclua também:

- exemplos `curl` com token placeholder, nunca credencial real;
- migrations e variáveis de ambiente adicionadas;
- decisões ou divergências em relação à demanda original;
- comandos de lint, checagem de tipos, testes e build executados, com resultados;
- pendências reais que impeçam a integração.

### 9. Critérios de conclusão

Considere o endpoint concluído apenas quando:

- contrato, autenticação e ownership estiverem definidos;
- validação ocorrer na borda;
- persistência for real;
- erros preservarem status e códigos úteis;
- testes relevantes passarem;
- documentação permitir integrar o frontend sem ler a implementação interna;
- nenhuma credencial, stack trace ou dado sensível estiver exposto;
- a implementação estiver conectada à persistência e infraestrutura reais do projeto.
