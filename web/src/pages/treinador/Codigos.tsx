import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { useUsuario } from '../../auth/sessao.ts'
import { CartaoCodigo } from '../../components/CartaoCodigo.tsx'
import { Alerta, Botao, Campo, Carregando } from '../../components/ui.tsx'
import { api, ErroApi } from '../../lib/api.ts'
import type { CodigoVinculo, Validade, Vinculos } from '../../lib/tipos.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

/** Códigos para alunos (e professores) se vincularem; o professor também entra em academias aqui. */
export function Codigos() {
  const { data: usuario } = useUsuario()
  return (
    <>
      <CabecalhoPagina
        titulo="Códigos de vínculo"
        subtitulo="Passe o código para quem vai se vincular. Ele digita o código no app ou na web."
      />
      {usuario?.tipo === 'ACADEMIA' ? <CodigosDaAcademia /> : <CodigosDoProfessor />}
    </>
  )
}

function useCodigo<T>(chave: string, caminho: string) {
  const cliente = useQueryClient()
  const consulta = useQuery({ queryKey: ['codigos', chave], queryFn: () => api<T>(caminho) })
  const atualizar = () => cliente.invalidateQueries({ queryKey: ['codigos', chave] })
  return { consulta, atualizar }
}

function CodigosDaAcademia() {
  const { consulta, atualizar } = useCodigo<{
    alunos: CodigoVinculo | null
    professores: CodigoVinculo | null
  }>('academia', '/academia/codigos')

  const gerar = useMutation({
    mutationFn: ({ tipo, validade }: { tipo: 'alunos' | 'professores'; validade: Validade }) =>
      api(`/academia/codigos/${tipo}`, { method: 'POST', body: { validade } }),
    onSuccess: atualizar,
  })
  const desativar = useMutation({
    mutationFn: (tipo: 'alunos' | 'professores') =>
      api<void>(`/academia/codigos/${tipo}`, { method: 'DELETE' }),
    onSuccess: atualizar,
  })

  if (consulta.isPending) return <Carregando />
  if (consulta.error) return <Alerta>{consulta.error.message}</Alerta>

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CartaoCodigo
        titulo="Código para alunos"
        descricao="O aluno se vincula à academia: todos os professores dela passam a ver os PRs dele."
        codigo={consulta.data.alunos}
        gerando={gerar.isPending && gerar.variables?.tipo === 'alunos'}
        erro={gerar.error?.message}
        aoGerar={(validade) => gerar.mutate({ tipo: 'alunos', validade })}
        aoDesativar={() => desativar.mutate('alunos')}
      />
      <CartaoCodigo
        titulo="Código para professores"
        descricao="O professor passa a fazer parte da academia e vê todos os alunos e turmas dela."
        codigo={consulta.data.professores}
        gerando={gerar.isPending && gerar.variables?.tipo === 'professores'}
        aoGerar={(validade) => gerar.mutate({ tipo: 'professores', validade })}
        aoDesativar={() => desativar.mutate('professores')}
      />
    </div>
  )
}

function CodigosDoProfessor() {
  const { consulta, atualizar } = useCodigo<{ codigo: CodigoVinculo | null }>(
    'professor',
    '/professor/codigo',
  )
  const gerar = useMutation({
    mutationFn: (validade: Validade) =>
      api('/professor/codigo', { method: 'POST', body: { validade } }),
    onSuccess: atualizar,
  })
  const desativar = useMutation({
    mutationFn: () => api<void>('/professor/codigo', { method: 'DELETE' }),
    onSuccess: atualizar,
  })

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {consulta.isPending ? (
        <Carregando />
      ) : consulta.error ? (
        <Alerta>{consulta.error.message}</Alerta>
      ) : (
        <CartaoCodigo
          titulo="Código para os seus alunos"
          descricao={
            'O aluno se vincula a você e aparece em "Meus alunos". Só você vê os PRs dele.'
          }
          codigo={consulta.data.codigo}
          gerando={gerar.isPending}
          erro={gerar.error?.message}
          aoGerar={(validade) => gerar.mutate(validade)}
          aoDesativar={() => desativar.mutate()}
        />
      )}
      <AcademiasOndeEnsina />
    </div>
  )
}

/** O professor entra numa academia com o código de professores dela, ou sai. */
function AcademiasOndeEnsina() {
  const cliente = useQueryClient()
  const vinculos = useQuery({ queryKey: ['vinculos'], queryFn: () => api<Vinculos>('/vinculos') })
  const [codigo, setCodigo] = useState('')

  const atualizar = () => {
    cliente.invalidateQueries({ queryKey: ['vinculos'] })
    cliente.invalidateQueries({ queryKey: ['contextos'] })
  }
  const entrar = useMutation({
    mutationFn: () => api('/vinculos/codigo', { method: 'POST', body: { codigo } }),
    onSuccess: () => {
      setCodigo('')
      atualizar()
    },
  })
  const sair = useMutation({
    mutationFn: (academiaId: number) =>
      api<void>(`/vinculos/academias/${academiaId}`, { method: 'DELETE' }),
    onSuccess: atualizar,
  })
  const erro = entrar.error instanceof ErroApi ? entrar.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    entrar.mutate()
  }

  return (
    <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <h2 className="font-bold">Academias onde você dá aula</h2>
        <p className="text-sm text-slate-500">
          Digite o código de professores que a academia passou para você.
        </p>
      </div>
      <form onSubmit={enviar} className="flex items-end gap-3" noValidate>
        <Campo
          rotulo="Código da academia"
          inputMode="numeric"
          maxLength={7}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className="flex-1"
        />
        <Botao type="submit" carregando={entrar.isPending} disabled={!codigo.trim()}>
          Entrar
        </Botao>
      </form>
      {erro && <Alerta>{erro.message}</Alerta>}
      {entrar.isSuccess && <Alerta tipo="sucesso">Pronto! Escolha a academia no menu.</Alerta>}
      <ul className="divide-y divide-slate-100 text-sm">
        {vinculos.data?.academiasOndeEnsina.map((a) => (
          <li key={a.id} className="flex items-center justify-between py-2">
            <span>{a.nome}</span>
            <Botao
              variante="link"
              onClick={() =>
                confirm(`Sair de ${a.nome}? Você deixa de ver os alunos dela.`) && sair.mutate(a.id)
              }
            >
              Sair
            </Botao>
          </li>
        ))}
      </ul>
    </section>
  )
}
