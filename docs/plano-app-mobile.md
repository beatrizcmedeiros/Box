# Plano — PR Box Android (app nativo com Expo)

O PR Box passa a ter duas versões, que usam **a mesma API e o mesmo banco**:

```
web/     React + Vite (navegador / PWA)  ─┐
                                          ├─HTTPS─▶ /api (Express, Render) ──▶ PostgreSQL (Neon)
mobile/  React Native + Expo (APK/AAB)  ─┘
```

Como o banco é um só, o que o aluno registra no app aparece para o treinador, seja no app ou na web, e vice-versa. As telas buscam os dados de novo ao voltar para o app e periodicamente enquanto estão abertas.

## Decisões

| Tema                        | Decisão                                                                                                                                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tecnologia                  | **Expo (SDK 58) + React Native + TypeScript**, navegação com **Expo Router**, dados com **TanStack Query** (o mesmo da web).                                                                                                                                                                  |
| Local                       | Pasta `mobile/` **fora dos workspaces npm** da raiz, com `package-lock` próprio. O React Native exige versões exatas de `react` diferentes das da web, e o hoisting do workspace quebraria um dos dois.                                                                                       |
| Autenticação                | O app envia `X-Prbox-Cliente: app`. Nesse caso a API devolve os tokens **no corpo da resposta**, não em cookies. O app guarda o refresh token no **SecureStore** (Keystore do Android) e manda o access token em `Authorization: Bearer`. A web continua com cookies `httpOnly`, sem mudança. |
| Endereço da API             | O app chama `https://<dominio-da-web>/api`, passando pelo mesmo encaminhamento da Vercel. Assim a contagem de proxies confiáveis (`PROXIES_CONFIAVEIS=2`) do limite de login continua correta. Configurável em `EXPO_PUBLIC_API_URL`.                                                         |
| Atualização entre aparelhos | Recarrega ao voltar o app para o primeiro plano (`AppState` → `focusManager`), ao reconectar e a cada 30 s nas telas abertas.                                                                                                                                                                 |
| Offline                     | Cache do TanStack Query persistido no aparelho (AsyncStorage). O aluno vê os últimos dados sem sinal no box. É apagado ao sair da conta.                                                                                                                                                      |
| Build                       | **EAS Build** (nuvem da Expo): perfil `preview` gera `.apk` para testes e `production` gera `.aab` para a Play Store. A chave de assinatura fica guardada pela Expo e pela Google (Play App Signing).                                                                                         |

## Fases

### Fase 1 — Base (feita nesta etapa)

- [x] API: login, refresh, logout e troca de senha por token para o app; `autenticar` aceita `Authorization: Bearer`.
- [x] API: `POST /api/auth/excluir-conta`. A Google Play exige que apps com login permitam excluir a conta.
- [x] Projeto Expo em `mobile/` com Expo Router, TanStack Query e o tema do PR Box.
- [x] Cliente da API com renovação automática do token e SecureStore.
- [x] Telas: login, troca da senha temporária e termo de consentimento.
- [x] Área do aluno: Percentuais (início), Meus PRs, detalhe do exercício (histórico e exclusão de lançamento próprio), Registrar PR, Evolução e Perfil (trocar senha, excluir conta, sair).
- [x] Atualização automática ao voltar ao app e a cada 30 s.
- [x] `app.json` e `eas.json` prontos para gerar APK e AAB.

### Fase 2 — Área do treinador no app (feita)

As telas mais usadas no box ficam em abas (Início, Teste, Percentuais, Alunos); as demais ficam em **Mais**.

- [x] Visão geral: adesão dos alunos, último teste importado e alunos sem PR.
- [x] Teste de carga: data, exercício, turma e busca; uma carga por aluno na mesma tela, com aviso de novo PR e remoção do lançamento do treinador.
- [x] Percentuais dos alunos e Consultar cargas, com filtros, ordenação e paginação.
- [x] Alunos (cadastrar, editar, apelidos, ativar/desativar, nova senha temporária, excluir), Turmas e Exercícios.
- [x] Evolução das turmas: resumo da última semana de teste, média por turma e evolução de cada aluno.
- [x] Importação por **texto colado**, com a mesma revisão da web (escolher aluno e exercício, memorizar apelidos) e o histórico com "Desfazer". Leitura de PDF e OCR continuam só na web, porque o `tesseract.js` e o `pdf.js` não rodam no React Native.

### Fase 3 — Offline e polimento

- [x] Cache das consultas salvo no aparelho (AsyncStorage, 30 dias): sem sinal, o app abre com os últimos dados e o usuário salvo. O cache é apagado ao sair da conta ou quando a sessão expira.
- [x] Faixa "Sem internet: mostrando os dados salvos" em todas as telas; botões que gravam no servidor ficam desativados sem conexão.
- [x] Gráficos de evolução com `react-native-svg`: PR do aluno por teste e média de cada turma por semana de teste.
- [x] Ícone adaptativo e splash (feitos na Fase 1).
- [ ] Capturas de tela da loja (Fase 4).
- [ ] Testes de componentes (`jest-expo` + Testing Library) dos fluxos de login e de registro de PR.

### Fase 4 — Publicação na Google Play

1. Conta Expo e `eas init` (gera o `projectId` no `app.json`).
2. `eas build -p android --profile preview`: instalar o APK e testar com aluno e treinador.
3. Conta na Play Console (US$ 25). Contas pessoais novas fazem **teste fechado com 12 testadores por 14 dias** antes da produção.
4. **Política de privacidade** em URL pública: página estática na web (ex.: `web/public/privacidade.html`).
5. **Página de exclusão de conta** em URL pública, explicando como excluir pelo app (Perfil → Excluir minha conta) ou por e-mail.
6. `eas build -p android --profile production` → enviar o `.aab` (ou `eas submit`).
7. Formulários da Play Console:
   - Segurança dos dados: nome, e-mail, IDs do usuário e informações de condicionamento físico; nada compartilhado; criptografado em trânsito; exclusão disponível.
   - Acesso ao app: conta de aluno para o revisor.
   - Classificação de conteúdo, público-alvo (18+) e declaração de app de saúde (fitness).

### Fase 5 — Tempo real e notificações (opcional)

- Server-Sent Events ou WebSocket para atualizar as telas na hora, sem esperar os 30 s.
- Notificações push (`expo-notifications` + FCM): "o treinador lançou o resultado do seu teste".

## Como rodar o app em desenvolvimento

```bash
npm run dev               # na raiz: API (3333) e web
cd mobile
npm install
cp .env.example .env      # ajuste EXPO_PUBLIC_API_URL para o IP do seu computador na rede
npm start                 # abre o Expo; leia o QR code com o app Expo Go no celular
```

No celular, `localhost` é o próprio celular. Use o IP do computador na rede Wi-Fi, por exemplo `http://192.168.0.10:3333/api`.
