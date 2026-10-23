# Publicar o PR Box na Google Play

O app Android é gerado pelo **EAS Build** (nuvem da Expo), a partir de `mobile/`. Ele usa a mesma API e o mesmo banco da versão web. Este guia vai do pré-requisito até a produção.

## 0. Antes de começar

| Item                          | Onde / como                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Envio de e-mails (Resend)** | No Render, serviço `prbox-api` → _Environment_: `RESEND_API_KEY` e `EMAIL_REMETENTE`. Sem isso, ninguém consegue recuperar a senha. Para enviar a qualquer pessoa, verifique um domínio seu no Resend (ver [deploy.md](deploy.md)).                                                                                                             |
| **Web pública**               | A política de privacidade (`/privacidade`) e as instruções de exclusão (`/excluir-conta`) ficam na versão web e **precisam abrir sem login**. Na Vercel: _Project → Settings → Deployment Protection_ → desligue a proteção (Vercel Authentication) do domínio de produção. Confira abrindo `https://SEU_DOMINIO/privacidade` numa aba anônima. |
| **Contato na política**       | Na Vercel, variável `VITE_CONTATO_PRIVACIDADE` (o seu e-mail de contato) e um novo deploy.                                                                                                                                                                                                                                                      |
| **Endereço da web no app**    | Em `mobile/eas.json`, acrescente `"EXPO_PUBLIC_WEB_URL": "https://SEU_DOMINIO"` em `env` dos perfis `preview` e `production`. Com ele, o app mostra o link "Política de privacidade".                                                                                                                                                           |
| **Conta na Play Console**     | https://play.google.com/console, taxa única de **US$ 25** e verificação de identidade.                                                                                                                                                                                                                                                          |

> **Contas pessoais novas** na Play Console precisam de um **teste fechado com pelo menos 12 testadores por 14 dias seguidos** antes de liberar a produção. Comece a juntar alunos do box como testadores cedo.

## 1. Gerar o arquivo da loja (`.aab`)

```bash
cd mobile
npm run build:play
```

- O perfil `production` gera um **`.aab`** e aumenta a versão (`versionCode`) sozinho a cada build.
- A chave de assinatura é a mesma usada nos APKs de teste, guardada pela Expo. Na Play Console, aceite o **Play App Signing**: a Google assina o app final e a chave da Expo vira a "chave de upload".
- Para testar antes no celular, use `npm run build:apk` (APK, perfil `preview`).

## 2. Criar o app na Play Console

1. **Criar app**: nome "PR Box", idioma Português (Brasil), **App**, **Gratuito**.
2. **Testar e lançar → Teste interno → Criar nova versão**: envie o `.aab` baixado da página do build na Expo. O primeiro envio precisa ser manual.
3. Depois disso, os próximos envios podem ser feitos com `npm run submit:play`. Para isso, crie uma conta de serviço no Google Cloud com acesso à Play Console e siga o passo a passo da Expo: https://docs.expo.dev/submit/android/

## 3. Ficha da loja (_Crescer → Presença na loja → Ficha principal_)

| Campo                              | Sugestão                                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nome                               | PR Box                                                                                                                                                                                                                                      |
| Descrição curta (até 80)           | Seus PRs e as cargas de 35% a 55% sempre à mão, mesmo sem internet no box.                                                                                                                                                                  |
| Descrição completa                 | Para o aluno: registrar PRs, ver as cargas por percentual e a evolução, funcionar sem internet. Para o professor e a academia: vincular alunos por código, organizar por turma, lançar o teste de carga, consultar e acompanhar a evolução. |
| Ícone 512×512                      | `mobile/assets/icon.png` (ou exporte `docs/logo/icones/icone-quadrado.svg` em 512×512)                                                                                                                                                      |
| Gráfico de recursos 1024×500       | A partir de `docs/logo/logo-horizontal-escuro.svg`, sobre fundo `#141c28`.                                                                                                                                                                  |
| Capturas de tela (mín. 2, celular) | Percentuais, Meus PRs, Evolução e, do professor, Teste de carga e Códigos de vínculo. **Use dados fictícios** (`npm run demo -w api` num ambiente de teste), nunca dados de alunos reais.                                                   |
| Categoria                          | Saúde e fitness                                                                                                                                                                                                                             |
| E-mail de contato                  | O mesmo de `VITE_CONTATO_PRIVACIDADE`                                                                                                                                                                                                       |

## 4. Conteúdo do app (_Política → Conteúdo do app_)

| Declaração                     | Resposta                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Política de privacidade        | `https://SEU_DOMINIO/privacidade`                                                                                        |
| Acesso ao app                  | "Todas ou algumas funcionalidades são restritas": informe uma **conta de teste já confirmada** (veja abaixo).            |
| Anúncios                       | Não contém anúncios                                                                                                      |
| Classificação de conteúdo      | Questionário: categoria "Utilitário/Produtividade/Outro"; nenhum conteúdo sensível → **Livre**.                          |
| Público-alvo                   | **18 anos ou mais** (marque 13–17 só se houver alunos menores). Não marque menores de 13 (ativa a política de Famílias). |
| Apps de saúde                  | **Fitness / atividade física**. Não é dispositivo médico.                                                                |
| Exclusão de dados              | URL `https://SEU_DOMINIO/excluir-conta`. No app: Perfil → Excluir minha conta.                                           |
| App governamental / financeiro | Não                                                                                                                      |

### Segurança dos dados

- Coleta ou compartilha dados? **Sim, coleta. Não compartilha.**
- Criptografados em trânsito? **Sim** (HTTPS).
- O usuário pode pedir a exclusão? **Sim** (no app e pela página de exclusão).

| Tipo de dado                                                | Coletado | Compartilhado | Obrigatório | Finalidade                                    |
| ----------------------------------------------------------- | -------- | ------------- | ----------- | --------------------------------------------- |
| Informações pessoais → **Nome**                             | Sim      | Não           | Sim         | Funcionalidade do app, Gerenciamento da conta |
| Informações pessoais → **Endereço de e-mail**               | Sim      | Não           | Sim         | Funcionalidade do app, Gerenciamento da conta |
| Informações pessoais → **IDs do usuário**                   | Sim      | Não           | Sim         | Funcionalidade do app, Gerenciamento da conta |
| Saúde e fitness → **Informações de condicionamento físico** | Sim      | Não           | Sim         | Funcionalidade do app                         |

Os vínculos com academias e professores **não** contam como compartilhamento com terceiros: é a própria pessoa que escolhe, dentro do app, quem vê os seus PRs. Não marque localização, contatos, fotos, arquivos, identificadores do dispositivo nem dados de uso ou diagnóstico.

### Conta para a revisão da Google

1. Crie, pelo próprio app, uma conta de **professor** com um e-mail seu (ex.: `voce+revisao@gmail.com`) e aceite o termo.
2. Registre 2 ou 3 PRs fictícios e gere um código de vínculo.
3. Informe e-mail e senha em **Acesso ao app**, explicando: _"A conta é de professor e também registra os próprios PRs. Para ver a área de aluno vinculado, crie outra conta e digite o código mostrado em Mais → Códigos de vínculo."_

## 5. Teste fechado e produção

1. **Teste interno** (até 100 pessoas, liberado na hora): você e um professor.
2. **Teste fechado**: lista com **pelo menos 12 alunos**, que instalam pela Play Store e mantêm o app por **14 dias**.
3. Peça **acesso à produção** na Play Console e envie a versão para **Produção**. A primeira revisão costuma levar de alguns dias a uma semana.

## 6. Novas versões

| O que mudou                      | O que fazer                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| Só a API ou o banco              | Deploy normal no Render. O app usa a API nova sem atualizar.                             |
| Telas do app                     | `npm run build:play` e envio do `.aab` (ou `npm run submit:play`) para a faixa desejada. |
| Nome, ícone, cores ou permissões | Mesmo processo; a Google pode revisar de novo a ficha.                                   |

> Atenção: mudanças na API que quebram o app antigo (como a Fase 1 do plano de vínculos) exigem publicar o app novo **antes** ou junto do deploy da API, porque os alunos demoram para atualizar.
