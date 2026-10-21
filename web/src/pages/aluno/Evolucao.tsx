import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { CartaoExercicio, PainelEvolucao } from '../../components/graficos/PainelEvolucao.tsx'
import { Alerta, Carregando } from '../../components/ui.tsx'
import { api } from '../../lib/api.ts'
import type { SerieExercicio } from '../../lib/tipos.ts'
import { BotaoFlutuante, CabecalhoAluno } from './LayoutAluno.tsx'

/** Dashboard de evolução do aluno: um gráfico por exercício escolhido + cartões com minigráficos. */
export function Evolucao() {
  const [params, setParams] = useSearchParams()
  const evolucao = useQuery({
    queryKey: ['prs', 'evolucao'],
    queryFn: () => api<{ exercicios: SerieExercicio[] }>('/me/evolucao'),
  })

  const series = evolucao.data?.exercicios ?? []
  const idEscolhido = Number(params.get('exercicio'))
  const escolhida = series.find((s) => s.exercicio.id === idEscolhido) ?? series[0]

  return (
    <>
      <CabecalhoAluno titulo="Evolução" subtitulo="Como seus PRs mudaram a cada teste" />
      <section className="space-y-4 p-4">
        {evolucao.isPending ? (
          <Carregando />
        ) : evolucao.error ? (
          <Alerta>{evolucao.error.message}</Alerta>
        ) : series.length === 0 ? (
          <div className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-lg font-bold">Ainda não há evolução para mostrar</p>
            <p className="text-sm text-slate-600">
              Registre seus PRs a cada teste de carga e acompanhe aqui a sua progressão em cada
              exercício.
            </p>
            <BotaoFlutuante para="/aluno/prs/novo">+ Registrar PR</BotaoFlutuante>
          </div>
        ) : (
          <>
            <PainelEvolucao serie={escolhida} />
            <h2 className="pt-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Todos os exercícios
            </h2>
            <ul className="space-y-2">
              {series.map((s) => (
                <li key={s.exercicio.id}>
                  <CartaoExercicio
                    serie={s}
                    selecionado={s === escolhida}
                    aoSelecionar={() => {
                      setParams({ exercicio: String(s.exercicio.id) }, { replace: true })
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  )
}
