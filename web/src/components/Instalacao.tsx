import { useState } from 'react'
import { useInstalacao } from '../lib/pwaHooks.ts'
import { Botao } from './ui.tsx'

const CHAVE_DISPENSADO = 'prbox:convite-instalacao-dispensado'

function lerDispensado() {
  try {
    return localStorage.getItem(CHAVE_DISPENSADO) === '1'
  } catch {
    return false
  }
}

/** Convite discreto no dashboard do aluno; some quando instalado ou dispensado. */
export function ConviteInstalacao() {
  const instalacao = useInstalacao()
  const [dispensado, setDispensado] = useState(lerDispensado)

  if (dispensado || (instalacao.tipo !== 'disponivel' && instalacao.tipo !== 'ios')) return null

  function dispensar() {
    setDispensado(true)
    try {
      localStorage.setItem(CHAVE_DISPENSADO, '1')
    } catch {
      // sem armazenamento local: o convite volta na próxima visita
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-marca font-extrabold text-white">
        PR
      </div>
      <p className="flex-1">
        {instalacao.tipo === 'ios'
          ? 'Adicione o PR Box à tela de início para abrir como app — veja como em Perfil.'
          : 'Instale o PR Box no celular e veja suas cargas mesmo sem sinal no box.'}
      </p>
      {instalacao.tipo === 'disponivel' && (
        <Botao className="!px-3 !py-1.5 text-sm" onClick={() => instalacao.instalar()}>
          Instalar
        </Botao>
      )}
      <button
        type="button"
        onClick={dispensar}
        className="px-1 text-slate-500"
        aria-label="Dispensar convite"
      >
        ✕
      </button>
    </div>
  )
}

/** Seção do Perfil: botão de instalar ou instruções para iPhone. */
export function SecaoInstalacao() {
  const instalacao = useInstalacao()

  return (
    <div className="space-y-2 rounded-2xl bg-white p-4 text-sm shadow-sm">
      <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        App no celular
      </h2>
      {instalacao.tipo === 'instalado' && <p>O PR Box está instalado neste aparelho. ✓</p>}
      {instalacao.tipo === 'disponivel' && (
        <>
          <p>
            Instale o PR Box para abrir direto da tela inicial e ver suas cargas mesmo sem internet.
          </p>
          <Botao className="w-full" onClick={() => instalacao.instalar()}>
            Instalar o PR Box
          </Botao>
        </>
      )}
      {instalacao.tipo === 'ios' && (
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Abra este site no <strong>Safari</strong>.
          </li>
          <li>
            Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).
          </li>
          <li>
            Escolha <strong>Adicionar à Tela de Início</strong> e confirme.
          </li>
        </ol>
      )}
      {instalacao.tipo === 'indisponivel' && (
        <p>
          No celular, abra o PR Box no Chrome (Android) ou no Safari (iPhone) para instalar o app na
          tela inicial.
        </p>
      )}
    </div>
  )
}
