import { type BasePr, rotuloBase, useBasePr } from '../lib/basePr.ts'

const OPCOES: BasePr[] = ['ultimo', 'maior']

/** Escolhe se as porcentagens partem do último PR ou do maior PR. */
export function SeletorBasePr({ className = '' }: { className?: string }) {
  const [base, setBase] = useBasePr()
  return (
    <div
      role="group"
      aria-label="Calcular as porcentagens a partir do"
      className={`inline-flex rounded-full bg-slate-200 p-1 ${className}`}
    >
      {OPCOES.map((opcao) => (
        <button
          key={opcao}
          type="button"
          aria-pressed={base === opcao}
          onClick={() => setBase(opcao)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
            base === opcao ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          {rotuloBase(opcao)}
        </button>
      ))}
    </div>
  )
}
