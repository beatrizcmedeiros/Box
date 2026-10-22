# PR Box — app Android

App nativo (React Native + Expo SDK 58) do PR Box. Usa **a mesma API e o mesmo banco** da versão web: o que o aluno registra no app aparece para o treinador, seja na web ou no app, e vice-versa. O plano completo está em [docs/plano-app-mobile.md](../docs/plano-app-mobile.md).

Este projeto fica **fora dos workspaces npm** da raiz, porque o React Native exige versões próprias de `react`. Instale e rode tudo dentro de `mobile/`.

## Rodar em desenvolvimento

1. Na raiz do repositório, suba a API: `npm run dev`.
2. Em `mobile/`:

   ```bash
   npm install
   cp .env.example .env
   ```

3. No `.env`, troque o IP pelo do seu computador na rede Wi-Fi. No Windows, ele aparece no `ipconfig`, em "Endereço IPv4". No celular, `localhost` é o próprio celular.
4. Rode `npm start` e leia o QR code com o app **Expo Go** (Play Store), com o celular na mesma rede Wi-Fi.

## Estrutura

| Pasta                           | Conteúdo                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/app/`                      | Telas (Expo Router: cada arquivo é uma rota; `_layout.tsx` define a navegação e as regras de acesso) |
| `src/lib/api.ts`                | Cliente da API: tokens no SecureStore e renovação automática                                         |
| `src/lib/sessao.ts`             | Login, troca de senha, termo, sair e excluir conta                                                   |
| `src/lib/consultas.ts`          | Consultas do aluno (atualizam a cada 30 s e ao voltar para o app)                                    |
| `src/lib/consultasTreinador.ts` | Consultas da área do treinador                                                                       |
| `src/components/`               | Componentes visuais                                                                                  |

## Login no app

O app envia `X-Prbox-Cliente: app` e a API devolve os tokens no corpo da resposta, em vez de cookies:

- o **refresh token** (7 dias, trocado a cada uso) fica no **SecureStore** (Keystore do Android);
- o **access token** (15 min) fica só na memória e vai em `Authorization: Bearer`.

## Gerar o app (EAS Build)

Uma vez só:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

O `init` grava o `projectId` no `app.json`. Antes do primeiro build, ajuste `EXPO_PUBLIC_API_URL` no `eas.json` para o domínio da versão web (ex.: `https://prbox.vercel.app/api`).

| Comando               | Gera                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------ |
| `npm run build:apk`   | `.apk` para instalar direto no celular e testar (perfil `preview`)                   |
| `npm run build:play`  | `.aab` para a Google Play (perfil `production`, versão incrementada automaticamente) |
| `npm run submit:play` | Envia o último `.aab` para o teste interno da Play Console                           |

O build roda na nuvem da Expo, sem Android Studio. A chave de assinatura é criada e guardada pela Expo no primeiro build.

## Ainda não está no app

- Leitura de PDF e OCR na importação: no app, o treinador cola o texto da lista. O PDF continua na versão web.
- Modo offline e gráficos (Fase 3 do plano).
