import { Navigate, type RouteObject } from 'react-router'
import { RotaProtegida } from './auth/RotaProtegida.tsx'
import { RedirecionarInicio } from './auth/RedirecionarInicio.tsx'
import { DetalheExercicio } from './pages/aluno/DetalheExercicio.tsx'
import { LayoutAluno } from './pages/aluno/LayoutAluno.tsx'
import { MeusPrs } from './pages/aluno/MeusPrs.tsx'
import { Percentuais } from './pages/aluno/Percentuais.tsx'
import { Perfil } from './pages/aluno/Perfil.tsx'
import { RegistrarPr } from './pages/aluno/RegistrarPr.tsx'
import { Login } from './pages/Login.tsx'
import { Termo, TrocarSenha } from './pages/PrimeiroAcesso.tsx'
import { Alunos } from './pages/treinador/Alunos.tsx'
import { Exercicios } from './pages/treinador/Exercicios.tsx'
import { LayoutTreinador } from './pages/treinador/LayoutTreinador.tsx'
import { Turmas } from './pages/treinador/Turmas.tsx'

export const rotas: RouteObject[] = [
  { path: '/login', element: <Login /> },
  {
    path: '/primeiro-acesso/senha',
    element: (
      <RotaProtegida etapa="senha">
        <TrocarSenha />
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
      <RotaProtegida perfil="ALUNO">
        <LayoutAluno />
      </RotaProtegida>
    ),
    children: [
      // O aluno já entra vendo as cargas de 35% a 55% (critério da Fase 3)
      { index: true, element: <Navigate to="percentuais" replace /> },
      { path: 'percentuais', element: <Percentuais /> },
      { path: 'prs', element: <MeusPrs /> },
      { path: 'prs/novo', element: <RegistrarPr /> },
      { path: 'exercicios/:id', element: <DetalheExercicio /> },
      { path: 'perfil', element: <Perfil /> },
    ],
  },
  {
    path: '/treinador',
    element: (
      <RotaProtegida perfil="TREINADOR">
        <LayoutTreinador />
      </RotaProtegida>
    ),
    children: [
      { index: true, element: <Navigate to="alunos" replace /> },
      { path: 'alunos', element: <Alunos /> },
      { path: 'turmas', element: <Turmas /> },
      { path: 'exercicios', element: <Exercicios /> },
    ],
  },
  // Raiz e endereços desconhecidos: leva cada perfil para a sua tela inicial
  { path: '*', element: <RedirecionarInicio /> },
]
