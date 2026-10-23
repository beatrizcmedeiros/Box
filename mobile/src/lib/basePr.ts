import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'

/** Base das porcentagens: o último teste (padrão) ou o maior PR já registrado. */
export type BasePr = 'ultimo' | 'maior'

const CHAVE = 'prbox.base-pr'
const ouvintes = new Set<() => void>()
let atual: BasePr = 'ultimo'

const avisar = () => ouvintes.forEach((ouvinte) => ouvinte())

// A escolha salva é lida uma vez, ao abrir o app
AsyncStorage.getItem(CHAVE)
  .then((salvo) => {
    if (salvo === 'maior') {
      atual = 'maior'
      avisar()
    }
  })
  .catch(() => undefined)

function definir(base: BasePr) {
  atual = base
  avisar()
  AsyncStorage.setItem(CHAVE, base).catch(() => undefined)
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

/** A escolha fica lembrada e vale em todas as telas de porcentagem. */
export function useBasePr() {
  const base = useSyncExternalStore(assinar, () => atual)
  return [base, definir] as const
}

export const rotuloBase = (base: BasePr) => (base === 'maior' ? 'Maior PR' : 'Último PR')
