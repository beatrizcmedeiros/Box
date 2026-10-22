import type { ReactNode } from 'react'

/** Cabeçalho escuro com o logo (kettlebell), usado no login, no cadastro e no primeiro acesso. */
export function LayoutPublico({ subtitulo, children }: { subtitulo: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="bg-fundo-escuro px-6 pt-12 pb-9 text-center text-white">
        <img
          src="/icones/logo.svg"
          alt=""
          className="mx-auto mb-3 size-20"
          width={80}
          height={80}
        />
        <h1 className="text-2xl font-bold">PR Box</h1>
        <p className="mt-1 text-sm text-slate-400">{subtitulo}</p>
      </header>
      <section className="mx-auto w-full max-w-md flex-1 p-6">{children}</section>
    </main>
  )
}
