import { Navigate, type RouteObject } from 'react-router'
import { RotaProtegida } from './auth/RotaProtegida.tsx'
import { RedirecionarInicio } from './auth/RedirecionarInicio.tsx'
import { DetalheExercicio } from './pages/aluno/DetalheExercicio.tsx'
import { Evolucao } from './pages/aluno/Evolucao.tsx'
import { LayoutAluno } from './pages/aluno/LayoutAluno.tsx'
import { MeusPrs } from './pages/aluno/MeusPrs.tsx'
import { Percentuais } from './pages/aluno/Percentuais.tsx'
import { Perfil } from './pages/aluno/Perfil.tsx'
import { RegistrarPr } from './pages/aluno/RegistrarPr.tsx'
import { Login } from './pages/Login.tsx'
import { Cadastro } from './pages/Cadastro.tsx'
import { EsqueciSenha } from './pages/EsqueciSenha.tsx'
import { ConfirmarEmail, Termo } from './pages/PrimeiroAcesso.tsx'
import { InstrucoesExcluirConta, Privacidade } from './pages/Privacidade.tsx'
import { Alunos } from './pages/treinador/Alunos.tsx'
import { ConsultarCargas } from './pages/treinador/ConsultarCargas.tsx'
import { EvolucaoTurmas } from './pages/treinador/EvolucaoTurmas.tsx'
import { Exercicios } from './pages/treinador/Exercicios.tsx'
import { ImportarCargas } from './pages/treinador/importacao/ImportarCargas.tsx'
import { LayoutTreinador } from './pages/treinador/LayoutTreinador.tsx'
import { PercentuaisAlunos } from './pages/treinador/PercentuaisAlunos.tsx'
import { TesteDeCarga } from './pages/treinador/TesteDeCarga.tsx'
import { Turmas } from './pages/treinador/Turmas.tsx'
import { VisaoGeral } from './pages/treinador/VisaoGeral.tsx'
import { Codigos } from './pages/treinador/Codigos.tsx'
import { Professores } from './pages/treinador/Professores.tsx'
import { MeusVinculos } from './pages/aluno/MeusVinculos.tsx'

export const rotas: RouteObject[] = [
  { path: '/login', element: <Login /> },
  { path: '/cadastro', element: <Cadastro /> },
  { path: '/esqueci-senha', element: <EsqueciSenha /> },
  // Páginas públicas exigidas pela Google Play (abertas sem login)
  { path: '/privacidade', element: <Privacidade /> },
  { path: '/excluir-conta', element: <InstrucoesExcluirConta /> },
  {
    path: '/primeiro-acesso/email',
    element: (
      <RotaProtegida etapa="email">
        <ConfirmarEmail />
      </RotaProtegida>
    ),
  },
  {
    path: '/primeiro-acesso/termo',
    element: (
      <RotaProtegida etapa="termo">
        <Termo />
      </RotaProtegida>
    ),
  },
  {
    path: '/aluno',
    element: (
      <RotaProtegida area="aluno">
        <LayoutAluno />
      </RotaProtegida>
    ),
    children: [
      // O aluno já entra vendo as cargas de 35% a 55% (critério da Fase 3)
      { index: true, element: <Navigate to="percentuais" replace /> },
      { path: 'percentuais', element: <Percentuais /> },
      { path: 'prs', element: <MeusPrs /> },
      { path: 'evolucao', element: <Evolucao /> },
      { path: 'prs/novo', element: <RegistrarPr /> },
      { path: 'exercicios/:id', element: <DetalheExercicio /> },
      { path: 'perfil', element: <Perfil /> },
      { path: 'vinculos', element: <MeusVinculos /> },
    ],
  },
  {
    path: '/treinador',
    element: (
      <RotaProtegida area="gestao">
        <LayoutTreinador />
      </RotaProtegida>
    ),
    children: [
      { index: true, element: <Navigate to="visao-geral" replace /> },
      { path: 'visao-geral', element: <VisaoGeral /> },
      { path: 'alunos', element: <Alunos /> },
      { path: 'turmas', element: <Turmas /> },
      { path: 'exercicios', element: <Exercicios /> },
      { path: 'teste-de-carga', element: <TesteDeCarga /> },
      { path: 'percentuais', element: <PercentuaisAlunos /> },
      { path: 'importar', element: <ImportarCargas /> },
      { path: 'consultar', element: <ConsultarCargas /> },
      { path: 'evolucao', element: <EvolucaoTurmas /> },
      { path: 'codigos', element: <Codigos /> },
      { path: 'professores', element: <Professores /> },
    ],
  },
  // Raiz e endereços desconhecidos: leva cada perfil para a sua tela inicial
  { path: '*', element: <RedirecionarInicio /> },
]
