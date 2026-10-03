import { type FormEvent, useState } from 'react'
import { useLogout, useTrocarSenha, useUsuario } from '../../auth/sessao.ts'
import { Alerta, Botao, Campo } from '../../components/ui.tsx'
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
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Turma</dt>
            <dd>{usuario?.turma?.nome ?? 'Sem turma definida'}</dd>
          </div>
        </dl>
        <TrocarSenha />
        <p className="px-1 text-xs text-slate-500">
          Para corrigir seus dados ou excluir sua conta, fale com o seu treinador.
        </p>
        <Botao
          variante="secundario"
          className="w-full"
          onClick={() => logout.mutate()}
          carregando={logout.isPending}
        >
          Sair
        </Botao>
      </section>
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
