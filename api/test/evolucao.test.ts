import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import {
  admin,
  criarAppDeTeste,
  criarTurma,
  criarUsuario,
  limparBanco,
  logar,
  logarComoTreinador,
} from './apoio.ts'

const app = criarAppDeTeste()

beforeEach(limparBanco)

const d = (iso: string) => new Date(`${iso}T00:00:00Z`)

async function teste(usuarioId: number, exercicioId: number, data: string, cargaKg: number) {
  await prisma.testeCarga.create({ data: { usuarioId, exercicioId, dataTeste: d(data), cargaKg } })
}

/** Duas semanas de teste (set/2025 e mar/2026) em duas turmas. */
async function cenario() {
  const t18 = await criarTurma('Turma 18h')
  const t07 = await criarTurma('Turma 07h')
  const backSquat = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
  const deadlift = await prisma.exercicio.create({ data: { nome: 'Deadlift' } })

  const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@t.com', turmaId: t18.id })
  const bruno = await criarUsuario({ nome: 'Bruno Lima', email: 'bruno@t.com', turmaId: t18.id })
  const carla = await criarUsuario({ nome: 'Carla Mendes', email: 'carla@t.com', turmaId: t07.id })
  const novato = await criarUsuario({ nome: 'Diego Novato', email: 'diego@t.com', turmaId: t07.id })

  // Semana de teste 1 (set/2025) e semana de teste 2 (mar/2026)
  await teste(ana.id, backSquat.id, '2025-09-12', 75)
  await teste(ana.id, backSquat.id, '2026-03-16', 80)
  await teste(ana.id, backSquat.id, '2026-05-02', 82.5) // PR batido depois, mesmo semestre
  await teste(bruno.id, backSquat.id, '2025-09-12', 120)
  await teste(bruno.id, backSquat.id, '2026-03-17', 130)
  await teste(carla.id, backSquat.id, '2025-09-11', 70)
  await teste(carla.id, backSquat.id, '2026-03-18', 67.5)
  await teste(novato.id, backSquat.id, '2026-03-18', 60) // só o último ciclo
  await teste(ana.id, deadlift.id, '2026-03-16', 95)

  return { t18, t07, backSquat, deadlift, ana, bruno, carla, novato }
}

describe('GET /api/c/:contexto/evolucao', () => {
  it('agrupa por semana de teste, com média por turma e evolução de cada aluno', async () => {
    const { t18, t07, backSquat, deadlift } = await cenario()
    const treinador = await logarComoTreinador(app)

    const res = await treinador.get(admin(`/evolucao?exercicioId=${backSquat.id}`))

    expect(res.status).toBe(200)
    expect(res.body.exercicio).toEqual({ id: backSquat.id, nome: 'Back Squat' })
    expect(res.body.exercicios.map((e: { nome: string }) => e.nome)).toEqual([
      'Back Squat',
      'Deadlift',
    ])
    expect(res.body.ciclos).toEqual([
      { chave: '2025-2', rotulo: '2º sem. 2025', semana: '2025-09-08' },
      { chave: '2026-1', rotulo: '1º sem. 2026', semana: '2026-03-16' },
    ])
    expect(res.body.turmas).toEqual([
      {
        turma: { id: t18.id, nome: 'Turma 18h' },
        porCiclo: [
          { ciclo: '2025-2', mediaKg: 97.5, alunos: 2 },
          { ciclo: '2026-1', mediaKg: 106.3, alunos: 2 }, // Ana conta o melhor do semestre (82,5)
        ],
      },
      {
        turma: { id: t07.id, nome: 'Turma 07h' },
        porCiclo: [
          { ciclo: '2025-2', mediaKg: 70, alunos: 1 },
          { ciclo: '2026-1', mediaKg: 63.8, alunos: 2 },
        ],
      },
    ])
    // Ordenados pela evolução (maior primeiro); quem só tem um ciclo fica no fim
    expect(
      res.body.alunos.map(
        (a: {
          aluno: { nome: string }
          anteriorKg: number
          ultimoKg: number
          variacaoKg: number
        }) => [a.aluno.nome, a.anteriorKg, a.ultimoKg, a.variacaoKg],
      ),
    ).toEqual([
      ['Bruno Lima', 120, 130, 10],
      ['Ana Souza', 75, 82.5, 7.5],
      ['Carla Mendes', 70, 67.5, -2.5],
      ['Diego Novato', null, 60, null],
    ])
    expect(res.body.resumo).toEqual({
      cicloAtual: '2026-1',
      cicloAnterior: '2025-2',
      alunosAvaliados: 4,
      mediaAtualKg: 85,
      medianaAtualKg: 75,
      mediaAnteriorKg: 88.3,
      evolucaoMediaKg: 5, // (10 + 7,5 − 2,5) / 3: só quem fez os dois testes
      evolucaoMediaPct: 4.9, // (8,3% + 10% − 3,6%) / 3
      comparaveis: 3,
      evoluiram: 2,
      mantiveram: 0,
      cairam: 1,
    })
    expect(deadlift.id).toBeGreaterThan(0)
  })

  it('filtra por turma e, sem exercício escolhido, usa o mais testado', async () => {
    const { t07 } = await cenario()
    const treinador = await logarComoTreinador(app)

    const res = await treinador.get(admin(`/evolucao?turmaId=${t07.id}`))

    expect(res.body.exercicio.nome).toBe('Back Squat')
    expect(res.body.exercicios.map((e: { nome: string }) => e.nome)).toEqual(['Back Squat'])
    expect(res.body.turmas).toHaveLength(1)
    expect(res.body.alunos.map((a: { aluno: { nome: string } }) => a.aluno.nome)).toEqual([
      'Carla Mendes',
      'Diego Novato',
    ])
  })

  it('sem dados, responde vazio', async () => {
    const treinador = await logarComoTreinador(app)
    const res = await treinador.get(admin('/evolucao'))
    expect(res.body).toMatchObject({ exercicio: null, ciclos: [], alunos: [], resumo: null })
  })

  it('detalhe de um aluno em todos os exercícios', async () => {
    const { ana } = await cenario()
    const treinador = await logarComoTreinador(app)

    const res = await treinador.get(admin(`/evolucao/alunos/${ana.id}`))

    expect(res.body.aluno).toMatchObject({ nome: 'Ana Souza', turma: { nome: 'Turma 18h' } })
    expect(
      res.body.exercicios.map((e: { exercicio: { nome: string } }) => e.exercicio.nome),
    ).toEqual(['Back Squat', 'Deadlift'])
    expect((await treinador.get(admin('/evolucao/alunos/9999'))).status).toBe(404)
  })

  it('é exclusiva do treinador', async () => {
    await cenario()
    const aluna = await logar(app, 'ana@t.com')
    expect((await aluna.get(admin('/evolucao'))).status).toBe(403)
  })
})

describe('GET /api/me/evolucao', () => {
  it('a aluna vê a série de cada exercício com a evolução desde o primeiro registro', async () => {
    await cenario()
    const aluna = await logar(app, 'ana@t.com')

    const res = await aluna.get('/api/me/evolucao')

    expect(res.status).toBe(200)
    expect(res.body.exercicios[0]).toEqual({
      exercicio: { id: expect.any(Number), nome: 'Back Squat', categoria: 'OUTRO' },
      pontos: [
        { data: '2025-09-12', cargaKg: 75 },
        { data: '2026-03-16', cargaKg: 80 },
        { data: '2026-05-02', cargaKg: 82.5 },
      ],
      primeiroKg: 75,
      atualKg: 82.5,
      melhorKg: 82.5,
      variacaoKg: 7.5,
      variacaoPct: 10,
    })
    expect(res.body.exercicios[1]).toMatchObject({ exercicio: { nome: 'Deadlift' }, variacaoKg: 0 })
  })
})
