import { type KeyboardEvent, type PointerEvent, useEffect, useId, useRef, useState } from 'react'
import { TINTA } from './cores.ts'
import { amostrarIndices, eixoY } from './escalas.ts'

export type PontoSerie = { x: number; y: number | null }
export type Serie = { id: string; nome: string; cor: string; pontos: PontoSerie[] }

type Props = {
  series: Serie[]
  /** Posições no eixo X (números crescentes) e como exibi-las. */
  posicoesX: number[]
  rotuloX: (x: number) => string
  /** Texto longo do X na dica (ex.: "Semana de 16/03/2026"). */
  rotuloXCompleto?: (x: number) => string
  formatarY: (y: number) => string
  /** Descrição para leitores de tela (o gráfico inteiro é uma imagem com resumo). */
  descricao: string
  altura?: number
  /** Escala do X proporcional ao valor (datas) ou igualmente espaçada (semanas de teste). */
  escalaX?: 'linear' | 'categorias'
}

const MARGEM = { topo: 16, direita: 56, base: 28, esquerda: 44 }

/**
 * Gráfico de linha em SVG: linhas de 2px, pontos de 8px com anel na cor da superfície,
 * grade recessiva, rótulo no último ponto, linha guia + dica no mouse, toque e teclado.
 */
export function GraficoLinha({
  series,
  posicoesX,
  rotuloX,
  rotuloXCompleto = rotuloX,
  formatarY,
  descricao,
  altura = 220,
  escalaX = 'linear',
}: Props) {
  const idDica = useId()
  const container = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(640)
  const [ativo, setAtivo] = useState<number | null>(null) // índice em posicoesX

  useEffect(() => {
    const elemento = container.current
    if (!elemento || typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(([entrada]) =>
      setLargura(Math.max(260, entrada.contentRect.width)),
    )
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  const areaL = largura - MARGEM.esquerda - MARGEM.direita
  const areaA = altura - MARGEM.topo - MARGEM.base

  const valores = series.flatMap((s) => s.pontos.flatMap((p) => (p.y === null ? [] : [p.y])))
  const y = eixoY(valores)
  const escalaY = (v: number) => MARGEM.topo + areaA - ((v - y.min) / (y.max - y.min)) * areaA

  const minX = posicoesX[0] ?? 0
  const maxX = posicoesX.at(-1) ?? 1
  const escalaXFn = (x: number) => {
    if (escalaX === 'categorias') {
      const i = posicoesX.indexOf(x)
      return (
        MARGEM.esquerda +
        (posicoesX.length === 1 ? areaL / 2 : (i / (posicoesX.length - 1)) * areaL)
      )
    }
    return MARGEM.esquerda + (maxX === minX ? areaL / 2 : ((x - minX) / (maxX - minX)) * areaL)
  }

  // Ticks do X espaçados para não colidir (~60px por rótulo, como "set/25")
  const indicesTicks = amostrarIndices(posicoesX.length, Math.max(2, Math.floor(areaL / 60)))

  function moverPara(clienteX: number) {
    const rect = container.current?.querySelector('svg')?.getBoundingClientRect()
    if (!rect || posicoesX.length === 0) return
    const xLocal = ((clienteX - rect.left) / rect.width) * largura
    let maisProximo = 0
    posicoesX.forEach((x, i) => {
      if (Math.abs(escalaXFn(x) - xLocal) < Math.abs(escalaXFn(posicoesX[maisProximo]) - xLocal))
        maisProximo = i
    })
    setAtivo(maisProximo)
  }

  function aoTeclar(e: KeyboardEvent) {
    if (posicoesX.length === 0) return
    if (e.key === 'ArrowRight') setAtivo((i) => Math.min(posicoesX.length - 1, (i ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setAtivo((i) => Math.max(0, (i ?? posicoesX.length) - 1))
    else if (e.key === 'Escape') setAtivo(null)
    else return
    e.preventDefault()
  }

  const xAtivo = ativo !== null ? posicoesX[ativo] : null
  const linhasDica =
    xAtivo === null
      ? []
      : series.flatMap((s) => {
          const ponto = s.pontos.find((p) => p.x === xAtivo)
          return ponto && ponto.y !== null ? [{ serie: s, y: ponto.y }] : []
        })

  // Rótulos no fim das linhas; se dois ficarem a menos de 14px, a legenda e a dica assumem
  const rotulosFinais: { serie: Serie; x: number; y: number; valor: number }[] = []
  for (const s of series) {
    const ultimo = [...s.pontos].reverse().find((p) => p.y !== null)
    if (!ultimo || ultimo.y === null) continue
    const py = escalaY(ultimo.y)
    if (rotulosFinais.some((r) => Math.abs(r.y - py) < 14)) continue
    rotulosFinais.push({ serie: s, x: escalaXFn(ultimo.x), y: py, valor: ultimo.y })
  }

  const unica = series.length === 1

  return (
    <div ref={container} className="relative w-full select-none">
      <svg
        role="img"
        aria-label={descricao}
        aria-describedby={ativo !== null ? idDica : undefined}
        tabIndex={0}
        width="100%"
        height={altura}
        viewBox={`0 0 ${largura} ${altura}`}
        className="overflow-visible rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-marca/50"
        onPointerMove={(e: PointerEvent) => moverPara(e.clientX)}
        onPointerDown={(e: PointerEvent) => moverPara(e.clientX)}
        onPointerLeave={(e: PointerEvent) => e.pointerType === 'mouse' && setAtivo(null)}
        onKeyDown={aoTeclar}
        onFocus={() => setAtivo((i) => i ?? posicoesX.length - 1)}
        onBlur={() => setAtivo(null)}
      >
        {/* Grade horizontal recessiva + rótulos do Y */}
        {y.ticks.map((t) => (
          <g key={t}>
            <line
              x1={MARGEM.esquerda}
              x2={largura - MARGEM.direita}
              y1={escalaY(t)}
              y2={escalaY(t)}
              stroke={TINTA.grade}
              strokeWidth={1}
            />
            <text
              x={MARGEM.esquerda - 8}
              y={escalaY(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill={TINTA.secundaria}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatarY(t)}
            </text>
          </g>
        ))}
        <line
          x1={MARGEM.esquerda}
          x2={largura - MARGEM.direita}
          y1={MARGEM.topo + areaA}
          y2={MARGEM.topo + areaA}
          stroke={TINTA.eixo}
          strokeWidth={1}
        />
        {indicesTicks.map((i) => (
          <text
            key={posicoesX[i]}
            x={escalaXFn(posicoesX[i])}
            y={altura - 8}
            textAnchor={
              i === 0 && posicoesX.length > 1
                ? 'start'
                : i === posicoesX.length - 1 && posicoesX.length > 1
                  ? 'end'
                  : 'middle'
            }
            fontSize={11}
            fill={TINTA.secundaria}
          >
            {rotuloX(posicoesX[i])}
          </text>
        ))}

        {/* Linha guia do ponto ativo */}
        {xAtivo !== null && (
          <line
            x1={escalaXFn(xAtivo)}
            x2={escalaXFn(xAtivo)}
            y1={MARGEM.topo}
            y2={MARGEM.topo + areaA}
            stroke={TINTA.eixo}
            strokeWidth={1}
          />
        )}

        {series.map((s) => {
          const validos = s.pontos.filter((p): p is { x: number; y: number } => p.y !== null)
          if (validos.length === 0) return null
          const caminho = validos
            .map((p, i) => `${i ? 'L' : 'M'}${escalaXFn(p.x)},${escalaY(p.y)}`)
            .join(' ')
          const base = MARGEM.topo + areaA
          return (
            <g key={s.id}>
              {/* Série única: área com ~10% de opacidade sob a linha */}
              {unica && validos.length > 1 && (
                <path
                  d={`${caminho} L${escalaXFn(validos.at(-1)!.x)},${base} L${escalaXFn(validos[0].x)},${base} Z`}
                  fill={s.cor}
                  opacity={0.1}
                />
              )}
              <path
                d={caminho}
                fill="none"
                stroke={s.cor}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {validos.map((p) => (
                <circle
                  key={p.x}
                  cx={escalaXFn(p.x)}
                  cy={escalaY(p.y)}
                  r={p.x === xAtivo ? 6 : 4}
                  fill={s.cor}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </g>
          )
        })}

        {/* Valor no fim de cada linha (texto em tinta neutra, nunca na cor da série) */}
        {rotulosFinais.map((r) => (
          <text
            key={r.serie.id}
            x={r.x + 8}
            y={r.y}
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={700}
            fill={TINTA.primaria}
          >
            {formatarY(r.valor)}
          </text>
        ))}
      </svg>

      {/* Dica: valor em destaque, nome da série em segundo plano, com traço da cor da série */}
      {xAtivo !== null && linhasDica.length > 0 && (
        <div
          id={idDica}
          role="status"
          className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${Math.min(Math.max((escalaXFn(xAtivo) / largura) * 100, 0), 100)}%`,
            transform:
              escalaXFn(xAtivo) > largura * 0.6
                ? 'translateX(calc(-100% - 12px))'
                : 'translateX(12px)',
          }}
        >
          <p className="mb-1 font-semibold text-slate-600">{rotuloXCompleto(xAtivo)}</p>
          <ul className="space-y-0.5">
            {linhasDica.map(({ serie, y: valor }) => (
              <li key={serie.id} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-0.5 w-3 rounded"
                  style={{ background: serie.cor }}
                />
                <strong className="text-sm text-slate-900 tabular-nums">{formatarY(valor)}</strong>
                {!unica && <span className="text-slate-500">{serie.nome}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Legenda (para 2 ou mais séries): traço da cor da série + nome em tinta neutra. */
export function LegendaLinhas({ series }: { series: { id: string; nome: string; cor: string }[] }) {
  if (series.length < 2) return null
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Legenda">
      {series.map((s) => (
        <li key={s.id} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded" style={{ background: s.cor }} />
          {s.nome}
        </li>
      ))}
    </ul>
  )
}

/** Minigráfico (cartões): só a linha e o ponto final; o valor vem em texto ao lado. */
export function Minigrafico({
  valores,
  cor,
  largura = 96,
  altura = 32,
}: {
  valores: number[]
  cor: string
  largura?: number
  altura?: number
}) {
  if (valores.length === 0) return null
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const px = (i: number) =>
    valores.length === 1 ? largura / 2 : 4 + (i / (valores.length - 1)) * (largura - 8)
  const py = (v: number) =>
    max === min ? altura / 2 : altura - 4 - ((v - min) / (max - min)) * (altura - 8)
  const caminho = valores.map((v, i) => `${i ? 'L' : 'M'}${px(i)},${py(v)}`).join(' ')
  return (
    <svg width={largura} height={altura} aria-hidden="true" className="shrink-0 overflow-visible">
      {valores.length > 1 && (
        <path
          d={caminho}
          fill="none"
          stroke={cor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      <circle
        cx={px(valores.length - 1)}
        cy={py(valores.at(-1)!)}
        r={4}
        fill={cor}
        stroke="#ffffff"
        strokeWidth={2}
      />
    </svg>
  )
}
