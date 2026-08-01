# Autocadastro público de alunos

O personal pode gerar um código público permanente e reutilizável para associar
autocadastros ao próprio perfil. O código não autentica o personal e não deve
ser confundido com o access token do Supabase.

O backend retorna o código; o frontend é responsável por montar a URL da página
compartilhável e enviar o mesmo código ao endpoint público.

## Gerenciamento do link pelo personal

Todas as rotas desta seção exigem:

```http
Authorization: Bearer <access_token>
```

### Consultar o código ativo

```http
GET /api/trainers/student-registration-link
```

Resposta `200`:

```json
{
  "token": "<registration-token>"
}
```

Retorna `404` quando o perfil não existe ou o link está desativado.

### Gerar ou rotacionar o código

```http
POST /api/trainers/student-registration-link
```

Resposta `201`:

```json
{
  "token": "<registration-token>"
}
```

O token possui 32 bytes aleatórios codificados em base64url. Se já havia um
código ativo, ele é substituído e deixa de aceitar novos autocadastros
imediatamente.

Exemplo:

```bash
curl -X POST http://localhost:3333/api/trainers/student-registration-link \
  -H 'Authorization: Bearer <access_token>'
```

### Desativar o código

```http
DELETE /api/trainers/student-registration-link
```

Retorna `204`, sem body. A operação pode ser repetida e impede novos cadastros
com o código anterior.

## Autocadastro do aluno

Esta rota é pública e não recebe bearer token:

```http
POST /api/public/student-registrations/:token
```

Parâmetro:

- `token`: código base64url de 43 caracteres gerado pelo backend.

Body:

```json
{
  "fullName": "Ana Silva",
  "phone": "+5585999999999",
  "birthDate": "1995-05-20",
  "gender": "female"
}
```

O body não aceita `status`, `trainerId`, `registrationSource` nem campos
desconhecidos. O backend normaliza nome e telefone, cria o aluno como `active` e
define `registrationSource` como `selfRegistration`.

Resposta `201`:

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

Exemplo:

```bash
curl -X POST \
  http://localhost:3333/api/public/student-registrations/<registration-token> \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "Ana Silva",
    "phone": "+5585999999999",
    "birthDate": "1995-05-20",
    "gender": "female"
  }'
```

Erros esperados:

- `400`: token malformado, body inválido ou campo desconhecido;
- `404`: token inexistente ou desativado;
- `409`: conflito ao concluir o cadastro, sem revelar publicamente qual telefone
  já existe.

## Decisões e limitações

- O token não expira automaticamente; permanece válido até rotação ou
  desativação.
- O token é um identificador público de alta entropia, armazenado no personal e
  omitido das respostas normais de perfil.
- A associação do aluno ao personal é feita no banco usando o token único; o
  body público nunca controla ownership.
- O telefone continua globalmente único conforme o schema atual.
- A API ainda não possui infraestrutura de rate limiting. O endpoint deve ser
  protegido por limite de requisições no proxy/edge antes de exposição ampla.
- O link não comprova a identidade do aluno. Aprovação pelo personal ou OTP de
  telefone podem ser adicionados futuramente se o produto exigir essa garantia.

## Persistência

A migration `20260801000000_add_student_self_registration`:

- adiciona `trainers.student_registration_token`, nullable e único;
- adiciona `self_registration` ao enum persistido
  `student_registration_source`.

Nenhuma variável de ambiente foi adicionada.
