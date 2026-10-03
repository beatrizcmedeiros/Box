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

Abra http://localhost:5173 — o card "Status do sistema" deve mostrar **API e banco de dados funcionando**.

> O banco usa a porta **5433** no host para não conflitar com um PostgreSQL já instalado na 5432.

## Scripts (na raiz)

| Comando                     | O que faz                                                     |
| --------------------------- | ------------------------------------------------------------- |
| `npm run dev`               | API e web em modo desenvolvimento                             |
| `npm test`                  | Testes da API e do front                                      |
| `npm run lint`              | Lint com oxlint                                               |
| `npm run format`            | Formata o código com Prettier                                 |
| `npm run typecheck`         | Checagem de tipos dos dois projetos                           |
| `npm run build`             | Build de produção da API (`api/dist`) e do front (`web/dist`) |
| `npm run db:up` / `db:down` | Sobe / para o PostgreSQL no Docker                            |
| `npm run db:migrate`        | Cria e aplica migrations (após mudar o `schema.prisma`)       |
| `npm run db:seed`           | Popula exercícios e turmas de exemplo (idempotente)           |
| `npm run db:studio -w api`  | Abre o Prisma Studio para ver os dados                        |

## Estrutura

```
api/
  prisma/schema.prisma   modelo de dados (usuários, turmas, exercícios, testes de carga, importações)
  prisma/migrations/     histórico de migrations
  prisma/seed.ts         dados iniciais de exemplo
  src/app.ts             app Express (rotas montadas aqui)
  src/server.ts          inicialização do servidor
  src/routes/            rotas da API
web/
  src/App.tsx            página inicial (status do sistema)
.github/workflows/ci.yml lint, formatação, tipos, testes, migrations e build a cada push/PR
```

## Roadmap

Ver o plano completo em `PLANO_DE_DESENVOLVIMENTO.md` (pasta do portfólio).

- [ ] **Fase 1 — Fundação:** monorepo, banco, modelo de dados, seed e CI prontos — falta o deploy inicial (Vercel/Netlify + Render + Neon)
- [ ] **Fase 2 — Autenticação e cadastros**
- [ ] **Fase 3 — Área do aluno** (PRs e dashboard de percentuais)
- [ ] **Fase 4 — Importação de PDF**
- [ ] **Fase 5 — Consulta com filtros**
- [ ] **Fase 6 — Camada PWA** (ponto de decisão)
- [ ] **Fase 7 — Piloto e lançamento**

## Observações

- `npm audit` aponta alertas em dependências **de desenvolvimento** do Prisma CLI (`mysql2`, `deepmerge-ts`). Não fazem parte do código que roda em produção e o projeto não usa MySQL; a correção sugerida rebaixaria para o Prisma 6. Reavaliar quando sair o Prisma 7.x/8 estável com a correção.
- O Prisma 7 não lê o `.env` sozinho: `prisma.config.ts` e o script `dev` da API carregam `api/.env` explicitamente.
