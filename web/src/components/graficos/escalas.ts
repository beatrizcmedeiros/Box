/** Passo "redondo" (1, 2, 2,5, 5 × 10ⁿ) para os ticks do eixo Y. */
function passoRedondo(intervalo: number, ticksDesejados: number) {
  const bruto = intervalo / Math.max(1, ticksDesejados)
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const fracao = bruto / potencia
  const base = fracao <= 1 ? 1 : fracao <= 2 ? 2 : fracao <= 2.5 ? 2.5 : fracao <= 5 ? 5 : 10
  return base * potencia
}

/**
 * Domínio e ticks do eixo Y com números redondos. Em gráfico de linha o eixo não precisa
 * começar em zero (o que importa é a variação), mas há folga acima e abaixo dos dados.
 */
export function eixoY(valores: number[], ticksDesejados = 4) {
  if (valores.length === 0) return { min: 0, max: 1, ticks: [0, 1] }
  let min = Math.min(...valores)
  let max = Math.max(...valores)
  if (min === max) {
    min -= 5
    max += 5
  }
  const folga = (max - min) * 0.15
  const passo = passoRedondo(max - min + 2 * folga, ticksDesejados)
  const inicio = Math.max(0, Math.floor((min - folga) / passo) * passo)
  const fim = Math.ceil((max + folga) / passo) * passo
  const ticks: number[] = []
  for (let v = inicio; v <= fim + passo / 2; v += passo) ticks.push(Math.round(v * 100) / 100)
  return { min: inicio, max: fim, ticks }
}

/** Escolhe até `maximo` índices espaçados (sempre inclui o primeiro e o último). */
export function amostrarIndices(total: number, maximo: number): number[] {
  if (total <= maximo) return Array.from({ length: total }, (_, i) => i)
  if (maximo <= 1) return [total - 1]
  const passo = (total - 1) / (maximo - 1)
  return [...new Set(Array.from({ length: maximo }, (_, i) => Math.round(i * passo)))]
}
