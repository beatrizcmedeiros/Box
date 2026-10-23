import { useSyncExternalStore } from 'react'

/** Base das porcentagens: o último teste (padrão) ou o maior PR já registrado. */
export type BasePr = 'ultimo' | 'maior'

const CHAVE = 'prbox.base-pr'
const ouvintes = new Set<() => void>()

function ler(): BasePr {
  try {
    return localStorage.getItem(CHAVE) === 'maior' ? 'maior' : 'ultimo'
  } catch {
    return 'ultimo'
  }
}

function definir(base: BasePr) {
  try {
    localStorage.setItem(CHAVE, base)
  } catch {
    // Sem armazenamento (ex.: janela anônima): a escolha vale só até recarregar
  }
  ouvintes.forEach((avisar) => avisar())
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar)
  return () => ouvintes.delete(avisar)
}

/** A escolha fica lembrada e vale em todas as telas de porcentagem. */
export function useBasePr() {
  const base = useSyncExternalStore(assinar, ler, (): BasePr => 'ultimo')
  return [base, definir] as const
}

export const rotuloBase = (base: BasePr) => (base === 'maior' ? 'Maior PR' : 'Último PR')
