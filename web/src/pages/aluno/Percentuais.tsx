import { useState } from 'react'
import { Link } from 'react-router'
import { useUsuario } from '../../auth/sessao.ts'
import { ConviteInstalacao } from '../../components/Instalacao.tsx'
import { Alerta, Carregando } from '../../components/ui.tsx'
import { usePrs } from '../../lib/consultasAluno.ts'
import { formatarKg } from '../../lib/formato.ts'
import type { CategoriaExercicio, ResumoPr } from '../../lib/tipos.ts'
import { BotaoFlutuante, CabecalhoAluno } from './LayoutAluno.tsx'

const filtros: { valor: CategoriaExercicio | null; rotulo: string }[] = [
  { valor: null, rotulo: 'Todos' },
  { valor: 'LEVANTAMENTO', rotulo: 'Levantamentos' },
  { valor: 'OLIMPICO', rotulo: 'Olímpicos' },
]

/** Dashboard do aluno: cargas de 35% a 55% do PR de cada exercício (Figura 2a). */
export function Percentuais() {
  const { data: usuario } = useUsuario()
  const prs = usePrs()
  const [categoria, setCategoria] = useState<CategoriaExercicio | null>(null)

  const visiveis = prs.data?.filter((r) => !categoria || r.exercicio.categoria === categoria) ?? []
  const categoriasComPr = new Set(prs.data?.map((r) => r.exercicio.categoria))

  return (
    <>
      <CabecalhoAluno
        titulo="Percentuais de carga"
        subtitulo={`${usuario?.nome.split(' ')[0]} · calculados a partir dos seus PRs`}
      />
      <section className="space-y-3 p-4">
        <ConviteInstalacao />
        {prs.isPending ? (
          <Carregando />
        ) : prs.error ? (
          <Alerta>{prs.error.message}</Alerta>
        ) : prs.data.length === 0 ? (
          <SemPrs />
        ) : (
          <>
            <div
              className="flex gap-2 overflow-x-auto"
              role="group"
              aria-label="Filtrar por categoria"
            >
              {filtros
                .filter((f) => !f.valor || categoriasComPr.has(f.valor))
                .map((f) => (
                  <button
                    key={f.rotulo}
                    type="button"
                    aria-pressed={categoria === f.valor}
                    onClick={() => setCategoria(f.valor)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                      categoria === f.valor
                        ? 'bg-fundo-escuro text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {f.rotulo}
                  </button>
                ))}
            </div>
            {visiveis.map((resumo) => (
              <CartaoPercentuais key={resumo.exercicio.id} resumo={resumo} />
            ))}
            <BotaoFlutuante para="/aluno/prs/novo">+ Registrar novo PR</BotaoFlutuante>
          </>
        )}
      </section>
    </>
  )
}

function CartaoPercentuais({ resumo }: { resumo: ResumoPr }) {
  const { exercicio, pr, percentuais } = resumo
  return (
    <Link
      to={`/aluno/exercicios/${exercicio.id}`}
      className="block rounded-2xl bg-white p-4 shadow-sm transition active:scale-[0.99]"
    >
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-base font-bold">{exercicio.nome}</h2>
        <p className="text-sm text-slate-500">
          PR <strong className="text-base text-slate-900">{formatarKg(pr.cargaKg)} kg</strong>
        </p>
      </div>
      <ul className="grid grid-cols-5 gap-1.5">
        {percentuais.map(({ percentual, cargaKg }) => (
          <li key={percentual} className="rounded-lg bg-slate-100 py-1.5 text-center">
            <span className="block text-[11px] font-bold text-marca-escura">{percentual}%</span>
            <span className="block text-lg leading-tight font-extrabold tabular-nums">
              {formatarKg(cargaKg)}
            </span>
            <span className="block text-[10px] text-slate-500">kg</span>
          </li>
        ))}
      </ul>
    </Link>
  )
}

function SemPrs() {
  return (
    <div className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-sm">
      <p className="text-lg font-bold">Nenhum PR registrado ainda</p>
      <p className="text-sm text-slate-500">
        Registre a carga máxima do seu último teste de força e o PR Box calcula na hora as cargas de
        35% a 55% para os treinos.
      </p>
      <BotaoFlutuante para="/aluno/prs/novo">+ Registrar meu primeiro PR</BotaoFlutuante>
    </div>
  )
}
