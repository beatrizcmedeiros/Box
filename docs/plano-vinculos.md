# Plano — PR Box para qualquer aluno, professor e academia

Hoje o PR Box atende **um único box**: turmas e exercícios são globais e só o treinador cria contas, com senha temporária. Este plano transforma o app numa plataforma aberta:

- qualquer pessoa cria a conta com **e-mail e senha** e registra os próprios PRs;
- o aluno se **vincula** a academias e professores digitando um **código numérico**;
- quem tem vínculo vê os PRs do aluno, e o aluno decide com quem compartilhar.

Vale para o app Android e para a versão web, que usam a mesma API e o mesmo banco.

## 1. Decisões tomadas

| Tema                            | Decisão                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipos de conta                  | **Usuário** (aluno e/ou professor) e **Academia**. A academia é uma conta própria (do dono do box), que pode não ser professor.                                                                                                                                                                                       |
| Aluno e professor               | **Mesma conta.** Todo usuário tem "Meus PRs". Quem ativa "sou professor" ganha também a área do professor e alterna entre as duas.                                                                                                                                                                                    |
| Cadastro                        | Aberto, só **e-mail e senha**. Acaba a senha temporária.                                                                                                                                                                                                                                                              |
| Recuperar senha                 | **Código enviado por e-mail** (serviço de envio, ex.: Resend).                                                                                                                                                                                                                                                        |
| Vínculo                         | Por **código numérico**, com validade de **15 dias, 30 dias ou sem validade**. **Vale na hora**, sem aprovação. O código pode ser trocado a qualquer momento (o antigo deixa de valer).                                                                                                                               |
| Quantos vínculos                | O aluno pode ter **vários**: nenhum, uma ou mais academias, um ou mais professores, ou academia e professor juntos.                                                                                                                                                                                                   |
| Conta da academia               | **Vê tudo e administra**: professores, turmas, códigos e exercícios da academia, e também os alunos e PRs.                                                                                                                                                                                                            |
| Professor da academia           | Entra na academia pelo **código de professor** da academia. Vê **todos os alunos e turmas** da academia, trabalhe ele por turma ou por dia.                                                                                                                                                                           |
| Locais do professor             | O professor sem vínculo com academia (ou com alunos próprios) organiza os alunos dele em **locais** (ex.: o nome de outra academia onde dá aula) e, dentro de cada local, em **turmas** (ex.: por horário). O local é só um agrupamento do professor: não é uma conta de academia e os outros professores não o veem. |
| Aluno vinculado só ao professor | É **pessoal**: só aquele professor vê. Os colegas dele na academia não veem. Para todos da academia verem, o aluno usa o código da academia.                                                                                                                                                                          |
| Exercícios                      | **Lista padrão** que já vem no app (ninguém altera) + exercícios **próprios** da academia ou do professor (para os alunos deles) + **pessoais** do aluno.                                                                                                                                                             |

## 2. Quem vê o quê

Regra única da API, usada em todas as consultas do professor e da academia:

> O **professor P** vê o aluno A se A tem vínculo **direto com P**, ou se A tem vínculo com uma **academia da qual P é professor**.
> A **academia Y** vê o aluno A se A tem vínculo **com Y**.

| Situação do aluno A            | Academia Y | Professores de Y | Professor X (de Y) | Professor Z (sem academia) |
| ------------------------------ | ---------- | ---------------- | ------------------ | -------------------------- |
| Sem vínculo                    | —          | —                | —                  | —                          |
| Vinculado à academia Y         | vê         | todos veem       | vê                 | —                          |
| Vinculado só ao professor X    | —          | —                | vê                 | —                          |
| Vinculado a Y e a X            | vê         | todos veem       | vê                 | —                          |
| Vinculado a Y e ao professor Z | vê         | todos veem       | vê                 | vê                         |

- O aluno sempre vê e controla os próprios PRs.
- Professores e academia podem **lançar** e **importar** PRs dos alunos que veem, como hoje. O registro guarda quem lançou e em qual academia.

## 3. Códigos de vínculo

| Código                                | Quem gera | Para quem | Efeito                                      |
| ------------------------------------- | --------- | --------- | ------------------------------------------- |
| Código de **alunos** da academia      | Academia  | Aluno     | Vincula o aluno à academia                  |
| Código de **professores** da academia | Academia  | Professor | O professor passa a fazer parte da academia |
| Código de **alunos** do professor     | Professor | Aluno     | Vincula o aluno ao professor                |

- Formato: **6 dígitos** (ex.: `482 913`), fácil de passar no box.
- Validade escolhida ao gerar: 15 dias, 30 dias ou sem validade. Botão **Gerar novo código** invalida o anterior.
- Segurança: com só 6 dígitos, alguém poderia tentar adivinhar. Por isso há um limite de tentativas por conta e por IP (ex.: 10 por hora), e o vínculo pode ser desfeito a qualquer momento.

## 4. Telas

### Entrada (app e web)

1. **Entrar** ou **Criar conta**: e-mail, senha e nome. Na criação, há uma opção "Sou professor" e outra "Sou uma academia".
2. Confirmação do e-mail com um código de 6 dígitos enviado por e-mail (ver seção 7, item 1).
3. Termo de consentimento (LGPD), como hoje.
4. Opcional: **"Tem um código do seu box ou professor?"**, que pode ser pulado e usado depois.
5. **Esqueci a senha**: código por e-mail e definição de uma senha nova.

### Aluno (todo usuário)

- Abas atuais (Percentuais, Meus PRs, Evolução, Perfil).
- **Registrar PR** mostra os exercícios disponíveis para ele: lista padrão, os das academias e professores dele e os pessoais. Pode criar um exercício pessoal ali mesmo. Hoje a tela fica vazia quando não há exercícios.
- Nova aba **Vínculos**: digitar um código, ver as academias e professores vinculados (e quem vê seus PRs) e **desvincular**.

### Professor

- Alterna entre "Meus PRs" e "Professor".
- Seletor de **contexto** no topo: cada academia em que ele trabalha, mais "Meus alunos" (os vinculados diretamente). As telas atuais (Visão geral, Teste de carga, Percentuais, Alunos, Evolução, Importar) passam a mostrar os alunos do contexto escolhido.
- Aba **Códigos**: gerar ou trocar o código de alunos, com a validade.
- Turmas: as da academia (compartilhadas com os colegas) ou as próprias, no contexto "Meus alunos".
- **Locais** (contexto "Meus alunos"): o professor cria locais, como "Box Centro" ou "Academia X", e turmas dentro de cada um, como "Box Centro · 07h" e "Box Centro · 19h". Cada aluno vinculado a ele pode ser colocado num local e numa turma.
  - Os filtros das telas (Teste de carga, Percentuais, Consultar, Evolução) ganham **Local** além de **Turma**: ver as duas turmas da "Academia X" juntas, ou só a das 19h.
  - Exemplo: o professor dá aula em duas turmas de outra academia. Ele cria o local "Academia X" com as turmas "07h" e "19h" e vê os alunos separados por horário, mas juntos pela academia.
- **Entrar numa academia** com o código de professor.

### Academia

- Mesmas telas do professor, sempre no contexto da própria academia.
- **Professores**: lista, código de professores e remover professor.
- **Códigos**: código de alunos e código de professores, cada um com a validade.
- Turmas e exercícios da academia.

## 5. Mudanças no modelo de dados

- `Usuario`: troca `perfil` por `ehProfessor` (booleano), mais `emailVerificadoEm`. Sai `trocarSenha`.
- `Academia` (nova): nome e a conta que a administra (login próprio).
- `ProfessorAcademia` (nova): vínculo do professor com a academia.
- `VinculoAluno` (nova): aluno com academia **ou** professor, com data de início e quem o criou.
- `CodigoVinculo` (nova): tipo, código, dono (academia ou professor), validade e situação.
- `LocalProfessor` (nova): agrupamento do professor (nome, ex.: "Academia X"). Pertence só a ele.
- `Turma`: passa a pertencer a uma academia **ou** a um local do professor. O aluno pode estar numa turma diferente em cada vínculo.
- `VinculoAluno` guarda, no vínculo com o professor, o local e a turma do aluno (ambos opcionais). Um aluno pode ficar num local sem turma.
- `Exercicio`: ganha escopo (`PADRAO`, `ACADEMIA`, `PROFESSOR`, `PESSOAL`) e dono. O nome deixa de ser único no banco todo e passa a ser único dentro do escopo.
- `TesteCarga`: ganha `lancadoPorId` e `academiaId` (contexto de quem lançou).
- `CodigoEmail` (nova): códigos de confirmação de e-mail e de recuperação de senha, guardados como hash e com validade curta.

## 6. Fases

| #   | Fase                                                                                                                                                                                               | Depende de |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 0   | **Correção imediata:** a lista padrão de exercícios entra por migration (vale para o banco publicado também) e a tela Registrar PR ganha a mensagem de lista vazia.                                | —          |
| 1   | **Modelo e regras na API:** academias, vínculos, códigos, escopo de exercícios e a regra "quem vê o quê" aplicada em todas as rotas do professor, com testes de cada cenário da tabela da seção 2. | 0          |
| 2   | **Cadastro aberto e e-mail:** criar conta, confirmar e-mail, esqueci a senha (serviço de envio + limite de tentativas), fim da senha temporária.                                                   | 1          |
| 3   | **App Android:** entrada nova, aba Vínculos, alternância aluno/professor, seletor de contexto, Códigos, área da academia.                                                                          | 1, 2       |
| 4   | **Web:** as mesmas telas na versão web.                                                                                                                                                            | 1, 2       |
| 5   | **Migração e publicação:** levar os dados atuais para o novo modelo, publicar a API, gerar o APK novo e seguir para a Google Play.                                                                 | 3, 4       |

As Fases 3 e 4 podem andar em paralelo.

## 7. Decisões complementares (confirmadas em 22/10/2026)

Todos os pontos seguem a recomendação.

1. **Confirmar o e-mail no cadastro: sim.** Como a recuperação de senha depende do e-mail, um e-mail digitado errado deixaria a pessoa sem como recuperar a conta.
2. **Quem pode desfazer um vínculo:** **o aluno** (a qualquer momento) **e a academia ou o professor** (para remover quem não treina mais). Ao desvincular, os PRs **continuam com o aluno**, inclusive os lançados pelo professor, e quem perdeu o vínculo deixa de vê-los na hora.
3. **Professor sai da academia:** perde o acesso aos alunos da academia na hora. Os alunos vinculados diretamente a ele continuam com ele.
4. **Excluir conta:** vale para todos (exigência da Google Play). A conta da academia, ao ser excluída, desfaz todos os vínculos, mas os PRs continuam com os alunos.
5. **Dados atuais:** o banco publicado só tem o seu treinador e nenhum PR, então ele **recomeça do zero** no modelo novo, sem migração de dados.
6. **Exercício pessoal com o mesmo nome de um da academia:** os dois aparecem para o aluno, identificados ("Back Squat · Box X" e "Back Squat · pessoal"). Os PRs não se misturam.
