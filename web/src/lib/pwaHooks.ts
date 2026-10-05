import { useEffect, useState, useSyncExternalStore } from 'react'

/** true quando o aparelho está com internet (atualiza ao perder/recuperar o sinal). */
export function useOnline() {
  return useSyncExternalStore(
    (avisar) => {
      window.addEventListener('online', avisar)
      window.addEventListener('offline', avisar)
      return () => {
        window.removeEventListener('online', avisar)
        window.removeEventListener('offline', avisar)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}

// Evento do Chrome/Edge/Android que permite mostrar o convite de instalação no momento certo
type EventoInstalacao = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

let eventoGuardado: EventoInstalacao | null = null
const ouvintes = new Set<() => void>()
const avisarOuvintes = () => ouvintes.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // o app mostra o próprio botão "Instalar"
    eventoGuardado = e as EventoInstalacao
    avisarOuvintes()
  })
  window.addEventListener('appinstalled', () => {
    eventoGuardado = null
    avisarOuvintes()
  })
}

const rodandoComoApp = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true)

const ehIos = () =>
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

export type SituacaoInstalacao =
  | { tipo: 'instalado' }
  | { tipo: 'disponivel'; instalar: () => Promise<void> }
  | { tipo: 'ios' } // Safari não tem botão de instalar: mostrar instruções
  | { tipo: 'indisponivel' }

export function useInstalacao(): SituacaoInstalacao {
  const [, forcar] = useState(0)
  useEffect(() => {
    const atualizar = () => forcar((n) => n + 1)
    ouvintes.add(atualizar)
    return () => {
      ouvintes.delete(atualizar)
    }
  }, [])

  if (rodandoComoApp()) return { tipo: 'instalado' }
  if (eventoGuardado) {
    const evento = eventoGuardado
    return {
      tipo: 'disponivel',
      instalar: async () => {
        await evento.prompt()
        await evento.userChoice
        eventoGuardado = null
        avisarOuvintes()
      },
    }
  }
  if (ehIos()) return { tipo: 'ios' }
  return { tipo: 'indisponivel' }
}
