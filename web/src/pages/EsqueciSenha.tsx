import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { useEsqueciSenha, useRedefinirSenha } from '../auth/sessao.ts'
import { LayoutPublico } from '../components/LayoutPublico.tsx'
import { Alerta, Botao, Campo } from '../components/ui.tsx'
import { ErroApi } from '../lib/api.ts'

/** Esqueci a senha: código enviado ao e-mail e criação da nova senha. */
export function EsqueciSenha() {
  const pedir = useEsqueciSenha()
  const redefinir = useRedefinirSenha()
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')

  const erroPedido = pedir.error instanceof ErroApi ? pedir.error : null
  const erro = redefinir.error instanceof ErroApi ? redefinir.error : null

  function pedirCodigo(e: FormEvent) {
    e.preventDefault()
    pedir.mutate(email.trim())
  }

  function salvar(e: FormEvent) {
    e.preventDefault()
    redefinir.mutate({ email: email.trim(), codigo, novaSenha })
  }

  if (redefinir.isSuccess) {
    return (
      <LayoutPublico subtitulo="Senha alterada">
        <div className="space-y-4">
          <Alerta tipo="sucesso">
            Pronto! Sua senha foi alterada. Por segurança, os outros aparelhos conectados foram
            desconectados.
          </Alerta>
          <Link
            to="/login"
            className="block rounded-xl bg-marca-forte px-4 py-2.5 text-center font-bold text-white"
          >
            Entrar
          </Link>
        </div>
      </LayoutPublico>
    )
  }

  if (!pedir.isSuccess) {
    return (
      <LayoutPublico subtitulo="Recuperar a senha">
        <form onSubmit={pedirCodigo} className="space-y-4" noValidate>
          <p className="text-sm text-slate-600">
            Informe o e-mail da sua conta. Vamos enviar um código para você criar uma nova senha.
          </p>
          <Campo
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erro={erroPedido?.doCampo('email')}
          />
          {erroPedido && erroPedido.campos.length === 0 && <Alerta>{erroPedido.message}</Alerta>}
          <Botao type="submit" className="w-full" carregando={pedir.isPending}>
            Enviar código
          </Botao>
          <Link
            to="/login"
            className="block text-center text-sm font-semibold text-slate-600 hover:underline"
          >
            Voltar para o login
          </Link>
        </form>
      </LayoutPublico>
    )
  }

  return (
    <LayoutPublico subtitulo="Crie uma nova senha">
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <Alerta tipo="info">
          Se houver uma conta com <strong>{email.trim()}</strong>, enviamos um código de 6 dígitos.
          Ele vale por 15 minutos.
        </Alerta>
        <Campo
          rotulo="Código"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          erro={erro?.codigo === 'CODIGO_INVALIDO' ? erro.message : erro?.doCampo('codigo')}
        />
        <Campo
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          erro={erro?.doCampo('novaSenha')}
          dica="Mínimo de 8 caracteres"
        />
        {erro && erro.campos.length === 0 && erro.codigo !== 'CODIGO_INVALIDO' && (
          <Alerta>{erro.message}</Alerta>
        )}
        <Botao type="submit" className="w-full" carregando={redefinir.isPending}>
          Salvar nova senha
        </Botao>
        <Botao variante="link" className="w-full" onClick={() => pedir.reset()}>
          Usar outro e-mail ou pedir outro código
        </Botao>
      </form>
    </LayoutPublico>
  )
}
