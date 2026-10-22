import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { rotaInicial, useLogin, useUsuario } from '../auth/sessao.ts'
import { LayoutPublico } from '../components/LayoutPublico.tsx'
import { Alerta, Botao, Campo } from '../components/ui.tsx'
import { ErroApi } from '../lib/api.ts'

export function Login() {
  const { data: usuario } = useUsuario()
  const login = useLogin()
  const navegar = useNavigate()
  const { state } = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  if (usuario) return <Navigate to={rotaInicial(usuario)} replace />

  const erro = login.error instanceof ErroApi ? login.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    login.mutate(
      { email, senha },
      {
        onSuccess: ({ usuario }) => {
          const voltarPara = (state as { voltarPara?: string } | null)?.voltarPara
          navegar(voltarPara ?? rotaInicial(usuario), { replace: true })
        },
      },
    )
  }

  return (
    <LayoutPublico subtitulo="Seus recordes e cargas de treino sempre à mão">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erro?.doCampo('email')}
          required
        />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={erro?.doCampo('senha')}
          required
        />
        {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
        {login.error && !erro && (
          <Alerta>Não foi possível conectar. Verifique sua internet.</Alerta>
        )}
        <Botao type="submit" className="w-full" carregando={login.isPending}>
          Entrar
        </Botao>
        <Link
          to="/esqueci-senha"
          className="block text-center text-sm font-semibold text-slate-600 hover:underline"
        >
          Esqueci a senha
        </Link>
        <p className="text-center text-sm text-slate-500">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-marca-escura hover:underline">
            Criar conta
          </Link>
        </p>
      </form>
    </LayoutPublico>
  )
}
