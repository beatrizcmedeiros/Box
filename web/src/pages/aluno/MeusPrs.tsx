import { Link } from 'react-router'
import { Alerta, Carregando } from '../../components/ui.tsx'
import { usePrs } from '../../lib/consultasAluno.ts'
import { formatarData, formatarKg } from '../../lib/formato.ts'
import { BotaoFlutuante, CabecalhoAluno } from './LayoutAluno.tsx'

/** Lista dos PRs vigentes por exercício (Figura 1b). */
export function MeusPrs() {
  const prs = usePrs()

  return (
    <>
      <CabecalhoAluno titulo="Meus PRs" subtitulo="Sua carga máxima vigente em cada exercício" />
      <section className="space-y-4 p-4">
        {prs.isPending ? (
          <Carregando />
        ) : prs.error ? (
          <Alerta>{prs.error.message}</Alerta>
        ) : prs.data.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Você ainda não registrou nenhum PR.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl bg-white px-4 shadow-sm">
            {prs.data.map(({ exercicio, pr, novoRecorde }) => (
              <li key={exercicio.id}>
                <Link
                  to={`/aluno/exercicios/${exercicio.id}`}
                  className="flex items-center justify-between py-3.5"
                >
                  <div>
                    <p className="font-semibold">
                      {exercicio.nome}{' '}
                      {novoRecorde && (
                        <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-marca-escura">
                          NOVO PR
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500">Teste em {formatarData(pr.dataTeste)}</p>
                  </div>
                  <p className="text-xl font-extrabold tabular-nums">
                    {formatarKg(pr.cargaKg)}{' '}
                    <span className="text-sm font-semibold text-slate-500">kg</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <BotaoFlutuante para="/aluno/prs/novo">+ Registrar novo PR</BotaoFlutuante>
      </section>
    </>
  )
}
