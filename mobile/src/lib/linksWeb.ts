import { Linking } from 'react-native'

/**
 * Endereço público da versão web (ex.: https://prbox.com.br), definido no eas.json.
 * A política de privacidade e as instruções de exclusão de conta ficam lá (exigência da
 * Google Play). Sem o endereço, os links não aparecem.
 */
export const URL_WEB = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/+$/, '') || null

export const abrirNaWeb = (caminho: '/privacidade' | '/excluir-conta') => {
  if (URL_WEB) Linking.openURL(`${URL_WEB}${caminho}`).catch(() => undefined)
}
