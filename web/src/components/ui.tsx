import { type ComponentProps, type ReactNode, useEffect, useId, useState } from 'react'

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center text-sm text-slate-500" role="status">
      {texto}
    </div>
  )
}

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'link'

const estilosBotao: Record<VarianteBotao, string> = {
  primario: 'bg-marca-forte text-white hover:bg-marca-escura',
  secundario: 'border border-fundo-escuro bg-white text-fundo-escuro hover:bg-slate-50',
  perigo: 'bg-red-600 text-white hover:bg-red-700',
  link: 'text-marca-escura underline-offset-2 hover:underline',
}

export function Botao({
  variante = 'primario',
  carregando = false,
  className = '',
  children,
  disabled,
  ...props
}: ComponentProps<'button'> & { variante?: VarianteBotao; carregando?: boolean }) {
  const tamanho = variante === 'link' ? 'text-sm font-semibold' : 'rounded-xl px-4 py-2.5 font-bold'
  return (
    <button
      type="button"
      className={`${tamanho} ${estilosBotao[variante]} transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      disabled={disabled || carregando}
      {...props}
    >
      {carregando ? 'Aguarde…' : children}
    </button>
  )
}

type PropsCampo = ComponentProps<'input'> & { rotulo: string; erro?: string; dica?: string }

export function Campo({ rotulo, erro, dica, className = '', type, ...props }: PropsCampo) {
  const id = useId()
  // Campo de senha: o "olhinho" mostra ou oculta o que foi digitado
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const ehSenha = type === 'password'
  return (
    <div className={className}>
      <label htmlFor={id} className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {rotulo}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={ehSenha && senhaVisivel ? 'text' : type}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro || dica ? `${id}-ajuda` : undefined}
          className={`w-full rounded-xl border bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-marca/40 ${
            erro ? 'border-red-500' : 'border-slate-300'
          } ${ehSenha ? 'pr-11' : ''}`}
          {...props}
        />
        {ehSenha && (
          <button
            type="button"
            onClick={() => setSenhaVisivel((v) => !v)}
            aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={senhaVisivel}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-800"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {senhaVisivel && <path d="M3 3l18 18" />}
            </svg>
          </button>
        )}
      </div>
      {(erro || dica) && (
        <p
          id={`${id}-ajuda`}
          className={`mt-1 text-sm ${erro ? 'text-red-600' : 'text-slate-500'}`}
        >
          {erro ?? dica}
        </p>
      )}
    </div>
  )
}

type PropsSelecao = ComponentProps<'select'> & {
  rotulo: string
  erro?: string
  children: ReactNode
}

export function Selecao({ rotulo, erro, className = '', children, ...props }: PropsSelecao) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {rotulo}
      </label>
      <select
        id={id}
        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-marca/40"
        {...props}
      >
        {children}
      </select>
      {erro && <p className="mt-1 text-sm text-red-600">{erro}</p>}
    </div>
  )
}

export function Alerta({
  tipo = 'erro',
  children,
}: {
  tipo?: 'erro' | 'sucesso' | 'info'
  children: ReactNode
}) {
  const estilos = {
    erro: 'bg-red-50 text-red-700 border-red-200',
    sucesso: 'bg-green-50 text-green-800 border-green-200',
    info: 'bg-amber-50 text-amber-900 border-amber-200',
  }
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={`rounded-xl border px-3 py-2.5 text-sm ${estilos[tipo]}`}
    >
      {children}
    </div>
  )
}

export function Modal({
  titulo,
  aoFechar,
  children,
}: {
  titulo: string
  aoFechar: () => void
  children: ReactNode
}) {
  const idTitulo = useId()

  useEffect(() => {
    const fecharComEsc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', fecharComEsc)
    return () => window.removeEventListener('keydown', fecharComEsc)
  }, [aoFechar])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={idTitulo} className="text-lg font-bold">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Etiqueta({
  cor = 'cinza',
  children,
}: {
  cor?: 'verde' | 'amarelo' | 'cinza'
  children: ReactNode
}) {
  const estilos = {
    verde: 'bg-green-100 text-green-800',
    amarelo: 'bg-amber-100 text-amber-900',
    cinza: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${estilos[cor]}`}>
      {children}
    </span>
  )
}
