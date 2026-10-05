import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Alerta, Botao, Campo, Carregando, Etiqueta, Selecao } from '../../components/ui.tsx'
import { api } from '../../lib/api.ts'
import { useExercicios, useTurmas } from '../../lib/consultas.ts'
import { formatarData, formatarKg } from '../../lib/formato.ts'
import type { ConsultaCargas, OrdenacaoCargas } from '../../lib/tipos.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

const POR_PAGINA = 25

/** Consulta das cargas máximas vigentes com filtros combináveis (Figura 4). */
export function ConsultarCargas() {
  const [params, setParams] = useSearchParams()
  const exercicios = useExercicios()
  const turmas = useTurmas()

  const busca = params.get('busca') ?? ''
  const exercicioId = params.get('exercicioId') ?? ''
  const turmaId = params.get('turmaId') ?? ''
  const ordenar = (params.get('ordenar') as OrdenacaoCargas | null) ?? 'carga'
  const direcao = params.get('direcao') === 'asc' ? 'asc' : 'desc'
  const pagina = Number(params.get('pagina') ?? 1)

  // O texto digitado só vira filtro após uma pausa, para não consultar a cada tecla
  const [textoBusca, setTextoBusca] = useState(busca)
  // Se o filtro mudar por fora (chip removido, "Limpar filtros", voltar no navegador), o campo acompanha
  const [buscaAnterior, setBuscaAnterior] = useState(busca)
  if (busca !== buscaAnterior) {
    setBuscaAnterior(busca)
    setTextoBusca(busca)
  }
  useEffect(() => {
    if (textoBusca.trim() === busca) return
    const espera = setTimeout(() => alterar({ busca: textoBusca.trim() }), 350)
    return () => clearTimeout(espera)
  })

  /** Atualiza os filtros na URL; qualquer mudança de filtro volta para a página 1. */
  function alterar(mudancas: Record<string, string>) {
    setParams(
      (atual) => {
        const novos = new URLSearchParams(atual)
        for (const [chave, valor] of Object.entries(mudancas)) {
          if (valor) novos.set(chave, valor)
          else novos.delete(chave)
        }
        if (!('pagina' in mudancas)) novos.delete('pagina')
        return novos
      },
      { replace: true },
    )
  }

  const consultaParams = new URLSearchParams({
    ordenar,
    direcao,
    pagina: String(pagina),
    porPagina: String(POR_PAGINA),
  })
  if (busca) consultaParams.set('busca', busca)
  if (exercicioId) consultaParams.set('exercicioId', exercicioId)
  if (turmaId) consultaParams.set('turmaId', turmaId)

  const consulta = useQuery({
    queryKey: ['cargas', consultaParams.toString()],
    queryFn: () => api<ConsultaCargas>(`/admin/cargas?${consultaParams}`),
    placeholderData: keepPreviousData,
  })

  const nomeExercicio = exercicios.data?.find((e) => String(e.id) === exercicioId)?.nome
  const nomeTurma = turmas.data?.find((t) => String(t.id) === turmaId)?.nome
  const filtrosAtivos: { rotulo: string; limpar: Record<string, string> }[] = []
  if (busca) filtrosAtivos.push({ rotulo: `Aluno: “${busca}”`, limpar: { busca: '' } })
  if (exercicioId) {
    filtrosAtivos.push({
      rotulo: `Exercício: ${nomeExercicio ?? '…'}`,
      limpar: { exercicioId: '' },
    })
  }
  if (turmaId) filtrosAtivos.push({ rotulo: `Turma: ${nomeTurma ?? '…'}`, limpar: { turmaId: '' } })

  function ordenarPor(coluna: OrdenacaoCargas) {
    const novaDirecao =
      ordenar === coluna
        ? direcao === 'desc'
          ? 'asc'
          : 'desc'
        : coluna === 'aluno'
          ? 'asc'
          : 'desc'
    alterar({ ordenar: coluna, direcao: novaDirecao })
  }

  const dados = consulta.data

  return (
    <>
      <CabecalhoPagina
        titulo="Consultar cargas máximas"
        subtitulo="Combine os filtros por aluno, exercício e turma"
      />

      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo
            rotulo="Aluno"
            type="search"
            placeholder="Nome ou apelido…"
            value={textoBusca}
            onChange={(e) => setTextoBusca(e.target.value)}
          />
          <Selecao
            rotulo="Exercício"
            value={exercicioId}
            onChange={(e) => alterar({ exercicioId: e.target.value })}
          >
            <option value="">Todos</option>
            {exercicios.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
                {e.ativo ? '' : ' (inativo)'}
              </option>
            ))}
          </Selecao>
          <Selecao
            rotulo="Turma"
            value={turmaId}
            onChange={(e) => alterar({ turmaId: e.target.value })}
          >
            <option value="">Todas</option>
            {turmas.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Selecao>
        </div>
        {filtrosAtivos.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Filtros ativos:</span>
            {filtrosAtivos.map((f) => (
              <button
                key={f.rotulo}
                type="button"
                onClick={() => alterar(f.limpar)}
                className="rounded-full bg-fundo-escuro px-3 py-1 font-semibold text-white hover:bg-slate-700"
                aria-label={`Remover filtro ${f.rotulo}`}
              >
                {f.rotulo} ✕
              </button>
            ))}
            <Botao
              variante="link"
              className="ml-auto"
              onClick={() => alterar({ busca: '', exercicioId: '', turmaId: '' })}
            >
              Limpar filtros
            </Botao>
          </div>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3" aria-live="polite">
        <Indicador rotulo="Alunos no filtro" valor={dados ? String(dados.totais.alunos) : '—'} />
        <Indicador
          rotulo="Maior carga"
          valor={
            dados?.totais.maiorCargaKg != null ? `${formatarKg(dados.totais.maiorCargaKg)} kg` : '—'
          }
        />
        <Indicador
          rotulo={nomeTurma ? 'Média da turma' : 'Média'}
          valor={dados?.totais.mediaKg != null ? `${formatarKg(dados.totais.mediaKg)} kg` : '—'}
          dica={!exercicioId ? 'Escolha um exercício para ver a média' : undefined}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {consulta.isPending ? (
          <Carregando />
        ) : consulta.error ? (
          <div className="p-4">
            <Alerta>{consulta.error.message}</Alerta>
          </div>
        ) : dados!.resultados.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Nenhuma carga encontrada para esses filtros.
          </p>
        ) : (
          <table
            className={`w-full min-w-[760px] text-left text-sm transition-opacity ${consulta.isPlaceholderData ? 'opacity-60' : ''}`}
          >
            <thead className="border-b-2 border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <Cabecalho
                  coluna="aluno"
                  ordenar={ordenar}
                  direcao={direcao}
                  aoOrdenar={ordenarPor}
                >
                  Aluno
                </Cabecalho>
                <th className="px-4 py-3">Turma</th>
                <th className="px-4 py-3">Exercício</th>
                <Cabecalho coluna="data" ordenar={ordenar} direcao={direcao} aoOrdenar={ordenarPor}>
                  Data do teste
                </Cabecalho>
                <Cabecalho
                  coluna="carga"
                  ordenar={ordenar}
                  direcao={direcao}
                  aoOrdenar={ordenarPor}
                >
                  Carga máxima
                </Cabecalho>
                <Cabecalho
                  coluna="variacao"
                  ordenar={ordenar}
                  direcao={direcao}
                  aoOrdenar={ordenarPor}
                >
                  Variação
                </Cabecalho>
              </tr>
            </thead>
            <tbody>
              {dados!.resultados.map((r) => (
                <tr
                  key={`${r.aluno.id}-${r.exercicio.id}`}
                  className="border-b border-slate-100 whitespace-nowrap last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{r.aluno.nome}</td>
                  <td className="px-4 py-3">{r.turma?.nome ?? '—'}</td>
                  <td className="px-4 py-3">{r.exercicio.nome}</td>
                  <td className="px-4 py-3">
                    {formatarData(r.dataTeste)}
                    {r.origem === 'ALUNO' && (
                      <span
                        className="block text-xs text-slate-500"
                        title="Registrado pelo próprio aluno"
                      >
                        informado pelo aluno
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold tabular-nums">{formatarKg(r.cargaKg)} kg</td>
                  <td className="px-4 py-3">
                    <Variacao kg={r.variacaoKg} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dados && dados.totalPaginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginação">
          <span className="text-slate-500">
            Página {dados.pagina} de {dados.totalPaginas} · {dados.totais.registros} resultado(s)
          </span>
          <div className="flex gap-2">
            <Botao
              variante="secundario"
              disabled={pagina <= 1}
              onClick={() => alterar({ pagina: String(pagina - 1) })}
            >
              Anterior
            </Botao>
            <Botao
              variante="secundario"
              disabled={pagina >= dados.totalPaginas}
              onClick={() => alterar({ pagina: String(pagina + 1) })}
            >
              Próxima
            </Botao>
          </div>
        </nav>
      )}
    </>
  )
}

function Indicador({ rotulo, valor, dica }: { rotulo: string; valor: string; dica?: string }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{rotulo}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{valor}</p>
      {dica && <p className="text-xs text-slate-500">{dica}</p>}
    </div>
  )
}

function Cabecalho({
  coluna,
  ordenar,
  direcao,
  aoOrdenar,
  children,
}: {
  coluna: OrdenacaoCargas
  ordenar: OrdenacaoCargas
  direcao: 'asc' | 'desc'
  aoOrdenar: (c: OrdenacaoCargas) => void
  children: string
}) {
  const ativo = ordenar === coluna
  return (
    <th
      className="px-4 py-3 whitespace-nowrap"
      aria-sort={ativo ? (direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => aoOrdenar(coluna)}
        className={`inline-flex items-center gap-1 uppercase ${ativo ? 'text-slate-900' : 'hover:text-slate-800'}`}
      >
        {children}
        <span aria-hidden="true" className={ativo ? '' : 'opacity-30'}>
          {ativo && direcao === 'asc' ? '▲' : '▼'}
        </span>
      </button>
    </th>
  )
}

function Variacao({ kg }: { kg: number | null }) {
  if (kg === null) return <span className="text-xs text-slate-400">1º teste</span>
  if (kg === 0) return <Etiqueta cor="amarelo">0 kg</Etiqueta>
  return kg > 0 ? (
    <Etiqueta cor="verde">+{formatarKg(kg)} kg</Etiqueta>
  ) : (
    <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
      −{formatarKg(Math.abs(kg))} kg
    </span>
  )
}
