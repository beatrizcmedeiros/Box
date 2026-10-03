import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import { criarAppDeTeste, criarUsuario, limparBanco, logar, logarComoTreinador } from './apoio.ts'

const app = criarAppDeTeste()

beforeEach(limparBanco)

async function cenario() {
  const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@teste.com' })
  const backSquat = await prisma.exercicio.create({
    data: { nome: 'Back Squat', categoria: 'LEVANTAMENTO' },
  })
  const deadlift = await prisma.exercicio.create({
    data: { nome: 'Deadlift', categoria: 'LEVANTAMENTO' },
  })
  const inativo = await prisma.exercicio.create({ data: { nome: 'Thruster', ativo: false } })
  const agente = await logar(app, 'ana@teste.com')
  return { ana, backSquat, deadlift, inativo, agente }
}

const registrar = (
  agente: Awaited<ReturnType<typeof cenario>>['agente'],
  exercicioId: number,
  dataTeste: string,
  cargaKg: number | string,
) => agente.post('/api/me/prs').send({ exercicioId, dataTeste, cargaKg })

describe('acesso à área do aluno', () => {
  it('bloqueia o treinador', async () => {
    const treinador = await logarComoTreinador(app)
    const res = await treinador.get('/api/me/prs')
    expect(res.status).toBe(403)
    expect(res.body.codigo).toBe('SEM_PERMISSAO')
  })

  it('exige concluir o primeiro acesso', async () => {
    await criarUsuario({ email: 'novo@teste.com', trocarSenha: true, consentido: false })
    const aluno = await logar(app, 'novo@teste.com')
    expect((await aluno.get('/api/me/prs')).body.codigo).toBe('TROCAR_SENHA')
  })

  it('lista apenas exercícios ativos', async () => {
    const { agente } = await cenario()
    const res = await agente.get('/api/me/exercicios')
    expect(res.body.map((e: { nome: string }) => e.nome)).toEqual(['Back Squat', 'Deadlift'])
  })
})

describe('POST /api/me/prs', () => {
  it('registra o PR', async () => {
    const { agente, backSquat } = await cenario()
    const res = await registrar(agente, backSquat.id, '2026-03-15', 105)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ dataTeste: '2026-03-15', cargaKg: 105, origem: 'ALUNO' })
  })

  it.each([
    ['carga zero', { cargaKg: 0 }, 'cargaKg'],
    ['carga acima de 500 kg', { cargaKg: 501 }, 'cargaKg'],
    ['carga com 3 casas decimais', { cargaKg: 100.125 }, 'cargaKg'],
    ['carga não numérica', { cargaKg: 'muito' }, 'cargaKg'],
    ['data inválida', { dataTeste: '15/03/2026' }, 'dataTeste'],
    ['data futura', { dataTeste: '2999-01-01' }, 'dataTeste'],
  ])('recusa %s', async (_caso, alteracao, campo) => {
    const { agente, backSquat } = await cenario()
    const res = await agente
      .post('/api/me/prs')
      .send({ exercicioId: backSquat.id, dataTeste: '2026-03-15', cargaKg: 100, ...alteracao })

    expect(res.status).toBe(400)
    expect(res.body.campos.map((c: { campo: string }) => c.campo)).toContain(campo)
  })

  it('recusa exercício inativo ou inexistente', async () => {
    const { agente, inativo } = await cenario()
    expect((await registrar(agente, inativo.id, '2026-03-15', 50)).status).toBe(400)
    expect((await registrar(agente, 9999, '2026-03-15', 50)).status).toBe(400)
  })
})

describe('GET /api/me/prs', () => {
  it('retorna o PR vigente de cada exercício com as cargas de 35% a 55%', async () => {
    const { agente, backSquat, deadlift } = await cenario()
    await registrar(agente, backSquat.id, '2025-09-12', 100)
    await registrar(agente, backSquat.id, '2026-03-15', 105)
    await registrar(agente, deadlift.id, '2026-03-15', 120)

    const res = await agente.get('/api/me/prs')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({
      exercicio: { nome: 'Back Squat', categoria: 'LEVANTAMENTO' },
      pr: { cargaKg: 105, dataTeste: '2026-03-15' },
      novoRecorde: true,
      diferencaKg: 5,
    })
    expect(res.body[0].percentuais).toEqual([
      { percentual: 35, cargaKg: 37 },
      { percentual: 40, cargaKg: 42 },
      { percentual: 45, cargaKg: 47.5 },
      { percentual: 50, cargaKg: 52.5 },
      { percentual: 55, cargaKg: 58 },
    ])
    expect(res.body[1]).toMatchObject({
      exercicio: { nome: 'Deadlift' },
      novoRecorde: false,
      diferencaKg: null,
    })
  })

  it('o vigente é o teste mais recente, mesmo que a carga seja menor', async () => {
    const { agente, backSquat } = await cenario()
    await registrar(agente, backSquat.id, '2026-03-15', 105)
    await registrar(agente, backSquat.id, '2026-09-10', 100)

    const [resumo] = (await agente.get('/api/me/prs')).body
    expect(resumo).toMatchObject({ pr: { cargaKg: 100 }, novoRecorde: false, diferencaKg: -5 })
  })

  it('não mostra os PRs de outros alunos', async () => {
    const { agente, backSquat } = await cenario()
    const bruno = await criarUsuario({ email: 'bruno@teste.com' })
    await prisma.testeCarga.create({
      data: {
        usuarioId: bruno.id,
        exercicioId: backSquat.id,
        dataTeste: new Date('2026-03-15'),
        cargaKg: 140,
      },
    })

    expect((await agente.get('/api/me/prs')).body).toEqual([])
    expect((await agente.get(`/api/me/prs/${backSquat.id}`)).status).toBe(404)
  })
})

describe('GET /api/me/prs/:exercicioId', () => {
  it('traz o histórico do mais recente para o mais antigo', async () => {
    const { agente, backSquat } = await cenario()
    await registrar(agente, backSquat.id, '2025-03-14', 92.5)
    await registrar(agente, backSquat.id, '2026-03-15', 105)
    await registrar(agente, backSquat.id, '2025-09-12', 100)

    const res = await agente.get(`/api/me/prs/${backSquat.id}`)

    expect(res.body.pr.cargaKg).toBe(105)
    expect(res.body.historico.map((t: { cargaKg: number }) => t.cargaKg)).toEqual([105, 100, 92.5])
  })
})

describe('DELETE /api/me/prs/lancamentos/:id', () => {
  it('apaga um lançamento próprio e o PR anterior volta a valer', async () => {
    const { agente, backSquat } = await cenario()
    await registrar(agente, backSquat.id, '2026-03-15', 105)
    const errado = await registrar(agente, backSquat.id, '2026-03-16', 150)

    expect((await agente.delete(`/api/me/prs/lancamentos/${errado.body.id}`)).status).toBe(204)
    expect((await agente.get('/api/me/prs')).body[0].pr.cargaKg).toBe(105)
  })

  it('não apaga resultado importado pelo treinador nem de outro aluno', async () => {
    const { agente, ana, backSquat } = await cenario()
    const importado = await prisma.testeCarga.create({
      data: {
        usuarioId: ana.id,
        exercicioId: backSquat.id,
        dataTeste: new Date('2026-03-15'),
        cargaKg: 100,
        origem: 'IMPORTACAO',
      },
    })
    const bruno = await criarUsuario({ email: 'bruno@teste.com' })
    const deOutro = await prisma.testeCarga.create({
      data: {
        usuarioId: bruno.id,
        exercicioId: backSquat.id,
        dataTeste: new Date('2026-03-15'),
        cargaKg: 140,
      },
    })

    expect((await agente.delete(`/api/me/prs/lancamentos/${importado.id}`)).status).toBe(403)
    expect((await agente.delete(`/api/me/prs/lancamentos/${deOutro.id}`)).status).toBe(404)
  })
})
