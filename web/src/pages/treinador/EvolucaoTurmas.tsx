import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { corCategorica, COR_OUTROS } from '../../components/graficos/cores.ts'
import { Delta, GraficoHalteres } from '../../components/graficos/GraficoHalteres.tsx'
import { GraficoLinha, LegendaLinhas, type Serie } from '../../components/graficos/GraficoLinha.tsx'
import { PainelEvolucao } from '../../components/graficos/PainelEvolucao.tsx'
import { CartaoGrafico, Tabela } from '../../components/graficos/TabelaDados.tsx'
import { Alerta, Carregando, Modal, Selecao } from '../../components/ui.tsx'
import { api } from '../../lib/api.ts'
import { useTurmas } from '../../lib/consultas.ts'
import { formatarData, formatarKg, formatarPct } from '../../lib/formato.ts'
import type { Ciclo, EvolucaoTurmas, SerieExercicio, TurmaResumo } from '../../lib/tipos.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

const kg = (v: number) => `${formatarKg(v)} kg`
const semanaCurta = (c: Ciclo) => formatarData(c.semana).replace(/\/(\d{2})(\d{2})$/, '/$2')
const semanaLonga = (c: Ciclo) => `Semana de ${formatarData(c.semana)} · ${c.rotulo}`

/** Evolução por semana de teste de carga: por turma e por aluno. */
export function EvolucaoTurmas() {
  const [params, setParams] = useSearchParams()
  const turmasCadastradas = useTurmas()
  const exercicioId = params.get('exercicioId') ?? ''
  const turmaId = params.get('turmaId') ?? ''
  const [alunoAberto, setAlunoAberto] = useState<number | null>(null)

  const consulta = new URLSearchParams()
  if (exercicioId) consulta.set('exercicioId', exercicioId)
  if (turmaId) consulta.set('turmaId', turmaId)
  const evolucao = useQuery({
    queryKey: ['evolucao', consulta.toString()],
    queryFn: () => api<EvolucaoTurmas>(`/admin/evolucao?${consulta}`),
    placeholderData: keepPreviousData,
  })

  function alterar(chave: string, valor: string) {
    setParams(
      (atual) => {
        const novos = new URLSearchParams(atual)
        if (valor) novos.set(chave, valor)
        else novos.delete(chave)
        return novos
      },
      { replace: true },
    )
  }

  // A cor segue a turma (ordem fixa do cadastro), não a posição no filtro
  const indiceDaTurma = (turma: TurmaResumo | null) =>
    turma ? (turmasCadastradas.data ?? []).findIndex((t) => t.id === turma.id) : -1
  const corDaTurma = (turma: TurmaResumo | null) =>
    turma ? corCategorica(indiceDaTurma(turma)) : COR_OUTROS

  const dados = evolucao.data

  return (
    <>
      <CabecalhoPagina
        titulo="Evolução"
        subtitulo="Compare os testes de carga semestrais por turma e por aluno"
      />

      {/* Filtros: uma linha, acima de tudo o que eles afetam */}
      <div className="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2">
        <Selecao
          rotulo="Exercício"
          value={exercicioId || (dados?.exercicio ? String(dados.exercicio.id) : '')}
          onChange={(e) => alterar('exercicioId', e.target.value)}
        >
          {(dados?.exercicios ?? []).length === 0 && (
            <option value="">Sem testes registrados</option>
          )}
          {dados?.exercicios.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </Selecao>
        <Selecao
          rotulo="Turma"
          value={turmaId}
          onChange={(e) => alterar('turmaId', e.target.value)}
        >
          <option value="">Todas as turmas</option>
          {turmasCadastradas.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </Selecao>
      </div>

      {evolucao.isPending ? (
        <Carregando />
      ) : evolucao.error ? (
        <Alerta>{evolucao.error.message}</Alerta>
      ) : !dados?.exercicio || !dados.resumo ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
          Ainda não há testes de carga para mostrar a evolução. Importe a lista do teste em
          “Importar cargas (PDF)”.
        </p>
      ) : (
        <div
          className={`space-y-4 transition-opacity ${evolucao.isPlaceholderData ? 'opacity-60' : ''}`}
        >
          <Indicadores dados={dados} />
          <GraficoTurmas dados={dados} corDaTurma={corDaTurma} />
          <EvolucaoAlunos dados={dados} aoSelecionar={setAlunoAberto} />
        </div>
      )}

      {alunoAberto !== null && (
        <DetalheAluno
          alunoId={alunoAberto}
          exercicioId={dados?.exercicio?.id ?? null}
          aoFechar={() => setAlunoAberto(null)}
        />
      )}
    </>
  )
}

function Indicadores({ dados }: { dados: EvolucaoTurmas }) {
  const r = dados.resumo!
  const atual = dados.ciclos.at(-1)!
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Indicador
        rotulo="Alunos no último teste"
        valor={String(r.alunosAvaliados)}
        detalhe={semanaLonga(atual)}
      />
      <Indicador
        rotulo="Média do último teste"
        valor={r.mediaAtualKg !== null ? kg(r.mediaAtualKg) : '—'}
        detalhe={
          r.mediaAnteriorKg !== null
            ? `Teste anterior: ${kg(r.mediaAnteriorKg)}`
            : 'Primeiro teste registrado'
        }
      />
      <Indicador
        rotulo="Evolução média"
        valor={
          r.evolucaoMediaKg !== null
            ? `${r.evolucaoMediaKg > 0 ? '+' : r.evolucaoMediaKg < 0 ? '−' : ''}${kg(Math.abs(r.evolucaoMediaKg))}`
            : '—'
        }
        detalhe={
          r.comparaveis > 0
            ? `${r.evolucaoMediaPct !== null ? formatarPct(r.evolucaoMediaPct) + ' · ' : ''}${r.comparaveis} aluno(s) com os dois testes`
            : 'Aparece a partir do segundo teste'
        }
      />
      <Indicador
        rotulo="Evoluíram"
        valor={r.comparaveis > 0 ? `${r.evoluiram} de ${r.comparaveis}` : '—'}
        detalhe={r.comparaveis > 0 ? `${r.mantiveram} mantiveram · ${r.cairam} caíram` : undefined}
      />
    </dl>
  )
}

function Indicador({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string
  valor: string
  detalhe?: string
}) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{rotulo}</dt>
      <dd className="mt-1 text-2xl font-extrabold">{valor}</dd>
      {detalhe && <dd className="text-xs text-slate-500">{detalhe}</dd>}
    </div>
  )
}

function GraficoTurmas({
  dados,
  corDaTurma,
}: {
  dados: EvolucaoTurmas
  corDaTurma: (t: TurmaResumo | null) => string
}) {
  const { ciclos, turmas, exercicio } = dados
  const posicoes = ciclos.map((_, i) => i)
  const series: Serie[] = turmas.map((t) => ({
    id: String(t.turma?.id ?? 'sem-turma'),
    nome: t.turma?.nome ?? 'Sem turma',
    cor: corDaTurma(t.turma),
    pontos: t.porCiclo.map((p, i) => ({ x: i, y: p.mediaKg })),
  }))

  return (
    <CartaoGrafico
      titulo={`Média do ${exercicio!.nome} por semana de teste`}
      subtitulo="Média da melhor carga de cada aluno em cada teste semestral"
      grafico={
        <div className="space-y-3">
          <LegendaLinhas series={series} />
          {ciclos.length === 1 && (
            <p className="text-sm text-slate-500">
              Só há um teste registrado; a linha de evolução aparece a partir do segundo.
            </p>
          )}
          <GraficoLinha
            series={series}
            posicoesX={posicoes}
            escalaX="categorias"
            rotuloX={(i) => semanaCurta(ciclos[i])}
            rotuloXCompleto={(i) => semanaLonga(ciclos[i])}
            formatarY={kg}
            descricao={`Média do ${exercicio!.nome} por turma em ${ciclos.length} semana(s) de teste.`}
          />
        </div>
      }
      tabela={
        <Tabela
          cabecalho={['Turma', ...ciclos.map(semanaCurta)]}
          linhas={turmas.map((t) => [
            t.turma?.nome ?? 'Sem turma',
            ...t.porCiclo.map((p) => (p.mediaKg !== null ? `${kg(p.mediaKg)} (${p.alunos})` : '—')),
          ])}
        />
      }
    />
  )
}

function EvolucaoAlunos({
  dados,
  aoSelecionar,
}: {
  dados: EvolucaoTurmas
  aoSelecionar: (id: number) => void
}) {
  const { alunos, ciclos, resumo } = dados
  const rotuloCiclo = (chave: string | null) => ciclos.find((c) => c.chave === chave)
  return (
    <CartaoGrafico
      titulo="Evolução por aluno"
      subtitulo="Teste anterior → último teste de cada aluno · toque em um aluno para ver todos os exercícios"
      grafico={
        <GraficoHalteres
          linhas={alunos
            .filter((a) => a.ultimoKg !== null)
            .map((a) => ({
              id: a.aluno.id,
              rotulo: a.aluno.nome,
              detalhe: [
                a.turma?.nome,
                a.ultimoCiclo !== resumo!.cicloAtual && rotuloCiclo(a.ultimoCiclo)
                  ? `último teste: ${rotuloCiclo(a.ultimoCiclo)!.rotulo}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · '),
              antes: a.anteriorKg,
              depois: a.ultimoKg!,
              delta: a.variacaoKg,
            }))}
          formatar={kg}
          rotuloAntes="Teste anterior"
          rotuloDepois="Último teste"
          aoSelecionar={aoSelecionar}
        />
      }
      tabela={
        <Tabela
          cabecalho={['Aluno', ...ciclos.map(semanaCurta), 'Variação']}
          linhas={alunos.map((a) => [
            a.aluno.nome,
            ...ciclos.map((c) =>
              a.porCiclo[c.chave] !== undefined ? kg(a.porCiclo[c.chave]) : '—',
            ),
            <Delta key="d" valor={a.variacaoKg} formatar={kg} />,
          ])}
        />
      }
    />
  )
}

function DetalheAluno({
  alunoId,
  exercicioId,
  aoFechar,
}: {
  alunoId: number
  exercicioId: number | null
  aoFechar: () => void
}) {
  const detalhe = useQuery({
    queryKey: ['evolucao', 'aluno', alunoId],
    queryFn: () =>
      api<{
        aluno: { id: number; nome: string; turma: TurmaResumo | null }
        exercicios: SerieExercicio[]
      }>(`/admin/evolucao/alunos/${alunoId}`),
  })
  const [escolhido, setEscolhido] = useState<number | null>(exercicioId)
  const series = detalhe.data?.exercicios ?? []
  const serie = series.find((s) => s.exercicio.id === escolhido) ?? series[0]

  return (
    <Modal
      titulo={detalhe.data ? `Evolução de ${detalhe.data.aluno.nome}` : 'Evolução do aluno'}
      aoFechar={aoFechar}
    >
      {detalhe.isPending ? (
        <Carregando />
      ) : detalhe.error ? (
        <Alerta>{detalhe.error.message}</Alerta>
      ) : !serie ? (
        <p className="text-sm text-slate-600">Este aluno ainda não tem PRs registrados.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Exercício">
            {series.map((s) => (
              <button
                key={s.exercicio.id}
                type="button"
                aria-pressed={s === serie}
                onClick={() => setEscolhido(s.exercicio.id)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  s === serie ? 'bg-fundo-escuro text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {s.exercicio.nome}
              </button>
            ))}
          </div>
          <PainelEvolucao serie={serie} altura={200} />
        </div>
      )}
    </Modal>
  )
}
