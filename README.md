# PR Box

Aplicação web (com caminho para PWA) para boxes de cross training: o aluno registra seus PRs e vê na hora as cargas de 35% a 55% de cada exercício, e o treinador importa o PDF do teste de força semestral e consulta as cargas com filtros por aluno, exercício e turma.

Projeto originado no Projeto de Extensão II — CST em Sistemas para Internet.

## Stack

| Parte     | Tecnologias                                            |
| --------- | ------------------------------------------------------ |
| `web/`    | React 19, Vite 8, TypeScript, Tailwind CSS 4, Vitest   |
| `api/`    | Node.js 24, Express 5, Prisma 7 (PostgreSQL), Vitest   |
| Banco     | PostgreSQL 17 via Docker Compose                       |
| Qualidade | oxlint, Prettier, GitHub Actions (lint, testes, build) |

## Pré-requisitos

- **Node.js 22.12+** (recomendado 24 — veja `.nvmrc`)
- **Docker Desktop** em execução
- Git

## Primeiros passos

```bash
npm install
cp api/.env.example api/.env
npm run setup   # sobe o banco, gera o Prisma Client, aplica as migrations e o seed
npm run dev     # API em http://localhost:3333 e web em http://localhost:5173
```

Abra http://localhost:5173 e entre com o **treinador de desenvolvimento** criado pelo seed — e-mail e senha estão em `SEED_TREINADOR_EMAIL` / `SEED_TREINADOR_SENHA` no `api/.env`. No primeiro acesso, aceite o termo de consentimento.

> Se o `api/.env` foi criado antes da Fase 2, copie as variáveis novas do `.env.example` (`JWT_SECRET`, `SEED_TREINADOR_*`) e gere um `JWT_SECRET` aleatório.

> O banco usa a porta **5433** no host para não conflitar com um PostgreSQL já instalado na 5432.

## Scripts (na raiz)

| Comando                                          | O que faz                                                     |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `npm run dev`                                    | API e web em modo desenvolvimento                             |
| `npm test`                                       | Testes da API e do front                                      |
| `npm run lint`                                   | Lint com oxlint                                               |
| `npm run format`                                 | Formata o código com Prettier                                 |
| `npm run typecheck`                              | Checagem de tipos dos dois projetos                           |
| `npm run build`                                  | Build de produção da API (`api/dist`) e do front (`web/dist`) |
| `npm run db:up` / `db:down`                      | Sobe / para o PostgreSQL no Docker                            |
| `npm run db:migrate`                             | Cria e aplica migrations (após mudar o `schema.prisma`)       |
| `npm run db:seed`                                | Popula exercícios e turmas de exemplo (idempotente)           |
| `npm run db:studio -w api`                       | Abre o Prisma Studio para ver os dados                        |
| `npm run criar-treinador -w api -- "Nome" email` | Cria um treinador com senha temporária (uso em produção)      |

## Autenticação e perfis

- **Treinador** (administrador): cadastra turmas, exercícios (com nomes alternativos usados no PDF) e alunos.
- **Aluno**: criado pelo treinador com uma **senha temporária** (exibida uma única vez). No primeiro acesso, precisa trocar a senha e aceitar o termo de consentimento (LGPD) antes de usar o sistema.
- Senhas com **scrypt** (`node:crypto`); token de acesso **JWT de 15 min** e **refresh token de 7 dias** em cookies `httpOnly`/`SameSite=Strict`. O refresh token é guardado só como hash e é **rotacionado** a cada uso; logout, troca de senha e redefinição pelo treinador revogam as sessões.
- Login limitado a 10 tentativas a cada 15 min por IP.
- Em produção, o front deve encaminhar `/api` para a API (rewrite/proxy, mesma origem) para os cookies `SameSite=Strict` funcionarem.

## Testes

- `api/test/`: testes de integração contra um banco **`prbox_test`**, criado e migrado automaticamente (o banco de desenvolvimento não é tocado).
- `api/src/**/*.test.ts` e `web/src/**/*.test.ts(x)`: testes unitários e de componentes (API simulada no front).

## Estrutura

```
api/
  prisma/schema.prisma   modelo de dados (usuários, turmas, exercícios, testes de carga, importações)
  prisma/migrations/     histórico de migrations
  prisma/seed.ts         dados iniciais de exemplo
  scripts/               utilitários de linha de comando (criar-treinador)
  src/app.ts             app Express (rotas montadas aqui)
  src/routes/auth.ts     login, refresh, logout, troca de senha, consentimento
  src/routes/admin/      painel do treinador: turmas, exercícios, alunos
  src/middlewares/       autenticação e controle de perfil
  src/services/          sessões (cookies e refresh tokens)
  test/                  testes de integração (banco prbox_test)
web/
  src/rotas.tsx          rotas e guardas por perfil / primeiro acesso
  src/lib/api.ts         cliente HTTP (renova a sessão automaticamente)
  src/auth/              sessão do usuário e proteção de rotas
  src/pages/             login, primeiro acesso, área do aluno, painel do treinador
.github/workflows/ci.yml lint, formatação, tipos, testes, migrations e build a cada push/PR
```

## Roadmap

Ver o plano completo em `PLANO_DE_DESENVOLVIMENTO.md` (pasta do portfólio).

- [ ] **Fase 1 — Fundação:** monorepo, banco, modelo de dados, seed e CI prontos — falta o deploy inicial (Vercel/Netlify + Render + Neon)
- [x] **Fase 2 — Autenticação e cadastros:** login, primeiro acesso (senha + termo LGPD), painel do treinador (turmas, exercícios, alunos)
- [ ] **Fase 3 — Área do aluno** (PRs e dashboard de percentuais)
- [ ] **Fase 4 — Importação de PDF**
- [ ] **Fase 5 — Consulta com filtros**
- [ ] **Fase 6 — Camada PWA** (ponto de decisão)
- [ ] **Fase 7 — Piloto e lançamento**

## Observações

- `npm audit` aponta alertas em dependências **de desenvolvimento** do Prisma CLI (`mysql2`, `deepmerge-ts`). Não fazem parte do código que roda em produção e o projeto não usa MySQL; a correção sugerida rebaixaria para o Prisma 6. Reavaliar quando sair o Prisma 7.x/8 estável com a correção.
- O Prisma 7 não lê o `.env` sozinho: `prisma.config.ts` e o script `dev` da API carregam `api/.env` explicitamente.
