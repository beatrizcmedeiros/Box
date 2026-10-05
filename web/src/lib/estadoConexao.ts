import { useSyncExternalStore } from 'react'

// Quando a API não responde, o service worker entrega a última cópia salva (com o cabeçalho
// "x-prbox-offline"). Aqui fica registrado de quando são esses dados, para avisar o aluno.

let dadosSalvosEm: string | null = null
const ouvintes = new Set<() => void>()

export function registrarOrigemDaResposta(resposta: Response) {
  const doCache = resposta.headers.get('x-prbox-offline') === '1'
  const novo = doCache ? (resposta.headers.get('date') ?? new Date().toUTCString()) : null
  // Resposta nova da rede limpa o aviso; resposta do cache mantém a data mais antiga exibida
  if (doCache && dadosSalvosEm) return
  if (novo === dadosSalvosEm) return
  dadosSalvosEm = novo
  ouvintes.forEach((avisar) => avisar())
}

/** Data (texto HTTP) dos dados salvos em exibição, ou null se os dados vieram da rede. */
export function useDadosSalvosEm() {
  return useSyncExternalStore(
    (avisar) => {
      ouvintes.add(avisar)
      return () => ouvintes.delete(avisar)
    },
    () => dadosSalvosEm,
    () => null,
  )
}
