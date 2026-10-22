import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import {
  admin,
  apelidar,
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

async function cenario() {
  const t18 = await criarTurma('Turma 18h')
  const t07 = await criarTurma('Turma 07h')
  const backSquat = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
  const inativo = await prisma.exercicio.create({ data: { nome: 'Thruster', ativo: false } })
  const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@t.com', turmaId: t18.id })
  const joao = await criarUsuario({ nome: 'João Pereira', email: 'joao@t.com', turmaId: t18.id })
  const carla = await criarUsuario({ nome: 'Carla Mendes', email: 'carla@t.com', turmaId: t07.id })
  await criarUsuario({
    nome: 'Fulano Inativo',
    email: 'fulano@t.com',
    turmaId: t18.id,
    ativo: false,
  })
  await apelidar(carla.id, 'carlinha')
  await prisma.testeCarga.create({
    data: { usuarioId: ana.id, exercicioId: backSquat.id, dataTeste: d('2026-03-15'), cargaKg: 80 },
  })
  const treinador = await logarComoTreinador(app)
  return { t18, t07, backSquat, inativo, ana, joao, carla, treinador }
}

describe('GET /api/c/:contexto/lancamentos', () => {
  it('lista os alunos ativos da turma com o PR atual do exercício', async () => {
    const { treinador, t18, backSquat } = await cenario()

    const res = await treinador.get(
      admin(`/lancamentos?exercicioId=${backSquat.id}&data=2026-10-21&turmaId=${t18.id}`),
    )

    expect(res.status).toBe(200)
    expect(res.body.alunos).toEqual([
      {
        aluno: { id: expect.any(Number), nome: 'Ana Souza' },
        turma: { id: t18.id, nome: 'Turma 18h' },
        prAtual: { cargaKg: 80, dataTeste: '2026-03-15' },
        melhorAnteriorKg: 80,
        lancamento: null,
      },
      {
        aluno: { id: expect.any(Number), nome: 'João Pereira' },
        turma: { id: t18.id, nome: 'Turma 18h' },
        prAtual: null,
        melhorAnteriorKg: null,
        lancamento: null,
      },
    ])
  })

  it('pesquisa pelo nome sem acento ou pelo apelido, em todas as turmas', async () => {
    const { treinador, backSquat } = await cenario()
    const nomes = async (busca: string) =>
      (
        await treinador.get(
          admin(`/lancamentos?exercicioId=${backSquat.id}&data=2026-10-21&busca=${busca}`),
        )
      ).body.alunos.map((a: { aluno: { nome: string } }) => a.aluno.nome)

    expect(await nomes('joao')).toEqual(['João Pereira'])
    expect(await nomes('CARLINHA')).toEqual(['Carla Mendes'])
    expect(await nomes('')).toEqual(['Ana Souza', 'Carla Mendes', 'João Pereira'])
  })

  it('exige exercício e data válidos', async () => {
    const { treinador } = await cenario()
    expect((await treinador.get(admin('/lancamentos?data=2026-10-21'))).status).toBe(400)
    expect((await treinador.get(admin('/lancamentos?exercicioId=1&data=2999-01-01'))).status).toBe(
      400,
    )
  })
})

describe('POST /api/c/:contexto/lancamentos', () => {
  it('lança a carga de vários alunos de uma vez e aponta novos recordes', async () => {
    const { treinador, backSquat, ana, joao } = await cenario()

    const res = await treinador.post(admin('/lancamentos')).send({
      dataTeste: '2026-10-21',
      exercicioId: backSquat.id,
      resultados: [
        { usuarioId: ana.id, cargaKg: 85 },
        { usuarioId: joao.id, cargaKg: 97.5 },
      ],
    })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      criados: 2,
      atualizados: 0,
      novosRecordes: [{ usuarioId: ana.id, nome: 'Ana Souza', cargaKg: 85, anteriorKg: 80 }],
    })

    // A aluna vê o novo PR, marcado como do treinador e sem poder apagar
    const aluna = await logar(app, 'ana@t.com')
    const [pr] = (await aluna.get('/api/me/prs')).body
    expect(pr).toMatchObject({
      pr: { cargaKg: 85, dataTeste: '2026-10-21', origem: 'TREINADOR' },
      novoRecorde: true,
    })
    expect((await aluna.delete(`/api/me/prs/lancamentos/${pr.pr.id}`)).status).toBe(403)

    // Na tela, o lançamento do dia aparece preenchido
    const lista = await treinador.get(
      admin(`/lancamentos?exercicioId=${backSquat.id}&data=2026-10-21&busca=ana`),
    )
    expect(lista.body.alunos[0]).toMatchObject({
      prAtual: { cargaKg: 80 },
      lancamento: { cargaKg: 85, origem: 'TREINADOR' },
    })
  })

  it('lançar de novo no mesmo dia corrige a carga em vez de duplicar', async () => {
    const { treinador, backSquat, joao } = await cenario()
    const enviar = (cargaKg: number) =>
      treinador.post(admin('/lancamentos')).send({
        dataTeste: '2026-10-21',
        exercicioId: backSquat.id,
        resultados: [{ usuarioId: joao.id, cargaKg }],
      })

    await enviar(100)
    expect((await enviar(102.5)).body).toMatchObject({ criados: 0, atualizados: 1 })
    const testes = await prisma.testeCarga.findMany({ where: { usuarioId: joao.id } })
    expect(testes.map((t) => t.cargaKg.toNumber())).toEqual([102.5])
  })

  it.each([
    [
      'aluno repetido',
      (c: Awaited<ReturnType<typeof cenario>>) => ({
        resultados: [
          { usuarioId: c.ana.id, cargaKg: 80 },
          { usuarioId: c.ana.id, cargaKg: 81 },
        ],
      }),
      'mesmo aluno',
    ],
    [
      'exercício inativo',
      (c: Awaited<ReturnType<typeof cenario>>) => ({ exercicioId: c.inativo.id }),
      'Exercício não disponível',
    ],
    [
      'carga inválida',
      (c: Awaited<ReturnType<typeof cenario>>) => ({
        resultados: [{ usuarioId: c.ana.id, cargaKg: 0 }],
      }),
      'Dados inválidos',
    ],
    ['lista vazia', () => ({ resultados: [] }), 'Dados inválidos'],
  ])('recusa %s', async (_caso, alterar, mensagem) => {
    const c = await cenario()
    const res = await c.treinador.post(admin('/lancamentos')).send({
      dataTeste: '2026-10-21',
      exercicioId: c.backSquat.id,
      resultados: [{ usuarioId: c.ana.id, cargaKg: 80 }],
      ...alterar(c),
    })
    expect(res.status).toBe(400)
    expect(res.body.erro).toContain(mensagem)
  })

  it('é exclusivo do treinador', async () => {
    const { backSquat, ana } = await cenario()
    const aluna = await logar(app, 'ana@t.com')
    const res = await aluna.post(admin('/lancamentos')).send({
      dataTeste: '2026-10-21',
      exercicioId: backSquat.id,
      resultados: [{ usuarioId: ana.id, cargaKg: 200 }],
    })
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/c/:contexto/lancamentos/:id', () => {
  it('exclui só lançamentos do treinador', async () => {
    const { treinador, backSquat, joao, ana } = await cenario()
    await treinador.post(admin('/lancamentos')).send({
      dataTeste: '2026-10-21',
      exercicioId: backSquat.id,
      resultados: [{ usuarioId: joao.id, cargaKg: 100 }],
    })
    const doTreinador = await prisma.testeCarga.findFirstOrThrow({ where: { usuarioId: joao.id } })
    const daAluna = await prisma.testeCarga.findFirstOrThrow({ where: { usuarioId: ana.id } })

    expect((await treinador.delete(admin(`/lancamentos/${daAluna.id}`))).status).toBe(409)
    expect((await treinador.delete(admin(`/lancamentos/${doTreinador.id}`))).status).toBe(204)
    expect(await prisma.testeCarga.count({ where: { usuarioId: joao.id } })).toBe(0)
  })
})
