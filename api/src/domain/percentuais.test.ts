import { describe, expect, it } from 'vitest'
import { calcularPercentuais, cargaDoPercentual, PERCENTUAIS } from './percentuais.ts'

const cargas = (prKg: number) => calcularPercentuais(prKg).map((c) => c.cargaKg)

describe('calcularPercentuais', () => {
  it('usa os percentuais de 35% a 55%', () => {
    expect(calcularPercentuais(100).map((c) => c.percentual)).toEqual([...PERCENTUAIS])
    expect(cargas(100)).toEqual([35, 40, 45, 50, 55])
  })

  // Valores das telas de modelo do relatório (Figura 2)
  it.each([
    [105, [37, 42, 47.5, 52.5, 58]],
    [120, [42, 48, 54, 60, 66]],
    [85, [30, 34, 38.5, 42.5, 47]],
    [70, [24.5, 28, 31.5, 35, 38.5]],
    [55, [19.5, 22, 25, 27.5, 30.5]],
  ])('PR de %d kg', (pr, esperado) => {
    expect(cargas(pr)).toEqual(esperado)
  })

  it('aceita PR com casas decimais', () => {
    expect(cargas(92.5)).toEqual([32.5, 37, 41.5, 46.5, 51])
    expect(cargas(102.3)).toEqual([36, 41, 46, 51, 56.5])
  })
})

describe('arredondamento para 0,5 kg', () => {
  it.each([
    [105, 35, 37], // 36,75 → 37 (empate arredonda para cima)
    [105, 45, 47.5], // 47,25 → 47,5
    [61, 35, 21.5], // 21,35 → 21,5
    [61, 40, 24.5], // 24,40 → 24,5
    [63, 40, 25], // 25,20 → 25
  ])('%d kg × %d%% = %d kg', (pr, percentual, esperado) => {
    expect(cargaDoPercentual(pr, percentual)).toBe(esperado)
  })

  it('o resultado é sempre múltiplo de 0,5', () => {
    for (let pr = 20; pr <= 300; pr += 0.25) {
      for (const p of PERCENTUAIS) {
        const carga = cargaDoPercentual(pr, p)
        expect(Number.isInteger(carga * 2)).toBe(true)
        expect(Math.abs(carga - (pr * p) / 100)).toBeLessThanOrEqual(0.25 + 1e-9)
      }
    }
  })
})
