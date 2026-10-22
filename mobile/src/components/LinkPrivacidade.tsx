import { Text } from 'react-native'
import { abrirNaWeb, URL_WEB } from '../lib/linksWeb'
import { cores } from '../lib/tema'

/** Link para a política de privacidade na versão web (só aparece com o endereço configurado). */
export function LinkPrivacidade() {
  if (!URL_WEB) return null
  return (
    <Text
      accessibilityRole="link"
      onPress={() => abrirNaWeb('/privacidade')}
      style={{
        textAlign: 'center',
        fontSize: 13,
        color: cores.textoSuave,
        textDecorationLine: 'underline',
      }}
    >
      Política de privacidade
    </Text>
  )
}
