import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { useDadosSalvosEm } from '../../lib/estadoConexao.ts'
import { useOnline } from '../../lib/pwaHooks.ts'

const abas = [
  {
    para: '/aluno/percentuais',
    rotulo: 'Percentuais',
    icone: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
  {
    para: '/aluno/prs',
    rotulo: 'Meus PRs',
    icone: <path d="M6 4v16M18 4v16M2 8v8M22 8v8M6 12h12" />,
  },
  {
    para: '/aluno/perfil',
    rotulo: 'Perfil',
    icone: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </>
    ),
  },
]

/** Estrutura das telas do aluno: conteúdo + barra de abas inferior (Figuras 1 e 2). */
export function LayoutAluno() {
  const online = useOnline()
  const dadosSalvosEm = useDadosSalvosEm()
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-fundo">
      {(!online || dadosSalvosEm) && (
        <p
          role="status"
          className="sticky top-0 z-40 bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950"
        >
          Sem conexão — mostrando seus dados salvos
          {dadosSalvosEm &&
            ` de ${new Date(dadosSalvosEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`}
        </p>
      )}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <nav
        aria-label="Navegação do aluno"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-lg border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        {abas.map(({ para, rotulo, icone }) => (
          <NavLink
            key={para}
            to={para}
            end={para === '/aluno/prs'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                isActive ? 'font-bold text-marca-escura' : 'text-slate-500'
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {icone}
            </svg>
            {rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function CabecalhoAluno({
  titulo,
  subtitulo,
  voltarPara,
}: {
  titulo: string
  subtitulo?: ReactNode
  voltarPara?: string
}) {
  return (
    <header className="bg-fundo-escuro px-5 pt-5 pb-5 text-white">
      <div className="flex items-center gap-3">
        {voltarPara && (
          <Link
            to={voltarPara}
            aria-label="Voltar"
            className="-ml-2 rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        )}
        <p className="text-xs font-bold tracking-[0.2em] text-marca">PR BOX</p>
      </div>
      <h1 className="mt-1 text-2xl font-bold">{titulo}</h1>
      {subtitulo && <p className="mt-0.5 text-sm text-slate-400">{subtitulo}</p>}
    </header>
  )
}

export function BotaoFlutuante({ para, children }: { para: string; children: ReactNode }) {
  return (
    <Link
      to={para}
      className="block rounded-xl bg-marca-forte px-4 py-3 text-center font-bold text-white transition hover:bg-marca-escura"
    >
      {children}
    </Link>
  )
}
