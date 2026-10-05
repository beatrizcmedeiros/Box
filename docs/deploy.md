# Deploy do PR Box

Arquitetura em produção (planos gratuitos):

```
Celular / computador ──HTTPS──▶ Vercel (front + PWA)
                                   │  /api/* (rewrite, mesma origem → cookies SameSite=Strict)
                                   ▼
                                Render (API Node/Express) ──▶ Neon (PostgreSQL)
```

O front encaminha `/api` para a API. Para o navegador tudo é um único site, então os cookies de sessão funcionam sem configuração de CORS entre domínios.

## 1. Banco de dados — Neon

1. Crie uma conta em https://neon.tech e um projeto **PostgreSQL 17**, região **US East (N. Virginia)** (a mesma do Render, para a API e o banco ficarem próximos).
2. Copie a _connection string_ (formato `postgresql://usuario:senha@host/banco?sslmode=require`). Ela será o `DATABASE_URL` da API.
3. As migrations (inclusive a extensão `unaccent`) são aplicadas automaticamente pela API a cada deploy.

## 2. API — Render

1. Crie uma conta em https://render.com e conecte o repositório do GitHub.
2. **New → Blueprint** e selecione o repositório: o arquivo `render.yaml` cria o serviço `prbox-api`.
3. Preencha as variáveis pedidas:
   - `DATABASE_URL`: a connection string do Neon.
   - `WEB_ORIGIN`: a URL do front na Vercel (passo 3; pode voltar e ajustar depois).
   - `JWT_SECRET` é gerado automaticamente.
4. Após o deploy, teste `https://prbox-api.onrender.com/api/health` → `{"status":"ok","banco":"ok",...}`.
5. Crie a conta do treinador (no _Shell_ do serviço no Render):
   ```bash
   npm run criar-treinador -w api -- "Nome do Treinador" email@dominio.com
   ```
   A senha temporária aparece no terminal; o treinador a troca no primeiro acesso.

> Se o nome do serviço no Render for diferente de `prbox-api`, ajuste a URL em `web/vercel.json`.

## 3. Front — Vercel

1. Crie uma conta em https://vercel.com e **Add New → Project** com o repositório.
2. **Root Directory**: `web` (o restante é lido de `web/vercel.json`).
3. Deploy. A URL final (ex.: `https://prbox.vercel.app`) deve ser colocada em `WEB_ORIGIN` no Render.
4. Abra no celular: o app deve oferecer **Instalar** (Android) ou ser adicionado pela opção **Compartilhar → Adicionar à Tela de Início** (iPhone).

## Atenção: plano gratuito do Render

O serviço gratuito **hiberna após 15 minutos sem uso** e leva cerca de 50 s para acordar. Efeitos:

- O aluno que abre o app depois de um tempo parado vê os **dados salvos** (o PWA espera 4 s e usa o cache) enquanto a API acorda.
- O primeiro login do dia pode demorar.

Para o piloto isso é aceitável. Para uso diário no box, as opções são: plano pago do Render (instância sempre ligada), ou um serviço de _ping_ a cada 10 minutos nos horários de aula (ex.: cron-job.org chamando `/api/health`).

## Checklist pós-deploy

- [ ] `/api/health` responde `ok` (banco conectado)
- [ ] Login do treinador → troca de senha → termo
- [ ] Cadastro de um aluno de teste e primeiro acesso dele pelo celular
- [ ] Importação de `docs/exemplos/teste-forca-exemplo.pdf` (OCR) e desfazer
- [ ] App instalado no celular abre sem internet (modo avião) mostrando os dados salvos
- [ ] Apagar o aluno de teste

## Dados e LGPD

- Backups: o Neon guarda histórico de 24 h no plano gratuito (_point-in-time restore_). Antes do piloto, faça também uma exportação manual (`pg_dump`) semanal.
- Não use dados reais em ambientes de teste; use `npm run demo -w api` apenas em desenvolvimento.
