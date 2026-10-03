import { Navigate, type RouteObject } from 'react-router'
import { RotaProtegida } from './auth/RotaProtegida.tsx'
import { RedirecionarInicio } from './auth/RedirecionarInicio.tsx'
import { InicioAluno } from './pages/aluno/InicioAluno.tsx'
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
        <InicioAluno />
      </RotaProtegida>
    ),
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
