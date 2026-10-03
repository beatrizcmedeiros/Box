// Regra de negócio central do PR Box — ver PLANO_DE_DESENVOLVIMENTO.md, seção 5.

/** Percentuais exibidos no dashboard do aluno. Na v2 podem virar configuração do treinador. */
export const PERCENTUAIS = [35, 40, 45, 50, 55] as const

export type CargaPercentual = { percentual: number; cargaKg: number }

/**
 * Carga de um percentual do PR, arredondada para o múltiplo de 0,5 kg mais próximo
 * (compatível com as anilhas). Ex.: 105 kg × 35% = 36,75 kg → 37 kg.
 *
 * O cálculo é feito em inteiros (centésimos de kg) para evitar erros de ponto
 * flutuante justamente nos casos de empate (x,25 / x,75), que sempre arredondam para cima.
 */
export function cargaDoPercentual(prKg: number, percentual: number): number {
  const centesimos = Math.round(prKg * 100)
  const meiosKg = Math.round((centesimos * percentual) / 5000)
  return meiosKg / 2
}

export function calcularPercentuais(prKg: number): CargaPercentual[] {
  return PERCENTUAIS.map((percentual) => ({
    percentual,
    cargaKg: cargaDoPercentual(prKg, percentual),
  }))
}
