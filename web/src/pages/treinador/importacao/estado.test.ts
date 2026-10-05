import { describe, expect, it } from 'vitest'
import type { Previa } from '../../../lib/tipos.ts'
import { cargaValida, linhasDuplicadas, montarEnvio, montarEstado } from './estado.ts'

const previa: Previa = {
  secoes: [
    {
      titulo: 'Teste agachamento',
      tituloLimpo: 'agachamento',
      exercicio: { status: 'ambiguo', candidatos: [1, 2] },
      linhas: [
        {
          numero: 2,
          texto: 'Carla 55kg',
          nome: 'Carla',
          cargaKg: 55,
          problema: null,
          duplicado: false,
          aluno: {
            status: 'encontrado',
            aluno: { id: 10, nome: 'Carla Mendes' },
            por: 'primeiro_nome',
          },
        },
        {
          numero: 3,
          texto: 'Toninho 85',
          nome: 'Toninho',
          cargaKg: 85,
          problema: null,
          duplicado: false,
          aluno: { status: 'nao_encontrado', candidatos: [] },
        },
        {
          numero: 4,
          texto: 'Patricia Gomez 75',
          nome: 'Patricia Gomez',
          cargaKg: 75,
          problema: null,
          duplicado: false,
          aluno: {
            status: 'sugestao',
            aluno: { id: 12, nome: 'Patrícia Gomes' },
            candidatos: [{ id: 12, nome: 'Patrícia Gomes' }],
            motivo: 'Nome parecido',
          },
        },
        {
          numero: 5,
          texto: 'Fulano 1100 kg',
          nome: 'Fulano',
          cargaKg: 1100,
          problema: 'Carga fora do intervalo',
          duplicado: false,
          aluno: null,
        },
      ],
    },
  ],
  resumo: { linhas: 4, encontrados: 1, sugestoes: 1, naoEncontrados: 1, comProblema: 1 },
  alunos: [],
  exercicios: [],
}

describe('montarEstado', () => {
  it('só inclui automaticamente os alunos encontrados', () => {
    const { linhas, secoes } = montarEstado(previa)
    expect(linhas.map((l) => [l.nomeLido, l.alunoId, l.incluir, l.situacao])).toEqual([
      ['Carla', 10, true, 'encontrado'],
      ['Toninho', null, false, 'nao_encontrado'],
      ['Patricia Gomez', 12, false, 'sugestao'],
      ['Fulano', null, false, 'problema'],
    ])
    expect(linhas[3].carga).toBe('1100')
    expect(secoes[0]).toMatchObject({ exercicioId: null, candidatos: [1, 2], lembrarTitulo: true })
  })
})

describe('montarEnvio', () => {
  it('envia só as linhas prontas e memoriza apelidos das escolhas manuais', () => {
    const { linhas, secoes } = montarEstado(previa)
    secoes[0].exercicioId = 1
    linhas[1] = { ...linhas[1], alunoId: 11, incluir: true, escolhaManual: true }
    linhas[2] = { ...linhas[2], incluir: true, escolhaManual: true }
    linhas[3] = { ...linhas[3], alunoId: 13, carga: '110', incluir: true, escolhaManual: true }

    expect(montarEnvio(linhas, secoes, true)).toEqual({
      resultados: [
        { usuarioId: 10, exercicioId: 1, cargaKg: 55, apelido: null },
        { usuarioId: 11, exercicioId: 1, cargaKg: 85, apelido: 'Toninho' },
        { usuarioId: 12, exercicioId: 1, cargaKg: 75, apelido: 'Patricia Gomez' },
        { usuarioId: 13, exercicioId: 1, cargaKg: 110, apelido: 'Fulano' },
      ],
      aliasesExercicio: [{ exercicioId: 1, alias: 'agachamento' }],
    })
    expect(montarEnvio(linhas, secoes, false).resultados.every((r) => r.apelido === null)).toBe(
      true,
    )
  })

  it('sem exercício escolhido, nada é enviado', () => {
    const { linhas, secoes } = montarEstado(previa)
    expect(montarEnvio(linhas, secoes, true)).toEqual({ resultados: [], aliasesExercicio: [] })
  })
})

describe('validações', () => {
  it('aponta o mesmo aluno duas vezes no mesmo exercício', () => {
    const { linhas, secoes } = montarEstado(previa)
    secoes[0].exercicioId = 1
    linhas[1] = { ...linhas[1], alunoId: 10, incluir: true }
    expect([...linhasDuplicadas(linhas, secoes)].sort()).toEqual(['0-2', '0-3'])
  })

  it.each([
    ['55', true],
    ['52,5', true],
    ['0', false],
    ['501', false],
    ['abc', false],
    ['', false],
    ['10,125', false],
  ])('carga %j válida? %s', (carga, esperado) => {
    expect(cargaValida(carga)).toBe(esperado)
  })
})
