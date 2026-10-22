import { Text, View } from 'react-native'
import { Alerta, Botao, Cartao, TelaPublica } from '../../components/ui'
import { useAceitarTermo, useLogout } from '../../lib/sessao'
import { cores } from '../../lib/tema'

const paragrafo = { fontSize: 14, lineHeight: 21, color: '#334155' } as const

/** Termo de consentimento (LGPD), com o mesmo conteúdo da versão web. */
export default function Termo() {
  const aceitar = useAceitarTermo()
  const logout = useLogout()

  return (
    <TelaPublica subtitulo="Termo de consentimento para uso dos dados">
      <Cartao estilo={{ gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>
          Como o PR Box usa seus dados
        </Text>
        <Text style={paragrafo}>
          Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), informamos que
          o PR Box armazena apenas os dados necessários para o seu funcionamento:
        </Text>
        <View style={{ gap: 4, paddingLeft: 8 }}>
          <Text style={paragrafo}>• nome, e-mail e turma, para identificar você no box;</Text>
          <Text style={paragrafo}>
            • exercícios, datas dos testes de carga e cargas máximas (PRs), para calcular as cargas
            dos treinos.
          </Text>
        </View>
        <Text style={paragrafo}>
          Esses dados são visíveis apenas para você e para os treinadores do seu box, não são
          compartilhados com terceiros e a senha é armazenada de forma criptografada.
        </Text>
        <Text style={paragrafo}>
          Você pode pedir a correção dos seus dados ao seu treinador e excluir sua conta a qualquer
          momento em Perfil → Excluir minha conta. A exclusão remove definitivamente sua conta e seu
          histórico de testes.
        </Text>
      </Cartao>
      {aceitar.error && <Alerta>{aceitar.error.message}</Alerta>}
      <Botao aoPressionar={() => aceitar.mutate()} precisaInternet carregando={aceitar.isPending}>
        Li e aceito
      </Botao>
      <Botao variante="link" aoPressionar={() => logout.mutate()}>
        Não aceito — sair
      </Botao>
    </TelaPublica>
  )
}
