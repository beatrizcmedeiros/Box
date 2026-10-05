import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Registra o service worker e avisa quando há uma versão nova do app
 * (a atualização só acontece quando a pessoa aceita, para não recarregar no meio do uso).
 */
export function AvisosPwa() {
  const {
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    offlineReady: [prontoOffline, setProntoOffline],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      // Procura atualização a cada hora enquanto o app fica aberto
      if (registro) setInterval(() => registro.update(), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (!prontoOffline) return
    const fechar = setTimeout(() => setProntoOffline(false), 5000)
    return () => clearTimeout(fechar)
  }, [prontoOffline, setProntoOffline])

  if (!precisaAtualizar && !prontoOffline) return null

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-fundo-escuro px-4 py-3 text-sm text-white shadow-xl md:bottom-6"
    >
      {precisaAtualizar ? (
        <>
          <p className="flex-1">Nova versão do PR Box disponível.</p>
          <button
            type="button"
            className="rounded-lg bg-marca-forte px-3 py-1.5 font-bold"
            onClick={() => updateServiceWorker(true)}
          >
            Atualizar
          </button>
          <button
            type="button"
            className="px-1 text-slate-300"
            onClick={() => setPrecisaAtualizar(false)}
          >
            Agora não
          </button>
        </>
      ) : (
        <p className="flex-1">Pronto! O PR Box agora também funciona sem internet.</p>
      )}
    </div>
  )
}
