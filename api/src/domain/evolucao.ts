// Evolução das cargas ao longo dos testes de força (aplicados a cada 6 meses).
//
// Ciclo = semestre do teste (1º: jan–jun; 2º: jul–dez). Dentro do ciclo, vale a MAIOR carga
// do aluno no exercício. Cada ciclo é identificado pela "semana do teste": a semana
// (segunda a domingo) com mais registros naquele semestre.

export type Ponto = { data: Date; cargaKg: number }

export type Ciclo = {
  chave: string // "2026-1"
  rotulo: string // "1º sem. 2026"
  semana: string // segunda-feira da semana do teste, "2026-03-16"
}

const iso = (data: Date) => data.toISOString().slice(0, 10)
const arredondar = (valor: number, casas = 1) => Math.round(valor * 10 ** casas) / 10 ** casas

export function chaveDoCiclo(data: Date): string {
  return `${data.getUTCFullYear()}-${data.getUTCMonth() < 6 ? 1 : 2}`
}

export function rotuloDoCiclo(chave: string): string {
  const [ano, semestre] = chave.split('-')
  return `${semestre}º sem. ${ano}`
}

/** Segunda-feira da semana da data (as datas de teste são guardadas à meia-noite UTC). */
export function inicioDaSemana(data: Date): string {
  const d = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()))
  const diaDaSemana = (d.getUTCDay() + 6) % 7 // segunda = 0
  d.setUTCDate(d.getUTCDate() - diaDaSemana)
  return iso(d)
}

/** Ciclos presentes nos dados, em ordem cronológica, com a semana em que o teste aconteceu. */
export function montarCiclos(datas: Date[]): Ciclo[] {
  const semanasPorCiclo = new Map<string, Map<string, number>>()
  for (const data of datas) {
    const chave = chaveDoCiclo(data)
    const semanas = semanasPorCiclo.get(chave) ?? new Map<string, number>()
    const semana = inicioDaSemana(data)
    semanas.set(semana, (semanas.get(semana) ?? 0) + 1)
    semanasPorCiclo.set(chave, semanas)
  }
  return [...semanasPorCiclo.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, semanas]) => {
      // Semana com mais registros; empate → a mais antiga
      const [semana] = [...semanas.entries()].sort(
        (x, y) => y[1] - x[1] || x[0].localeCompare(y[0]),
      )[0]
      return { chave, rotulo: rotuloDoCiclo(chave), semana }
    })
}

/** Melhor carga de cada ciclo (para um aluno em um exercício). */
export function melhorPorCiclo(pontos: Ponto[]): Map<string, number> {
  const melhores = new Map<string, number>()
  for (const { data, cargaKg } of pontos) {
    const chave = chaveDoCiclo(data)
    melhores.set(chave, Math.max(melhores.get(chave) ?? 0, cargaKg))
  }
  return melhores
}

export function media(valores: number[]): number | null {
  if (valores.length === 0) return null
  return arredondar(valores.reduce((s, v) => s + v, 0) / valores.length)
}

export function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null
  const ordenados = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2
    ? ordenados[meio]
    : arredondar((ordenados[meio - 1] + ordenados[meio]) / 2)
}

/** Variação percentual com uma casa (null se não há base para comparar). */
export function variacaoPercentual(antes: number | null, depois: number | null): number | null {
  if (antes === null || depois === null || antes <= 0) return null
  return arredondar(((depois - antes) / antes) * 100)
}

export type SerieExercicio = {
  pontos: { data: string; cargaKg: number }[]
  primeiroKg: number
  atualKg: number
  melhorKg: number
  variacaoKg: number
  variacaoPct: number | null
}

/**
 * Série temporal de um aluno em um exercício (todos os registros, em ordem de data).
 * "Atual" = registro mais recente; a variação compara com o primeiro registro.
 */
export function serieDoExercicio(pontos: Ponto[]): SerieExercicio {
  const ordenados = [...pontos].sort((a, b) => a.data.getTime() - b.data.getTime())
  const primeiro = ordenados[0].cargaKg
  const atual = ordenados.at(-1)!.cargaKg
  return {
    pontos: ordenados.map((p) => ({ data: iso(p.data), cargaKg: p.cargaKg })),
    primeiroKg: primeiro,
    atualKg: atual,
    melhorKg: Math.max(...ordenados.map((p) => p.cargaKg)),
    variacaoKg: arredondar(atual - primeiro, 2),
    variacaoPct: variacaoPercentual(primeiro, atual),
  }
}
