import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  CHAVE_EMAIL_ENVIADO,
  rotaInicial,
  useAceitarTermo,
  useConfirmarEmail,
  useLogout,
  useReenviarConfirmacao,
  useUsuario,
} from '../auth/sessao.ts'
import { LayoutPublico } from '../components/LayoutPublico.tsx'
import { Alerta, Botao, Campo } from '../components/ui.tsx'
import { ErroApi } from '../lib/api.ts'

/** Primeiro acesso: digitar o código de 6 dígitos enviado ao e-mail no cadastro. */
export function ConfirmarEmail() {
  const { data: usuario } = useUsuario()
  const confirmar = useConfirmarEmail()
  const reenviar = useReenviarConfirmacao()
  const logout = useLogout()
  const [codigo, setCodigo] = useState('')
  const erro = confirmar.error instanceof ErroApi ? confirmar.error : null
  // false: no cadastro, a API não conseguiu enviar o código (ex.: envio de e-mail fora do ar)
  const emailEnviado = useQueryClient().getQueryData<boolean>(CHAVE_EMAIL_ENVIADO)

  function enviar(e: FormEvent) {
    e.preventDefault()
    confirmar.mutate(codigo)
  }

  return (
    <LayoutPublico subtitulo="Confirme o seu e-mail para continuar">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {emailEnviado === false && !reenviar.isSuccess && (
          <Alerta>
            Não conseguimos enviar o código agora. Clique em Reenviar o código daqui a pouco. Se o
            problema continuar, avise o responsável pelo PR Box.
          </Alerta>
        )}
        <Alerta tipo="info">
          Enviamos um código de 6 dígitos para <strong>{usuario?.email}</strong>. Ele vale por 15
          minutos. Confira também a caixa de spam.
        </Alerta>
        <Campo
          rotulo="Código"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          erro={
            erro?.doCampo('codigo') ??
            (erro?.codigo === 'CODIGO_INVALIDO' ? erro.message : undefined)
          }
          className="[&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[0.4em]"
        />
        <Botao
          type="submit"
          className="w-full"
          carregando={confirmar.isPending}
          disabled={codigo.length !== 6}
        >
          Confirmar e-mail
        </Botao>
        {reenviar.isSuccess && <Alerta tipo="sucesso">Enviamos um novo código.</Alerta>}
        {reenviar.error && <Alerta>{reenviar.error.message}</Alerta>}
        <Botao
          variante="link"
          className="w-full"
          carregando={reenviar.isPending}
          onClick={() => reenviar.mutate()}
        >
          Reenviar o código
        </Botao>
        <Botao variante="link" className="w-full" onClick={() => logout.mutate()}>
          Sair
        </Botao>
      </form>
    </LayoutPublico>
  )
}

export function Termo() {
  const aceitar = useAceitarTermo()
  const logout = useLogout()
  const navegar = useNavigate()

  return (
    <LayoutPublico subtitulo="Termo de consentimento para uso dos dados">
      <article className="space-y-3 rounded-2xl bg-white p-5 text-sm leading-relaxed text-slate-700 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Como o PR Box usa seus dados</h2>
        <p>
          Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), informamos que
          o PR Box armazena apenas os dados necessários para o seu funcionamento:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>nome, e-mail e turma, para identificar você no box;</li>
          <li>
            exercícios, datas dos testes de carga e cargas máximas (PRs), para calcular as cargas
            dos treinos.
          </li>
        </ul>
        <p>
          Esses dados são visíveis apenas para você e para as academias e professores aos quais você
          se vincular, não são compartilhados com terceiros e a senha é armazenada de forma
          criptografada.
        </p>
        <p>
          Você pode corrigir ou excluir os seus dados a qualquer momento no seu perfil, e desfazer
          os vínculos com academias e professores quando quiser. A exclusão remove definitivamente
          sua conta e seu histórico de testes.
        </p>
        <p>
          <Link to="/privacidade" className="font-semibold text-marca-escura underline">
            Ler a política de privacidade completa
          </Link>
        </p>
      </article>
      {aceitar.error && (
        <div className="mt-4">
          <Alerta>{aceitar.error.message}</Alerta>
        </div>
      )}
      <div className="mt-5 space-y-3">
        <Botao
          className="w-full"
          carregando={aceitar.isPending}
          onClick={() =>
            aceitar.mutate(undefined, {
              onSuccess: ({ usuario }) => navegar(rotaInicial(usuario), { replace: true }),
            })
          }
        >
          Li e aceito
        </Botao>
        <Botao variante="link" className="w-full" onClick={() => logout.mutate()}>
          Não aceito — sair
        </Botao>
      </div>
    </LayoutPublico>
  )
}
