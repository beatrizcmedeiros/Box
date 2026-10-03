import { useEffect, useState } from 'react'

type StatusApi = 'carregando' | 'ok' | 'degradado' | 'offline'

const rotulos: Record<StatusApi, string> = {
  carregando: 'Verificando…',
  ok: 'API e banco de dados funcionando',
  degradado: 'API no ar, mas o banco de dados está indisponível',
  offline: 'API fora do ar',
}

const cores: Record<StatusApi, string> = {
  carregando: 'bg-slate-300',
  ok: 'bg-green-500',
  degradado: 'bg-amber-400',
  offline: 'bg-red-500',
}

function App() {
  const [status, setStatus] = useState<StatusApi>('carregando')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json() as Promise<{ status: 'ok' | 'degradado' }>)
      .then((dados) => setStatus(dados.status))
      .catch(() => setStatus('offline'))
  }, [])

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="bg-fundo-escuro px-6 pt-14 pb-10 text-center text-white">
        <div className="mx-auto mb-4 flex size-18 items-center justify-center rounded-2xl bg-marca text-3xl font-extrabold">
          PR
        </div>
        <h1 className="text-2xl font-bold">PR Box</h1>
        <p className="mt-1 text-sm text-slate-400">Seus recordes e cargas de treino sempre à mão</p>
      </header>

      <section className="mx-auto w-full max-w-md flex-1 p-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Status do sistema
          </p>
          <p className="mt-2 flex items-center gap-2 font-medium" role="status">
            <span className={`size-2.5 rounded-full ${cores[status]}`} aria-hidden="true" />
            {rotulos[status]}
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Fase 1 — fundação do projeto</p>
      </section>
    </main>
  )
}

export default App
