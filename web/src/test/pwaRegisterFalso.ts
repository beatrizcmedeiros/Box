// Substitui "virtual:pwa-register/react" nos testes (o módulo real só existe no build do Vite).
import { useState } from 'react'

export function useRegisterSW() {
  const precisaAtualizar = useState(false)
  const prontoOffline = useState(false)
  return {
    needRefresh: precisaAtualizar,
    offlineReady: prontoOffline,
    updateServiceWorker: async () => {},
  }
}
