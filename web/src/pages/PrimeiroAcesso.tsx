import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  rotaInicial,
  useAceitarTermo,
  useLogout,
  useTrocarSenha,
  useUsuario,
} from '../auth/sessao.ts'
import { LayoutPublico } from '../components/LayoutPublico.tsx'
import { Alerta, Botao, Campo } from '../components/ui.tsx'
import { ErroApi } from '../lib/api.ts'

export function TrocarSenha() {
  const { data: usuario } = useUsuario()
  const trocar = useTrocarSenha()
  const logout = useLogout()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erroConfirmacao, setErroConfirmacao] = useState<string>()

  const erro = trocar.error instanceof ErroApi ? trocar.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (novaSenha !== confirmacao) {
      setErroConfirmacao('As senhas não conferem')
      return
    }
    setErroConfirmacao(undefined)
    trocar.mutate({ senhaAtual, novaSenha })
  }

  return (
    <LayoutPublico
      subtitulo={`Olá, ${usuario?.nome.split(' ')[0]}! Crie sua senha para continuar.`}
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Alerta tipo="info">
          Você entrou com uma senha temporária. Escolha uma senha pessoal com pelo menos 8
          caracteres.
        </Alerta>
        <Campo
          rotulo="Senha temporária"
          type="password"
          autoComplete="current-password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          erro={
            erro?.doCampo('senhaAtual') ??
            (erro?.codigo === 'SENHA_ATUAL_INCORRETA' ? erro.message : undefined)
          }
        />
        <Campo
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          erro={
            erro?.doCampo('novaSenha') ??
            (erro?.codigo === 'SENHA_REPETIDA' ? erro.message : undefined)
          }
          dica="Mínimo de 8 caracteres"
        />
        <Campo
          rotulo="Confirme a nova senha"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          erro={erroConfirmacao}
        />
        <Botao type="submit" className="w-full" carregando={trocar.isPending}>
          Salvar nova senha
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
          Esses dados são visíveis apenas para você e para os treinadores do seu box, não são
          compartilhados com terceiros e a senha é armazenada de forma criptografada.
        </p>
        <p>
          Você pode solicitar a correção ou a exclusão dos seus dados a qualquer momento ao seu
          treinador. A exclusão remove definitivamente sua conta e seu histórico de testes.
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
