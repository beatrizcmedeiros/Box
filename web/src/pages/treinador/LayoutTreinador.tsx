import { NavLink, Outlet } from 'react-router'
import { useLogout, useUsuario } from '../../auth/sessao.ts'
import { ProvedorContexto, useContexto } from '../../lib/contexto.tsx'

const itens = [
  { para: '/treinador/visao-geral', rotulo: 'Visão geral' },
  { para: '/treinador/teste-de-carga', rotulo: 'Teste de carga' },
  { para: '/treinador/percentuais', rotulo: 'Percentuais' },
  { para: '/treinador/importar', rotulo: 'Importar cargas (PDF)' },
  { para: '/treinador/consultar', rotulo: 'Consultar cargas' },
  { para: '/treinador/evolucao', rotulo: 'Evolução' },
  { para: '/treinador/alunos', rotulo: 'Alunos' },
  { para: '/treinador/turmas', rotulo: 'Turmas' },
  { para: '/treinador/exercicios', rotulo: 'Exercícios' },
  { para: '/treinador/codigos', rotulo: 'Códigos de vínculo' },
]

/** Área de gestão do professor e da academia. */
export function LayoutTreinador() {
  return (
    <ProvedorContexto>
      <Painel />
    </ProvedorContexto>
  )
}

function Painel() {
  const { data: usuario } = useUsuario()
  const logout = useLogout()
  const ehAcademia = usuario?.tipo === 'ACADEMIA'

  const menu = [
    ...itens,
    ...(ehAcademia ? [{ para: '/treinador/professores', rotulo: 'Professores' }] : []),
    // O professor também é aluno: registra os próprios PRs
    ...(ehAcademia ? [] : [{ para: '/aluno', rotulo: 'Meus PRs' }]),
  ]

  return (
    <div className="min-h-dvh md:flex">
      <aside className="bg-fundo-escuro px-4 print:hidden py-4 text-slate-300 md:flex md:w-60 md:shrink-0 md:flex-col md:py-6">
        <div className="flex items-center justify-between md:block">
          <div>
            <p className="text-base font-extrabold tracking-[0.15em] text-marca">PR BOX</p>
            <p className="text-xs text-slate-400">
              {ehAcademia ? 'Painel da academia' : 'Painel do professor'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 md:hidden"
          >
            Sair
          </button>
        </div>

        <SeletorContexto />

        <nav
          className="-mx-1 mt-4 flex gap-1 overflow-x-auto md:mx-0 md:mt-6 md:flex-col"
          aria-label="Menu de gestão"
        >
          {menu.map(({ para, rotulo }) => (
            <NavLink
              key={para}
              to={para}
              className={({ isActive }) =>
                `shrink-0 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-marca-forte font-semibold text-white' : 'hover:bg-white/10'}`
              }
            >
              {rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden border-t border-white/10 pt-4 md:block">
          <p className="truncate text-sm text-white">{usuario?.nome}</p>
          <p className="truncate text-xs text-slate-400">{usuario?.email}</p>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="mt-3 text-sm text-marca hover:underline"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">
        <Outlet />
      </main>
    </div>
  )
}

/** Onde a pessoa está trabalhando: cada academia ou "Meus alunos". */
function SeletorContexto() {
  const { contexto, contextos, trocar } = useContexto()
  if (contextos.length < 2) {
    return <p className="mt-4 text-sm font-semibold text-white md:mt-6">{contexto.nome}</p>
  }
  return (
    <label className="mt-4 block md:mt-6">
      <span className="text-xs text-slate-400">Trabalhando em</span>
      <select
        value={contexto.id}
        onChange={(e) => trocar(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white"
      >
        {contextos.map((c) => (
          <option key={c.id} value={c.id} className="text-slate-900">
            {c.nome}
          </option>
        ))}
      </select>
    </label>
  )
}

export function CabecalhoPagina({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string
  subtitulo: string
  acao?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <p className="text-sm text-slate-500">{subtitulo}</p>
      </div>
      {acao}
    </div>
  )
}
