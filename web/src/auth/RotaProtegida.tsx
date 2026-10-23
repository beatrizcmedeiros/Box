import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Carregando } from '../components/ui.tsx'
import { fazGestao, rotaInicial, useUsuario } from './sessao.ts'

type Props = {
  children: ReactNode
  /**
   * Área exigida: "aluno" (Meus PRs, só contas pessoais) ou "gestao" (professor ou academia).
   * Sem ela, qualquer usuário com cadastro completo entra.
   */
  area?: 'aluno' | 'gestao'
  /** Etapa de primeiro acesso: permite entrar mesmo com o cadastro incompleto. */
  etapa?: 'termo'
}

export function RotaProtegida({ children, area, etapa }: Props) {
  const { data: usuario, isPending } = useUsuario()
  const { pathname } = useLocation()

  if (isPending) return <Carregando />
  if (!usuario) return <Navigate to="/login" replace state={{ voltarPara: pathname }} />

  // Primeiro acesso: aceitar o termo de consentimento
  const etapaPendente = usuario.consentimentoPendente ? 'termo' : null
  if (etapaPendente !== (etapa ?? null)) {
    return (
      <Navigate
        to={etapaPendente ? `/primeiro-acesso/${etapaPendente}` : rotaInicial(usuario)}
        replace
      />
    )
  }

  const permitido = !area || (area === 'aluno' ? usuario.tipo === 'PESSOA' : fazGestao(usuario))
  if (!permitido) return <Navigate to={rotaInicial(usuario)} replace />

  return children
}
