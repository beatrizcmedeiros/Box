import { useState } from 'react'
import { formatarData } from '../lib/formato.ts'
import type { CodigoVinculo, Validade } from '../lib/tipos.ts'
import { Alerta, Botao } from './ui.tsx'

const VALIDADES: { valor: Validade; rotulo: string }[] = [
  { valor: '15', rotulo: '15 dias' },
  { valor: '30', rotulo: '30 dias' },
  { valor: 'nunca', rotulo: 'Sem validade' },
]

/** "123456" → "123 456", mais fácil de ditar no box. */
const separar = (codigo: string) => `${codigo.slice(0, 3)} ${codigo.slice(3)}`

/** Código de vínculo atual, com a validade e as ações de gerar outro ou desativar. */
export function CartaoCodigo({
  titulo,
  descricao,
  codigo,
  gerando,
  erro,
  aoGerar,
  aoDesativar,
}: {
  titulo: string
  descricao: string
  codigo: CodigoVinculo | null
  gerando: boolean
  erro?: string
  aoGerar: (validade: Validade) => void
  aoDesativar: () => void
}) {
  const [validade, setValidade] = useState<Validade>('30')

  return (
    <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <h2 className="font-bold">{titulo}</h2>
        <p className="text-sm text-slate-500">{descricao}</p>
      </div>

      {codigo ? (
        <div className="rounded-xl bg-slate-100 p-4 text-center">
          <p
            className="text-3xl font-extrabold tracking-[0.2em] tabular-nums"
            aria-label={`Código ${codigo.codigo}`}
          >
            {separar(codigo.codigo)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {codigo.expiraEm
              ? `Vale até ${formatarData(codigo.expiraEm.slice(0, 10))}`
              : 'Sem validade'}
          </p>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-500">
          Nenhum código ativo.
        </p>
      )}

      {erro && <Alerta>{erro}</Alerta>}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Validade</span>
          <select
            value={validade}
            onChange={(e) => setValidade(e.target.value as Validade)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            {VALIDADES.map((v) => (
              <option key={v.valor} value={v.valor}>
                {v.rotulo}
              </option>
            ))}
          </select>
        </label>
        <Botao carregando={gerando} onClick={() => aoGerar(validade)}>
          {codigo ? 'Gerar novo código' : 'Gerar código'}
        </Botao>
        {codigo && (
          <Botao variante="link" onClick={aoDesativar}>
            Desativar
          </Botao>
        )}
      </div>
      {codigo && (
        <p className="text-xs text-slate-500">
          Gerar um novo código desativa o anterior. Quem já se vinculou continua vinculado.
        </p>
      )}
    </section>
  )
}
