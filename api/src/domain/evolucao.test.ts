import { describe, expect, it } from 'vitest'
import {
  chaveDoCiclo,
  inicioDaSemana,
  media,
  mediana,
  melhorPorCiclo,
  montarCiclos,
  serieDoExercicio,
  variacaoPercentual,
} from './evolucao.ts'

const d = (iso: string) => new Date(`${iso}T00:00:00Z`)

describe('ciclos semestrais', () => {
  it.each([
    ['2026-01-02', '2026-1'],
    ['2026-06-30', '2026-1'],
    ['2026-07-01', '2026-2'],
    ['2025-12-31', '2025-2'],
  ])('%s → %s', (data, chave) => {
    expect(chaveDoCiclo(d(data))).toBe(chave)
  })

  it('a semana começa na segunda-feira', () => {
    expect(inicioDaSemana(d('2026-03-15'))).toBe('2026-03-09') // domingo
    expect(inicioDaSemana(d('2026-03-16'))).toBe('2026-03-16') // segunda
    expect(inicioDaSemana(d('2026-03-18'))).toBe('2026-03-16') // quarta
  })

  it('identifica cada ciclo pela semana com mais registros', () => {
    const datas = [
      d('2025-09-12'),
      d('2026-03-16'),
      d('2026-03-17'),
      d('2026-03-18'),
      d('2026-05-02'), // registro avulso do aluno no mesmo semestre
    ]
    expect(montarCiclos(datas)).toEqual([
      { chave: '2025-2', rotulo: '2º sem. 2025', semana: '2025-09-08' },
      { chave: '2026-1', rotulo: '1º sem. 2026', semana: '2026-03-16' },
    ])
  })
})

describe('estatísticas', () => {
  it('melhor carga por ciclo', () => {
    const melhores = melhorPorCiclo([
      { data: d('2026-03-16'), cargaKg: 100 },
      { data: d('2026-05-01'), cargaKg: 105 },
      { data: d('2025-09-12'), cargaKg: 92.5 },
    ])
    expect(Object.fromEntries(melhores)).toEqual({ '2026-1': 105, '2025-2': 92.5 })
  })

  it('média, mediana e variação percentual', () => {
    expect(media([80, 100, 130])).toBe(103.3)
    expect(mediana([80, 100, 130])).toBe(100)
    expect(mediana([80, 100, 105, 130])).toBe(102.5)
    expect(media([])).toBeNull()
    expect(variacaoPercentual(100, 105)).toBe(5)
    expect(variacaoPercentual(92.5, 105)).toBe(13.5)
    expect(variacaoPercentual(null, 105)).toBeNull()
  })

  it('série do exercício ordenada por data, com variação desde o primeiro registro', () => {
    const serie = serieDoExercicio([
      { data: d('2026-03-15'), cargaKg: 105 },
      { data: d('2025-03-14'), cargaKg: 92.5 },
      { data: d('2025-09-12'), cargaKg: 100 },
    ])
    expect(serie).toEqual({
      pontos: [
        { data: '2025-03-14', cargaKg: 92.5 },
        { data: '2025-09-12', cargaKg: 100 },
        { data: '2026-03-15', cargaKg: 105 },
      ],
      primeiroKg: 92.5,
      atualKg: 105,
      melhorKg: 105,
      variacaoKg: 12.5,
      variacaoPct: 13.5,
    })
  })
})
