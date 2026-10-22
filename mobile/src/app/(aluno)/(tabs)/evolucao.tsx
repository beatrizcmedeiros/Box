import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { BotaoRegistrar } from '../../../components/aluno'
import { GraficoLinha } from '../../../components/GraficoLinha'
import { Alerta, Cartao, Carregando, Tela, Titulo } from '../../../components/ui'
import { useEvolucao } from '../../../lib/consultas'
import { formatarData, formatarKg, formatarPct } from '../../../lib/formato'
import { cores } from '../../../lib/tema'
import type { SerieExercicio } from '../../../lib/tipos'

/** Evolução dos PRs: o exercício escolhido em detalhe e a lista de todos. */
export default function Evolucao() {
  const evolucao = useEvolucao()
  const [escolhidoId, setEscolhidoId] = useState<number>()

  const series = evolucao.data?.exercicios ?? []
  const escolhida = series.find((s) => s.exercicio.id === escolhidoId) ?? series[0]

  return (
    <Tela atualizar={{ atualizando: evolucao.isRefetching, aoPuxar: () => evolucao.refetch() }}>
      <Text style={{ color: cores.textoSuave }}>Como seus PRs mudaram a cada teste</Text>
      {evolucao.isPending ? (
        <Carregando />
      ) : evolucao.error ? (
        <Alerta>{evolucao.error.message}</Alerta>
      ) : series.length === 0 ? (
        <Cartao estilo={{ gap: 12, alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: cores.texto }}>
            Ainda não há evolução para mostrar
          </Text>
          <Text style={{ textAlign: 'center', color: cores.textoSuave }}>
            Registre seus PRs a cada teste de carga e acompanhe aqui a sua progressão em cada
            exercício.
          </Text>
          <BotaoRegistrar texto="+ Registrar PR" />
        </Cartao>
      ) : (
        <>
          <PainelSerie serie={escolhida} />
          <Titulo>Todos os exercícios</Titulo>
          {series.map((s) => (
            <Pressable
              key={s.exercicio.id}
              accessibilityRole="button"
              accessibilityState={{ selected: s === escolhida }}
              onPress={() => setEscolhidoId(s.exercicio.id)}
            >
              <Cartao
                estilo={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: s === escolhida ? cores.marca : 'transparent',
                }}
              >
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ fontWeight: '700', color: cores.texto }}>{s.exercicio.nome}</Text>
                  <Text style={{ color: cores.textoSuave, fontSize: 13 }}>
                    {s.pontos.length} {s.pontos.length === 1 ? 'teste' : 'testes'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: cores.texto }}>
                    {formatarKg(s.atualKg)} kg
                  </Text>
                  <Variacao serie={s} />
                </View>
              </Cartao>
            </Pressable>
          ))}
        </>
      )}
    </Tela>
  )
}

function Variacao({ serie }: { serie: SerieExercicio }) {
  if (serie.pontos.length < 2) return null
  const cor =
    serie.variacaoKg > 0 ? cores.sucesso : serie.variacaoKg < 0 ? cores.erro : cores.textoSuave
  return (
    <Text style={{ color: cor, fontSize: 13, fontWeight: '600' }}>
      {serie.variacaoKg > 0 ? '+' : serie.variacaoKg < 0 ? '−' : ''}
      {formatarKg(Math.abs(serie.variacaoKg))} kg
      {serie.variacaoPct !== null ? ` (${formatarPct(serie.variacaoPct)})` : ''}
    </Text>
  )
}

/** Histórico do exercício em barras: uma por teste, proporcional ao melhor PR. */
function PainelSerie({ serie }: { serie: SerieExercicio }) {
  return (
    <Cartao estilo={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: cores.texto }}>
          {serie.exercicio.nome}
        </Text>
        <Variacao serie={serie} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Indicador rotulo="Primeiro" valor={serie.primeiroKg} />
        <Indicador rotulo="Atual" valor={serie.atualKg} />
        <Indicador rotulo="Melhor" valor={serie.melhorKg} />
      </View>
      {serie.pontos.length > 1 && (
        <GraficoLinha
          rotulosX={serie.pontos.map((p) =>
            formatarData(p.data).replace(/\/(\d{2})(\d{2})$/, '/$2'),
          )}
          series={[
            {
              nome: serie.exercicio.nome,
              cor: cores.marca,
              valores: serie.pontos.map((p) => p.cargaKg),
            },
          ]}
          descricao={`Evolução do PR em ${serie.exercicio.nome}: de ${formatarKg(serie.primeiroKg)} kg para ${formatarKg(serie.atualKg)} kg em ${serie.pontos.length} testes.`}
        />
      )}
      <View style={{ gap: 8 }}>
        {serie.pontos.map((p) => (
          <View key={p.data} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ width: 82, fontSize: 13, color: cores.textoSuave }}>
              {formatarData(p.data)}
            </Text>
            <View
              style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: cores.cinzaClaro }}
            >
              <View
                style={{
                  width: `${(p.cargaKg / serie.melhorKg) * 100}%`,
                  height: '100%',
                  borderRadius: 5,
                  backgroundColor: p.cargaKg === serie.melhorKg ? cores.marcaForte : cores.marca,
                }}
              />
            </View>
            <Text style={{ width: 64, textAlign: 'right', fontWeight: '700', color: cores.texto }}>
              {formatarKg(p.cargaKg)} kg
            </Text>
          </View>
        ))}
      </View>
    </Cartao>
  )
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: cores.cinzaClaro, borderRadius: 10, padding: 8 }}>
      <Text style={{ fontSize: 11, color: cores.textoSuave, fontWeight: '600' }}>{rotulo}</Text>
      <Text style={{ fontSize: 16, fontWeight: '800', color: cores.texto }}>
        {formatarKg(valor)} kg
      </Text>
    </View>
  )
}
