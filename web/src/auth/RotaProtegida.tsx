import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Carregando } from '../components/ui.tsx'
import type { Perfil } from '../lib/tipos.ts'
import { rotaInicial, useUsuario } from './sessao.ts'

type Props = {
  children: ReactNode
  /** Perfil exigido; sem ele, qualquer usuário com cadastro completo entra. */
  perfil?: Perfil
  /** Etapa de primeiro acesso: permite entrar mesmo com o cadastro incompleto. */
  etapa?: 'senha' | 'termo'
}

export function RotaProtegida({ children, perfil, etapa }: Props) {
  const { data: usuario, isPending } = useUsuario()
  const { pathname } = useLocation()

  if (isPending) return <Carregando />
  if (!usuario) return <Navigate to="/login" replace state={{ voltarPara: pathname }} />

  // Ordem do primeiro acesso: 1) trocar a senha temporária, 2) aceitar o termo
  const etapaPendente = usuario.trocarSenha
    ? 'senha'
    : usuario.consentimentoPendente
      ? 'termo'
      : null
  if (etapaPendente !== (etapa ?? null)) {
    return (
      <Navigate
        to={etapaPendente ? `/primeiro-acesso/${etapaPendente}` : rotaInicial(usuario)}
        replace
      />
    )
  }

  if (perfil && usuario.perfil !== perfil) return <Navigate to={rotaInicial(usuario)} replace />

  return children
}
