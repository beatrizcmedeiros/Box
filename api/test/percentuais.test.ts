import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import { criarAppDeTeste, criarUsuario, limparBanco, logar, logarComoTreinador } from './apoio.ts'

const app = criarAppDeTeste()

beforeEach(limparBanco)

const d = (iso: string) => new Date(`${iso}T00:00:00Z`)

async function cenario() {
  const t18 = await prisma.turma.create({ data: { nome: 'Turma 18h' } })
  const t07 = await prisma.turma.create({ data: { nome: 'Turma 07h' } })
  const backSquat = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
  const clean = await prisma.exercicio.create({ data: { nome: 'Clean' } })
  const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@t.com', turmaId: t18.id })
  const bruno = await criarUsuario({ nome: 'Bruno Lima', email: 'bruno@t.com', turmaId: t18.id })
  const carla = await criarUsuario({ nome: 'Carla Mendes', email: 'carla@t.com', turmaId: t07.id })
  await prisma.alunoApelido.create({ data: { usuarioId: carla.id, apelido: 'carlinha' } })

  const teste = (usuarioId: number, exercicioId: number, data: string, cargaKg: number) =>
    prisma.testeCarga.create({ data: { usuarioId, exercicioId, dataTeste: d(data), cargaKg } })
  // Vale o teste mais recente (PR vigente)
  await teste(ana.id, backSquat.id, '2025-09-10', 90)
  await teste(ana.id, backSquat.id, '2026-03-15', 105)
  await teste(ana.id, clean.id, '2026-03-15', 70)
  await teste(bruno.id, backSquat.id, '2026-03-15', 130)
  await teste(carla.id, backSquat.id, '2026-03-15', 80)

  const treinador = await logarComoTreinador(app)
  return { t18, t07, backSquat, clean, treinador }
}

describe('GET /api/admin/percentuais', () => {
  it('lista as cargas de todos os percentuais para a turma e o exercício', async () => {
    const { treinador, t18, backSquat } = await cenario()

    const res = await treinador.get(
      `/api/admin/percentuais?turmaId=${t18.id}&exercicioId=${backSquat.id}`,
    )

    expect(res.status).toBe(200)
    expect(res.body.percentuais).toEqual([35, 40, 45, 50, 55])
    expect(res.body.resultados).toEqual([
      {
        aluno: { id: expect.any(Number), nome: 'Ana Souza' },
        turma: { id: t18.id, nome: 'Turma 18h' },
        exercicio: { id: backSquat.id, nome: 'Back Squat' },
        dataTeste: '2026-03-15',
        prKg: 105,
        cargas: [
          { percentual: 35, cargaKg: 37 },
          { percentual: 40, cargaKg: 42 },
          { percentual: 45, cargaKg: 47.5 },
          { percentual: 50, cargaKg: 52.5 },
          { percentual: 55, cargaKg: 58 },
        ],
      },
      expect.objectContaining({
        aluno: expect.objectContaining({ nome: 'Bruno Lima' }),
        prKg: 130,
      }),
    ])
    expect(res.body.totais).toEqual({ alunos: 2, registros: 2 })
    expect(res.body.limitado).toBe(false)
  })

  it('mostra só os percentuais escolhidos, em ordem e sem repetir', async () => {
    const { treinador, backSquat } = await cenario()

    const res = await treinador.get(
      `/api/admin/percentuais?exercicioId=${backSquat.id}&percentuais=45,35,45`,
    )

    expect(res.body.percentuais).toEqual([35, 45])
    expect(res.body.resultados.map((r: { cargas: unknown }) => r.cargas)).toEqual([
      [
        { percentual: 35, cargaKg: 37 },
        { percentual: 45, cargaKg: 47.5 },
      ],
      [
        { percentual: 35, cargaKg: 45.5 },
        { percentual: 45, cargaKg: 58.5 },
      ],
      [
        { percentual: 35, cargaKg: 28 },
        { percentual: 45, cargaKg: 36 },
      ],
    ])
  })

  it('pesquisa um aluno pelo apelido e traz todos os exercícios dele', async () => {
    const { treinador } = await cenario()

    const carla = await treinador.get('/api/admin/percentuais?busca=CARLINHA')
    expect(carla.body.resultados.map((r: { aluno: { nome: string } }) => r.aluno.nome)).toEqual([
      'Carla Mendes',
    ])

    const ana = await treinador.get('/api/admin/percentuais?busca=ana')
    expect(
      ana.body.resultados.map((r: { exercicio: { nome: string } }) => r.exercicio.nome),
    ).toEqual(['Back Squat', 'Clean'])
  })

  it('exige algum filtro e percentuais válidos', async () => {
    const { treinador, backSquat } = await cenario()

    const semFiltro = await treinador.get('/api/admin/percentuais')
    expect(semFiltro.status).toBe(400)
    expect(semFiltro.body.erro).toContain('Escolha uma turma')

    for (const invalido of ['0', '101', '40.5', 'abc']) {
      const res = await treinador.get(
        `/api/admin/percentuais?exercicioId=${backSquat.id}&percentuais=${invalido}`,
      )
      expect(res.status).toBe(400)
    }
  })

  it('é exclusivo do treinador', async () => {
    const { backSquat } = await cenario()
    const aluna = await logar(app, 'ana@t.com')
    expect((await aluna.get(`/api/admin/percentuais?exercicioId=${backSquat.id}`)).status).toBe(403)
  })
})
