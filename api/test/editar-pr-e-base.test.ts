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

/** Ana: o maior PR (110 kg) é antigo; o último teste (100 kg) é o mais recente. */
async function cenario() {
  const turma = await criarTurma('Turma 18h')
  const backSquat = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
  const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@t.com', turmaId: turma.id })
  const teste = (data: string, cargaKg: number, origem: 'ALUNO' | 'TREINADOR' = 'ALUNO') =>
    prisma.testeCarga.create({
      data: { usuarioId: ana.id, exercicioId: backSquat.id, dataTeste: d(data), cargaKg, origem },
    })
  const antigo = await teste('2025-09-10', 110, 'TREINADOR')
  const recente = await teste('2026-03-15', 100)
  const treinador = await logarComoTreinador(app)
  const aluna = await logar(app, 'ana@t.com')
  return { turma, backSquat, ana, antigo, recente, treinador, aluna }
}

describe('base das porcentagens: último PR ou maior PR', () => {
  it('na área do aluno, o padrão é o último teste e "maior" usa a maior carga', async () => {
    const { aluna, backSquat } = await cenario()

    const [ultimo] = (await aluna.get('/api/me/prs')).body
    expect(ultimo).toMatchObject({ base: 'ultimo', pr: { cargaKg: 100 } })
    expect(ultimo.percentuais[0]).toEqual({ percentual: 35, cargaKg: 35 })

    const [maior] = (await aluna.get('/api/me/prs?base=maior')).body
    expect(maior).toMatchObject({ base: 'maior', pr: { cargaKg: 110, dataTeste: '2025-09-10' } })
    expect(maior.percentuais[0]).toEqual({ percentual: 35, cargaKg: 38.5 })

    const detalhe = (await aluna.get(`/api/me/prs/${backSquat.id}?base=maior`)).body
    expect(detalhe.pr.cargaKg).toBe(110)
    expect(detalhe.historico).toHaveLength(2)

    expect((await aluna.get('/api/me/prs?base=outra')).status).toBe(400)
  })

  it('nos percentuais dos alunos, o professor também escolhe a base', async () => {
    const { treinador, turma } = await cenario()
    const caminho = admin(`/percentuais?turmaId=${turma.id}`)

    const ultimo = (await treinador.get(caminho)).body
    expect(ultimo.base).toBe('ultimo')
    expect(ultimo.resultados[0].prKg).toBe(100)

    const maior = (await treinador.get(`${caminho}&base=maior`)).body
    expect(maior.base).toBe('maior')
    expect(maior.resultados[0]).toMatchObject({ prKg: 110, dataTeste: '2025-09-10' })
  })
})

describe('editar PR', () => {
  it('o aluno edita qualquer PR dele, inclusive o lançado pelo professor', async () => {
    const { aluna, antigo, recente } = await cenario()

    const proprio = await aluna
      .put(`/api/me/prs/lancamentos/${recente.id}`)
      .send({ dataTeste: '2026-03-16', cargaKg: 102.5 })
    expect(proprio.status).toBe(200)
    expect(proprio.body).toMatchObject({ dataTeste: '2026-03-16', cargaKg: 102.5 })

    const doProfessor = await aluna
      .put(`/api/me/prs/lancamentos/${antigo.id}`)
      .send({ dataTeste: '2025-09-10', cargaKg: 112 })
    expect(doProfessor.status).toBe(200)
    expect(doProfessor.body.origem).toBe('TREINADOR')

    const invalido = await aluna
      .put(`/api/me/prs/lancamentos/${recente.id}`)
      .send({ dataTeste: '2026-03-16', cargaKg: 0 })
    expect(invalido.status).toBe(400)
  })

  it('o aluno não edita o PR de outra pessoa', async () => {
    const { recente } = await cenario()
    await criarUsuario({ nome: 'Bruno', email: 'bruno@t.com' })
    const bruno = await logar(app, 'bruno@t.com')
    const res = await bruno
      .put(`/api/me/prs/lancamentos/${recente.id}`)
      .send({ dataTeste: '2026-03-16', cargaKg: 50 })
    expect(res.status).toBe(404)
  })

  it('o professor lista e edita os PRs do aluno vinculado', async () => {
    const { treinador, ana, recente } = await cenario()

    const lista = (await treinador.get(admin(`/alunos/${ana.id}/prs`))).body
    expect(lista.map((p: { cargaKg: number }) => p.cargaKg)).toEqual([100, 110])
    expect(lista[0]).toMatchObject({ exercicio: { nome: 'Back Squat' }, origem: 'ALUNO' })

    const res = await treinador
      .put(admin(`/alunos/${ana.id}/prs/${recente.id}`))
      .send({ dataTeste: '2026-03-15', cargaKg: 97.5 })
    expect(res.status).toBe(200)
    expect(res.body.cargaKg).toBe(97.5)
  })

  it('o professor não edita PRs de quem não é aluno dele', async () => {
    const { treinador, ana, recente } = await cenario()
    const outro = await criarUsuario({ nome: 'Fora', email: 'fora@t.com', vinculado: false })

    expect((await treinador.get(admin(`/alunos/${outro.id}/prs`))).status).toBe(404)
    // PR da Ana pela rota de outro aluno também não vale
    const cruzado = await treinador
      .put(admin(`/alunos/${outro.id}/prs/${recente.id}`))
      .send({ dataTeste: '2026-03-15', cargaKg: 1 })
    expect(cruzado.status).toBe(404)
    expect((await prisma.testeCarga.findUnique({ where: { id: recente.id } }))?.usuarioId).toBe(
      ana.id,
    )
  })
})

describe('perfil de professor', () => {
  it('o aluno não muda o perfil para professor', async () => {
    const { aluna } = await cenario()
    const res = await aluna.put('/api/professor/perfil').send({ ativo: true })
    expect(res.status).not.toBe(200)
    expect((await aluna.get('/api/auth/me')).body.usuario.ehProfessor).toBe(false)
  })
})
