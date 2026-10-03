import { Navigate } from 'react-router'
import { Carregando } from '../components/ui.tsx'
import { rotaInicial, useUsuario } from './sessao.ts'

/** Leva cada perfil para a sua tela inicial (ou ao login, sem sessão). */
export function RedirecionarInicio() {
  const { data: usuario, isPending } = useUsuario()
  if (isPending) return <Carregando />
  return <Navigate to={usuario ? rotaInicial(usuario) : '/login'} replace />
}
