import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatarKg } from '../lib/formato'
import { cores } from '../lib/tema'
import type { ResumoPr } from '../lib/tipos'
import { Botao, Cartao } from './ui'

/** Botão principal "Registrar PR", opcionalmente já com o exercício escolhido. */
export function BotaoRegistrar({
  texto = '+ Registrar novo PR',
  exercicioId,
}: {
  texto?: string
  exercicioId?: number
}) {
  return (
    <Botao
      aoPressionar={() =>
        router.push(
          exercicioId
            ? { pathname: '/registrar', params: { exercicio: String(exercicioId) } }
            : '/registrar',
        )
      }
    >
      {texto}
    </Botao>
  )
}

export const abrirExercicio = (id: number) =>
  router.push({ pathname: '/exercicio/[id]', params: { id: String(id) } })

/** Cartão com o PR e as cargas de 35% a 55% de um exercício. */
export function CartaoPercentuais({ resumo }: { resumo: ResumoPr }) {
  const { exercicio, pr, percentuais } = resumo
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${exercicio.nome}, PR ${formatarKg(pr.cargaKg)} quilos`}
      onPress={() => abrirExercicio(exercicio.id)}
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <Cartao estilo={{ gap: 10 }}>
        <View style={estilos.linhaTitulo}>
          <Text style={estilos.nome}>{exercicio.nome}</Text>
          <Text style={{ color: cores.textoSuave }}>
            PR <Text style={estilos.pr}>{formatarKg(pr.cargaKg)} kg</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {percentuais.map(({ percentual, cargaKg }) => (
            <View key={percentual} style={estilos.celula}>
              <Text style={estilos.percentual}>{percentual}%</Text>
              <Text style={estilos.carga}>{formatarKg(cargaKg)}</Text>
              <Text style={estilos.kg}>kg</Text>
            </View>
          ))}
        </View>
      </Cartao>
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nome: { fontSize: 16, fontWeight: '700', color: cores.texto, flexShrink: 1 },
  pr: { fontSize: 16, fontWeight: '700', color: cores.texto },
  celula: {
    flex: 1,
    backgroundColor: cores.cinzaClaro,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  percentual: { fontSize: 11, fontWeight: '700', color: cores.marcaEscura },
  carga: { fontSize: 17, fontWeight: '800', color: cores.texto, fontVariant: ['tabular-nums'] },
  kg: { fontSize: 10, color: cores.textoSuave },
})
