import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import {
  useExcluirConta,
  useLogout,
  useSouProfessor,
  useTrocarSenha,
  useUsuario,
} from '../../auth/sessao.ts'
import { SecaoInstalacao } from '../../components/Instalacao.tsx'
import { Alerta, Botao, Campo, Modal } from '../../components/ui.tsx'
import { ErroApi } from '../../lib/api.ts'
import { CabecalhoAluno } from './LayoutAluno.tsx'

export function Perfil() {
  const { data: usuario } = useUsuario()
  const logout = useLogout()

  return (
    <>
      <CabecalhoAluno titulo="Perfil" />
      <section className="space-y-3 p-4">
        <dl className="space-y-3 rounded-2xl bg-white p-4 text-sm shadow-sm">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Nome</dt>
            <dd className="font-semibold">{usuario?.nome}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">E-mail</dt>
            <dd>{usuario?.email}</dd>
          </div>
        </dl>
        <SouProfessor />
        <SecaoInstalacao />
        <TrocarSenha />
        <p className="px-1 text-xs text-slate-500">
          Academias e professores que veem os seus PRs estão em{' '}
          <Link to="/aluno/vinculos" className="font-semibold text-marca-escura">
            Vínculos
          </Link>
          .
        </p>
        {logout.error && <Alerta>Sem conexão: para sair da conta, conecte-se à internet.</Alerta>}
        <Botao
          variante="secundario"
          className="w-full"
          onClick={() => logout.mutate()}
          carregando={logout.isPending}
        >
          Sair
        </Botao>
        <ExcluirConta />
        <p className="text-center">
          <Link to="/privacidade" className="text-xs text-slate-500 underline">
            Política de privacidade
          </Link>
        </p>
      </section>
    </>
  )
}

/** "Sou professor": ativa a área de gestão (alunos, turmas, códigos) na mesma conta. */
function SouProfessor() {
  const { data: usuario } = useUsuario()
  const alterar = useSouProfessor()
  if (!usuario) return null
  return (
    <div className="space-y-2 rounded-2xl bg-white p-4 text-sm shadow-sm">
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-semibold">Sou professor</span>
          <span className="text-slate-500">Acompanhe os seus alunos com a mesma conta</span>
        </span>
        <input
          type="checkbox"
          className="size-5 accent-marca"
          checked={usuario.ehProfessor}
          disabled={alterar.isPending}
          onChange={(e) => alterar.mutate(e.target.checked)}
        />
      </label>
      {usuario.ehProfessor && (
        <Link
          to="/treinador/visao-geral"
          className="block font-semibold text-marca-escura hover:underline"
        >
          Ir para a área do professor →
        </Link>
      )}
      {alterar.error && <Alerta>{alterar.error.message}</Alerta>}
    </div>
  )
}

/** Exclusão definitiva da conta, confirmada com a senha. */
function ExcluirConta() {
  const excluir = useExcluirConta()
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const erro = excluir.error instanceof ErroApi ? excluir.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    excluir.mutate(senha)
  }

  return (
    <>
      <Botao variante="link" className="w-full !text-red-700" onClick={() => setAberto(true)}>
        Excluir minha conta
      </Botao>
      {aberto && (
        <Modal titulo="Excluir minha conta" aoFechar={() => setAberto(false)}>
          <form onSubmit={enviar} className="space-y-4" noValidate>
            <Alerta>
              Sua conta, seus PRs e todo o histórico de testes serão apagados{' '}
              <strong>definitivamente</strong>. Isso não pode ser desfeito.
            </Alerta>
            <Campo
              rotulo="Confirme com sua senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              erro={erro?.codigo === 'SENHA_INCORRETA' ? erro.message : erro?.doCampo('senha')}
            />
            <div className="flex justify-end gap-3">
              <Botao variante="secundario" onClick={() => setAberto(false)}>
                Cancelar
              </Botao>
              <Botao
                type="submit"
                variante="perigo"
                carregando={excluir.isPending}
                disabled={!senha}
              >
                Excluir definitivamente
              </Botao>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

function TrocarSenha() {
  const trocar = useTrocarSenha()
  const [aberto, setAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const erro = trocar.error instanceof ErroApi ? trocar.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    trocar.mutate(
      { senhaAtual, novaSenha },
      {
        onSuccess: () => {
          setSenhaAtual('')
          setNovaSenha('')
          setAberto(false)
        },
      },
    )
  }

  if (!aberto) {
    return (
      <div className="space-y-3">
        {trocar.isSuccess && <Alerta tipo="sucesso">Senha alterada.</Alerta>}
        <Botao variante="secundario" className="w-full" onClick={() => setAberto(true)}>
          Trocar senha
        </Botao>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" noValidate>
      <Campo
        rotulo="Senha atual"
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
      <div className="flex justify-end gap-3">
        <Botao variante="secundario" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
        <Botao type="submit" carregando={trocar.isPending}>
          Salvar
        </Botao>
      </div>
    </form>
  )
}
