import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { criarApp } from '../src/app.ts'
import { prisma } from '../src/lib/prisma.ts'
import { criarAppDeTeste, criarUsuario, limparBanco, logar, SENHA } from './apoio.ts'

const app = criarAppDeTeste()

beforeEach(limparBanco)

type Agente = Awaited<ReturnType<typeof logar>>

/** Conta de academia própria (fora da academia de teste dos outros arquivos). */
async function novaAcademia(nome: string, email: string) {
  const conta = await criarUsuario({ nome, email, vinculado: false })
  await prisma.usuario.update({ where: { id: conta.id }, data: { tipo: 'ACADEMIA' } })
  const academia = await prisma.academia.create({ data: { nome, contaId: conta.id } })
  return { academia, agente: await logar(app, email) }
}

async function pessoa(nome: string, email: string, ehProfessor = false) {
  const usuario = await criarUsuario({ nome, email, vinculado: false })
  if (ehProfessor) await prisma.usuario.update({ where: { id: usuario.id }, data: { ehProfessor } })
  return { usuario, agente: await logar(app, email) }
}

const gerar = async (agente: Agente, rota: string, validade = '30') => {
  const res = await agente.post(rota).send({ validade })
  expect(res.status).toBe(201)
  return res.body.codigo.codigo as string
}

const usar = (agente: Agente, codigo: string) =>
  agente.post('/api/vinculos/codigo').send({ codigo })

const nomes = async (agente: Agente, rota: string) =>
  (await agente.get(rota)).body.map((a: { nome: string }) => a.nome)

describe('códigos de vínculo', () => {
  it('a academia gera o código de alunos e o aluno se vincula na hora', async () => {
    const { academia, agente: box } = await novaAcademia('Box Centro', 'box@t.com')
    const ana = await pessoa('Ana Souza', 'ana@t.com')

    const res = await box.post('/api/academia/codigos/alunos').send({ validade: '15' })
    expect(res.status).toBe(201)
    expect(res.body.codigo.codigo).toMatch(/^\d{6}$/)
    const dias = (new Date(res.body.codigo.expiraEm).getTime() - Date.now()) / 86_400_000
    expect(Math.round(dias)).toBe(15)

    const vinculo = await usar(ana.agente, res.body.codigo.codigo)
    expect(vinculo.status).toBe(201)
    expect(vinculo.body).toMatchObject({ tipo: 'academia', academia: { id: academia.id } })
    expect(await nomes(box, `/api/c/${academia.id}/alunos`)).toEqual(['Ana Souza'])

    // Usar de novo não duplica
    expect((await usar(ana.agente, res.body.codigo.codigo)).status).toBe(409)
  })

  it('gerar um código novo invalida o anterior; código expirado não vale', async () => {
    const { agente: box } = await novaAcademia('Box Centro', 'box@t.com')
    const ana = await pessoa('Ana', 'ana@t.com')
    const antigo = await gerar(box, '/api/academia/codigos/alunos')
    const novo = await gerar(box, '/api/academia/codigos/alunos', 'nunca')
    expect(novo).not.toBe(antigo)

    expect((await usar(ana.agente, antigo)).body.codigo).toBe('CODIGO_INVALIDO')
    await prisma.codigoVinculo.updateMany({
      where: { codigo: novo },
      data: { expiraEm: new Date(Date.now() - 1000) },
    })
    expect((await usar(ana.agente, novo)).status).toBe(404)
    expect((await box.get('/api/academia/codigos')).body.alunos).toBeNull()
  })

  it('código de professores da academia: só para quem é professor', async () => {
    const { academia, agente: box } = await novaAcademia('Box Centro', 'box@t.com')
    const ana = await pessoa('Ana', 'ana@t.com')
    const carlos = await pessoa('Carlos', 'carlos@t.com', true)
    const codigo = await gerar(box, '/api/academia/codigos/professores')

    expect((await usar(ana.agente, codigo)).body.codigo).toBe('SO_PROFESSORES')
    expect((await usar(carlos.agente, codigo)).status).toBe(201)
    expect((await box.get('/api/academia/professores')).body).toEqual([
      expect.objectContaining({ nome: 'Carlos' }),
    ])
    expect((await carlos.agente.get('/api/contextos')).body).toEqual([
      { id: 'pessoal', tipo: 'professor', nome: 'Meus alunos' },
      { id: String(academia.id), tipo: 'academia', nome: 'Box Centro' },
    ])
  })

  it('o professor gera o código dos alunos dele; não pode usar o próprio', async () => {
    const carlos = await pessoa('Carlos', 'carlos@t.com', true)
    const ana = await pessoa('Ana', 'ana@t.com')
    const codigo = await gerar(carlos.agente, '/api/professor/codigo')

    expect((await usar(carlos.agente, codigo)).status).toBe(400)
    expect((await usar(ana.agente, codigo)).body).toMatchObject({
      tipo: 'professor',
      professor: { nome: 'Carlos' },
    })
    expect(await nomes(carlos.agente, '/api/c/pessoal/alunos')).toEqual(['Ana'])
  })

  it('código inválido e área do professor só para quem se cadastrou como professor', async () => {
    const ana = await pessoa('Ana', 'ana@t.com')
    expect((await usar(ana.agente, '000000')).status).toBe(404)
    expect((await ana.agente.get('/api/professor/codigo')).status).toBe(403)

    await prisma.usuario.update({ where: { email: 'ana@t.com' }, data: { ehProfessor: true } })
    expect((await ana.agente.get('/api/professor/codigo')).body).toEqual({ codigo: null })
  })

  it('limita as tentativas de código para impedir adivinhar', async () => {
    const anterior = process.env.LIMITE_CODIGOS
    process.env.LIMITE_CODIGOS = '1'
    const appComLimite = criarApp({ verificarBanco: async () => true, webOrigin: 'http://x' })
    process.env.LIMITE_CODIGOS = anterior
    await criarUsuario({ email: 'ana@t.com', vinculado: false })
    const agente = request.agent(appComLimite)
    await agente.post('/api/auth/login').send({ email: 'ana@t.com', senha: SENHA })

    for (let i = 0; i < 10; i++)
      await agente.post('/api/vinculos/codigo').send({ codigo: '123456' })
    const bloqueado = await agente.post('/api/vinculos/codigo').send({ codigo: '123456' })
    expect(bloqueado.status).toBe(429)
  })
})

describe('quem vê o quê (seção 2 do plano)', () => {
  // Academia Y com o professor X; professor Z sem academia; alunos em cada situação
  async function cenario() {
    const y = await novaAcademia('Box Y', 'y@t.com')
    const x = await pessoa('Professor X', 'x@t.com', true)
    const z = await pessoa('Professor Z', 'z@t.com', true)
    await prisma.professorAcademia.create({
      data: { academiaId: y.academia.id, professorId: x.usuario.id },
    })
    const aluno = async (
      nome: string,
      vinculos: { academia?: boolean; x?: boolean; z?: boolean },
    ) => {
      const a = await pessoa(nome, `${nome.toLowerCase().replace(' ', '')}@t.com`)
      if (vinculos.academia)
        await prisma.vinculoAluno.create({
          data: { alunoId: a.usuario.id, academiaId: y.academia.id },
        })
      if (vinculos.x)
        await prisma.vinculoAluno.create({
          data: { alunoId: a.usuario.id, professorId: x.usuario.id },
        })
      if (vinculos.z)
        await prisma.vinculoAluno.create({
          data: { alunoId: a.usuario.id, professorId: z.usuario.id },
        })
      return a
    }
    const semVinculo = await aluno('A0 Livre', {})
    const daAcademia = await aluno('A1 Academia', { academia: true })
    const soDoX = await aluno('A2 SoX', { x: true })
    await aluno('A3 AcademiaX', { academia: true, x: true })
    await aluno('A4 AcademiaZ', { academia: true, z: true })
    return { y, x, z, semVinculo, daAcademia, soDoX }
  }

  it('cada contexto vê exatamente os alunos da tabela', async () => {
    const { y, x, z } = await cenario()
    const daY = `/api/c/${y.academia.id}/alunos`
    const esperadoY = ['A1 Academia', 'A3 AcademiaX', 'A4 AcademiaZ']

    expect(await nomes(y.agente, daY)).toEqual(esperadoY)
    expect(await nomes(x.agente, daY)).toEqual(esperadoY)
    expect(await nomes(x.agente, '/api/c/pessoal/alunos')).toEqual(['A2 SoX', 'A3 AcademiaX'])
    expect(await nomes(z.agente, '/api/c/pessoal/alunos')).toEqual(['A4 AcademiaZ'])
    // Z não é da academia Y; a conta da academia não tem "Meus alunos"
    expect((await z.agente.get(daY)).status).toBe(403)
    expect((await y.agente.get('/api/c/pessoal/alunos')).status).toBe(403)
  })

  it('aluno sem vínculo não aparece para ninguém e não acessa a gestão', async () => {
    const { y, semVinculo } = await cenario()
    expect((await semVinculo.agente.get(`/api/c/${y.academia.id}/alunos`)).status).toBe(403)
    expect((await semVinculo.agente.get('/api/contextos')).body).toEqual([])
  })

  it('o aluno desfaz o vínculo e o professor deixa de ver os PRs na hora', async () => {
    const { x, soDoX } = await cenario()
    const exercicio = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
    await soDoX.agente
      .post('/api/me/prs')
      .send({ exercicioId: exercicio.id, dataTeste: '2026-03-15', cargaKg: 100 })
    expect((await x.agente.get('/api/c/pessoal/cargas')).body.resultados).toHaveLength(1)

    const { comoAluno } = (await soDoX.agente.get('/api/vinculos')).body
    expect(comoAluno).toEqual([
      expect.objectContaining({
        tipo: 'professor',
        professor: expect.objectContaining({ nome: 'Professor X' }),
      }),
    ])
    expect((await soDoX.agente.delete(`/api/vinculos/${comoAluno[0].id}`)).status).toBe(204)

    expect((await x.agente.get('/api/c/pessoal/cargas')).body.resultados).toEqual([])
    expect((await soDoX.agente.get('/api/me/prs')).body).toHaveLength(1)
  })

  it('professor que sai (ou é removido) perde o acesso aos alunos da academia', async () => {
    const { y, x } = await cenario()
    const rota = `/api/c/${y.academia.id}/alunos`
    expect((await x.agente.delete(`/api/vinculos/academias/${y.academia.id}`)).status).toBe(204)
    expect((await x.agente.get(rota)).status).toBe(403)
    // Os alunos vinculados diretamente continuam com ele
    expect(await nomes(x.agente, '/api/c/pessoal/alunos')).toEqual(['A2 SoX', 'A3 AcademiaX'])

    await prisma.professorAcademia.create({
      data: { academiaId: y.academia.id, professorId: x.usuario.id },
    })
    expect((await y.agente.delete(`/api/academia/professores/${x.usuario.id}`)).status).toBe(204)
    expect((await x.agente.get(rota)).status).toBe(403)
  })
})

describe('locais do professor', () => {
  it('agrupa os alunos próprios por local e turma', async () => {
    const carlos = await pessoa('Carlos', 'carlos@t.com', true)
    const ana = await pessoa('Ana', 'ana@t.com')
    const bia = await pessoa('Bia', 'bia@t.com')
    for (const a of [ana, bia]) {
      await prisma.vinculoAluno.create({
        data: { alunoId: a.usuario.id, professorId: carlos.usuario.id },
      })
    }

    const local = (await carlos.agente.post('/api/professor/locais').send({ nome: 'Academia X' }))
      .body
    expect(
      (await carlos.agente.post('/api/professor/locais').send({ nome: 'academia x' })).status,
    ).toBe(409)

    // No contexto "Meus alunos", a turma fica dentro de um local
    expect((await carlos.agente.post('/api/c/pessoal/turmas').send({ nome: '07h' })).status).toBe(
      400,
    )
    const t07 = (
      await carlos.agente.post('/api/c/pessoal/turmas').send({ nome: '07h', localId: local.id })
    ).body
    await carlos.agente.post('/api/c/pessoal/turmas').send({ nome: '19h', localId: local.id })

    // Colocar na turma já coloca no local
    const res = await carlos.agente
      .put(`/api/c/pessoal/alunos/${ana.usuario.id}`)
      .send({ turmaId: t07.id })
    expect(res.body).toMatchObject({
      turma: { nome: '07h' },
      local: { id: local.id, nome: 'Academia X' },
    })
    await carlos.agente.put(`/api/c/pessoal/alunos/${bia.usuario.id}`).send({ localId: local.id })

    expect(await nomes(carlos.agente, `/api/c/pessoal/alunos?localId=${local.id}`)).toEqual([
      'Ana',
      'Bia',
    ])
    expect(await nomes(carlos.agente, `/api/c/pessoal/alunos?turmaId=${t07.id}`)).toEqual(['Ana'])
    expect((await carlos.agente.get('/api/professor/locais')).body).toEqual([
      expect.objectContaining({ nome: 'Academia X', totalAlunos: 2, turmas: expect.any(Array) }),
    ])
    expect((await carlos.agente.get('/api/c/pessoal/locais')).body).toEqual([
      { id: local.id, nome: 'Academia X' },
    ])
  })
})

describe('exercícios por escopo', () => {
  it('o aluno vê os padrão, os dos vínculos e os pessoais; não os de outras academias', async () => {
    const y = await novaAcademia('Box Y', 'y@t.com')
    const w = await novaAcademia('Box W', 'w@t.com')
    const ana = await pessoa('Ana', 'ana@t.com')
    await prisma.vinculoAluno.create({
      data: { alunoId: ana.usuario.id, academiaId: y.academia.id },
    })
    await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
    await y.agente
      .post(`/api/c/${y.academia.id}/exercicios`)
      .send({ nome: 'Wall Ball', categoria: 'OUTRO' })
    const deW = (
      await w.agente
        .post(`/api/c/${w.academia.id}/exercicios`)
        .send({ nome: 'Thruster', categoria: 'OUTRO' })
    ).body

    const pessoal = await ana.agente.post('/api/me/exercicios').send({ nome: 'Farmer Walk' })
    expect(pessoal.status).toBe(201)
    expect((await ana.agente.post('/api/me/exercicios').send({ nome: 'farmer walk' })).status).toBe(
      409,
    )

    const lista = (await ana.agente.get('/api/me/exercicios')).body
    expect(lista.map((e: { nome: string; origem: string | null }) => [e.nome, e.origem])).toEqual([
      ['Back Squat', null],
      ['Farmer Walk', 'pessoal'],
      ['Wall Ball', 'Box Y'],
    ])

    const prAlheio = await ana.agente
      .post('/api/me/prs')
      .send({ exercicioId: deW.id, dataTeste: '2026-03-15', cargaKg: 40 })
    expect(prAlheio.status).toBe(400)
  })

  it('exercícios e nomes alternativos da academia não aparecem para outro contexto', async () => {
    const y = await novaAcademia('Box Y', 'y@t.com')
    const z = await pessoa('Professor Z', 'z@t.com', true)
    const padrao = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
    await y.agente
      .post(`/api/c/${y.academia.id}/exercicios`)
      .send({ nome: 'Wall Ball', categoria: 'OUTRO' })
    // A academia acrescenta um nome alternativo ao exercício padrão, só para ela
    const comAlias = await y.agente
      .put(`/api/c/${y.academia.id}/exercicios/${padrao.id}/aliases`)
      .send({ aliases: ['agacha'] })
    expect(comAlias.body).toMatchObject({ aliases: ['agacha'], editavel: false })

    const deZ = (await z.agente.get('/api/c/pessoal/exercicios')).body
    expect(deZ).toEqual([expect.objectContaining({ nome: 'Back Squat', aliases: [] })])
  })
})
