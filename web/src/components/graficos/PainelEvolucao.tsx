import {
  diasDesdeEpoca,
  formatarData,
  formatarKg,
  formatarMesAno,
  formatarPct,
  isoDeDias,
} from '../../lib/formato.ts'
import type { SerieExercicio } from '../../lib/tipos.ts'
import { COR_DESTAQUE } from './cores.ts'
import { Delta } from './GraficoHalteres.tsx'
import { GraficoLinha, Minigrafico } from './GraficoLinha.tsx'
import { CartaoGrafico, Tabela } from './TabelaDados.tsx'

const kg = (v: number) => `${formatarKg(v)} kg`

/** Indicadores + gráfico de linha + tabela da evolução de um exercício. */
export function PainelEvolucao({ serie, altura }: { serie: SerieExercicio; altura?: number }) {
  const { exercicio, pontos, primeiroKg, atualKg, melhorKg, variacaoKg, variacaoPct } = serie
  const posicoes = pontos.map((p) => diasDesdeEpoca(p.data))
  const unico = pontos.length === 1

  return (
    <div className="@container space-y-3">
      <dl className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
        <Indicador rotulo="PR atual" valor={kg(atualKg)} />
        <Indicador
          rotulo="Primeiro registro"
          valor={kg(primeiroKg)}
          detalhe={formatarData(pontos[0].data)}
        />
        <Indicador
          rotulo="Evolução"
          valor={
            unico
              ? '—'
              : `${variacaoKg > 0 ? '+' : variacaoKg < 0 ? '−' : ''}${kg(Math.abs(variacaoKg))}`
          }
          detalhe={
            unico
              ? 'Registre o próximo teste para comparar'
              : variacaoPct !== null
                ? `${formatarPct(variacaoPct)} desde o primeiro`
                : undefined
          }
        />
        <Indicador
          rotulo="Melhor marca"
          valor={kg(melhorKg)}
          detalhe={`${pontos.length} registro(s)`}
        />
      </dl>

      <CartaoGrafico
        titulo={`Evolução no ${exercicio.nome}`}
        subtitulo="Carga máxima (PR) em cada teste registrado"
        grafico={
          <GraficoLinha
            series={[
              {
                id: String(exercicio.id),
                nome: exercicio.nome,
                cor: COR_DESTAQUE,
                pontos: pontos.map((p) => ({ x: diasDesdeEpoca(p.data), y: p.cargaKg })),
              },
            ]}
            posicoesX={posicoes}
            rotuloX={(x) => formatarMesAno(isoDeDias(x))}
            rotuloXCompleto={(x) => `Teste de ${formatarData(isoDeDias(x))}`}
            formatarY={kg}
            altura={altura}
            descricao={`Evolução no ${exercicio.nome}: de ${kg(primeiroKg)} em ${formatarData(pontos[0].data)} para ${kg(atualKg)} em ${formatarData(pontos.at(-1)!.data)}.`}
          />
        }
        tabela={
          <Tabela
            cabecalho={['Data do teste', 'Carga', 'Variação']}
            linhas={pontos.map((p, i) => [
              formatarData(p.data),
              kg(p.cargaKg),
              <Delta
                key="d"
                valor={i === 0 ? null : Math.round((p.cargaKg - pontos[i - 1].cargaKg) * 100) / 100}
                formatar={kg}
              />,
            ])}
          />
        }
      />
    </div>
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
    <div className="rounded-2xl bg-white px-3 py-2.5 shadow-sm">
      <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{rotulo}</dt>
      <dd className="text-xl font-extrabold">{valor}</dd>
      {detalhe && <dd className="text-[11px] text-slate-500">{detalhe}</dd>}
    </div>
  )
}

/** Cartão de exercício na lista (minigráfico + PR + variação). */
export function CartaoExercicio({
  serie,
  selecionado,
  aoSelecionar,
}: {
  serie: SerieExercicio
  selecionado: boolean
  aoSelecionar: () => void
}) {
  const { exercicio, pontos, atualKg, variacaoKg } = serie
  return (
    <button
      type="button"
      onClick={aoSelecionar}
      aria-pressed={selecionado}
      className={`flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition ${
        selecionado ? 'ring-2 ring-marca-forte' : 'hover:bg-slate-50'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{exercicio.nome}</span>
        <span className="block text-sm text-slate-600">
          {kg(atualKg)} · <Delta valor={pontos.length > 1 ? variacaoKg : null} formatar={kg} />
        </span>
      </span>
      <Minigrafico valores={pontos.map((p) => p.cargaKg)} cor={COR_DESTAQUE} />
    </button>
  )
}
