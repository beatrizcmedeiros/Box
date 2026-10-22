import { Text } from 'react-native'
import { Alerta, Botao, Cartao, Tela } from '../components/ui'
import { useLogout, useUsuario } from '../lib/sessao'
import { cores } from '../lib/tema'

/** A área do treinador chega ao app na Fase 2 do plano; até lá, fica na versão web. */
export default function AreaTreinador() {
  const { data: usuario } = useUsuario()
  const logout = useLogout()

  return (
    <Tela>
      <Cartao estilo={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: cores.texto }}>
          Olá, {usuario?.nome.split(' ')[0]}!
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: cores.textoSuave }}>
          As telas do treinador (visão geral, teste de carga, percentuais, alunos e importação)
          estão chegando ao app. Por enquanto, use a versão web do PR Box. Os dados são os mesmos
          nos dois.
        </Text>
      </Cartao>
      {logout.error && <Alerta>{logout.error.message}</Alerta>}
      <Botao
        variante="secundario"
        aoPressionar={() => logout.mutate()}
        carregando={logout.isPending}
      >
        Sair
      </Botao>
    </Tela>
  )
}
