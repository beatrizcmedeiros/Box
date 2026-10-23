import { Pressable, Text, View } from 'react-native'
import { type BasePr, rotuloBase, useBasePr } from '../lib/basePr'
import { cores } from '../lib/tema'

const OPCOES: BasePr[] = ['ultimo', 'maior']

/** Escolhe se as porcentagens partem do último PR ou do maior PR. */
export function SeletorBasePr() {
  const [base, setBase] = useBasePr()
  return (
    <View
      accessibilityLabel="Calcular as porcentagens a partir do"
      style={{
        flexDirection: 'row',
        alignSelf: 'flex-start',
        padding: 4,
        borderRadius: 999,
        backgroundColor: '#e2e8f0',
      }}
    >
      {OPCOES.map((opcao) => {
        const ativo = base === opcao
        return (
          <Pressable
            key={opcao}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            onPress={() => setBase(opcao)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: ativo ? cores.branco : 'transparent',
            }}
          >
            <Text style={{ fontWeight: '600', color: ativo ? cores.texto : '#475569' }}>
              {rotuloBase(opcao)}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
