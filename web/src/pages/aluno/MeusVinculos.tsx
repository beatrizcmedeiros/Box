import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Alerta, Botao, Campo, Carregando } from '../../components/ui.tsx'
import { api, ErroApi } from '../../lib/api.ts'
import type { Vinculos } from '../../lib/tipos.ts'
import { CabecalhoAluno } from './LayoutAluno.tsx'

type ResultadoCodigo =
  | { tipo: 'academia'; academia: { nome: string } }
  | { tipo: 'professor'; professor: { nome: string } }
  | { tipo: 'professor_da_academia'; academia: { nome: string } }

const mensagemDe = (r: ResultadoCodigo) =>
  r.tipo === 'academia'
    ? `Pronto! Você está vinculado a ${r.academia.nome}.`
    : r.tipo === 'professor'
      ? `Pronto! ${r.professor.nome} passa a acompanhar os seus PRs.`
      : `Pronto! Você agora é professor de ${r.academia.nome}.`

/** Academias e professores que acompanham os PRs do aluno; vincular por código ou desfazer. */
export function MeusVinculos() {
  const cliente = useQueryClient()
  const vinculos = useQuery({ queryKey: ['vinculos'], queryFn: () => api<Vinculos>('/vinculos') })
  const [codigo, setCodigo] = useState('')

  const atualizar = () => {
    cliente.invalidateQueries({ queryKey: ['vinculos'] })
    // Exercícios da academia ou do professor passam a aparecer (ou somem) ao registrar PR
    cliente.invalidateQueries({ queryKey: ['exercicios-ativos'] })
    cliente.invalidateQueries({ queryKey: ['contextos'] })
  }

  const usar = useMutation({
    mutationFn: () =>
      api<ResultadoCodigo>('/vinculos/codigo', { method: 'POST', body: { codigo } }),
    onSuccess: () => {
      setCodigo('')
      atualizar()
    },
  })
  const desfazer = useMutation({
    mutationFn: (id: number) => api<void>(`/vinculos/${id}`, { method: 'DELETE' }),
    onSuccess: atualizar,
  })
  const erro = usar.error instanceof ErroApi ? usar.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    usar.mutate()
  }

  return (
    <>
      <CabecalhoAluno titulo="Vínculos" subtitulo="Quem acompanha os seus PRs" />
      <section className="space-y-4 p-4">
        <form onSubmit={enviar} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" noValidate>
          <p className="text-sm text-slate-600">
            Recebeu um código do seu box ou do seu professor? Digite aqui para ele acompanhar os
            seus PRs.
          </p>
          <Campo
            rotulo="Código de vínculo"
            inputMode="numeric"
            placeholder="Ex.: 482 913"
            maxLength={7}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            erro={erro?.doCampo('codigo')}
          />
          {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
          {usar.data && <Alerta tipo="sucesso">{mensagemDe(usar.data)}</Alerta>}
          <Botao
            type="submit"
            className="w-full"
            carregando={usar.isPending}
            disabled={!codigo.trim()}
          >
            Vincular
          </Botao>
        </form>

        {vinculos.isPending ? (
          <Carregando />
        ) : vinculos.error ? (
          <Alerta>{vinculos.error.message}</Alerta>
        ) : vinculos.data.comoAluno.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Você ainda não tem vínculos. Seus PRs ficam só com você.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl bg-white px-4 shadow-sm">
            {desfazer.error && <Alerta>{desfazer.error.message}</Alerta>}
            {vinculos.data.comoAluno.map((v) => {
              const nome = v.academia?.nome ?? v.professor?.nome ?? ''
              return (
                <li key={v.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{nome}</p>
                    <p className="text-sm text-slate-500">
                      {v.tipo === 'academia' ? 'Academia' : 'Professor'}
                      {v.turma ? ` · ${v.turma.nome}` : ''}
                    </p>
                  </div>
                  <Botao
                    variante="link"
                    className="!text-red-600"
                    onClick={() =>
                      confirm(
                        `Desfazer o vínculo com ${nome}? Os seus PRs continuam com você, mas ${nome} deixa de vê-los.`,
                      ) && desfazer.mutate(v.id)
                    }
                  >
                    Desfazer
                  </Botao>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
