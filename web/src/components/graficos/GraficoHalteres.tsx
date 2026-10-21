import { COR_DESTAQUE, COR_SECUNDARIA } from './cores.ts'
import { eixoY } from './escalas.ts'

export type LinhaHalter = {
  id: number
  rotulo: string
  detalhe?: string | null
  antes: number | null
  depois: number
  delta: number | null
}

type Props = {
  linhas: LinhaHalter[]
  formatar: (v: number) => string
  rotuloAntes: string
  rotuloDepois: string
  aoSelecionar?: (id: number) => void
}

/**
 * "Antes → depois" por aluno (dumbbell): um tom para cada teste — anterior em cinza,
 * último no destaque —, ligados por um traço. Os valores ficam sempre visíveis em texto.
 */
export function GraficoHalteres({
  linhas,
  formatar,
  rotuloAntes,
  rotuloDepois,
  aoSelecionar,
}: Props) {
  const valores = linhas.flatMap((l) => (l.antes === null ? [l.depois] : [l.antes, l.depois]))
  const escala = eixoY(valores, 4)
  const pos = (v: number) => ((v - escala.min) / (escala.max - escala.min)) * 100

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 text-xs text-slate-600" aria-label="Legenda">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ background: COR_SECUNDARIA }}
          />
          {rotuloAntes}
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ background: COR_DESTAQUE }}
          />
          {rotuloDepois}
        </li>
      </ul>

      {/* Eixo superior com valores redondos */}
      <div className="grid grid-cols-[minmax(7rem,11rem)_1fr_5.5rem] gap-3 text-[11px] text-slate-500">
        <span />
        <div className="relative h-4">
          {escala.ticks.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2 whitespace-nowrap tabular-nums"
              style={{ left: `${pos(t)}%` }}
            >
              {formatar(t)}
            </span>
          ))}
        </div>
        <span />
      </div>

      <ul>
        {linhas.map((l) => {
          const a = l.antes === null ? null : pos(l.antes)
          const b = pos(l.depois)
          const descricao =
            l.antes === null
              ? `${l.rotulo}: ${formatar(l.depois)} (primeiro teste)`
              : `${l.rotulo}: de ${formatar(l.antes)} para ${formatar(l.depois)}`
          const conteudo = (
            <>
              <span className="truncate text-left">
                <span className="block truncate font-medium text-slate-800">{l.rotulo}</span>
                {l.detalhe && (
                  <span className="block truncate text-[11px] text-slate-500">{l.detalhe}</span>
                )}
              </span>
              <span className="relative h-6" aria-hidden="true">
                {/* grade vertical recessiva */}
                {escala.ticks.map((t) => (
                  <span
                    key={t}
                    className="absolute inset-y-0 w-px bg-slate-100"
                    style={{ left: `${pos(t)}%` }}
                  />
                ))}
                {a !== null && (
                  <span
                    className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded bg-slate-300"
                    style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(b - a)}%` }}
                  />
                )}
                {a !== null && (
                  <span
                    className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                    style={{ left: `${a}%`, background: COR_SECUNDARIA }}
                  />
                )}
                <span
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                  style={{ left: `${b}%`, background: COR_DESTAQUE }}
                />
              </span>
              <span className="text-right text-xs tabular-nums">
                <span className="block font-semibold text-slate-900">{formatar(l.depois)}</span>
                <Delta valor={l.delta} formatar={formatar} />
              </span>
            </>
          )
          const classe =
            'grid w-full grid-cols-[minmax(7rem,11rem)_1fr_5.5rem] items-center gap-3 border-b border-slate-100 py-1.5 last:border-0'
          return (
            <li key={l.id}>
              {aoSelecionar ? (
                <button
                  type="button"
                  className={`${classe} rounded-md text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none`}
                  aria-label={`${descricao}. Ver evolução`}
                  onClick={() => aoSelecionar(l.id)}
                >
                  {conteudo}
                </button>
              ) : (
                <div className={classe} aria-label={descricao}>
                  {conteudo}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Variação com sinal; cor + sinal + texto (nunca só a cor). */
export function Delta({
  valor,
  formatar,
}: {
  valor: number | null
  formatar: (v: number) => string
}) {
  if (valor === null) return <span className="text-[11px] text-slate-500">1º teste</span>
  if (valor === 0) return <span className="text-[11px] text-slate-500">= sem variação</span>
  return valor > 0 ? (
    <span className="text-[11px] font-semibold text-green-800">▲ +{formatar(valor)}</span>
  ) : (
    <span className="text-[11px] font-semibold text-red-700">▼ −{formatar(Math.abs(valor))}</span>
  )
}
