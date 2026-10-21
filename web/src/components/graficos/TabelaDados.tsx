import { type ReactNode, useId, useState } from 'react'

/** Cartão de gráfico com a alternativa em tabela (acessibilidade: nenhum valor fica só no gráfico). */
export function CartaoGrafico({
  titulo,
  subtitulo,
  grafico,
  tabela,
  acoes,
}: {
  titulo: string
  subtitulo?: ReactNode
  grafico: ReactNode
  tabela: ReactNode
  acoes?: ReactNode
}) {
  const [verTabela, setVerTabela] = useState(false)
  const idConteudo = useId()
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5" aria-label={titulo}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-bold">{titulo}</h2>
          {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-3">
          {acoes}
          <button
            type="button"
            className="text-sm font-semibold text-marca-escura hover:underline"
            aria-expanded={verTabela}
            aria-controls={idConteudo}
            onClick={() => setVerTabela((v) => !v)}
          >
            {verTabela ? 'Ver gráfico' : 'Ver tabela'}
          </button>
        </div>
      </div>
      <div id={idConteudo}>{verTabela ? tabela : grafico}</div>
    </section>
  )
}

export function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b-2 border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
          <tr>
            {cabecalho.map((c, i) => (
              <th key={c} className={`px-3 py-2 ${i > 0 ? 'text-right' : ''}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((celulas, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {celulas.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j > 0 ? 'text-right tabular-nums' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
