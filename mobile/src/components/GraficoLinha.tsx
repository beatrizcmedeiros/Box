import { useState } from 'react'
import { Text, View } from 'react-native'
import Svg, { Circle, Line, Polyline, Text as TextoSvg } from 'react-native-svg'
import { formatarKg } from '../lib/formato'
import { cores } from '../lib/tema'

export type Serie = {
  nome: string
  cor: string
  /** Um valor por posição do eixo X; null quando não houve teste naquela posição. */
  valores: (number | null)[]
}

// Paleta das séries (turmas); a primeira é a cor da marca
export const CORES_SERIES = [cores.marca, '#2563eb', '#16a34a', '#9333ea', '#0891b2', '#dc2626']

const ALTURA = 180
const MARGEM = { topo: 16, base: 26, esquerda: 40, direita: 12 }

/**
 * Gráfico de linhas simples (kg por teste). Linhas pulam as posições sem valor.
 * A largura acompanha o espaço disponível na tela.
 */
export function GraficoLinha({
  rotulosX,
  series,
  descricao,
}: {
  rotulosX: string[]
  series: Serie[]
  /** Texto lido pelo leitor de tela no lugar do gráfico. */
  descricao: string
}) {
  const [largura, setLargura] = useState(0)

  const valores = series.flatMap((s) => s.valores.filter((v): v is number => v !== null))
  if (valores.length === 0 || rotulosX.length === 0) return null

  // Eixo Y com folga de 10% e sem começar em zero, para a evolução ficar visível
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  const folga = Math.max((maximo - minimo) * 0.1, 2.5)
  const yMin = Math.max(0, minimo - folga)
  const yMax = maximo + folga

  const areaX = Math.max(largura - MARGEM.esquerda - MARGEM.direita, 1)
  const areaY = ALTURA - MARGEM.topo - MARGEM.base
  const x = (i: number) =>
    MARGEM.esquerda + (rotulosX.length === 1 ? areaX / 2 : (i / (rotulosX.length - 1)) * areaX)
  const y = (v: number) => MARGEM.topo + (1 - (v - yMin) / (yMax - yMin)) * areaY

  const marcasY = [yMin, (yMin + yMax) / 2, yMax]
  // Com muitos testes, mostra só alguns rótulos no eixo X para não sobrepor
  const passoX = Math.ceil(rotulosX.length / Math.max(Math.floor(areaX / 56), 1))

  return (
    <View
      accessible
      accessibilityLabel={descricao}
      onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
      style={{ gap: 8 }}
    >
      {largura > 0 && (
        <Svg width={largura} height={ALTURA}>
          {marcasY.map((v) => (
            <Line
              key={`grade-${v}`}
              x1={MARGEM.esquerda}
              x2={largura - MARGEM.direita}
              y1={y(v)}
              y2={y(v)}
              stroke={cores.borda}
              strokeWidth={1}
            />
          ))}
          {marcasY.map((v) => (
            <TextoSvg
              key={`y-${v}`}
              x={MARGEM.esquerda - 6}
              y={y(v) + 4}
              fontSize={10}
              fill={cores.textoSuave}
              textAnchor="end"
            >
              {formatarKg(Math.round(v))}
            </TextoSvg>
          ))}
          {rotulosX.map((rotulo, i) =>
            i % passoX === 0 || i === rotulosX.length - 1 ? (
              <TextoSvg
                key={`x-${i}`}
                x={x(i)}
                y={ALTURA - 8}
                fontSize={10}
                fill={cores.textoSuave}
                textAnchor="middle"
              >
                {rotulo}
              </TextoSvg>
            ) : null,
          )}
          {series.map((s) => {
            const pontos = s.valores
              .map((v, i) => (v === null ? null : `${x(i)},${y(v)}`))
              .filter(Boolean)
              .join(' ')
            return (
              <Polyline
                key={`linha-${s.nome}`}
                points={pontos}
                fill="none"
                stroke={s.cor}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
            )
          })}
          {series.map((s) =>
            s.valores.map((v, i) =>
              v === null ? null : (
                <Circle key={`ponto-${s.nome}-${i}`} cx={x(i)} cy={y(v)} r={3.5} fill={s.cor} />
              ),
            ),
          )}
        </Svg>
      )}
      {series.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {series.map((s) => (
            <View key={s.nome} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.cor }} />
              <Text style={{ fontSize: 12, color: cores.textoSuave }}>{s.nome}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
