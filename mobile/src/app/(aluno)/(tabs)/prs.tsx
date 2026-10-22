import { Pressable, Text, View } from 'react-native'
import { abrirExercicio, BotaoRegistrar } from '../../../components/aluno'
import { Alerta, Cartao, Carregando, Tela } from '../../../components/ui'
import { usePrs } from '../../../lib/consultas'
import { formatarData, formatarKg } from '../../../lib/formato'
import { cores } from '../../../lib/tema'

/** PR vigente de cada exercício. */
export default function MeusPrs() {
  const prs = usePrs()

  return (
    <Tela atualizar={{ atualizando: prs.isRefetching, aoPuxar: () => prs.refetch() }}>
      <Text style={{ color: cores.textoSuave }}>Sua carga máxima vigente em cada exercício</Text>
      {prs.isPending ? (
        <Carregando />
      ) : prs.error ? (
        <Alerta>{prs.error.message}</Alerta>
      ) : prs.data.length === 0 ? (
        <Cartao estilo={{ padding: 24 }}>
          <Text style={{ textAlign: 'center', color: cores.textoSuave }}>
            Você ainda não registrou nenhum PR.
          </Text>
        </Cartao>
      ) : (
        <Cartao estilo={{ paddingVertical: 0 }}>
          {prs.data.map(({ exercicio, pr, novoRecorde }, i) => (
            <Pressable
              key={exercicio.id}
              accessibilityRole="button"
              onPress={() => abrirExercicio(exercicio.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: cores.cinzaClaro,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{ flexShrink: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: cores.texto }}>
                    {exercicio.nome}
                  </Text>
                  {novoRecorde && (
                    <Text
                      style={{
                        backgroundColor: cores.marcaClara,
                        color: cores.marcaEscura,
                        fontSize: 11,
                        fontWeight: '700',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                      }}
                    >
                      NOVO PR
                    </Text>
                  )}
                </View>
                <Text style={{ color: cores.textoSuave, fontSize: 14 }}>
                  Teste em {formatarData(pr.dataTeste)}
                </Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: cores.texto }}>
                {formatarKg(pr.cargaKg)}{' '}
                <Text style={{ fontSize: 14, fontWeight: '600', color: cores.textoSuave }}>kg</Text>
              </Text>
            </Pressable>
          ))}
        </Cartao>
      )}
      <BotaoRegistrar />
    </Tela>
  )
}
