import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Alerta, Botao, Carregando } from '../../components/ui.tsx'
import { api, ErroApi } from '../../lib/api.ts'
import { useDetalhePr } from '../../lib/consultasAluno.ts'
import { formatarData, formatarKg } from '../../lib/formato.ts'
import type { Lancamento } from '../../lib/tipos.ts'
import { BotaoFlutuante, CabecalhoAluno } from './LayoutAluno.tsx'

/** PR atual, tabela de percentuais e histórico de testes de um exercício (Figura 2b). */
export function DetalheExercicio() {
  const exercicioId = Number(useParams().id)
  const { state, pathname } = useLocation()
  const navegar = useNavigate()
  const detalhe = useDetalhePr(exercicioId)
  const cliente = useQueryClient()

  const excluir = useMutation({
    mutationFn: (lancamento: Lancamento) =>
      api<void>(`/me/prs/lancamentos/${lancamento.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      // Remove o aviso "PR registrado!" que veio da tela anterior
      navegar(pathname, { replace: true, state: null })
      cliente.invalidateQueries({ queryKey: ['prs'] })
    },
  })

  if (detalhe.isPending) return <Carregando />
  if (detalhe.error) {
    const naoEncontrado = detalhe.error instanceof ErroApi && detalhe.error.status === 404
    return (
      <>
        <CabecalhoAluno titulo="Exercício" voltarPara="/aluno/percentuais" />
        <div className="space-y-4 p-4">
          <Alerta>
            {naoEncontrado ? 'Não há PR registrado para este exercício.' : detalhe.error.message}
          </Alerta>
          <BotaoFlutuante para={`/aluno/prs/novo?exercicio=${exercicioId}`}>
            + Registrar PR
          </BotaoFlutuante>
        </div>
      </>
    )
  }

  const { exercicio, pr, percentuais, novoRecorde, diferencaKg, historico } = detalhe.data
  const maior = percentuais.at(-1)!.cargaKg

  return (
    <>
      <CabecalhoAluno
        titulo={exercicio.nome}
        subtitulo="Detalhe do exercício"
        voltarPara="/aluno/percentuais"
      />
      <section className="space-y-3 p-4">
        {(state as { salvo?: boolean } | null)?.salvo && (
          <Alerta tipo="sucesso">PR registrado!</Alerta>
        )}

        <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">PR atual</p>
          <p className="mt-1 text-5xl font-extrabold tabular-nums">
            {formatarKg(pr.cargaKg)} <span className="text-xl text-slate-500">kg</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Teste de carga em {formatarData(pr.dataTeste)}
          </p>
          {diferencaKg !== null && diferencaKg !== 0 && (
            <p
              className={`mt-2 text-sm font-semibold ${novoRecorde ? 'text-green-700' : 'text-slate-600'}`}
            >
              {novoRecorde ? 'Novo recorde! ' : ''}
              {diferencaKg > 0 ? '+' : '−'}
              {formatarKg(Math.abs(diferencaKg))} kg em relação ao teste anterior
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Cargas por percentual
          </h2>
          <ul>
            {percentuais.map(({ percentual, cargaKg }) => (
              <li
                key={percentual}
                className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0"
              >
                <span className="w-11 text-lg font-bold text-marca-escura">{percentual}%</span>
                <span className="h-2 flex-1 rounded-full bg-slate-100" aria-hidden="true">
                  <span
                    className="block h-full rounded-full bg-marca"
                    style={{ width: `${(cargaKg / maior) * 100}%` }}
                  />
                </span>
                <span className="w-20 text-right text-lg font-extrabold tabular-nums">
                  {formatarKg(cargaKg)} kg
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Valores arredondados para o múltiplo de 0,5 kg mais próximo.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Histórico de testes
          </h2>
          {excluir.error && <Alerta>{excluir.error.message}</Alerta>}
          <ul>
            {historico.map((lancamento) => (
              <li
                key={lancamento.id}
                className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0"
              >
                <span>
                  {formatarData(lancamento.dataTeste)}
                  {lancamento.origem === 'IMPORTACAO' && (
                    <span className="ml-2 text-xs text-slate-500">(treinador)</span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <strong className="tabular-nums">{formatarKg(lancamento.cargaKg)} kg</strong>
                  {lancamento.origem === 'ALUNO' && (
                    <Botao
                      variante="link"
                      className="!text-red-600"
                      aria-label={`Excluir lançamento de ${formatarData(lancamento.dataTeste)}`}
                      onClick={() =>
                        confirm(
                          `Excluir o lançamento de ${formatarKg(lancamento.cargaKg)} kg em ${formatarData(lancamento.dataTeste)}?`,
                        ) && excluir.mutate(lancamento)
                      }
                    >
                      Excluir
                    </Botao>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <BotaoFlutuante para={`/aluno/prs/novo?exercicio=${exercicio.id}`}>
          + Registrar novo PR
        </BotaoFlutuante>
        <Link
          to="/aluno/percentuais"
          className="block text-center text-sm font-semibold text-slate-600"
        >
          Ver todos os percentuais
        </Link>
      </section>
    </>
  )
}
