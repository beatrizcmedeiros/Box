import { describe, expect, it } from 'vitest'
import {
  type AlunoParaAssociar,
  associarAluno,
  associarExercicio,
  type ExercicioParaAssociar,
  limparTitulo,
  semelhanca,
} from './associar.ts'

const alunos: AlunoParaAssociar[] = [
  { id: 1, nome: 'Carla Mendes', turmaId: 18, apelidos: [] },
  { id: 2, nome: 'Maria de Lourdes Silva', turmaId: 18, apelidos: ['lurdinha'] },
  { id: 3, nome: 'Ana Paula Rocha', turmaId: 18, apelidos: [] },
  { id: 4, nome: 'Ana Souza', turmaId: 7, apelidos: [] },
  { id: 5, nome: 'Ana Lima', turmaId: 18, apelidos: [] },
  { id: 6, nome: 'Rose Alves', turmaId: 18, apelidos: [] },
  { id: 7, nome: 'Maria Rose Costa', turmaId: 18, apelidos: [] },
  { id: 8, nome: 'Patrícia Gomes', turmaId: 18, apelidos: [] },
]

describe('associarAluno', () => {
  it('encontra pelo apelido salvo', () => {
    expect(associarAluno('Lurdinha', alunos, null)).toMatchObject({
      status: 'encontrado',
      aluno: { id: 2 },
      por: 'apelido',
    })
  })

  it('encontra pelo nome completo, ignorando acentos e maiúsculas', () => {
    expect(associarAluno('PATRICIA gomes', alunos, null)).toMatchObject({
      status: 'encontrado',
      aluno: { id: 8 },
      por: 'nome',
    })
  })

  it('encontra pelo primeiro nome quando ele é único', () => {
    expect(associarAluno('Carla', alunos, null)).toMatchObject({
      status: 'encontrado',
      aluno: { id: 1 },
    })
    expect(associarAluno('Patrícia', alunos, null)).toMatchObject({
      status: 'encontrado',
      aluno: { id: 8 },
    })
    expect(associarAluno('Ana Paula', alunos, null)).toMatchObject({
      status: 'encontrado',
      aluno: { id: 3 },
    })
  })

  it('"Rose" não é confundida com "Maria Rose"', () => {
    expect(associarAluno('Rose', alunos, null)).toMatchObject({
      status: 'encontrado',
      aluno: { id: 6 },
    })
    expect(associarAluno('Maria Rose', alunos, null)).toMatchObject({
      status: 'encontrado',
      aluno: { id: 7 },
    })
  })

  it('com nomes repetidos, pede confirmação e lista os candidatos', () => {
    expect(associarAluno('Ana', alunos, null)).toMatchObject({
      status: 'sugestao',
      motivo: 'Há 3 alunos com esse nome',
      candidatos: [{ id: 3 }, { id: 4 }, { id: 5 }],
    })
  })

  it('a turma informada desempata nomes repetidos', () => {
    expect(associarAluno('Ana', alunos, 7)).toMatchObject({
      status: 'encontrado',
      aluno: { id: 4 },
    })
  })

  it('sugere (sem aplicar) nomes parecidos', () => {
    expect(associarAluno('Patricia Gomez', alunos, null)).toMatchObject({
      status: 'sugestao',
      aluno: { id: 8 },
    })
    expect(associarAluno('Karla', alunos, null)).toMatchObject({
      status: 'sugestao',
      aluno: { id: 1 },
    })
  })

  it('não encontra nomes sem relação', () => {
    expect(associarAluno('Toninho', alunos, null)).toEqual({
      status: 'nao_encontrado',
      candidatos: [],
    })
  })
})

describe('semelhanca', () => {
  it('vai de 0 a 1', () => {
    expect(semelhanca('carla', 'carla')).toBe(1)
    expect(semelhanca('carla', 'karla')).toBe(0.8)
    expect(semelhanca('abc', '')).toBe(0)
  })
})

const exercicios: ExercicioParaAssociar[] = [
  { id: 1, nome: 'Back Squat', aliases: ['agachamento livre', 'back sq'] },
  { id: 2, nome: 'Front Squat', aliases: ['agachamento frontal'] },
  { id: 3, nome: 'Deadlift', aliases: ['levantamento terra', 'terra'] },
  { id: 4, nome: 'Clean & Jerk', aliases: ['arremesso'] },
]

describe('associarExercicio', () => {
  it('limpa palavras genéricas e datas do título', () => {
    expect(limparTitulo('Teste de Força - Terra (março/2026)')).toBe('terra marco')
    expect(limparTitulo('Teste agachamento')).toBe('agachamento')
  })

  it.each([
    ['Teste terra', 3],
    ['TESTE DE BACK SQUAT', 1],
    ['Teste agachamento frontal', 2],
    ['Clean & Jerk', 4],
    ['Teste terra março', 3],
  ])('%j → exercício %d', (titulo, id) => {
    expect(associarExercicio(titulo, exercicios)).toEqual({ status: 'encontrado', exercicioId: id })
  })

  it('"agachamento" sozinho é ambíguo entre Back Squat e Front Squat', () => {
    expect(associarExercicio('Teste agachamento', exercicios)).toEqual({
      status: 'ambiguo',
      candidatos: [1, 2],
    })
  })

  it('sem título ou sem correspondência', () => {
    expect(associarExercicio(null, exercicios).status).toBe('nao_encontrado')
    expect(associarExercicio('Teste', exercicios).status).toBe('nao_encontrado')
    expect(associarExercicio('Teste thruster', exercicios).status).toBe('nao_encontrado')
  })
})
