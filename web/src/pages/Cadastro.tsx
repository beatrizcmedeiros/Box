import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { rotaInicial, useCadastro, useUsuario } from '../auth/sessao.ts'
import { LayoutPublico } from '../components/LayoutPublico.tsx'
import { Alerta, Botao, Campo } from '../components/ui.tsx'
import { ErroApi } from '../lib/api.ts'

type TipoCadastro = 'aluno' | 'professor' | 'academia'

const opcoes: { valor: TipoCadastro; titulo: string; descricao: string }[] = [
  { valor: 'aluno', titulo: 'Aluno', descricao: 'Registro meus PRs e vejo minhas cargas' },
  {
    valor: 'professor',
    titulo: 'Professor',
    descricao: 'Acompanho meus alunos (e também registro meus PRs)',
  },
  {
    valor: 'academia',
    titulo: 'Academia',
    descricao: 'Conta do box: professores, turmas e alunos',
  },
]

/** Cadastro aberto: e-mail e senha. Depois vêm a confirmação do e-mail e o termo. */
export function Cadastro() {
  const { data: usuario } = useUsuario()
  const cadastro = useCadastro()
  const [tipo, setTipo] = useState<TipoCadastro>('aluno')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erroConfirmacao, setErroConfirmacao] = useState<string>()

  if (usuario) return <Navigate to={rotaInicial(usuario)} replace />

  const erro = cadastro.error instanceof ErroApi ? cadastro.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (senha !== confirmacao) {
      setErroConfirmacao('As senhas não conferem')
      return
    }
    setErroConfirmacao(undefined)
    // Após o cadastro, as rotas protegidas levam à confirmação do e-mail
    cadastro.mutate({
      nome,
      email,
      senha,
      tipo: tipo === 'academia' ? 'ACADEMIA' : 'PESSOA',
      ehProfessor: tipo === 'professor',
    })
  }

  return (
    <LayoutPublico subtitulo="Crie sua conta">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">Eu sou</legend>
          {opcoes.map((o) => (
            <label
              key={o.valor}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                tipo === o.valor ? 'border-marca-forte bg-orange-50' : 'border-slate-200 bg-white'
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value={o.valor}
                checked={tipo === o.valor}
                onChange={() => setTipo(o.valor)}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold">{o.titulo}</span>
                <span className="block text-sm text-slate-500">{o.descricao}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Campo
          rotulo={tipo === 'academia' ? 'Nome da academia' : 'Seu nome'}
          autoComplete={tipo === 'academia' ? 'organization' : 'name'}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erro?.doCampo('nome')}
        />
        <Campo
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={
            erro?.doCampo('email') ?? (erro?.codigo === 'EMAIL_EM_USO' ? erro.message : undefined)
          }
        />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={erro?.doCampo('senha')}
          dica="Mínimo de 8 caracteres"
        />
        <Campo
          rotulo="Confirme a senha"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          erro={erroConfirmacao}
        />
        {erro && erro.campos.length === 0 && erro.codigo !== 'EMAIL_EM_USO' && (
          <Alerta>{erro.message}</Alerta>
        )}
        <Botao type="submit" className="w-full" carregando={cadastro.isPending}>
          Criar conta
        </Botao>
        <p className="text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <Link to="/login" className="font-semibold text-marca-escura hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </LayoutPublico>
  )
}
