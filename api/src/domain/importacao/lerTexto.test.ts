import { describe, expect, it } from 'vitest'
import { lerTexto } from './lerTexto.ts'

// Lista fictícia no mesmo formato da nota real do treinador, com os defeitos vistos no OCR
const TEXTO_OCR = `Teste agachamento
Carla 55Kkg

Bruna 50kg

Toninho 85
Lucas 110 kg
Marcos  100kg
Ana Paula 75 Kkg
Zé 65kg

Teste terra
Carla 80 kg
Lucas 1100 kg
Fulano sem carga
`

describe('lerTexto', () => {
  it('separa as seções pelo título e lê nome e carga de cada linha', () => {
    const secoes = lerTexto(TEXTO_OCR)

    expect(secoes.map((s) => s.titulo)).toEqual(['Teste agachamento', 'Teste terra'])
    expect(secoes[0].linhas.map((l) => [l.nome, l.cargaKg])).toEqual([
      ['Carla', 55],
      ['Bruna', 50],
      ['Toninho', 85],
      ['Lucas', 110],
      ['Marcos', 100],
      ['Ana Paula', 75],
      ['Zé', 65],
    ])
    expect(secoes[0].linhas.every((l) => l.problema === null)).toBe(true)
  })

  it('guarda o número da linha original', () => {
    const [agachamento] = lerTexto(TEXTO_OCR)
    expect(agachamento.linhas[0]).toMatchObject({ numero: 2, texto: 'Carla 55Kkg' })
    expect(agachamento.linhas[2]).toMatchObject({ numero: 6, texto: 'Toninho 85' })
  })

  it('aponta carga fora do intervalo', () => {
    const [, terra] = lerTexto(TEXTO_OCR)
    expect(terra.linhas[1]).toMatchObject({ nome: 'Lucas', cargaKg: 1100 })
    expect(terra.linhas[1].problema).toContain('fora do intervalo')
  })

  it('linha sem número vira título (nova seção vazia é descartada)', () => {
    const [, terra] = lerTexto(TEXTO_OCR)
    expect(terra.linhas).toHaveLength(2)
  })

  it.each([
    ['Ana: 52,5 kg', 'Ana', 52.5],
    ['Ana - 52.5kg', 'Ana', 52.5],
    ['Ana 11O kg', 'Ana', 110],
    ['Ana 60kq', 'Ana', 60],
    ['Ana 60 k9', 'Ana', 60],
    ['Ana 60 quilos', 'Ana', 60],
    ['Maria Fernanda 50 kg', 'Maria Fernanda', 50],
  ])('lê %j', (linha, nome, carga) => {
    const [secao] = lerTexto(linha)
    expect(secao.titulo).toBeNull()
    expect(secao.linhas[0]).toMatchObject({ nome, cargaKg: carga, problema: null })
  })

  it('marca linhas com número que não seguem o padrão', () => {
    const [secao] = lerTexto('Teste\n55 kg\n12/03')
    expect(secao.linhas.map((l) => l.problema)).toEqual([
      'Não foi possível separar nome e carga',
      'Não foi possível separar nome e carga',
    ])
  })

  it('texto vazio não gera seções', () => {
    expect(lerTexto('\n \n')).toEqual([])
  })
})
