import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

/**
 * Cópia das últimas respostas da API guardada no aparelho: sem sinal no box, o app abre
 * e mostra os PRs e cargas salvos. Os tokens NÃO ficam aqui (eles vão no SecureStore).
 */
export const persistidor = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'prbox.cache',
  throttleTime: 2000,
})

/** Dados salvos valem por 30 dias; depois disso o app precisa da internet de novo. */
export const VALIDADE_CACHE = 30 * 24 * 60 * 60 * 1000

/** Troque ao mudar o formato dos dados salvos, para descartar caches antigos. */
export const VERSAO_CACHE = '1'

/** Ao sair da conta, nada do usuário anterior pode ficar no aparelho. */
export const apagarCacheOffline = () => persistidor.removeClient()

/** true quando o aparelho está conectado (atualiza sozinho quando a conexão muda). */
export const useOnline = () =>
  useSyncExternalStore(
    (avisar) => onlineManager.subscribe(avisar),
    () => onlineManager.isOnline(),
  )
