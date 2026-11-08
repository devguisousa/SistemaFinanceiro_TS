# Sistema Financeiro API

API REST de controle financeiro: contas, categorias, transações, transferências,
contas a pagar/receber com pagamentos e recebimentos parciais, autenticação JWT
e papéis (ADMIN / USUARIO). **Cada usuário tem os próprios dados**: contas,
categorias, contas a pagar/receber e tudo que nasce delas são separados por
usuário, e o cadastro é aberto.

Em produção: API na Vercel e banco Neon (PostgreSQL) em São Paulo. O front-end
está em outro repositório: [front-sistema-financeiro](https://github.com/devguisousa/front-sistema-financeiro).

**Stack:** Node 22+, Express 5, TypeScript, Prisma 7 (PostgreSQL), Zod 4, Vitest.

## Como rodar

```bash
npm install                 # também gera o Prisma Client (postinstall)
cp .env.example .env        # preencha DATABASE_URL e JWT_SEGREDO
npm run db:migrate          # aplica as migrations
npm run criar-admin         # cria o primeiro ADMIN
npm run dev                 # http://localhost:3000
```

Produção: `npm run build && npm start`.

## Scripts

| Script | O que faz |
|---|---|
| `dev` | Servidor com reload (tsx watch) |
| `build` / `start` | Compila para `dist/` e roda o build |
| `check` | Checagem de tipos |
| `test` | Testes (precisa de `.env.test` apontando para um banco com `_test` no nome) |
| `criar-admin` | Cria ou promove um usuário a ADMIN |
| `db:migrate` | `prisma migrate deploy` |

## Autenticação

1. `POST /auth/login` `{ email, senha }` → `{ accessToken, refreshToken }`
2. Envie `Authorization: Bearer <accessToken>` em todas as rotas (exceto `/auth/login`, `/auth/cadastro`, `/auth/refresh`, `/auth/logout`, `/auth/status`, `/auth/primeiro-admin` e `/health`).
3. O access token dura 15 min. Renove com `POST /auth/refresh` `{ refreshToken }` (o refresh muda a cada troca; reutilizar um antigo derruba todas as sessões).

| Rota | Quem |
|---|---|
| `POST /auth/cadastro` `{ email, senha }` → `201 { accessToken, refreshToken }` | público: cria um `USUARIO` com dados próprios (`409` se o e-mail já existe) |
| `GET /auth/status` → `{ precisaAdmin }` | público |
| `POST /auth/primeiro-admin` `{ email, senha }` → `{ accessToken, refreshToken }` | público, só enquanto não existe ADMIN (senão `409`) |
| `GET /auth/me` | logado |
| `PUT /auth/senha` `{ senhaAtual, novaSenha }` | logado (derruba todas as sessões) |
| `POST /auth/sair-de-todos` | logado |
| `POST /auth/registrar` `{ email, senha, papel? }` | ADMIN (cria usuário com o papel escolhido) |
| `GET/PATCH /usuarios…`, `DELETE /usuarios/:id` | ADMIN (apagar um usuário apaga também todos os dados dele) |

### Primeiro acesso

Enquanto o banco não tem nenhum ADMIN, `GET /auth/status` devolve `{ "precisaAdmin": true }` e o front-end oferece criar o administrador por `POST /auth/primeiro-admin`. Depois que existe um ADMIN, essa rota responde `409 JÁ EXISTE UM ADMINISTRADOR`. Pedidos simultâneos são serializados por um lock no banco: só um vira ADMIN.

**Risco:** enquanto não há ADMIN, quem acessar o site primeiro vira ADMIN. Em produção, crie o admin logo após o deploy (pelo site ou com `npm run criar-admin`).

## Permissões e dados por usuário

- Todo usuário logado (`USUARIO` ou `ADMIN`) usa todas as rotas financeiras, mas **só enxerga e altera os próprios dados**. Acessar o registro de outro usuário responde `404`.
- `Conta`, `Categoria`, `ContaPagar` e `ContaReceber` guardam o `usuarioId`; transações, transferências, pagamentos e recebimentos são filtrados pela relação com elas. Não dá para lançar numa conta ou categoria de outra pessoa.
- **ADMIN** a mais: gerenciar usuários (`/usuarios`, `/auth/registrar`).
- O sistema nunca fica sem ADMIN (não dá para rebaixar ou apagar o último).

## Rotas principais

| Recurso | Rotas |
|---|---|
| Contas | `GET/POST /contas`, `GET/PUT/DELETE /contas/:id`, `GET /contas/:id/saldo` |
| Categorias | `GET/POST /categoria` (`?tipo=`), `GET/PUT/DELETE /categoria/:id` |
| Transações | `GET/POST /transacao` (`?tipo&contaId&categoriaId&page&limit`), `GET/PUT/DELETE /transacao/:id`, `GET /transacao/:contaId/receitas`, `/despesas` |
| Transferências | `GET/POST /transferencias`, `GET/DELETE /transferencias/:id` (estorno) |
| Contas a pagar | `GET/POST /contaPagar` (`?status&vencidas&page&limit`), `GET/PUT/DELETE /contaPagar/:id` |
| Pagamentos | `GET /pagamentoPagar`, `GET /pagamentoPagar/:id`, `GET/POST /pagamentoPagar/contaPagar/:id` |
| Contas a receber | `GET/POST /contaReceber` (`?status&vencidas&pagina&limite`), `GET/PUT/DELETE /contaReceber/:id` |
| Recebimentos | `GET /recebimentos`, `GET /recebimentos/:id`, `GET/POST /contaReceber/:id/recebimentos` |

## Regras de negócio

- Valores monetários são texto com até 2 casas (`"150.50"`) e sempre saem com 2 casas.
- Nenhuma conta pode ficar com saldo negativo (despesa, pagamento, transferência, edição ou exclusão).
- A categoria tem tipo (`RECEITA`/`DESPESA`) e precisa bater com o lançamento.
- Transações geradas por pagamento, recebimento ou transferência não podem ser editadas/apagadas diretamente.
- Conta a pagar/receber não pode ter `valorTotal` menor que o já pago/recebido; o status é recalculado.
- Operações concorrentes no mesmo registro são repetidas automaticamente (até 5 vezes); se o conflito persistir, a resposta é `409`.

## Deploy (Vercel + Neon)

- `vercel.json` fixa `"framework": "express"` e a região `gru1`. O push na `main` publica sozinho.
- Variáveis de produção: `DATABASE_URL` (injetada pela integração Neon), `JWT_SEGREDO`, `TRUST_PROXY=1` e `CORS_ORIGENS` com a URL do front. Não defina `NODE_ENV`: o build precisa das devDependencies (prisma e typescript).
- Migrations não rodam no deploy. Aplique à mão com a URL **sem pooler** do Neon: `DATABASE_URL=<url-sem-pooler> npx prisma migrate deploy`.
- O `req.usuario` é declarado em `src/middleware/autenticar.middleware.ts` (e não em um `.d.ts` solto) porque o builder da Vercel só checa os arquivos importados pelo `src/app.ts`.

## Erros

- Validação: `400 { erro: "DADOS INVÁLIDOS" | "ID INVÁLIDO" | "PARÂMETROS INVÁLIDOS", detalhes }`
- Regra de negócio: `{ erro: "..." }` com `404` (não encontrado), `409` (conflito), `401`/`403` (acesso).
