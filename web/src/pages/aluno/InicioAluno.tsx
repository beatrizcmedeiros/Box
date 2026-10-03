import { useLogout, useUsuario } from '../../auth/sessao.ts'
import { Botao } from '../../components/ui.tsx'

/** Tela provisória do aluno — Meus PRs e o dashboard de percentuais chegam na Fase 3. */
export function InicioAluno() {
  const { data: usuario } = useUsuario()
  const logout = useLogout()

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="bg-fundo-escuro px-5 pt-6 pb-5 text-white">
        <p className="text-xs font-bold tracking-[0.2em] text-marca">PR BOX</p>
        <h1 className="mt-1 text-xl font-bold">Olá, {usuario?.nome.split(' ')[0]}</h1>
        <p className="text-sm text-slate-400">{usuario?.turma?.nome ?? 'Sem turma definida'}</p>
      </header>
      <section className="mx-auto w-full max-w-md flex-1 space-y-4 p-5">
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
          <p className="font-semibold">Seus PRs e percentuais aparecerão aqui.</p>
          <p className="mt-1 text-sm text-slate-500">
            Em breve você poderá registrar seus recordes.
          </p>
        </div>
        <Botao
          variante="secundario"
          className="w-full"
          onClick={() => logout.mutate()}
          carregando={logout.isPending}
        >
          Sair
        </Botao>
      </section>
    </main>
  )
}
