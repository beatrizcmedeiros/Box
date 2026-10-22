import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Alerta, Botao, Campo, Carregando, Selecao } from '../../components/ui.tsx'
import { api } from '../../lib/api.ts'
import { useExercicios, useTurmas } from '../../lib/consultas.ts'
import { formatarData, formatarKg } from '../../lib/formato.ts'
import type { ConsultaPercentuais, LinhaPercentuais } from '../../lib/tipos.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

/** Mesmos percentuais do dashboard do aluno. */
const PERCENTUAIS = [35, 40, 45, 50, 55]

/**
 * Cargas por percentual do PR de vários alunos ao mesmo tempo — para quando o aluno
 * está sem o celular e o treinador precisa consultar rápido, sem abrir um por um.
 */
export function PercentuaisAlunos() {
  const [params, setParams] = useSearchParams()
  const exercicios = useExercicios()
  const turmas = useTurmas()

  const busca = params.get('busca') ?? ''
  const exercicioId = params.get('exercicioId') ?? ''
  const turmaId = params.get('turmaId') ?? ''
  const escolhidos = lerPercentuais(params.get('p'))

  // O texto digitado só vira filtro após uma pausa, para não consultar a cada tecla
  const [textoBusca, setTextoBusca] = useState(busca)
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

  function alterar(mudancas: Record<string, string>) {
    setParams(
      (atual) => {
        const novos = new URLSearchParams(atual)
        for (const [chave, valor] of Object.entries(mudancas)) {
          if (valor) novos.set(chave, valor)
          else novos.delete(chave)
        }
        return novos
      },
      { replace: true },
    )
  }

  function alternarPercentual(percentual: number) {
    const novos = escolhidos.includes(percentual)
      ? escolhidos.filter((p) => p !== percentual)
      : [...escolhidos, percentual].sort((a, b) => a - b)
    if (novos.length === 0) return // sempre fica pelo menos um
    alterar({ p: novos.length === PERCENTUAIS.length ? '' : novos.join(',') })
  }

  const temFiltro = Boolean(busca || exercicioId || turmaId)
  const consultaParams = new URLSearchParams({ percentuais: escolhidos.join(',') })
  if (busca) consultaParams.set('busca', busca)
  if (exercicioId) consultaParams.set('exercicioId', exercicioId)
  if (turmaId) consultaParams.set('turmaId', turmaId)

  const consulta = useQuery({
    queryKey: ['percentuais', consultaParams.toString()],
    queryFn: () => api<ConsultaPercentuais>(`/admin/percentuais?${consultaParams}`),
    placeholderData: keepPreviousData,
    enabled: temFiltro,
  })

  const todos = escolhidos.length === PERCENTUAIS.length
  const dados = consulta.data

  return (
    <>
      <CabecalhoPagina
        titulo="Percentuais de carga"
        subtitulo="Cargas de cada percentual do PR por aluno, turma e exercício"
        acao={
          temFiltro &&
          dados &&
          dados.resultados.length > 0 && (
            <Botao variante="secundario" className="print:hidden" onClick={() => window.print()}>
              Imprimir
            </Botao>
          )
        }
      />

      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm print:hidden">
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

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Percentuais
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Chip ativo={todos} onClick={() => alterar({ p: '' })}>
              Todos
            </Chip>
            {PERCENTUAIS.map((p) => (
              <Chip
                key={p}
                ativo={!todos && escolhidos.includes(p)}
                onClick={() => (todos ? alterar({ p: String(p) }) : alternarPercentual(p))}
              >
                {p}%
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>

      {!temFiltro ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Escolha uma turma, um exercício ou pesquise um aluno para ver as cargas.
        </p>
      ) : consulta.isPending ? (
        <Carregando />
      ) : consulta.error ? (
        <Alerta>{consulta.error.message}</Alerta>
      ) : dados!.resultados.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Nenhum PR encontrado para esses filtros.
        </p>
      ) : (
        <>
          {dados!.limitado && (
            <div className="mb-3">
              <Alerta tipo="info">
                Mostrando os primeiros {dados!.resultados.length} resultados. Filtre por turma ou
                exercício para ver todos.
              </Alerta>
            </div>
          )}
          <p className="mb-2 hidden text-sm font-semibold print:block">
            {[
              exercicios.data?.find((e) => String(e.id) === exercicioId)?.nome ??
                'Todos os exercícios',
              turmas.data?.find((t) => String(t.id) === turmaId)?.nome,
              busca && `Aluno: “${busca}”`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <TabelaPercentuais
            dados={dados!}
            mostrarExercicio={!exercicioId}
            mostrarTurma={!turmaId}
            atualizando={consulta.isPlaceholderData}
          />
          <p className="mt-2 text-xs text-slate-500">
            Cargas arredondadas para múltiplos de 0,5 kg, como no app do aluno.
          </p>
        </>
      )}
    </>
  )
}

function lerPercentuais(texto: string | null): number[] {
  const validos = (texto ?? '')
    .split(',')
    .map(Number)
    .filter((p) => PERCENTUAIS.includes(p))
  return validos.length ? [...new Set(validos)].sort((a, b) => a - b) : PERCENTUAIS
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-bold tabular-nums transition ${
        ativo
          ? 'border-fundo-escuro bg-fundo-escuro text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Uma linha por aluno e exercício. Sem exercício escolhido, as linhas do mesmo aluno
 * ficam agrupadas, com o nome só na primeira.
 */
function TabelaPercentuais({
  dados,
  mostrarExercicio,
  mostrarTurma,
  atualizando,
}: {
  dados: ConsultaPercentuais
  mostrarExercicio: boolean
  mostrarTurma: boolean
  atualizando: boolean
}) {
  const grupos: LinhaPercentuais[][] = []
  for (const linha of dados.resultados) {
    const ultimo = grupos.at(-1)
    if (ultimo && ultimo[0].aluno.id === linha.aluno.id) ultimo.push(linha)
    else grupos.push([linha])
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm print:overflow-visible print:shadow-none">
      <table
        className={`w-full text-left text-sm transition-opacity ${atualizando ? 'opacity-60' : ''}`}
      >
        <caption className="sr-only">
          Cargas por percentual do PR de {dados.totais.alunos} aluno(s)
        </caption>
        <thead className="border-b-2 border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
          <tr>
            <th scope="col" className="sticky left-0 bg-white px-4 py-3">
              Aluno
            </th>
            {mostrarExercicio && (
              <th scope="col" className="px-4 py-3">
                Exercício
              </th>
            )}
            <th scope="col" className="px-4 py-3 text-right">
              PR
            </th>
            {dados.percentuais.map((p) => (
              <th
                key={p}
                scope="col"
                className="bg-orange-50 px-4 py-3 text-right text-marca-escura print:bg-transparent"
              >
                {p}%
              </th>
            ))}
          </tr>
        </thead>
        {grupos.map((grupo) => (
          <tbody key={grupo[0].aluno.id} className="border-b-2 border-slate-100 last:border-0">
            {grupo.map((linha, i) => (
              <tr
                key={linha.exercicio.id}
                className="border-t border-slate-100 whitespace-nowrap first:border-0"
              >
                <th
                  scope="row"
                  className="sticky left-0 bg-white px-4 py-2.5 align-top font-medium"
                >
                  {/* Nome visível só na primeira linha do aluno; nas demais, só para leitores de tela */}
                  <span className={i > 0 ? 'sr-only' : ''}>{linha.aluno.nome}</span>
                  {i === 0 && mostrarTurma && linha.turma && (
                    <span className="block text-xs font-normal text-slate-500">
                      {linha.turma.nome}
                    </span>
                  )}
                </th>
                {mostrarExercicio && <td className="px-4 py-2.5">{linha.exercicio.nome}</td>}
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatarKg(linha.prKg)} kg
                  <span className="block text-xs text-slate-500">
                    {formatarData(linha.dataTeste)}
                  </span>
                </td>
                {linha.cargas.map((c) => (
                  <td
                    key={c.percentual}
                    className="bg-orange-50/60 px-4 py-2.5 text-right text-base font-bold tabular-nums print:bg-transparent"
                  >
                    {formatarKg(c.cargaKg)}
                    <span className="ml-0.5 text-xs font-normal text-slate-500">kg</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}
