import type { ReactNode } from 'react'

/** Cabeçalho escuro com a marca, usado no login e no primeiro acesso (Figura 1a). */
export function LayoutPublico({ subtitulo, children }: { subtitulo: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="bg-fundo-escuro px-6 pt-12 pb-9 text-center text-white">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-marca text-2xl font-extrabold">
          PR
        </div>
        <h1 className="text-2xl font-bold">PR Box</h1>
        <p className="mt-1 text-sm text-slate-400">{subtitulo}</p>
      </header>
      <section className="mx-auto w-full max-w-md flex-1 p-6">{children}</section>
    </main>
  )
}
