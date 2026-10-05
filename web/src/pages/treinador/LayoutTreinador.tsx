import { NavLink, Outlet } from 'react-router'
import { useLogout, useUsuario } from '../../auth/sessao.ts'

const itens = [
  { para: '/treinador/importar', rotulo: 'Importar cargas (PDF)' },
  { para: '/treinador/consultar', rotulo: 'Consultar cargas' },
  { para: '/treinador/alunos', rotulo: 'Alunos' },
  { para: '/treinador/turmas', rotulo: 'Turmas' },
  { para: '/treinador/exercicios', rotulo: 'Exercícios' },
]

export function LayoutTreinador() {
  const { data: usuario } = useUsuario()
  const logout = useLogout()

  return (
    <div className="min-h-dvh md:flex">
      <aside className="bg-fundo-escuro px-4 py-4 text-slate-300 md:flex md:w-60 md:shrink-0 md:flex-col md:py-6">
        <div className="flex items-center justify-between md:block">
          <div>
            <p className="text-base font-extrabold tracking-[0.15em] text-marca">PR BOX</p>
            <p className="text-xs text-slate-400">Painel do Treinador</p>
          </div>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 md:hidden"
          >
            Sair
          </button>
        </div>

        <nav
          className="-mx-1 mt-4 flex gap-1 overflow-x-auto md:mx-0 md:mt-8 md:flex-col"
          aria-label="Menu do treinador"
        >
          {itens.map(({ para, rotulo }) => (
            <NavLink
              key={para}
              to={para}
              className={({ isActive }) =>
                `shrink-0 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-marca font-semibold text-white' : 'hover:bg-white/10'}`
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

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
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
